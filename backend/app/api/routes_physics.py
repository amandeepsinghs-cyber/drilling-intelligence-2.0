"""Physics what-if (SDD §13): POST /api/physics/whatif {md_m, mw_ppg, rop_m_hr}."""
from __future__ import annotations

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ml import baseline
from app.physics import barite_lb_per_bbl, barite_volume_gain_bbl, ecd_calibrated, overbalance_psi
from app.physics.barite import LB_PER_KG
from app.scenario import store
from app.scenario.facts import facts
from app.scenario.profiles import pore_pressure_at

router = APIRouter(prefix="/api/physics", tags=["physics"])


class WhatIfIn(BaseModel):
    md_m: float = Field(..., ge=4000, le=4460)
    mw_ppg: float = Field(..., ge=9.0, le=14.0)
    rop_m_hr: float = Field(..., ge=0, le=60)


@router.post("/whatif")
def whatif(q: WhatIfIn) -> dict:
    fs = store.get()
    df = fs.df
    i = int(np.argmin(np.abs(df["md_m"].to_numpy() - q.md_m)))
    row = df.iloc[i]
    f = facts()
    fit = f["casing"]["last_shoe"]["fit_ppg"]
    resid = float(row["derived.ECD"] - ecd_calibrated(row["mud.MW_IN_PPG"], row["drilling.ROP"]))
    ecd = ecd_calibrated(q.mw_ppg, q.rop_m_hr, resid)
    margin = fit - ecd
    pp_now = pore_pressure_at(q.md_m)
    ub = baseline.forecast_underbalance(q.md_m, q.mw_ppg)
    mw_frame = float(row["mud.MW_IN_PPG"])
    w1 = f["mud"]["initial"]["mw_ppg"]
    bar = None
    if q.mw_ppg > w1:  # field practice: quote lb/bbl to 0.1, then scale (brief: 28.3 lb/bbl → 796 bags)
        lb = round(barite_lb_per_bbl(w1, q.mw_ppg), 1) * f["mud"]["active_system_bbl"]
        kg = lb / LB_PER_KG
        bar = {"lb": lb, "mt": kg / 1000.0, "bags": kg / 50.0}
    return {
        "inputs": q.model_dump(),
        "ecd_ppg": round(ecd, 3),
        "ecd_fit_margin_ppg": round(margin, 3),
        "overbalance_psi_now": round(overbalance_psi(q.mw_ppg, pp_now, q.md_m)),
        "forecast_underbalance_ppg_30m": round(ub, 3),
        "p_kick_30m": round(baseline.p_kick_whatif(q.md_m, mw_frame, q.mw_ppg), 3),
        "p_loss": round(float(baseline.p_loss(margin)), 3),
        "rop_max_m_hr": round(float(baseline.rop_max(q.mw_ppg, resid)), 1),
        "barite": None if bar is None else {
            "mt": round(bar["mt"], 1), "bags_50kg": round(bar["bags"]),
            "volume_gain_bbl": round(barite_volume_gain_bbl(bar["lb"]))},
        "provenance": {"ecd_ppg": "DERIVED", "p_kick_30m": "MODEL_INFERENCE", "p_loss": "MODEL_INFERENCE",
                       "rop_max_m_hr": "MODEL_INFERENCE", "barite": "DERIVED"},
        "model": "ecd_calibrated + baseline_heuristic (Phase 6 → trained)",
    }
