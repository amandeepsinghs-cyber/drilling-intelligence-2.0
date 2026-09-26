"""Baseline (heuristic) model outputs until Phase 6 trained models land (SDD §8).

Labelled MODEL_INFERENCE in frames, with `ml_status=baseline_heuristic` in meta so the Audit
drawer can say exactly what produced each number.
- p_kick (ml.kick_horizon_m look-ahead): anchored to brief §3C checkpoints; what-if uses a physics-informed
  logistic on forecast underbalance, applied as a *delta* from the frame so KPIs stay consistent.
- p_loss: logistic on ECD–FIT margin.
- rop_max: highest ROP that keeps ECD–FIT margin ≥ target (SOP-04 ROP cap).
- litho: stratigraphy prior + stringers (SIMULATED until the FORCE-trained classifier replaces it).
"""
from __future__ import annotations

import math

import numpy as np

from app.physics.ecd import A0, A_SLOPE, B_ROP, MW_REF
from app.scenario.facts import facts, profiles
from app.scenario.profiles import litho_classes, pore_pressure
from app.scenario.synthetic_lwd import smooth, stringer_mask

CLASSES = ("SHALE", "SILTSTONE", "SAND", "LIMESTONE", "DOLOMITE")


def p_kick_frames(md: np.ndarray) -> np.ndarray:
    a = np.array(profiles()["ml_baseline"]["p_kick_anchors"], dtype=float)
    return np.interp(md, a[:, 0], a[:, 1])


def forecast_underbalance(md_m: float, mw_ppg: float) -> float:
    look = facts()["ml"]["kick_horizon_m"]
    ahead = np.linspace(md_m, md_m + look, 61)
    return float(np.max(pore_pressure(ahead)) - mw_ppg)


def p_kick_logistic(md_m: float, mw_ppg: float) -> float:
    c = profiles()["ml_baseline"]["p_kick_logistic"]
    ub = forecast_underbalance(md_m, mw_ppg)
    return c["floor"] + c["span"] / (1.0 + math.exp(-(ub - c["u0_ppg"]) / c["scale_ppg"]))


def p_kick_whatif(md_m: float, mw_frame: float, mw_new: float) -> float:
    base = float(p_kick_frames(np.array([md_m]))[0])
    val = base + p_kick_logistic(md_m, mw_new) - p_kick_logistic(md_m, mw_frame)
    return float(min(max(val, 0.0), 0.99))


def p_loss(margin_ppg: np.ndarray | float) -> np.ndarray | float:
    c = profiles()["ml_baseline"]["p_loss_logistic"]
    return c["floor"] + c["span"] / (1.0 + np.exp((np.asarray(margin_ppg) - c["m0_ppg"]) / c["scale_ppg"]))


def rop_max(mw_ppg: np.ndarray | float, resid_ppg: np.ndarray | float) -> np.ndarray | float:
    ml = profiles()["ml_baseline"]
    fit = facts()["casing"]["last_shoe"]["fit_ppg"]
    head = fit - ml["ecd_margin_target_ppg"] - np.asarray(mw_ppg) - (A0 + A_SLOPE * (np.asarray(mw_ppg) - MW_REF)) \
        - np.asarray(resid_ppg)
    return np.clip(head / B_ROP, 0.0, ml["rop_max_clip_m_hr"])


def litho_probs(md: np.ndarray) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    lc = litho_classes(md)
    strg = stringer_mask(md) & (lc == "SILTSTONE")
    onehot = {c: (lc == c).astype(float) for c in CLASSES}
    onehot["SILTSTONE"][strg] = 0.0
    onehot["LIMESTONE"][strg] = 0.7
    onehot["DOLOMITE"][strg] = 0.3
    soft = {c: smooth(v, 2.0) * 0.9 + 0.1 / len(CLASSES) for c, v in onehot.items()}
    total = sum(soft.values())
    probs = {c: v / total for c, v in soft.items()}
    stacked = np.vstack([probs[c] for c in CLASSES])
    cls = np.array(CLASSES, dtype=object)[np.argmax(stacked, axis=0)]
    return cls, probs


