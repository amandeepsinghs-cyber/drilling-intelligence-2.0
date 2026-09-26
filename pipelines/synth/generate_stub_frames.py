"""pipelines.synth.generate_stub_frames — build + persist the serving view and frontend mocks.

Works before any download (SYNTHETIC curves) and after the real-LWD drop-in (PUBLIC curves win
automatically; see backend/app/scenario/frames.py). Re-run after every data change.

Writes (SDD §5.4):
  data/processed/lwd/<well>.synthetic.parquet       stand-in curves (never overwrites PUBLIC)
  data/processed/mudlog/<well>.parquet              drilling + mud-log channels (SIMULATED)
  data/processed/mud_chemistry/<well>.parquet       mud channels (SIMULATED)
  data/processed/depth_frames/<well>.parquet        joined serving view
  data/processed/depth_frames/<well>.meta.json      provenance map + lwd source + grid
  frontend/public/mocks/{frames,scenario,wells}.json offline fallback for the UI

Usage:  cd backend && uv run python ../pipelines/synth/generate_stub_frames.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.scenario.facts import facts, scenario_bundle  # noqa: E402
from app.scenario.frames import build_frames, to_columnar  # noqa: E402


def main() -> None:
    fs = build_frames()
    slug = fs.well_id.lower().replace("-", "_")
    proc = ROOT / "data" / "processed"
    for sub in ("lwd", "mudlog", "mud_chemistry", "depth_frames"):
        (proc / sub).mkdir(parents=True, exist_ok=True)
    df = fs.df
    pick = lambda pfx: ["md_m"] + [c for c in df.columns if c.startswith(pfx)]  # noqa: E731
    if all(v == "synthetic" for v in fs.meta["curve_sources"].values()):
        df[pick("curves.")].to_parquet(proc / "lwd" / f"{slug}.synthetic.parquet", index=False)
    df[pick("drilling.") + [c for c in df.columns if c.startswith("mudlog.")]].to_parquet(
        proc / "mudlog" / f"{slug}.parquet", index=False)
    df[pick("mud.")].to_parquet(proc / "mud_chemistry" / f"{slug}.parquet", index=False)
    df.to_parquet(proc / "depth_frames" / f"{slug}.parquet", index=False)
    (proc / "depth_frames" / f"{slug}.meta.json").write_text(
        json.dumps({"meta": fs.meta, "provenance": fs.provenance}, indent=2))

    mocks = ROOT / "frontend" / "public" / "mocks"
    mocks.mkdir(parents=True, exist_ok=True)
    (mocks / "frames.json").write_text(json.dumps(to_columnar(fs), separators=(",", ":")))
    (mocks / "scenario.json").write_text(json.dumps(scenario_bundle(), separators=(",", ":"), default=str))
    (mocks / "wells.json").write_text((ROOT / "data" / "geo" / "wells.geojson").read_text(encoding="utf-8"))
    print(f"[ok] {fs.well_id}: {len(df)} frames, curves={set(fs.meta['curve_sources'].values())}, "
          f"columns={len(df.columns)} → {proc / 'depth_frames'} + frontend/public/mocks/")
    assert facts()["well"]["id"] == fs.well_id


if __name__ == "__main__":
    main()
