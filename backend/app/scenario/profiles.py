"""Scenario-driven depth profiles (SDD §6/§7): pressure, mud weight, ROP, ECD.

These are *scenario* channels — they stay scenario-driven even after real LWD curves drop in.
Checkpoint values come from mn_sm_dw_01.yaml; shapes between checkpoints from profiles.yaml.
All functions are vectorised over an MD grid (numpy arrays, metres; MD ≈ TVD in this interval).
"""
from __future__ import annotations

import numpy as np

from app.physics.ecd import ecd_calibrated
from app.physics.overburden import obg_ppg
from app.physics.units import overbalance_psi
from app.scenario.facts import facts, profiles


def grid() -> np.ndarray:
    g = profiles()["grid"]
    n = int(round((g["base_m"] - g["top_m"]) / g["step_m"])) + 1
    return np.round(g["top_m"] + np.arange(n) * g["step_m"], 3)


def unit_ids(md: np.ndarray) -> np.ndarray:
    out = np.empty(md.shape, dtype=object)
    units = facts()["stratigraphy"]
    for u in units:
        out[(md >= u["top_m"]) & (md < u["base_m"])] = u["id"]
    out[md >= units[-1]["base_m"]] = units[-1]["id"]
    out[md < units[0]["top_m"]] = units[0]["id"]
    return out


def litho_classes(md: np.ndarray) -> np.ndarray:
    by_id = {u["id"]: u["litho_class"] for u in facts()["stratigraphy"]}
    return np.array([by_id[u] for u in unit_ids(md)], dtype=object)


def _unit(uid: str) -> dict:
    return next(u for u in facts()["stratigraphy"] if u["id"] == uid)


def pore_pressure(md: np.ndarray) -> np.ndarray:
    f, p = facts()["pressure"], profiles()["pressure"]
    pn, ptop = f["pp_shale_normal_ppg"], f["pp_sand_top_ppg"]
    r0, top = f["pp_ramp_start_m"], f["sand_top_m"]
    u3 = _unit("U3")
    base, td = u3["base_m"], profiles()["grid"]["base_m"]
    pp = np.full(md.shape, pn, dtype=float)
    ramp = (md >= r0) & (md < top)
    t = (md[ramp] - r0) / (top - r0)
    pp[ramp] = pn + (ptop - pn) * t ** p["pp_ramp_exponent"]
    sand = (md >= top) & (md < base)
    pp[sand] = ptop + (p["pp_sand_base_ppg"] - ptop) * (md[sand] - top) / (base - top)
    deep = md >= base
    pp[deep] = p["pp_sand_base_ppg"] + (p["pp_td_ppg"] - p["pp_sand_base_ppg"]) * (md[deep] - base) / (td - base)
    return pp


def pore_pressure_at(md_m: float) -> float:
    return float(pore_pressure(np.array([md_m]))[0])


def mud_weight(md: np.ndarray, weighted: bool = True) -> np.ndarray:
    """As-drilled MW. `weighted=False` gives the 'if unchanged' ghost path (no MOC)."""
    m = facts()["mud"]
    mw = np.full(md.shape, m["initial"]["mw_ppg"], dtype=float)
    if weighted:
        mw[md > m["weight_up_location_m"]] = m["weighted"]["mw_ppg"]
    return mw


def rop(md: np.ndarray) -> np.ndarray:
    d, r = facts()["drilling"], profiles()["rop"]
    ref_md = next(c["md_m"] for c in facts()["checkpoints"] if c["label"] == "Before")
    out = d["rop_initial_m_hr"] * (1.0 - r["compaction_per_m"] * (md - ref_md))
    rise0, alert = r["transition_rise_from_m"], facts()["mud"]["weight_up_location_m"]
    rise = (md >= rise0) & (md <= alert)
    base_at_rise = d["rop_initial_m_hr"] * (1.0 - r["compaction_per_m"] * (rise0 - ref_md))
    out[rise] = base_at_rise + (r["transition_peak_m_hr"] - base_at_rise) * (md[rise] - rise0) / (alert - rise0)
    controlled = md >= r["controlled_from_m"]
    out[controlled] = d["rop_cap_m_hr"]
    b0, b1 = r["break_interval_m"]
    out[(md >= b0) & (md <= b1)] = d["rop_drilling_break_m_hr"]
    out[md >= _unit("U4")["top_m"]] = r["limestone_m_hr"]
    return out


def residual_cuttings(md: np.ndarray) -> np.ndarray:
    """Cuttings-bed residual after the drilling break (brief §3C 'after ROP cap' = +0.02 ppg)."""
    b1 = profiles()["rop"]["break_interval_m"][1]
    until = profiles()["rop"]["residual_cuttings_until_m"]
    resid_ppg = round(checkpoint_ecd("After ROP cap") - ecd_calibrated(
        facts()["mud"]["weighted"]["mw_ppg"], facts()["drilling"]["rop_cap_m_hr"]), 4)
    return np.where((md > b1) & (md < until), resid_ppg, 0.0)


def checkpoint_ecd(label: str) -> float:
    return next(c["ecd_ppg"] for c in facts()["checkpoints"] if c["label"] == label)


def derived(md: np.ndarray, mw: np.ndarray, rop_arr: np.ndarray, resid: np.ndarray) -> dict[str, np.ndarray]:
    w = facts()["well"]
    fit = facts()["casing"]["last_shoe"]["fit_ppg"]
    obg = np.array([obg_ppg(x, w["water_depth_m"], w["air_gap_m"],
                            facts()["pressure"]["sediment_bulk_density_avg_gcc"]) for x in md])
    pp = pore_pressure(md)
    ki = profiles()["pressure"]["fg_ki"]
    fg = ki * (obg - pp) + pp
    ecd = np.array([ecd_calibrated(a, b, c) for a, b, c in zip(mw, rop_arr, resid)])
    ob = np.array([overbalance_psi(a, b, x) for a, b, x in zip(mw, pp, md)])
    return {"OBG": obg, "PP": pp, "FG": fg, "FIT": np.full(md.shape, fit), "ECD": ecd,
            "OVERBAL_PSI": ob, "ECD_FIT_MARGIN": fit - ecd}
