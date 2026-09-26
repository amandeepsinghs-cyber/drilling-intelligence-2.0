"""Scenario + wells routes (SDD §13)."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query

from app.scenario import store
from app.scenario.facts import data_dir, facts, scenario_bundle
from app.scenario.frames import frame_at, to_columnar

router = APIRouter(prefix="/api", tags=["scenario"])


def _check(well_id: str) -> None:
    if well_id != facts()["well"]["id"]:
        raise HTTPException(404, f"Unknown well {well_id}")


@router.get("/wells")
def wells() -> dict:
    """Map layer: GeoJSON of the live well, offsets and authenticity markers."""
    return json.loads((data_dir() / "geo" / "wells.geojson").read_text(encoding="utf-8"))


@router.get("/scenario")
def scenario() -> dict:
    """Canonical facts, offsets and turns — the UI renders narrative numbers from this only."""
    return scenario_bundle()


@router.get("/scenario/{well_id}/frames")
def frames(well_id: str, md_from: float | None = Query(None, alias="from"),
           md_to: float | None = Query(None, alias="to"), step: int = 1) -> dict:
    """Columnar DepthFrames (efficient for Plotly): {md_m:[...], columns:{'curves.GR':[...]}, provenance}."""
    _check(well_id)
    import os
    from app.core.config import get_settings
    s = get_settings()
    if s.adapters.get("tabular") == "gcp.tabular_bigquery" or os.getenv("DI_SOURCE") == "bigquery":
        try:
            from app.adapters.gcp.tabular_bigquery import get_bq_adapter
            bqa = get_bq_adapter()
            col = bqa.fetch_columnar(md_from, md_to, step)
            fs = store.get(well_id)
            col["meta"] = fs.meta
            col["provenance"] = fs.provenance
            return col
        except Exception:
            pass
    return to_columnar(store.get(well_id), md_from, md_to, step)


@router.get("/scenario/{well_id}/frame")
def frame(well_id: str, md: float) -> dict:
    """Single DepthFrame per data/contracts/depth_frame.schema.json."""
    _check(well_id)
    return frame_at(store.get(well_id), md)


@router.get("/scenario/{well_id}/meta")
def meta(well_id: str) -> dict:
    _check(well_id)
    fs = store.get(well_id)
    return {"meta": fs.meta, "provenance": fs.provenance}


@router.post("/scenario/reload")
def reload() -> dict:
    """Rebuild frames after dropping real LWD into data/processed/lwd/ (build.md Phase 6)."""
    fs = store.reload()
    return {"status": "reloaded", "curve_sources": fs.meta["curve_sources"]}
