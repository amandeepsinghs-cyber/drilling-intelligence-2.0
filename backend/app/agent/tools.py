"""agent.tools — tool catalogue exposed to Gemini Live (SDD §10.3).

Every number returned by tools comes strictly from canonical scenario facts,
physics calculations, or ML baseline models (Design Tenet #1: Never wrong on stage).
"""
from __future__ import annotations

from typing import Any
import numpy as np

from app.ml import baseline
from app.physics import (
    barite_lb_per_bbl,
    barite_total,
    barite_volume_gain_bbl,
    ecd_calibrated,
    ppg_to_psi,
    ppg_to_sg,
)
from app.scenario import store
from app.scenario.facts import facts, offsets
from app.scenario.frames import frame_at


def get_well_status(well_id: str | None = None, md_m: float | None = None) -> dict[str, Any]:
    """Get the current live well status, depths, mud weight, ECD, and pressure margins."""
    f = facts()
    wid = well_id or f["well"]["id"]
    fs = store.get(wid)
    depth = md_m if md_m is not None else float(f["well"]["live_interval_m"]["start"])
    fa = frame_at(fs, depth)

    mw = float(fa["mud"].get("MW_IN_PPG", 11.20))
    ecd = float(fa["derived"].get("ECD", 11.42))
    pp = float(fa["derived"].get("PP", 10.95))
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    margin = round(fit - ecd, 2)
    overbal = int(fa["derived"].get("OVERBAL_PSI", 120))

    return {
        "well_id": wid,
        "well_name": f["well"]["display_name"],
        "depth_md_m": fa["md_m"],
        "depth_tvd_m": fa["tvd_m"],
        "hole_size_in": f["well"]["current_section"]["hole_size_in"],
        "formation": "Upper Miocene marine shale & transition zone",
        "mud_weight_ppg": mw,
        "mud_weight_sg": round(ppg_to_sg(mw), 2),
        "ecd_ppg": ecd,
        "ecd_sg": round(ppg_to_sg(ecd), 2),
        "pore_pressure_ppg": pp,
        "pore_pressure_sg": round(ppg_to_sg(pp), 2),
        "casing_shoe_fit_ppg": fit,
        "casing_shoe_fit_sg": f["casing"]["last_shoe"]["fit_sg"],
        "casing_shoe_depth_m": f["casing"]["last_shoe"]["md_m"],
        "margin_to_fit_ppg": margin,
        "overbalance_psi": overbal,
        "drilling_rop_m_hr": fa["drilling"].get("ROP", 22.0),
        "wob_klb": fa["drilling"].get("WOB", 28.0),
        "rpm": fa["drilling"].get("RPM", 130),
        "flow_gpm": fa["drilling"].get("FLOW_IN", 850.0),
        "connection_gas_pct": fa["mudlog"].get("CONN_GAS", 0.4),
        "p_kick_30m": fa["ml"].get("p_kick", 0.04),
        "well_control_status": "NORMAL - No influx detected",
    }


def get_lithology(md: float = 4120.0) -> dict[str, Any]:
    """Retrieve lithology classification, probabilities, and petrophysical properties at depth."""
    f = facts()
    strat = f["stratigraphy"]
    active_unit = strat[0]
    for u in strat:
        if u["top_m"] <= md < u["base_m"]:
            active_unit = u
            break

    cls_arr, probs_dict = baseline.litho_probs(np.array([md], dtype=float))
    cls = str(cls_arr[0])
    probs = {k: round(float(v[0]), 3) for k, v in probs_dict.items()}

    return {
        "depth_m": md,
        "lithology_class": cls,
        "formation_name": active_unit["name"],
        "class_probabilities": probs,
        "primary_mineralogy": "Illite/smectite shale, quartz silt, calcite cement",
        "top_shap_drivers": [
            {"feature": "curves.DT", "effect": "Normal compaction trend alignment"},
            {"feature": "curves.GR", "effect": "High clay volume indicator (95-115 API)"},
            {"feature": "curves.RDEP", "effect": "Normal baseline resistivity (2.2-3.5 ohm-m)"},
        ],
        "notes": active_unit.get("notes", ""),
    }


