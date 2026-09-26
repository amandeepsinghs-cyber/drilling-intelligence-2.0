"""pipelines.ingest.las_to_depth_frames — register a REAL public log into the scenario (SDD §5.5).

Reads the manifest (data/contracts/manifests/<dataset>.yaml), maps mnemonics/units, applies the
depth registration, resamples to the scenario grid (gaps stay NaN) and writes:
  data/processed/lwd/<well>.parquet     (md_m + canonical curves, values untouched except units)
  data/processed/lwd/<well>.meta.json   (provenance PUBLIC, dataset, licence, attribution, registration)
Then run generate_stub_frames.py (or POST /api/scenario/reload) — PUBLIC curves win automatically.

Usage:
  cd backend && uv run --extra ingest python ../pipelines/ingest/las_to_depth_frames.py \
      ../data/contracts/manifests/iodp_348_c0002p.yaml
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.scenario.facts import facts  # noqa: E402
from app.scenario.frames import lwd_path  # noqa: E402
from app.scenario.profiles import grid  # noqa: E402
from app.scenario.registration import map_curves, register_depth, resample  # noqa: E402
from inspect_logs import read_any  # noqa: E402


def main(manifest_path: str) -> None:
    m = yaml.safe_load(Path(manifest_path).read_text())
    reg = m["depth_registration"]
    if reg.get("source_top_m") is None:
        sys.exit("Fill depth_registration.source_top_m (and source_base_m for shift_stretch) first — "
                 "see data/interim/curve_inventory/*.json from inspect_logs.py")
    files = [ROOT / f for f in m.get("files", [])]
    if not files:
        sys.exit("manifest.files is empty — list the raw file(s) under data/raw/ to register")
    parts = []
    for f in files:
        df, _ = read_any(f)
        depth_col = m.get("depth_mnemonic") or df.columns[0]
        df = df.rename(columns={depth_col: "DEPTH"})
        parts.append(map_curves(df, m))
    raw = pd.concat(parts)
    raw["DEPTH"] = raw["DEPTH"].round(3)  # files share a 0.1524 m grid; avoid float-key mismatches
    raw = raw.sort_values("DEPTH").groupby("DEPTH", as_index=False).mean()
    window = raw[(raw["DEPTH"] >= reg["source_top_m"]) &
                 (raw["DEPTH"] <= (reg.get("source_base_m") or raw["DEPTH"].max()))].copy()
    window["DEPTH"] = register_depth(window["DEPTH"].to_numpy(), reg)
    out = resample(window, "DEPTH", grid(), max_gap_m=m.get("max_gap_m", 2.0))

    well = facts()["well"]["id"]
    p = lwd_path(well)
    p.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(p, index=False)
    meta = {"provenance": "PUBLIC", "dataset_id": m["dataset_id"], "source": m["source"],
            "licence": m["licence"], "attribution": m["attribution"], "registration": reg,
            "curves": [c for c in out.columns if c != "md_m" and out[c].notna().any()],
            "coverage_pct": {c: round(float(out[c].notna().mean() * 100), 1) for c in out.columns if c != "md_m"}}
    p.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"[ok] {m['dataset_id']} → {p.relative_to(ROOT)}  curves={meta['curves']}  coverage={meta['coverage_pct']}")
    print("Next: python ../pipelines/synth/generate_stub_frames.py   (or POST /api/scenario/reload)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data/contracts/manifests/iodp_348_c0002p.yaml"))
