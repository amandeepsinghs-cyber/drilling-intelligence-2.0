"""High-resolution SYNTHETIC well model for MN-SM-DW-01 (O6) — forward petrophysics, no real log.

Pipeline (every step deterministic, seeded from well_id + profiles.seed_salt):
  1. Geology truth on the profiles.yaml grid: shale fraction (Vsh), calcite, total porosity per unit;
     U2 carbonate stringers (profiles.ml_baseline.stringers_m); U3 sand/shale interbeds (NTG ≈ YAML).
  2. Pressure coupling: PP from profiles.pore_pressure; disequilibrium compaction adds shale porosity
     ∝ (PP − Pn); sonic follows Eaton (n = 3) inverted from the same PP.
  3. Fluids: Archie virgin zone (Rw, a, m, n, Sw from mn_sm_dw_01.yaml reservoir); SOBM flushed zone
     (non-conductive base-oil filtrate displaces only movable fluid; residual gas stays).
  4. Tool physics: volumetric density/neutron/PEF mixing, Wyllie matrix sonic, radial resistivity
     mixing (shallow/medium/deep pseudo-geometric factors), caliper washouts → density correction.
  5. Tool response: Gaussian vertical-resolution filter per curve, then band-limited noise.

DT decision (documented in docs/data/column_contract.md): the story requires DT − NCT = the T3 departure
(triggers.T3_PRESSURE_RAMP) at the alert depth, but Eaton n = 3 at that PP gives only ~+1.3. The remainder is a U2 gas /
transition term (gas-charged shale slows Vp strongly at low Sg) calibrated so the logged DT at the
trigger equals the warning-point checkpoint. NCT is anchored at (checkpoint DT − T3 departure).
SP is NOT generated: it cannot be recorded in SOBM (non-conductive mud).
"""
from __future__ import annotations

import numpy as np

from app.physics.overburden import obg_ppg
from app.scenario.facts import facts, profiles
from app.scenario.profiles import pore_pressure, unit_ids
from app.scenario.synthetic_lwd import _rng, band_noise, smooth, stringer_mask

LITHO_TRUTH = ("SHALE", "SILTSTONE", "SAND", "LIMESTONE")


def _H() -> dict:
    return profiles()["hires"]


def _unit(uid: str) -> dict:
    return next(u for u in facts()["stratigraphy"] if u["id"] == uid)


def _checkpoint(label: str) -> dict:
    return next(c for c in facts()["checkpoints"] if c["label"] == label)


def _tool(a: np.ndarray, res_m: float, step: float) -> np.ndarray:
    """Gaussian vertical response with FWHM = tool resolution."""
    s = res_m / 2.355 / step
    return smooth(a, s) if s >= 0.3 else a.copy()


def dt_nct(md: np.ndarray) -> np.ndarray:
    """Normal compaction trend, anchored so NCT(T3 depth) = warning-point DT − T3 departure (YAML)."""
    trig = facts()["triggers"]["T3_PRESSURE_RAMP"]
    anchor = _checkpoint("Warning point")["dt_us_ft"] - trig["conditions"]["dt_above_nct_us_ft"]
    return anchor + _H()["dt_nct_per_m"] * (md - trig["md_m"])


def rdep_nct(md: np.ndarray) -> np.ndarray:
    r = _H()["rdep_nct"]
    return r["top_ohmm"] + r["per_m"] * (md - r["top_m"])


def _u3_beds(well_id: str) -> list[tuple[float, float, bool]]:
    """Alternating sand / shale-interbed sequence through U3 (sand first, ≥ first_sand_min_m)."""
    p = _H()["units"]["U3"]
    u3 = _unit("U3")
    rng = _rng(well_id, "U3_BEDS")
    z, sand, first, beds = float(u3["top_m"]), True, True, []
    while z < u3["base_m"]:
        if sand:
            th = (p["first_sand_min_m"] if first else 1.0) + rng.exponential(p["sand_bed_mean_m"] - 1.0)
        else:
            th = p["interbed_min_m"] + rng.exponential(p["interbed_mean_m"] - p["interbed_min_m"])
        th = round(th * 8) / 8                                 # snap to the 0.125 m grid
        beds.append((z, min(z + th, float(u3["base_m"])), sand))
        z, sand, first = z + th, not sand, False
    return beds


def _washout(md: np.ndarray, base_in: np.ndarray) -> np.ndarray:
    cal = base_in.copy()
    for top, th, mx in _H()["caliper"]["washouts_m"]:
        m = (md >= top) & (md <= top + th)
        cal[m] = np.maximum(cal[m], base_in[m] + (mx - base_in[m]) * np.sin(np.pi * (md[m] - top) / th))
    return cal


