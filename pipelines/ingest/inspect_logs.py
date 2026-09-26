"""pipelines.ingest.inspect_logs — inventory real log files before mapping (build.md Phase 6, step 1).

Reads LAS (lasio), DLIS (dlisio) or delimited ASCII (.csv/.txt/.dat) and writes one JSON per
file to data/interim/curve_inventory/: mnemonics, units, descriptions, depth range, null %.
Use the output to fill data/contracts/manifests/<dataset>.yaml.

Usage:  cd backend && uv run --extra ingest python ../pipelines/ingest/inspect_logs.py data/raw/iodp/c0002p
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "interim" / "curve_inventory"
EXTS = {".las", ".dlis", ".csv", ".txt", ".dat"}


def read_any(path: Path) -> tuple[pd.DataFrame, dict[str, dict]]:
    """Return (dataframe with first column = depth, {mnemonic: {unit, descr}})."""
    ext = path.suffix.lower()
    if ext == ".las":
        import lasio
        las = lasio.read(str(path))
        df = las.df().reset_index()
        info = {c.mnemonic: {"unit": c.unit, "descr": c.descr} for c in las.curves}
        return df, info
    if ext == ".dlis":
        from dlisio import dlis
        frames = []
        info: dict[str, dict] = {}
        with dlis.load(str(path)) as files:
            for f in files:
                for fr in f.frames:
                    curves = fr.curves()
                    names = [ch.name for ch in fr.channels]
                    frames.append(pd.DataFrame({n: curves[n] for n in names if curves[n].ndim == 1}))
                    info.update({ch.name: {"unit": ch.units, "descr": ch.long_name} for ch in fr.channels})
        return (frames[0] if frames else pd.DataFrame()), info
    if _is_iodp_standard(path):
        return read_iodp_standard(path)
    df = pd.read_csv(path, sep=None, engine="python", comment="#")
    return df, {c: {"unit": "", "descr": ""} for c in df.columns}


def _is_iodp_standard(path: Path) -> bool:
    """IODP/CDEX 'Standard Data' .dat: 'HOLE:' / 'EXPEDITION:' / 'TOP:' / 'BOTTOM:' header lines."""
    try:
        with path.open(errors="replace") as fh:
            head = [fh.readline() for _ in range(3)]
    except OSError:
        return False
    return any(line.upper().startswith(("HOLE:", "EXPEDITION:")) for line in head)


def read_iodp_standard(path: Path) -> tuple[pd.DataFrame, dict[str, dict]]:
    """Parse IODP Standard Data: KEY: value lines, then mnemonic row, unit row, tab-delimited data."""
    lines = path.read_text(errors="replace").splitlines()
    i = 0
    header: dict[str, str] = {}
    while i < len(lines) and ":" in lines[i].split("\t")[0]:
        k, _, v = lines[i].partition(":")
        header[k.strip().upper()] = v.strip()
        i += 1
    names = lines[i].split("\t")
    units = lines[i + 1].split("\t") if i + 1 < len(lines) else [""] * len(names)
    units += [""] * (len(names) - len(units))
    rows = [ln.split("\t") for ln in lines[i + 2:] if ln.strip()]
    df = pd.DataFrame(rows, columns=names).apply(pd.to_numeric, errors="coerce")
    descr = f"{header.get('EXPEDITION', '')}-{header.get('HOLE', '')}".strip("-")
    return df, {n: {"unit": u.strip(), "descr": descr} for n, u in zip(names, units)}


def inventory(path: Path) -> dict:
    df, info = read_any(path)
    depth = df.columns[0]
    curves = []
    for c in df.columns:
        v = pd.to_numeric(df[c], errors="coerce").replace([-999.25, -9999.0], np.nan)
        curves.append({"mnemonic": c, **info.get(c, {}), "null_pct": round(float(v.isna().mean() * 100), 1),
                       "min": None if v.isna().all() else float(v.min()),
                       "max": None if v.isna().all() else float(v.max())})
    d = pd.to_numeric(df[depth], errors="coerce")
    return {"file": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            "depth_mnemonic": depth, "depth_top": float(d.min()), "depth_base": float(d.max()),
            "rows": len(df), "curves": curves}


def main(target: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    root = Path(target).resolve()
    files = [root] if root.is_file() else sorted(p for p in root.rglob("*") if p.suffix.lower() in EXTS)
    for p in files:
        try:
            inv = inventory(p)
        except Exception as e:  # keep going; report per file
            print(f"[skip] {p.name}: {e}")
            continue
        (OUT / f"{p.stem}.json").write_text(json.dumps(inv, indent=2))
        print(f"[ok] {p.name}: {inv['rows']} rows, {inv['depth_top']:.1f}–{inv['depth_base']:.1f}, "
              f"{len(inv['curves'])} curves → {', '.join(c['mnemonic'] for c in inv['curves'][:12])}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data" / "raw"))