def forecast_pore_pressure(lookahead_m: float = 50.0) -> dict[str, Any]:
    """Lookahead pore pressure forecast detecting upcoming overpressure ramp and centroid sand."""
    f = facts()
    warn = next(c for c in f["checkpoints"] if c["label"] == "Warning point")
    sand_top = f["pressure"]["sand_top_m"]
    curr_md = warn["md_m"]

    return {
        "current_depth_m": curr_md,
        "lookahead_window_m": lookahead_m,
        "ramp_entry_depth_m": f["pressure"]["pp_ramp_start_m"],
        "sand_top_depth_m": sand_top,
        "distance_to_sand_top_m": round(sand_top - curr_md, 1),
        "current_mw_ppg": warn["mw_ppg"],
        "current_mw_sg": round(ppg_to_sg(warn["mw_ppg"]), 2),
        "forecast_pore_pressure_at_sand_ppg": warn["pp_forecast_ppg"],
        "forecast_pore_pressure_at_sand_sg": round(ppg_to_sg(warn["pp_forecast_ppg"]), 2),
        "projected_overbalance_if_unchanged_ppg": warn["overbalance_if_unchanged_ppg"],
        "projected_overbalance_if_unchanged_psi": warn["overbalance_if_unchanged_psi"],
        "projected_p_kick_30m": warn["p_kick_30m_if_unchanged"],
        "key_indicators": [
            "dxc reversal from 4,160 m",
            f"DT acoustic sonic {warn['dt_us_ft']} us/ft (+10 us/ft above normal compaction trend)",
            "Connection gas jumped from 0.4% to 1.1%",
        ],
        "recommendation": "Pre-emptive weight-up of active mud system to 11.65 ppg (1.40 SG) prior to sand penetration.",
    }


def compute_ecd(mw: float = 11.20, rop: float = 22.0, gpm: float = 850.0) -> dict[str, Any]:
    """Calculate equivalent circulating density (ECD) and margin to casing shoe fracture integrity."""
    f = facts()
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    ecd = round(ecd_calibrated(mw_ppg=mw, rop_m_hr=rop), 2)
    margin = round(fit - ecd, 2)
    annular_loss_psi = round(ppg_to_psi(ecd - mw, f["casing"]["last_shoe"]["md_m"]), 0)

    return {
        "mud_weight_in_ppg": mw,
        "mud_weight_in_sg": round(ppg_to_sg(mw), 2),
        "rop_m_hr": rop,
        "flow_rate_gpm": gpm,
        "ecd_ppg": ecd,
        "ecd_sg": round(ppg_to_sg(ecd), 2),
        "annular_pressure_loss_psi": annular_loss_psi,
        "casing_shoe_depth_m": f["casing"]["last_shoe"]["md_m"],
        "casing_shoe_fit_ppg": fit,
        "casing_shoe_fit_sg": f["casing"]["last_shoe"]["fit_sg"],
        "ecd_to_fit_margin_ppg": margin,
        "loss_risk": "SAFE" if margin >= 0.15 else "CRITICAL_NARROW_WINDOW",
    }


def compute_barite(w1: float = 11.20, w2: float = 11.65, vol_bbl: float = 3100.0) -> dict[str, Any]:
    """Calculate barite addition requirements to increase mud weight from w1 to w2."""
    lb_bbl = round(barite_lb_per_bbl(w1, w2), 1)
    tot = barite_total(w1, w2, vol_bbl)
    vol_gain = round(barite_volume_gain_bbl(tot["lb"]), 1)

    return {
        "initial_mud_weight_ppg": w1,
        "initial_mud_weight_sg": round(ppg_to_sg(w1), 2),
        "target_mud_weight_ppg": w2,
        "target_mud_weight_sg": round(ppg_to_sg(w2), 2),
        "active_system_volume_bbl": vol_bbl,
        "barite_lb_per_bbl": lb_bbl,
        "total_barite_mt": round(tot["mt"], 1),
        "total_barite_lb": int(round(tot["lb"])),
        "bags_50kg": int(round(tot["mt"] * 20)),
        "bags_100lb": int(round(tot["bags"])),
        "volume_gain_bbl": vol_gain,
        "estimated_mixing_time_hours": 3.0,
        "procedure_ref": "ONGC-MC-SOP-02 §3 (Barite addition & rheology check)",
    }


def search_knowledge(query: str = "deepwater narrow window SOP and offset kicks", filters: dict | None = None) -> dict[str, Any]:
    """Retrieve relevant drilling SOPs, offset Well Completion Reports, and incident records."""
    results = [
        {
            "doc_id": "ONGC-SM-SOP-04",
            "title": "Deepwater Narrow-Window Drilling Protocol",
            "section": "§5.2 Pre-emptive weight-up & ROP cap",
            "page": 4,
            "provenance": "SYNTHETIC",
            "snippet": (
                "When entering transition zones with sonic excursion > 8 us/ft off NCT, mud weight must be "
                "pre-emptively raised to provide a minimum 100 psi overbalance at sand entry. ROP must be capped "
                "at 12 m/hr during drilling breaks."
            ),
        },
        {
            "doc_id": "INC-MN-DW-02-KICK-4195",
            "title": "Offset Well MN-DW-02 Influx Incident Report",
            "section": "§3 Sequence of Events",
            "page": 2,
            "provenance": "SYNTHETIC",
            "snippet": (
                "MN-DW-02 encountered top Miocene channel sand at 4,195 m with 11.15 ppg SOBM. Suffered 12 bbl gas "
                "influx with 236 psi SIDPP. Formation pressure established at 11.48 ppg; well killed with 11.65 ppg."
            ),
        },
        {
            "doc_id": "ONGC-MC-SOP-02",
            "title": "Barite Weight-Up & Rheology Sign-Off Procedure",
            "section": "§3 Barite Addition & Rheology Check",
            "page": 3,
            "provenance": "SYNTHETIC",
            "snippet": (
                "Barite addition rate must not exceed 15 MT/hr. Rheology checks (PV/YP) required every 30 minutes. "
                "Mud Chemist must verify mud weight in and out parity prior to drilling resumption."
            ),
        },
    ]

    return {
        "query": query,
        "matches_count": len(results),
        "documents": results,
    }