def lithology_volumes(
    md: np.ndarray,
    gr: np.ndarray,
    rhob: np.ndarray,
    phie: np.ndarray | None = None,
) -> dict[str, np.ndarray]:
    """Continuous 4-component multimineral petrophysical inversion (SAFIR-03 inspired).

    Partitions total formation rock volume into:
      1. V_shale (VWCL): Clay / shale volume via Larionov tertiary shale model from GR
      2. V_sand (VSand): Quartz matrix fraction
      3. V_lime (VLime): Carbonate matrix fraction (active in U2 stringers & U4 limestone)
      4. V_por (PHIE): Effective pore volume (fluid-filled porosity)

    Guarantees:
      V_shale + V_sand + V_lime + V_por = 1.0 (100%) exactly at every depth frame.
    """
    import pandas as pd
    n = len(md)

    # Clean any border NaNs from public logging stretch
    gr_clean_arr = pd.Series(gr).bfill().ffill().fillna(100.0).to_numpy(dtype=float)
    rhob_clean_arr = pd.Series(rhob).bfill().ffill().fillna(2.45).to_numpy(dtype=float)

    # 1. Effective porosity
    if phie is not None and len(phie) == n:
        por = np.clip(pd.Series(phie).bfill().ffill().fillna(0.15).to_numpy(dtype=float), 0.02, 0.35)
    else:
        por = np.clip((2.65 - rhob_clean_arr) / (2.65 - 1.05), 0.02, 0.35)

    # 2. Shale volume (Larionov equation for Tertiary young rocks)
    # GR clean sand ~ 30 API, shale baseline ~ 115 API
    gr_clean, gr_shale = 30.0, 115.0
    igr = np.clip((gr_clean_arr - gr_clean) / (gr_shale - gr_clean), 0.0, 1.0)
    v_shale_raw = 0.083 * (np.power(2.0, 3.7 * igr) - 1.0)
    v_shale = np.clip(v_shale_raw, 0.04, 0.90)

    # 3. Limestone fraction: triggered in U4 carbonate zone (MD >= 4290 m) and U2 stringers
    strg = stringer_mask(md)
    u4_mask = md >= 4290.0
    v_lime_target = np.zeros(n, dtype=float)
    v_lime_target[strg] = 0.45
    v_lime_target[u4_mask] = 0.65
    v_lime = smooth(v_lime_target, 2.5)

    # In U4, adjust shale & sand
    v_shale = np.where(u4_mask, np.clip(v_shale * 0.4, 0.05, 0.35), v_shale)

    # 4. Sandstone fraction fills remaining matrix
    mat_avail = np.maximum(0.0, 1.0 - por)
    v_shale = np.minimum(v_shale, mat_avail * 0.92)
    v_lime = np.minimum(v_lime, np.maximum(0.0, mat_avail - v_shale))
    v_sand = np.maximum(0.0, mat_avail - v_shale - v_lime)

    # 5. Normalization: ensure exact 1.0 sum
    tot = v_shale + v_sand + v_lime + por
    tot = np.where(tot > 0, tot, 1.0)

    shale_frac = v_shale / tot
    sand_frac = v_sand / tot
    lime_frac = v_lime / tot
    por_frac = por / tot

    # Cumulative boundaries for 0–1.0 stacked area rendering
    cum_shale = shale_frac
    cum_sand = cum_shale + sand_frac
    cum_lime = cum_sand + lime_frac
    cum_total = cum_lime + por_frac  # exactly 1.0

    return {
        "SHALE": shale_frac,
        "SAND": sand_frac,
        "LIME": lime_frac,
        "PHIE": por_frac,
        "cum_shale": cum_shale,
        "cum_sand": cum_sand,
        "cum_lime": cum_lime,
        "cum_total": cum_total,
    }

