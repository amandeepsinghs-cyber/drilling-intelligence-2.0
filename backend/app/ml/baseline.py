"""Baseline (heuristic) model outputs until Phase 6 trained models land (SDD §8).

Labelled MODEL_INFERENCE in frames, with `ml_status=baseline_heuristic` in meta so the Audit
drawer can say exactly what produced each number.
- p_kick (30 m look-ahead): anchored to brief §3C checkpoints; what-if uses a physics-informed
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
    look = profiles()["ml_baseline"]["p_kick_logistic"]["lookahead_m"]
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