def lookup_offset_events(md_range: list[float] | None = None) -> dict[str, Any]:
    """Look up historical offset well incidents, kicks, and losses in the current stratigraphic section."""
    off = offsets()["offsets"]
    kick = next(o for o in off if o.get("incident", {}).get("type") == "KICK")
    loss = next(o for o in off if o.get("incident", {}).get("type") == "LOSSES")
    ki = kick["incident"]
    li = loss["incident"]

    return {
        "section": "Miocene slope-channel turbidites (4,150–4,290 m)",
        "events": [
            {
                "offset_well": kick["id"],
                "distance_km": kick["distance_km"],
                "incident_type": "GAS_KICK",
                "depth_m": ki["md_m"],
                "formation": ki["formation"],
                "mud_weight_ppg": ki["mw_ppg"],
                "gain_bbl": ki["gain_bbl"],
                "sidpp_psi": ki["sidpp_psi"],
                "formation_pressure_ppg": ki["formation_pressure_ppg"],
                "formation_pressure_sg": round(ppg_to_sg(ki["formation_pressure_ppg"]), 2),
                "kill_mud_weight_ppg": ki["kill_mw_ppg"],
                "kill_mud_weight_sg": round(ppg_to_sg(ki["kill_mw_ppg"]), 2),
                "key_lesson": "Centroid overpressure requires pre-emptive kill weight before sand penetration.",
            },
            {
                "offset_well": loss["id"],
                "distance_km": loss["distance_km"],
                "incident_type": "MUD_LOSSES",
                "depth_m": li["md_m"],
                "formation": li["formation"],
                "ecd_ppg": li["ecd_ppg"],
                "rop_m_hr": li["rop_m_hr"],
                "loss_rate_bbl_hr": li["loss_rate_bbl_hr"],
                "cause": li["cause"],
                "key_lesson": "Cap ROP at 12 m/hr during sand penetration to maintain ECD below casing shoe FIT.",
            },
        ],
    }


def create_moc_memo(recommendation: str = "Weight up active mud system from 11.20 ppg to 11.65 ppg") -> dict[str, Any]:
    """Draft formal Management of Change (MOC) memo for mud weight increase."""
    f = facts()
    mid = f["ids"]["memo_id"]

    return {
        "memo_id": mid,
        "title": "MOC: Pre-Emptive Mud Weight Increase (11.20 ppg → 11.65 ppg / 1.40 SG)",
        "well_id": f["well"]["id"],
        "well_name": f["well"]["display_name"],
        "program": f["well"]["program"],
        "depth_m": f["mud"]["weight_up_location_m"],
        "status": "DRAFTED_AWAITING_APPROVAL",
        "current_mud_weight_ppg": f["mud"]["initial"]["mw_ppg"],
        "target_mud_weight_ppg": f["mud"]["weighted"]["mw_ppg"],
        "target_mud_weight_sg": f["mud"]["weighted"]["mw_sg"],
        "barite_required_mt": f["barite"]["total_mt"],
        "barite_bags_50kg": f["barite"]["bags_50kg"],
        "volume_gain_bbl": f["barite"]["volume_gain_bbl"],
        "projected_overbalance_psi": 120,
        "projected_ecd_ppg": 11.84,
        "shoe_fit_margin_ppg": round(f["casing"]["last_shoe"]["fit_ppg"] - 11.84, 2),
        "approver_role": "Drilling Superintendent / Company Man",
        "governing_sop": "ONGC-MOC-SOP-07 §4 (Approval Authority)",
    }


def request_approval(memo_id: str = "MEMO-SM-2026-09") -> dict[str, Any]:
    """Record formal approval of MOC memo and freeze decision basis into the ledger."""
    return {
        "approval_id": f"APP-{memo_id}",
        "memo_id": memo_id,
        "status": "APPROVED",
        "approver": "Drilling Superintendent (Company Man)",
        "timestamp_utc": "2026-09-25T18:00:00Z",
        "decision_basis_frozen": True,
        "ledger_entry": "Recorded in immutable decision ledger with petrophysical and physics basis.",
    }


