"""SIMULATED drilling, mud-log and mud channels (SDD §5.4 stores db_drilling_mudlog / db_mud_chemistry).

These stay scenario-driven even after real LWD drops in: public LWD datasets do not carry the
rig-floor / mud-logging channels the narrative needs.
"""
from __future__ import annotations

import numpy as np

from app.physics.dxc import dxc
from app.scenario.facts import facts, profiles
from app.scenario.profiles import litho_classes, unit_ids
from app.scenario.synthetic_lwd import band_noise


def connection_depths(md: np.ndarray) -> np.ndarray:
    o = profiles()["ops"]
    k0 = np.ceil((md.min() - o["connection_anchor_m"]) / o["connection_every_m"])
    k1 = np.floor((md.max() - o["connection_anchor_m"]) / o["connection_every_m"])
    return np.round(o["connection_anchor_m"] + np.arange(k0, k1 + 1) * o["connection_every_m"], 3)


def drilling(md: np.ndarray, rop: np.ndarray, mw: np.ndarray, ecd: np.ndarray, well_id: str) -> dict[str, np.ndarray]:
    o = profiles()["ops"]
    lc = litho_classes(md)
    n = len(md)
    wob = np.array([o["wob_klb"][c] for c in lc], dtype=float) + 0.6 * band_noise(n, well_id, "WOB", 3)
    rpm = np.array([o["rpm"][c] for c in lc], dtype=float) + 1.0 * band_noise(n, well_id, "RPM", 3)
    tq = np.array([o["torque_kftlb"][c] for c in lc], dtype=float) + 0.8 * band_noise(n, well_id, "TQ", 2)
    mw0 = facts()["mud"]["initial"]["mw_ppg"]
    spp = o["spp_psi_at_initial_mw"] * (mw / mw0) + 12 * band_noise(n, well_id, "SPP", 3)
    hkld = o["hookload_klb_at_top"] + o["hookload_klb_per_m"] * (md - md.min()) - wob
    flow_in = np.full(n, float(facts()["drilling"]["flow_gpm"]))
    b0, b1 = profiles()["rop"]["break_interval_m"]
    delta = np.where((md >= b0) & (md <= b1), o["flow_out_break_delta_pct"] / 100.0, 0.0)
    flow_out = flow_in * (1.0 + delta + 0.0015 * band_noise(n, well_id, "FLOW_OUT", 2))
    dx = np.array([dxc(r, p, w, o["bit_size_in"], o["dxc_normal_mw_ppg"], e)
                   for r, p, w, e in zip(rop, rpm, wob, ecd)])
    return {"ROP": rop, "WOB": wob, "RPM": rpm, "TORQUE": tq, "SPP": spp, "HKLD": hkld,
            "FLOW_IN": flow_in, "FLOW_OUT": flow_out, "DXC": dx}


def mudlog(md: np.ndarray, well_id: str) -> dict[str, np.ndarray]:
    m = profiles()["mudlog"]
    bg = m["background_gas_pct"]
    f = facts()
    uid = unit_ids(md)
    alert = f["mud"]["weight_up_location_m"]
    u2 = next(u for u in f["stratigraphy"] if u["id"] == "U2")
    n = len(md)
    gas = np.full(n, float(bg["U1"]))
    ramp = (uid == "U2") & (md <= alert)
    gas[ramp] = bg["U1"] + (bg["U2_end"] - bg["U1"]) * (md[ramp] - u2["top_m"]) / (alert - u2["top_m"])
    gas[(uid == "U2") & (md > alert)] = bg["post_weightup"]
    gas[uid == "U3"] = bg["U3"]
    b0, b1 = profiles()["rop"]["break_interval_m"]
    gas[(md >= b0) & (md <= b1 + 1.0)] = bg["U3_break_peak"]
    gas[uid == "U4"] = bg["U4"]
    gas = np.maximum(gas * (1.0 + 0.08 * band_noise(n, well_id, "GAS", 2)), 0.02)

    conn = np.full(n, np.nan)
    overrides = {round(o["md_m"], 3): o["pct"] for o in m["conn_gas_pct_overrides"]}
    for c in connection_depths(md):
        i = int(np.argmin(np.abs(md - c)))
        conn[i] = overrides.get(round(float(c), 3), gas[i] + m["conn_gas_excess_pct"])
        if round(float(c), 3) in overrides:
            gas[i] = min(gas[i], overrides[round(float(c), 3)])
    comp, comp_u3 = m["composition"], m.get("composition_U3", m["composition"])
    out = {"GAS_TOTAL": gas, "CONN_GAS": conn}
    in_u3 = uid == "U3"
    for k, frac in comp.items():
        out[k] = gas * 10_000 * np.where(in_u3, comp_u3[k], frac)  # ppm
    # Gas Wetness Ratio Wh = (C2 + C3 + C4 + C5) / (C1 + C2 + C3 + C4 + C5) * 100
    heavy = out.get("C2", 0) + out.get("C3", 0) + out.get("C4", 0) + out.get("C5", 0)
    total_hc = out.get("C1", 0) + heavy
    out["GAS_WETNESS"] = np.where(total_hc > 0, (heavy / np.maximum(total_hc, 1e-4)) * 100.0, 0.0)
    return out


def mud(md: np.ndarray, mw: np.ndarray) -> dict[str, np.ndarray]:
    f, p = facts(), profiles()["mud"]
    weighted = md > f["mud"]["weight_up_location_m"]
    pv = np.where(weighted, p["pv_weighted_cp"], f["mud"]["pv_cp"]).astype(float)
    yp = np.where(weighted, p["yp_weighted_lb_100ft2"], f["mud"]["yp_lb_100ft2"]).astype(float)
    mw_out = mw - np.where(unit_ids(md) == "U3", p["mw_out_gascut_sand_ppg"], 0.0)
    pit = f["mud"]["active_system_bbl"] + np.where(weighted, f["barite"]["volume_gain_bbl"], 0.0)
    return {"MW_IN_PPG": mw, "MW_OUT_PPG": mw_out, "PV": pv, "YP": yp, "PIT_VOL_BBL": pit.astype(float)}


def scenario_clock_s(md: np.ndarray, rop: np.ndarray) -> np.ndarray:
    """Real (uncompressed) seconds since top of interval: drilling + connections + weight-up."""
    o, f = profiles()["ops"], facts()
    step = np.diff(md, prepend=md[0])
    t = np.cumsum(np.where(rop > 0, step / rop * 3600.0, 0.0))
    for c in connection_depths(md):
        t[md > c] += o["connection_minutes"] * 60
    t[md > f["mud"]["weight_up_location_m"]] += f["mud"]["weight_up_duration_h"] * 3600
    return t
