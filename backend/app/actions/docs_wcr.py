"""actions.docs_wcr — Google Docs Well Completion Report (WCR) generator.

Design reference: docs/SDD.md §11.
Compiles scenario facts, geomechanical narrative, MOC ledger entries, and shift notes
into a formal executive WCR document.
"""
from __future__ import annotations

import logging
from app.actions.types import ActionStatus, ChannelType, DispatchResult, WcrExportPayload

logger = logging.getLogger(__name__)


def generate_wcr_markdown(payload: WcrExportPayload) -> str:
    """Compiles the full Well Completion Report text. Every number comes from data/scenario/*.yaml (O3)."""
    from app.scenario.facts import checkpoint, facts, offsets

    f = facts()
    shoe, m0, m1, bar = f["casing"]["last_shoe"], f["mud"]["initial"], f["mud"]["weighted"], f["barite"]
    t3 = f["triggers"]["T3_PRESSURE_RAMP"]
    warn, sand, cap = checkpoint("Warning point"), checkpoint("Sand top (offset kick depth)"), checkpoint("After ROP cap")
    kick = next(o for o in offsets()["offsets"] if o.get("incident", {}).get("type") == "KICK")
    loss = next(o for o in offsets()["offsets"] if o.get("incident", {}).get("type") == "LOSSES")
    rop_cap = f["drilling"]["rop_cap_m_hr"]
    return f"""# WELL COMPLETION REPORT: {payload.wcr_id}
**Operator**: ONGC Deepwater Operations ({f['well']['basin']})  
**Well**: {payload.well_id}  
**Total Depth**: {payload.td_m:,.0f} m MD / TVD  
**Status**: Section drilled to TD — no kicks, no losses  

---

## 1. Executive Summary
The {payload.well_id} exploration well was drilled to total depth of {payload.td_m:,.0f} m MD in {f['well']['water_depth_m']:,} m water depth without well-control incidents or lost-circulation events. Proactive geopressure interpretation avoided an underbalanced entry into the overpressured Miocene {f['reservoir']['unit']} sand at {f['reservoir']['sand_top_m']:,} m MD, where offset {kick['id']} lost {kick['incident']['npt_h']} hours to a kick.

## 2. Geomechanical Diary & Narrow Margin Management
- **{shoe['size']} Casing Shoe**: Set at {shoe['md_m']:,} m MD with Formation Integrity Test (FIT) of {shoe['fit_ppg']:.2f} ppg ({shoe['fit_sg']:.2f} SG).
- **Pore Pressure Transition**: Detected at {t3['md_m']:,} m MD via dxc reversal and acoustic sonic departure (+{t3['conditions']['dt_above_nct_us_ft']} µs/ft off NCT), {warn['distance_to_hazard_m']} m above the sand.
- **Pre-emptive Weight-Up**: Mud weight raised from {m0['mw_ppg']:.2f} ppg to {m1['mw_ppg']:.2f} ppg ({bar['total_mt']} MT barite) under approved {f['ids']['memo_id']}.
- **Top Miocene Sand ({sand['md_m']:,} m MD)**: Drilled with +{sand['overbalance_psi']} psi overbalance, avoiding the {kick['incident']['gain_bbl']} bbl influx experienced on offset well {kick['id']}.
- **Drilling Break & Loss Mitigation ({cap['md_m']:,} m MD)**: ROP capped at {rop_cap} m/hr, keeping ECD at {cap['ecd_ppg']:.2f} ppg ({cap['ecd_fit_margin_ppg']:.2f} ppg below the shoe FIT), avoiding the {loss['incident']['loss_rate_bbl_hr']} bbl/hr losses seen on {loss['id']}.

## 3. Management of Change (MOC) Record
- **MOC ID**: {f['ids']['memo_id']}
- **Action**: Mud weight elevation from {m0['mw_ppg']:.2f} to {m1['mw_ppg']:.2f} ppg.
- **Additives**: {bar['total_mt']} metric tonnes ({bar['bags_50kg']} bags) barite.
- **Sign-Off**: Drilling Superintendent & RTOC Operations Manager.

## 4. Operational Lessons Learned
1. Sonic slowness departure with rising connection gas gave {warn['distance_to_hazard_m']} m advance warning before the overpressured turbidite sand.
2. An ROP cap of {rop_cap} m/hr during drilling breaks suppresses annular cuttings loading and keeps ECD below the casing shoe FIT.
"""


async def generate_wcr_doc(payload: WcrExportPayload) -> DispatchResult:
    """Generates and logs/exports the Well Completion Report."""
    wcr_text = generate_wcr_markdown(payload)
    logger.info(f"[Google Docs WCR] Report generated ({len(wcr_text)} bytes)")
    
    return DispatchResult(
        channel=ChannelType.DOCS_WCR,
        status=ActionStatus.DELIVERED,
        message_id=f"GDOC-{payload.wcr_id}",
        recipient="ONGC Corporate Data Archive",
        details={
            "wcr_id": payload.wcr_id,
            "document_length_chars": len(wcr_text),
            "export_url": "https://storage.cloud.google.com/sagar-drishti-data/reports/WCR-MN-SM-DW-01.html",
        },
    )
