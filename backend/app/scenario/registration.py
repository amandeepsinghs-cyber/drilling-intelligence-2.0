"""Real-LWD drop-in seam (SDD §5.5). Pure functions — no I/O — so they are unit-testable.

Flow when the user supplies real logs:
  1. pipelines/ingest/inspect_logs.py         → curve inventory (mnemonics, units, depth range)
  2. fill data/contracts/manifests/<dataset>.yaml (mnemonic map + depth_registration)
  3. pipelines/ingest/las_to_depth_frames.py  → map_curves() + register_depth() + resample()
     writes data/processed/lwd/<well>.parquet (+ .meta.json, provenance PUBLIC)
  4. pipelines/synth/generate_stub_frames.py  → rebuilds depth_frames; PUBLIC curves win
Invariant: public values are never edited. Scenario signatures missing from the real log are
added as separate `overlays.*` fields labelled SIMULATED (see frames.build_overlays).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

UNIT_FACTORS = {  # (source_unit, target_unit) -> multiplier
    ("us/m", "us/ft"): 0.3048,
    ("g/cm3", "g/cc"): 1.0, ("g/cc", "g/cc"): 1.0, ("kg/m3", "g/cc"): 0.001,
    ("%", "v/v"): 0.01, ("pu", "v/v"): 0.01, ("v/v", "v/v"): 1.0, ("dec", "v/v"): 1.0,
    ("gapi", "api"): 1.0, ("api", "api"): 1.0,
    ("ohm.m", "ohm.m"): 1.0, ("ohmm", "ohm.m"): 1.0,
    ("in", "in"): 1.0, ("mm", "in"): 1 / 25.4, ("b/e", "b/e"): 1.0,
    ("us/ft", "us/ft"): 1.0,
}
NULL_VALUES = (-999.25, -9999.0, -999.0)


def convert(values: np.ndarray, source_unit: str, target_unit: str) -> np.ndarray:
    key = (source_unit.strip().lower(), target_unit.strip().lower())
    if key[0] == key[1]:
        return values
    if key not in UNIT_FACTORS:
        raise ValueError(f"No unit conversion {source_unit} -> {target_unit}; add it to UNIT_FACTORS")
    return values * UNIT_FACTORS[key]


def map_curves(df: pd.DataFrame, manifest: dict) -> pd.DataFrame:
    """Rename source mnemonics to canonical, convert units, null sentinel values.

    `df` must have a depth column named 'DEPTH' (m) plus source curve columns.
    Returns DEPTH + canonical columns that were present in the source.
    """
    out = pd.DataFrame({"DEPTH": df["DEPTH"].astype(float)})
    for c in manifest["curves"]:
        src = c["source_mnemonic"]
        if src not in df.columns:
            continue
        v = df[src].astype(float).to_numpy()
        v = np.where(np.isin(v, NULL_VALUES), np.nan, v)
        out[c["canonical"]] = convert(v, c.get("source_unit", ""), c.get("target_unit", ""))
    return out


def register_depth(src_depth: np.ndarray, reg: dict) -> np.ndarray:
    """Affine shift (+ optional stretch) from the source interval onto the scenario interval.

    method=shift         : target = src + (target_top − source_top)
    method=shift_stretch : linear map [source_top, source_base] → [target_top, target_base]
    """
    s0, s1 = reg["source_top_m"], reg.get("source_base_m")
    t0, t1 = reg["target_top_m"], reg.get("target_base_m")
    if reg.get("method", "shift_stretch") == "shift" or s1 is None or t1 is None:
        return src_depth + (t0 - s0)
    return t0 + (src_depth - s0) * (t1 - t0) / (s1 - s0)


def resample(df: pd.DataFrame, depth_col: str, grid: np.ndarray, max_gap_m: float = 2.0) -> pd.DataFrame:
    """Linear resample onto the scenario grid; gaps wider than `max_gap_m` stay NaN (no invention)."""
    d = df[depth_col].to_numpy()
    order = np.argsort(d)
    d = d[order]
    out = pd.DataFrame({"md_m": grid})
    for col in df.columns:
        if col == depth_col:
            continue
        v = df[col].to_numpy()[order]
        ok = ~np.isnan(v)
        if ok.sum() < 2:
            out[col] = np.nan
            continue
        dv, vv = d[ok], v[ok]
        res = np.interp(grid, dv, vv, left=np.nan, right=np.nan)
        idx = np.searchsorted(dv, grid)
        lo = np.clip(idx - 1, 0, len(dv) - 1)
        hi = np.clip(idx, 0, len(dv) - 1)
        gap = dv[hi] - dv[lo]
        res[gap > max_gap_m] = np.nan
        out[col] = res
    return out
