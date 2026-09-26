"""SYNTHETIC stand-in petrophysics (SDD §5.6). Used ONLY when no PUBLIC log is registered.

Deterministic: band-limited noise seeded from (well_id, curve, seed_salt). Shapes follow the
YAML stratigraphy (U1 seal → U2 overpressured transition with carbonate stringers → U3 gas
sand → U4 limestone), so the T3 signatures (DT off-trend, Rdeep below trend) exist before
real data arrives.
"""
from __future__ import annotations

import zlib

import numpy as np

from app.scenario.facts import facts, profiles
from app.scenario.profiles import litho_classes, unit_ids


def _rng(well_id: str, key: str) -> np.random.Generator:
    salt = profiles()["seed_salt"]
    return np.random.default_rng(zlib.crc32(f"{well_id}|{key}|{salt}".encode()))


def _gauss_kernel(sigma: float) -> np.ndarray:
    r = max(int(4 * sigma), 1)
    x = np.arange(-r, r + 1)
    k = np.exp(-0.5 * (x / sigma) ** 2)
    return k / k.sum()


def smooth(a: np.ndarray, sigma: float) -> np.ndarray:
    k = _gauss_kernel(sigma)
    pad = len(k) // 2
    return np.convolve(np.pad(a, pad, mode="edge"), k, mode="valid")


def band_noise(n: int, well_id: str, key: str, sigma_samples: float) -> np.ndarray:
    """Unit-variance, band-limited Gaussian noise."""
    w = _rng(well_id, key).standard_normal(n + 64)
    s = smooth(w, sigma_samples)[32:32 + n]
    return s / (s.std() or 1.0)


def stringer_mask(md: np.ndarray) -> np.ndarray:
    ml = profiles()["ml_baseline"]
    half = ml["stringer_thickness_m"] / 2
    m = np.zeros(md.shape, dtype=bool)
    for s in ml["stringers_m"]:
        m |= (md >= s - half) & (md <= s + half)
    return m


def _interp_anchors(md: np.ndarray, anchors: list[list[float]]) -> np.ndarray:
    a = np.array(anchors, dtype=float)
    return np.interp(md, a[:, 0], a[:, 1])


def synthetic_lwd(md: np.ndarray, well_id: str) -> dict[str, np.ndarray]:
    L = profiles()["lwd"]
    uid = unit_ids(md)
    n = len(md)
    nsig = L["noise_sigma_samples"]
    dt_nct = L["dt_nct"]["top_us_ft"] + L["dt_nct"]["per_m"] * (md - L["dt_nct"]["top_m"])
    rd_nct = L["rdep_nct"]["top_ohmm"] + L["rdep_nct"]["per_m"] * (md - L["rdep_nct"]["top_m"])
    u2 = uid == "U2"
    strg = stringer_mask(md) & u2

    mean: dict[str, np.ndarray] = {c: np.zeros(n) for c in ("GR", "RDEP", "RHOB", "NPHI", "DT", "PEF", "CALI")}
    sd: dict[str, np.ndarray] = {c: np.zeros(n) for c in mean}

    for u in ("U1", "U3", "U4"):
        m = uid == u
        for c, (mu, s) in L[u].items():
            mean[c][m], sd[c][m] = mu, s
    # U1 trends
    m1 = uid == "U1"
    mean["DT"][m1], sd["DT"][m1] = dt_nct[m1], L["noise_sd"]["DT"]
    mean["RDEP"][m1] = rd_nct[m1]
    # U2 anchored transition
    U2 = L["U2"]
    for c in ("GR", "PEF", "CALI"):
        mean[c][u2], sd[c][u2] = U2[c]
    for c, key in (("RHOB", "RHOB_anchors"), ("NPHI", "NPHI_anchors"), ("DT", "DT_anchors"), ("RDEP", "RDEP_anchors")):
        mean[c][u2] = _interp_anchors(md[u2], U2[key])
    sd["RHOB"][u2], sd["NPHI"][u2], sd["DT"][u2] = 0.015, 0.01, L["noise_sd"]["DT"]
    for c, v in U2["stringer"].items():
        mean[c][strg] = v

    out: dict[str, np.ndarray] = {}
    for c in mean:
        base = smooth(mean[c], L["smooth_sigma_samples"])
        if c == "RDEP":
            logv = np.log10(np.maximum(base, 0.05)) + L["noise_sd"]["RDEP_log10"] * band_noise(n, well_id, c, nsig)
            out[c] = 10 ** logv
        else:
            out[c] = base + smooth(sd[c], L["smooth_sigma_samples"]) * band_noise(n, well_id, c, nsig)
    ratio = np.array([L["rmed_ratio"][lc] for lc in litho_classes(md)])
    out["RMED"] = out["RDEP"] * smooth(ratio, L["smooth_sigma_samples"])
    out["_DT_NCT"] = dt_nct
    out["_RDEP_NCT"] = rd_nct
    return out


def lwd_meta() -> dict:
    return {"source": "synthetic_stub", "dataset_id": None, "licence": None,
            "note": "Stand-in curves; replaced by PUBLIC logs via pipelines/ingest (build.md Phase 6).",
            "well": facts()["well"]["id"]}