def hires_well(md: np.ndarray, well_id: str) -> dict:
    """Return {'curves': {...}, 'truth': {...}, 'trend': {...}, 'meta': {...}} on the given grid."""
    H, F = _H(), facts()
    res = F["reservoir"]
    n, step = len(md), float(md[1] - md[0])
    uid = unit_ids(md)
    corr = H["noise_corr_m"] / step
    noise = lambda key, sig=corr: band_noise(n, well_id, f"HR|{key}", sig)  # noqa: E731
    slow = lambda key: band_noise(n, well_id, f"HR|{key}", 1.0 / step)     # ~1 m heterogeneity  # noqa: E731

    # ── 1. geology truth ────────────────────────────────────────────────────
    U = H["units"]
    vsh, calc, phit = np.zeros(n), np.zeros(n), np.zeros(n)
    litho = np.empty(n, dtype=object)
    perm = np.zeros(n, dtype=bool)                             # permeable (invadable) sand beds
    pp = pore_pressure(md)
    pn = F["pressure"]["pp_shale_normal_ppg"]
    sn = H["shale_phit_n"]
    phin = np.interp(md, [md[0], md[-1]], [sn["top"], sn["base"]])
    dphi = H["undercompaction_phit_per_ppg"] * np.maximum(pp - pn, 0.0)

    m1 = uid == "U1"
    vsh[m1] = U["U1"]["vsh"] + U["U1"]["vsh_sd"] * slow("U1_VSH")[m1]
    calc[m1], phit[m1], litho[m1] = U["U1"]["calc"], phin[m1], "SHALE"

    m2 = uid == "U2"
    u2 = _unit("U2")
    p2 = U["U2"]
    vsh[m2] = np.interp(md[m2], [u2["top_m"], (u2["top_m"] + u2["base_m"]) / 2, u2["base_m"]],
                        [p2["vsh_top"], p2["vsh_mid"], p2["vsh_base"]]) + p2["vsh_sd"] * slow("U2_VSH")[m2]
    calc[m2], phit[m2], litho[m2] = p2["calc"], p2["phit"] + dphi[m2], "SILTSTONE"

    m3 = uid == "U3"
    p3 = U["U3"]
    beds = _u3_beds(well_id)
    sand = np.zeros(n, dtype=bool)
    for top, bot, is_sand in beds:
        if is_sand:
            sand |= (md >= top) & (md < bot)
    sand &= m3
    inter = m3 & ~sand
    vsh[sand] = p3["vsh_sand"] + p3["vsh_sand_sd"] * slow("U3_VSH")[sand]
    calc[sand] = p3["calc_sand"]
    phie_t = res["phie_pct"] / 100 - 0.4 * (vsh[sand] - p3["vsh_sand"]) + 0.008 * slow("U3_PHI")[sand]
    f_cl = H["cbw_per_clay"] * H["shale_clay_fraction"] * vsh[sand]
    phit[sand] = (phie_t + f_cl) / (1 + f_cl)                  # solve PHIE = PHIT − CBW for PHIT
    litho[sand], perm[sand] = "SAND", True
    vsh[inter], calc[inter], phit[inter], litho[inter] = p3["vsh_interbed"], 0.02, phin[inter] + dphi[inter], "SHALE"

    m4 = uid == "U4"
    vsh[m4] = U["U4"]["vsh"] + U["U4"]["vsh_sd"] * slow("U4_VSH")[m4]
    calc[m4], phit[m4], litho[m4] = U["U4"]["calc"], U["U4"]["phit"], "LIMESTONE"

    strg = stringer_mask(md) & m2
    st = H["stringer"]
    vsh[strg], calc[strg], phit[strg], litho[strg] = st["vsh"], st["calc"], st["phit"], "LIMESTONE"

    vsh = np.clip(vsh, 0.02, 0.95)
    calc = np.minimum(calc, 1.0 - vsh)
    solids = 1.0 - phit
    fcl = H["shale_clay_fraction"]
    vcl = solids * fcl * vsh
    vqz = solids * (1.0 - vsh - calc + (1.0 - fcl) * vsh)
    vca = solids * calc
    cbw = np.minimum(H["cbw_per_clay"] * vcl, phit)
    phie = phit - cbw

    # ── 2/3. fluids ─────────────────────────────────────────────────────────
    gwc, tr = res["gwc_m"], H["gwc_transition_m"]
    sw_g, sw_w = res["sw_gas_leg"], res["sw_water_leg"]
    sw = np.ones(n)
    sw[perm] = sw_g + (sw_w - sw_g) * np.clip((md[perm] - (gwc - tr)) / tr, 0.0, 1.0)
    fz = H["flushed_zone"]
    t_wl = np.clip((sw - sw_g) / (sw_w - sw_g), 0.0, 1.0)
    gas_xo = np.where(perm, np.minimum(1.0 - sw, fz["residual_gas_sat"]), 0.0)
    sxo_w = np.where(perm, sw - fz["filtrate_sat_water_leg"] * t_wl, sw)
    filt = np.where(perm, np.clip(1.0 - sxo_w - gas_xo, 0.0, 1.0), 0.0)

    mn, fl = H["minerals"], H["fluids"]
    br, fo, gs = fl["brine"], fl["filtrate"], fl["gas"]
    vol = {"quartz": vqz, "clay": vcl, "calcite": vca}
    rho_fl = sxo_w * br["rho"] + filt * fo["rho"] + gas_xo * gs["rho"]
    hi_fl = sxo_w * br["hi"] + filt * fo["hi"] + gas_xo * gs["hi"]
    rhob_t = sum(v * mn[k]["rho"] for k, v in vol.items()) + cbw * br["rho"] + phie * rho_fl
    nphi_t = sum(v * mn[k]["nphi"] for k, v in vol.items()) + cbw * br["hi"] + phie * hi_fl
    mass = [(v * mn[k]["rho"], mn[k]["pef"]) for k, v in vol.items()] + [
        (cbw * br["rho"], br["pef"]), (phie * sxo_w * br["rho"], br["pef"]),
        (phie * filt * fo["rho"], fo["pef"]), (phie * gas_xo * gs["rho"], gs["pef"])]
    pef_t = sum(m * p for m, p in mass) / sum(m for m, _ in mass)

    # lithology weight: 1 = behaves as shale (Eaton/NCT sonic, shale resistivity), 0 = matrix physics
    lb = H["lithology_blend"]
    w = np.clip((vsh - lb["vsh_clean"]) / (lb["vsh_shaly"] - lb["vsh_clean"]), 0.0, 1.0)

    w_ = F["well"]
    obg = np.array([obg_ppg(x, w_["water_depth_m"], w_["air_gap_m"],
                            F["pressure"]["sediment_bulk_density_avg_gcc"]) for x in md])
    nct = dt_nct(md)
    dt_sh = nct * ((obg - pn) / np.maximum(obg - pp, 1e-3)) ** (1.0 / H["eaton"]["dt_exponent"])
    dt_ma = sum(v * mn[k]["dt"] for k, v in vol.items()) + phit * br["dt"]
    dt_ma = dt_ma + np.where(perm, H["gas_dt_effect_us_ft"] * (1.0 - sw) / (1.0 - sw_g), 0.0)
    dt_nofizz = w * dt_sh + (1.0 - w) * dt_ma
    fizz_shape = np.where(m2, 1.0 - np.exp(-(md - u2["top_m"]) / H["transition_gas_decay_m"]), 0.0) * w

    rw, ar = res["rw_ohmm"], res["archie"]
    rnct = rdep_nct(md)
    r_sh = rnct * (phin / (phin + dphi)) ** 2
    m_arch = np.where(m4 | strg, U["U4"]["archie_m"], ar["m"])

    def archie(s):
        return ar["a"] * rw / (np.maximum(phie, 0.01) ** m_arch * np.maximum(s, 0.02) ** ar["n"])

    def mix(r_ma):
        return 1.0 / (w / r_sh + (1.0 - w) / np.minimum(r_ma, 2000.0))

    rt, rxo = mix(archie(sw)), mix(archie(sxo_w))
    J = H["radial_j"]
    radial = {k: 1.0 / (J[j] / rxo + (1.0 - J[j]) / rt) for k, j in (("RSHAL", "shallow"), ("RMED", "medium"), ("RDEP", "deep"))}

    cp = H["caliper"]
    cal_base = np.select([m1, m2 & ~strg, sand, inter, m4, strg],
                         [cp["shale_in"], cp["u2_in"], cp["sand_in"], cp["shale_in"], cp["lime_in"], cp["bit_in"]],
                         default=cp["bit_in"]).astype(float)
    cali_t = _washout(md, cal_base)
    rhob_t = rhob_t + H["washout_rhob_per_in"] * np.maximum(cali_t - cp["u2_in"], 0.0)

    gr_c = H["gr"]
    gr_t = gr_c["clean_api"] + gr_c["per_vsh_api"] * vsh

    # ── 4/5. tool response + noise ──────────────────────────────────────────
    R, N = H["tool_resolution_m"], H["noise"]
    out: dict[str, np.ndarray] = {}
    gr = _tool(gr_t, R["GR"], step)
    out["GR"] = gr * (1.0 + N["GR_rel"] * noise("GR"))
    out["GR_UP"] = np.maximum(out["GR"] + gr_c["azimuthal_sd_api"] * noise("GR_UP"), 5.0)
    out["GR_DN"] = np.maximum(out["GR"] + gr_c["azimuthal_sd_api"] * noise("GR_DN"), 5.0)
    out["RHOB"] = _tool(rhob_t, R["RHOB"], step) + N["RHOB"] * noise("RHOB")
    out["NPHI"] = _tool(nphi_t, R["NPHI"], step) + N["NPHI"] * noise("NPHI")
    out["PEF"] = _tool(pef_t, R["PEF"], step) + N["PEF"] * noise("PEF")
    out["CALI"] = _tool(cali_t, R["CALI"], step) + N["CALI"] * noise("CALI")
    for k, r in radial.items():
        out[k] = 10 ** (_tool(np.log10(r), R[k], step) + N["R_log10"] * noise(k))

    # DT with the calibrated transition term (linear ⇒ exact calibration at the trigger sample)
    trig = F["triggers"]["T3_PRESSURE_RAMP"]
    i = int(np.argmin(np.abs(md - trig["md_m"])))
    dt0 = _tool(dt_nofizz, R["DT"], step) + N["DT"] * noise("DT")
    fz_m = _tool(fizz_shape, R["DT"], step)
    target = _checkpoint("Warning point")["dt_us_ft"]
    amp = float((target - dt0[i]) / fz_m[i])
    if not 0.0 < amp < 20.0:
        raise ValueError(f"DT transition term out of physical range: {amp:.2f} us/ft")
    out["DT"] = dt0 + amp * fz_m

    vpvs_ma = np.where(calc > 0.5, H["vpvs"]["limestone"],
                       H["vpvs"]["gas_sand"] + (H["vpvs"]["water_sand"] - H["vpvs"]["gas_sand"]) * t_wl)
    vpvs = w * H["vpvs"]["shale"] + (1.0 - w) * vpvs_ma
    out["VPVS"] = _tool(vpvs, R["DT"], step) + 0.01 * noise("VPVS")
    out["DTSM"] = out["DT"] * out["VPVS"]

    out["PHIE"] = np.clip(_tool(phie, R["RHOB"], step) + N["PHIE"] * noise("PHIE"), 0.0, 0.40)
    m_int = _tool(m_arch.astype(float), R["RDEP"], step)
    out["SW"] = np.clip((ar["a"] * rw / (np.maximum(out["PHIE"], 0.01) ** m_int * out["RDEP"])) ** (1 / ar["n"]), 0.05, 1.0)

    net = [b for b in beds if b[2]]
    u3 = _unit("U3")
    ntg = sum(b[1] - b[0] for b in net) / (u3["base_m"] - u3["top_m"])
    gas_net = sand & (md < gwc)
    meta = {
        "source": "synthetic_hires", "provenance": "SYNTHETIC", "step_m": step, "n": n,
        "model": "Archie + SOBM flushed zone + volumetric D/N/PEF + Wyllie/Eaton sonic + radial R mixing",
        "rw_ohmm": rw, "u3_beds": len(beds), "u3_ntg": round(ntg, 3),
        "u3_gas_leg_phie_mean": round(float(phie[gas_net].mean()), 4),
        "dt_decomposition_at_trigger": {
            "md_m": float(md[i]), "nct_us_ft": round(float(nct[i]), 2),
            "eaton_us_ft": round(float(dt_sh[i] - nct[i]), 2),
            "transition_gas_us_ft": round(float(amp * fz_m[i]), 2),
            "noise_us_ft": round(float(dt0[i] - _tool(dt_nofizz, R["DT"], step)[i]), 2),
            "logged_us_ft": round(float(out["DT"][i]), 2)},
        "sp": "not generated — SP cannot be recorded in non-conductive SOBM",
        "seed": {"well_id": well_id, "salt": profiles()["seed_salt"]},
    }
    truth = {"VSH": vsh, "VCL": vcl, "VQTZ": vqz, "VCALC": vca, "PHIT": phit, "PHIE": phie,
             "SW": sw, "SXO_W": sxo_w, "RT": rt, "RXO": rxo, "LITHO": litho}
    trend = {"DT_NCT": nct, "RDEP_NCT": rnct}
    return {"curves": out, "truth": truth, "trend": trend, "meta": meta}
