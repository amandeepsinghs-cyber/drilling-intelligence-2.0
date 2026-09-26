"""pipelines.synth.generate_hires_well — persist the HIGH-RESOLUTION SYNTHETIC well (O6).

The serving path (backend/app/scenario/frames.py) computes the same model in-process; this script
writes the auditable copy used for ML training / column-contract checks:

  data/processed/lwd/<well>_synth_hires.parquet     md_m + curves (SYNTHETIC) + truth_* labels + trends
  data/processed/lwd/<well>_synth_hires.meta.json   model, seed, grid, DT decomposition, provenance

Usage:  uv run --no-project --python 3.12 --with pyyaml,numpy,pandas,pyarrow,pydantic \
            python pipelines/synth/generate_hires_well.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.provenance import CURVES  # noqa: E402
from app.scenario import profiles as prof  # noqa: E402
from app.scenario.facts import facts  # noqa: E402
from app.scenario.hires_well import hires_well  # noqa: E402


def write(well_id: str | None = None) -> Path:
    well_id = well_id or facts()["well"]["id"]
    md = prof.grid()
    hw = hires_well(md, well_id)
    cols = {"md_m": md}
    cols.update({c: hw["curves"][c] for c in CURVES})
    cols.update({f"truth_{k}": v for k, v in hw["truth"].items()})
    cols.update({f"trend_{k}": v for k, v in hw["trend"].items()})
    out = ROOT / "data" / "processed" / "lwd" / f"{well_id.lower().replace('-', '_')}_synth_hires.parquet"
    out.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(cols).to_parquet(out, index=False)
    meta = dict(hw["meta"], well_id=well_id, provenance="SYNTHETIC",
                grid={"top_m": float(md[0]), "base_m": float(md[-1]), "step_m": float(md[1] - md[0]), "n": len(md)},
                column_contract="docs/data/column_contract.md")
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"[ok] {well_id}: {len(md)} samples @ {meta['grid']['step_m']} m, {len(cols) - 1} columns → {out}")
    return out


if __name__ == "__main__":
    write()