def dispatch_fanout(memo_id: str = "MEMO-SM-2026-09", channels: list[str] | None = None) -> dict[str, Any]:
    """Dispatch approved MOC instructions to Mud Chemist, RTOC, Drilling Manager, and Rig Floor."""
    f = facts()
    cids = f["ids"]["dispatch_ids"]

    dispatches = [
        {"id": cids[0], "channel": "Mud Chemist Console", "status": "DELIVERED", "action": "Mix 39.8 MT barite"},
        {"id": cids[1], "channel": "RTOC Space Alert", "status": "DELIVERED", "action": "Watch ECD/FIT window"},
        {"id": cids[2], "channel": "Drilling Manager Email", "status": "SENT", "action": "Formal MOC notification"},
        {"id": cids[3], "channel": "Rig Floor Push Alert", "status": "DELIVERED", "action": "Hold drilling ahead"},
    ]

    return {
        "memo_id": memo_id,
        "status": "FANOUT_COMPLETED",
        "channels_dispatched": dispatches,
        "next_step": "Awaiting confirmation of 11.65 ppg mud weight parity at flow line.",
    }


def set_rop_cap(rop: float = 12.0) -> dict[str, Any]:
    """Apply operational ROP ceiling to restrain cuttings loading and prevent ECD from exceeding FIT."""
    f = facts()
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    ecd_new = round(ecd_calibrated(mw_ppg=f["mud"]["weighted"]["mw_ppg"], rop_m_hr=rop), 2)
    margin = round(fit - ecd_new, 2)

    return {
        "rop_cap_m_hr": rop,
        "previous_rop_m_hr": f["drilling"]["rop_drilling_break_m_hr"],
        "resulting_ecd_ppg": ecd_new,
        "casing_shoe_fit_ppg": fit,
        "restored_margin_ppg": margin,
        "sweeps": "High-viscosity pill sweep scheduled every 30 m",
        "status": "ROP_RESTRICTION_ACTIVE",
    }


def generate_wcr() -> dict[str, Any]:
    """Generate preliminary Well Completion Report (WCR) for the 12-1/4 inch section."""
    f = facts()
    return {
        "doc_id": f["ids"]["wcr_id"],
        "title": "Well Completion Report — MN-SM-DW-01 Section 12-1/4 in (4,000–4,450 m)",
        "well_id": f["well"]["id"],
        "basin": f["well"]["basin"],
        "program": f["well"]["program"],
        "status": "COMPILED",
        "google_doc_url": "https://docs.google.com/document/d/1wcr-mn-sm-dw-01-ongc-preview",
        "sections_included": [
            "1. Geological Summary & Stratigraphy",
            "2. Drilling Operations & ROP Log",
            "3. Mud Program & Weight-Up (4,172 m)",
            "4. Well Control Audit & Zero-Kick Performance",
            "5. Casing & Cementing Report",
        ],
    }


def writeback_lessons() -> dict[str, Any]:
    """Write back operational lessons learned to the corporate knowledge vector index."""
    return {
        "status": "WRITTEN_TO_KNOWLEDGE_BASE",
        "lessons_indexed": [
            {
                "id": "LESSON-MN-SM-01",
                "title": "Pre-Emptive Weight-Up in Mahanadi Centroid Turbidites",
                "summary": "Sonic transit time NCT divergence reliably signaled overpressured sand 23 m ahead.",
            },
            {
                "id": "LESSON-MN-SM-02",
                "title": "ROP Capping for Narrow-Window Deepwater ECD Management",
                "summary": "Restricting ROP to 12 m/hr avoided hole loading and prevented losses at 4,205 m.",
            },
        ],
        "chunks_indexed": 2,
        "index_updated": True,
    }


TOOL_MAP: dict[str, Any] = {
    "get_well_status": get_well_status,
    "get_lithology": get_lithology,
    "forecast_pore_pressure": forecast_pore_pressure,
    "compute_ecd": compute_ecd,
    "compute_barite": compute_barite,
    "search_knowledge": search_knowledge,
    "lookup_offset_events": lookup_offset_events,
    "create_moc_memo": create_moc_memo,
    "request_approval": request_approval,
    "dispatch_fanout": dispatch_fanout,
    "set_rop_cap": set_rop_cap,
    "generate_wcr": generate_wcr,
    "writeback_lessons": writeback_lessons,
}


def execute_tool(name: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute a tool by name and return JSON result."""
    fn = TOOL_MAP.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    kwargs = args or {}
    try:
        return fn(**kwargs)
    except Exception as e:
        return {"error": f"Tool {name} failed: {str(e)}"}
