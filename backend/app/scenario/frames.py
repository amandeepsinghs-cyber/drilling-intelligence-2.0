"""DepthFrame builder — joins the four stores into the serving view (SDD §5.4–§5.6).

Precedence for petrophysics (`curves.*`):
    PUBLIC  data/processed/lwd/<well>.parquet (+ .meta.json)  ← written by pipelines/ingest
    else SYNTHETIC stand-in (synthetic_lwd)
Everything else is scenario-driven: drilling/mudlog/mud = SIMULATED, derived = DERIVED,
ml = MODEL_INFERENCE (baseline) / SIMULATED (litho prior).

Output is a flat DataFrame with dotted columns ('curves.GR', 'derived.ECD', ...) plus a
provenance map {column: label}. `to_columnar()` / `frame_at()` produce API payloads.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from app.core.provenance import CURVES, Provenance as P
from app.ml import baseline
from app.scenario import profiles as prof
from app.scenario import simulated_ops as ops
from app.scenario.facts import data_dir, facts
from app.scenario.synthetic_lwd import lwd_meta, synthetic_lwd

LITHO_ORDER = baseline.CLASSES


def lwd_path(well_id: str) -> Path:
    return data_dir() / "processed" / "lwd" / f"{well_id.lower().replace('-', '_')}.parquet"


@dataclass
class FrameSet:
    well_id: str
    df: pd.DataFrame
    provenance: dict[str, str]
    meta: dict = field(default_factory=dict)


def _load_public_lwd(well_id: str, md: np.ndarray) -> tuple[pd.DataFrame | None, dict]:
    p = lwd_path(well_id)
    meta_p = p.with_suffix(".meta.json")
    if not p.exists():
        return None, {}
    df = pd.read_parquet(p)
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    if meta.get("provenance", "PUBLIC") != "PUBLIC":
        return None, {}          # only PUBLIC files take precedence; synthetic is rebuilt in-process
    df = df.set_index("md_m").reindex(md).reset_index()
    return df, meta


def build_overlays(md: np.ndarray, public: pd.DataFrame, synth: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """Scenario signatures the real log lacks → separate SIMULATED overlay fields (never edits PUBLIC)."""
    trig = facts()["triggers"]["T3_PRESSURE_RAMP"]
    need = trig["conditions"]["dt_above_nct_us_ft"]
    out: dict[str, np.ndarray] = {}
    if "DT" in public and public["DT"].notna().sum() > 20:
        u1 = next(u for u in facts()["stratigraphy"] if u["id"] == "U1")
        m = (md >= u1["top_m"]) & (md < u1["base_m"]) & public["DT"].notna().to_numpy()
        if m.sum() > 10:
            k, b = np.polyfit(md[m], public["DT"].to_numpy()[m], 1)
            i = int(np.argmin(np.abs(md - trig["md_m"])))
            excess = public["DT"].to_numpy()[i] - (k * md[i] + b)
            if not np.isfinite(excess) or excess < need:
                out["DT_SCN"] = synth["DT"]
    else:
        out["DT_SCN"] = synth["DT"]
    if "RDEP" not in public or public["RDEP"].notna().sum() <= 20:
        out["RDEP_SCN"] = synth["RDEP"]
    return out


def build_frames(well_id: str | None = None) -> FrameSet:
    well_id = well_id or facts()["well"]["id"]
    md = prof.grid()
    cols: dict[str, np.ndarray] = {"md_m": md, "tvd_m": md.copy()}
    provenance: dict[str, str] = {"tvd_m": P.ASSUMED}

    synth = synthetic_lwd(md, well_id)
    public, pub_meta = _load_public_lwd(well_id, md)
    curve_sources: dict[str, str] = {}
    for c in CURVES:
        if public is not None and c in public and public[c].notna().any():
            cols[f"curves.{c}"] = public[c].to_numpy(dtype=float)
            provenance[f"curves.{c}"] = P.PUBLIC
            curve_sources[c] = "public"
        else:
            cols[f"curves.{c}"] = synth[c]
            provenance[f"curves.{c}"] = P.SYNTHETIC
            curve_sources[c] = "synthetic"
    cols["trend.DT_NCT"], cols["trend.RDEP_NCT"] = synth["_DT_NCT"], synth["_RDEP_NCT"]
    provenance["trend.DT_NCT"] = provenance["trend.RDEP_NCT"] = P.DERIVED
    if public is not None:
        for k, v in build_overlays(md, public, synth).items():
            cols[f"overlays.{k}"] = v
            provenance[f"overlays.{k}"] = P.SIMULATED

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
    for k, v in ops.mud(md, mw).items():
        cols[f"mud.{k}"] = v
        provenance[f"mud.{k}"] = P.ASSUMED if k in ("PV",) else P.SIMULATED

    cls, probs = baseline.litho_probs(md)
    cols["ml.litho.class"] = cls
    provenance["ml.litho.class"] = P.SIMULATED
    for c in LITHO_ORDER:
        cols[f"ml.litho.probs.{c}"] = probs[c]
        provenance[f"ml.litho.probs.{c}"] = P.SIMULATED
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
        "lwd_source": pub_meta if public is not None else lwd_meta(),
        "curve_sources": curve_sources,
        "ml_status": "baseline_heuristic",
        "connections_m": ops.connection_depths(md).tolist(),
        "provenance_footer": _footer(pub_meta if public is not None else None, curve_sources),
    }
    return FrameSet(well_id=well_id, df=df, provenance={k: str(v) for k, v in provenance.items()}, meta=meta)


def _footer(pub_meta: dict | None, curve_sources: dict[str, str]) -> str:
    """Honesty line built from what is actually loaded (falls back to the YAML text when synthetic-only)."""
    if not pub_meta:
        return facts()["provenance_footer"]
    src, reg = pub_meta.get("source", {}), pub_meta.get("registration", {})
    pub = [c for c, s in curve_sources.items() if s == "public"]
    syn = [c for c, s in curve_sources.items() if s != "public"]
    shift = ""
    if reg.get("source_top_m") is not None:
        shift = (f", depth-registered {reg['source_top_m']:g}–{reg.get('source_base_m', 0):g} m → "
                 f"{reg['target_top_m']:g}–{reg['target_base_m']:g} m")
    name = src.get("name", pub_meta.get("dataset_id", "public dataset")).split(" (")[0]
    return (f"Real public LWD: {name} ({pub_meta.get('licence', '')}) — {'/'.join(pub)}{shift}. "
            f"{'/'.join(syn) + ' synthetic. ' if syn else ''}Scenario well is illustrative; drilling, mud-log, "
            f"chemistry, offset reports & SOPs are simulated. Plug-in to ONGC data = pilot scope.")


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
