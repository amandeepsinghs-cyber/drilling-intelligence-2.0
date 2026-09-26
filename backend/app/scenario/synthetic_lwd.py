"""Deterministic signal helpers shared by the synthetic generators (hires_well, simulated_ops, baseline).

Band-limited noise is seeded from (well_id, key, profiles.seed_salt) so every run is reproducible.
The former anchor-interpolated stand-in curves were replaced by app.scenario.hires_well (O6).
"""
from __future__ import annotations

import zlib

import numpy as np

from app.scenario.facts import profiles


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
