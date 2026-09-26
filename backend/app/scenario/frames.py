"""DepthFrame builder — joins the four stores into the serving view (SDD §5.4–§5.6).

Petrophysics (`curves.*`) = HIGH-RESOLUTION SYNTHETIC forward model (app.scenario.hires_well, O6):
Archie / volumetric density-neutron-PEF / Wyllie+Eaton sonic / SOBM radial resistivity on a
grid set by profiles.yaml, plus generator ground truth (`truth.*`) for ML labels. No real log is loaded.
Everything else is scenario-driven: drilling/mudlog/mud = SIMULATED, derived = DERIVED,
ml = MODEL_INFERENCE (baseline) / SIMULATED (litho prior).

Output is a flat DataFrame with dotted columns ('curves.GR', 'derived.ECD', ...) plus a
provenance map {column: label}. `to_columnar()` / `frame_at()` produce API payloads.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from app.core.provenance import CURVES, Provenance as P
from app.ml import baseline
from app.scenario import profiles as prof
from app.scenario import simulated_ops as ops
from app.scenario.facts import facts
from app.scenario.hires_well import hires_well

LITHO_ORDER = baseline.CLASSES
TRUTH_COLS = ("VSH", "VCL", "VQTZ", "VCALC", "PHIT", "PHIE", "SW", "SXO_W", "LITHO")


@dataclass
class FrameSet:
    well_id: str
    df: pd.DataFrame
    provenance: dict[str, str]
    meta: dict = field(default_factory=dict)


def cuttings(md: np.ndarray, rop: np.ndarray, truth: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """Mud-log cuttings % at the shakers: truth solids lagged by ROP × bottoms-up/60, reported in decile steps."""
    lag = rop * facts()["mudlog"]["bottoms_up_lag_min"] / 60.0
    src = md - lag
    solids = {"SHALE": truth["VSH"], "CARB": np.minimum(truth["VCALC"] / np.maximum(1 - truth["PHIT"], 1e-6), 1.0)}
    sh = np.interp(src, md, solids["SHALE"])
    cb = np.interp(src, md, solids["CARB"])
    sh = np.clip(np.round(sh * 10) * 10, 0, 100)
    cb = np.clip(np.round(cb * 10) * 10, 0, 100 - sh)
    return {"CUT_SHALE_PCT": sh, "CUT_CARB_PCT": cb, "CUT_SAND_SILT_PCT": 100 - sh - cb, "LAG_M": lag}


def build_frames(well_id: str | None = None) -> FrameSet:
    well_id = well_id or facts()["well"]["id"]
    md = prof.grid()
    cols: dict[str, np.ndarray] = {"md_m": md, "tvd_m": md.copy()}
    provenance: dict[str, str] = {"tvd_m": P.ASSUMED}

    hw = hires_well(md, well_id)
    for c in CURVES:
        cols[f"curves.{c}"] = hw["curves"][c]
        provenance[f"curves.{c}"] = P.SYNTHETIC
    cols["trend.DT_NCT"], cols["trend.RDEP_NCT"] = hw["trend"]["DT_NCT"], hw["trend"]["RDEP_NCT"]
    provenance["trend.DT_NCT"] = provenance["trend.RDEP_NCT"] = P.DERIVED
    for k in TRUTH_COLS:
        cols[f"truth.{k}"] = hw["truth"][k]
        provenance[f"truth.{k}"] = P.SYNTHETIC

    mw = prof.mud_weight(md)
    rop = prof.rop(md)
    resid = prof.residual_cuttings(md)
    der = prof.derived(md, mw, rop, resid)
    for k, v in der.items():
        cols[f"derived.{k}"] = v
        provenance[f"derived.{k}"] = P.DERIVED
    cols["ghost.MW_UNCHANGED"] = prof.mud_weight(md, weighted=False)
    provenance["ghost.MW_UNCHANGED"] = P.SIMULATED

    for k, v in ops.drilling(md, rop, mw, der["ECD"], well_id).items():
        cols[f"drilling.{k}"] = v
        provenance[f"drilling.{k}"] = P.DERIVED if k == "DXC" else P.SIMULATED
    for k, v in ops.mudlog(md, well_id).items():
        cols[f"mudlog.{k}"] = v
        provenance[f"mudlog.{k}"] = P.SIMULATED
    for k, v in cuttings(md, rop, hw["truth"]).items():
        cols[f"mudlog.{k}"] = v
        provenance[f"mudlog.{k}"] = P.DERIVED if k == "LAG_M" else P.SIMULATED
    for k, v in ops.mud(md, mw).items():
        cols[f"mud.{k}"] = v
        provenance[f"mud.{k}"] = P.ASSUMED if k in ("PV",) else P.SIMULATED

    from app.ml import lithology
    if lithology.is_trained_model_loaded():
        cls, probs = lithology.predict_litho(cols)
        cols["ml.litho.class"] = cls
        provenance["ml.litho.class"] = P.MODEL_INFERENCE
        for c in LITHO_ORDER:
            cols[f"ml.litho.probs.{c}"] = probs[c]
            provenance[f"ml.litho.probs.{c}"] = P.MODEL_INFERENCE
    else:
        cls, probs = baseline.litho_probs(md)
        cols["ml.litho.class"] = cls
        provenance["ml.litho.class"] = P.SIMULATED
        for c in LITHO_ORDER:
            cols[f"ml.litho.probs.{c}"] = probs[c]
            provenance[f"ml.litho.probs.{c}"] = P.SIMULATED

    # Petrophysical multimineral continuous lithology inversion (SAFIR-03 inspired)
    vols = baseline.lithology_volumes(md, cols["curves.GR"], cols["curves.RHOB"], cols["curves.PHIE"])
    for vk, vv in vols.items():
        cols[f"vol.{vk}"] = vv
        provenance[f"vol.{vk}"] = P.MODEL_INFERENCE

    cols["ml.p_kick"] = baseline.p_kick_frames(md)
    cols["ml.p_loss"] = baseline.p_loss(der["ECD_FIT_MARGIN"])
    cols["ml.rop_max"] = baseline.rop_max(mw, resid)
    for k in ("ml.p_kick", "ml.p_loss", "ml.rop_max"):
        provenance[k] = P.MODEL_INFERENCE
    cols["t_rel_s"] = ops.scenario_clock_s(md, rop)
    provenance["t_rel_s"] = P.SIMULATED

    df = pd.DataFrame(cols)
    meta = {
        "well_id": well_id,
        "grid": {"top_m": float(md[0]), "base_m": float(md[-1]), "step_m": float(md[1] - md[0]), "n": len(md)},
        "lwd_source": hw["meta"],
        "curve_sources": {c: "synthetic" for c in CURVES},
        "ml_status": "baseline_heuristic",
        "connections_m": ops.connection_depths(md).tolist(),
        "provenance_footer": facts()["provenance_footer"],
    }
    return FrameSet(well_id=well_id, df=df, provenance={k: str(v) for k, v in provenance.items()}, meta=meta)


def _clean(v):
    if isinstance(v, (float, np.floating)):
        return None if not np.isfinite(v) else round(float(v), 4)
    if isinstance(v, np.integer):
        return int(v)
    return v


def to_columnar(fs: FrameSet, md_from: float | None = None, md_to: float | None = None, step: int = 1) -> dict:
    df = fs.df
    if md_from is not None:
        df = df[df["md_m"] >= md_from]
    if md_to is not None:
        df = df[df["md_m"] <= md_to]
    df = df.iloc[::max(step, 1)]
    return {
        "well_id": fs.well_id, "meta": fs.meta, "provenance": fs.provenance,
        "md_m": [_clean(x) for x in df["md_m"]],
        "columns": {c: [_clean(x) for x in df[c]] for c in df.columns if c != "md_m"},
    }


def frame_at(fs: FrameSet, md_m: float) -> dict:
    """Single DepthFrame matching data/contracts/depth_frame.schema.json."""
    i = int(np.argmin(np.abs(fs.df["md_m"].to_numpy() - md_m)))
    row = fs.df.iloc[i]
    frame: dict = {"well_id": fs.well_id, "md_m": _clean(row["md_m"]), "tvd_m": _clean(row["tvd_m"]),
                   "t_rel_s": _clean(row["t_rel_s"]), "curves": {}, "drilling": {}, "mudlog": {}, "mud": {},
                   "derived": {}, "ml": {"litho": {"class": row["ml.litho.class"], "probs": {}}}, "provenance": {}}
    for col, val in row.items():
        parts = col.split(".")
        if parts[0] in ("curves", "drilling", "mudlog", "mud", "derived") and len(parts) == 2:
            frame[parts[0]][parts[1]] = _clean(val)
        elif col.startswith("ml.litho.probs."):
            frame["ml"]["litho"]["probs"][parts[-1]] = _clean(val)
        elif col in ("ml.p_kick", "ml.p_loss", "ml.rop_max"):
            frame["ml"][parts[1]] = _clean(val)
    frame["provenance"] = {k: v for k, v in fs.provenance.items()
                           if k.split(".")[0] in ("curves", "drilling", "mudlog", "mud", "derived", "ml")}
    return frame
