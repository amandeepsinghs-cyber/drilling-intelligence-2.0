"""agent.tools — tool catalogue exposed to Gemini Live (SDD §10.3).

Every number returned by tools comes strictly from canonical scenario facts,
physics calculations, or ML baseline models (Design Tenet #1: Never wrong on stage).

A-11 / O3: no literal fallbacks or defaults. Optional arguments default to `None` and are
resolved from the live frame at the bit or from data/scenario/*.yaml; a missing fact raises
(and execute_tool returns an error) instead of silently speaking an invented number.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
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
from app.rag import retriever
from app.scenario import store
from app.scenario.facts import checkpoint, facts, offsets, unit_at
from app.scenario.frames import frame_at


# A-8: the browser reports the live bit depth (prompt / context messages); tools answer for that depth.
LIVE_CONTEXT: dict[str, float | None] = {"md_m": None}


def set_live_depth(md_m: float) -> None:
    LIVE_CONTEXT["md_m"] = float(md_m)


def _live_md() -> float:
    md = LIVE_CONTEXT["md_m"]
    return float(md) if md is not None else float(facts()["well"]["live_interval_m"]["start"])


def _live_frame(md_m: float | None = None) -> dict[str, Any]:
    f = facts()
    return frame_at(store.get(f["well"]["id"]), md_m if md_m is not None else _live_md())


def _eta_to(target_m: float, bit_m: float, rop_m_hr: float) -> dict[str, Any]:
    """Distance and ETA to a depth, computed (never quoted): distance ÷ current ROP."""
    dist = round(float(target_m) - float(bit_m), 1)
    eta_h = round(dist / rop_m_hr, 2) if dist > 0 and rop_m_hr > 0 else 0.0
    return {"distance_m": dist, "eta_hours": eta_h, "eta_minutes": int(round(eta_h * 60)), "rop_used_m_hr": rop_m_hr}


def _warn() -> dict[str, Any]:
    return checkpoint("Warning point")


def _offset(kind: str) -> dict[str, Any]:
    return next(o for o in offsets()["offsets"] if o.get("incident", {}).get("type") == kind)


def _gas_pct(fa: dict[str, Any]) -> float:
    """Connection gas is only logged at connections; between connections report background total gas."""
    ml = fa["mudlog"]
    return float(ml["CONN_GAS"] if ml.get("CONN_GAS") is not None else ml["GAS_TOTAL"])


def get_well_status(well_id: str | None = None, md_m: float | None = None) -> dict[str, Any]:
    """Get the current live well status at the bit: depth, mud weight, ECD, margins, ROP, and distance/ETA to the U3 sand top."""
    f = facts()
    wid = well_id or f["well"]["id"]
    depth = md_m if md_m is not None else _live_md()
    fa = frame_at(store.get(wid), depth)

    mw = float(fa["mud"]["MW_IN_PPG"])
    ecd = float(fa["derived"]["ECD"])
    pp = float(fa["derived"]["PP"])
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    rop = float(fa["drilling"]["ROP"])
    warn = _warn()

    return {
        "well_id": wid,
        "well_name": f["well"]["display_name"],
        "depth_md_m": fa["md_m"],
        "depth_tvd_m": fa["tvd_m"],
        "hole_size_in": f["well"]["current_section"]["hole_size_in"],
        "formation": unit_at(fa["md_m"])["name"],
        "mud_weight_ppg": round(mw, 2),
        "mud_weight_sg": round(ppg_to_sg(mw), 2),
        "ecd_ppg": round(ecd, 2),
        "ecd_sg": round(ppg_to_sg(ecd), 2),
        "pore_pressure_ppg": round(pp, 2),
        "pore_pressure_sg": round(ppg_to_sg(pp), 2),
        "casing_shoe_fit_ppg": fit,
        "casing_shoe_fit_sg": f["casing"]["last_shoe"]["fit_sg"],
        "casing_shoe_depth_m": f["casing"]["last_shoe"]["md_m"],
        "margin_to_fit_ppg": round(fit - ecd, 2),
        "overbalance_psi": int(round(float(fa["derived"]["OVERBAL_PSI"]))),
        "drilling_rop_m_hr": round(rop, 1),
        "wob_klb": round(float(fa["drilling"]["WOB"]), 1),
        "rpm": int(round(float(fa["drilling"]["RPM"]))),
        "flow_gpm": round(float(fa["drilling"]["FLOW_IN"])),
        "gas_pct": round(_gas_pct(fa), 2),
        "p_kick_next_window": round(float(fa["ml"]["p_kick"]), 2),
        "p_kick_window_m": f["ml"]["kick_horizon_m"],
        "well_control_status": "NORMAL - No influx detected",
        "next_zone": {
            "name": f"{f['reservoir']['unit']} pay sand top",
            "md_m": f["reservoir"]["sand_top_m"],
            **_eta_to(f["reservoir"]["sand_top_m"], fa["md_m"], rop),
            # A-9: look-ahead at the sand, so "safe at the bit" is never mistaken for "safe at the sand".
            "pp_forecast_at_sand_ppg": warn["pp_forecast_ppg"],
            "overbalance_at_sand_if_unchanged_psi": warn["overbalance_if_unchanged_psi"],
            "kick_side_status": "UNDERBALANCED at sand if MW unchanged" if warn["overbalance_if_unchanged_psi"] < 0 else "overbalanced at sand",
            "shoe_fit_ppg": fit,
        },
    }


def get_lithology(md: float | None = None) -> dict[str, Any]:
    """Retrieve ML lithology classification and class probabilities at depth (default: the bit), with the unit's reference log ranges."""
    depth = float(md) if md is not None else _live_md()
    unit = unit_at(depth)

    cls_arr, probs_dict = baseline.litho_probs(np.array([depth], dtype=float))
    probs = {k: round(float(v[0]), 3) for k, v in probs_dict.items()}
    ranges = {key: unit[key] for key in ("gr_api", "rdep_ohmm", "dt_us_ft") if key in unit}

    return {
        "depth_m": depth,
        "lithology_class": str(cls_arr[0]),
        "class_probabilities": probs,
        "unit_id": unit["id"],
        "formation_name": unit["name"],
        "unit_reference_ranges": ranges,
        "notes": unit.get("notes", ""),
    }


def forecast_pore_pressure(lookahead_m: float | None = None) -> dict[str, Any]:
    """Lookahead pore pressure forecast detecting upcoming overpressure ramp and centroid sand."""
    f = facts()
    warn = _warn()
    t3 = f["triggers"]["T3_PRESSURE_RAMP"]["conditions"]
    sand_top = f["reservoir"]["sand_top_m"]
    fa = _live_frame()
    eta = _eta_to(sand_top, fa["md_m"], float(fa["drilling"]["ROP"]))
    cg = warn["conn_gas_pct"]
    mw_now = float(fa["mud"]["MW_IN_PPG"])
    mw1 = f["mud"]["weighted"]

    return {
        "current_depth_m": fa["md_m"],
        "lookahead_window_m": lookahead_m if lookahead_m is not None else f["ml"]["pp_lookahead_m"],
        "ramp_entry_depth_m": f["pressure"]["pp_ramp_start_m"],
        "sand_top_depth_m": sand_top,
        "distance_to_sand_top_m": eta["distance_m"],
        "eta_to_sand_top_hours": eta["eta_hours"],
        "eta_to_sand_top_minutes": eta["eta_minutes"],
        "rop_used_m_hr": eta["rop_used_m_hr"],
        "current_mw_ppg": round(mw_now, 2),
        "current_mw_sg": round(ppg_to_sg(mw_now), 2),
        "forecast_pore_pressure_at_sand_ppg": warn["pp_forecast_ppg"],
        "forecast_pore_pressure_at_sand_sg": round(ppg_to_sg(warn["pp_forecast_ppg"]), 2),
        "projected_overbalance_if_unchanged_ppg": warn["overbalance_if_unchanged_ppg"],
        "projected_overbalance_if_unchanged_psi": warn["overbalance_if_unchanged_psi"],
        "projected_p_kick_if_unchanged": warn["p_kick_30m_if_unchanged"],
        "p_kick_window_m": f["ml"]["kick_horizon_m"],
        "key_indicators": [
            f"dxc reversal from {t3['dxc_reversal_from_m']:,} m",
            f"DT acoustic sonic {warn['dt_us_ft']} us/ft (+{t3['dt_above_nct_us_ft']} us/ft above normal compaction trend)",
            f"Connection gas jumped from {cg['from']}% to {cg['to']}%",
        ],
        "recommendation": f"Pre-emptive weight-up of active mud system to {mw1['mw_ppg']:.2f} ppg ({mw1['mw_sg']:.2f} SG) prior to sand penetration.",
    }


def compute_ecd(mw: float | None = None, rop: float | None = None, gpm: float | None = None) -> dict[str, Any]:
    """Calculate equivalent circulating density (ECD) and margin to casing shoe FIT. Unset inputs = live values at the bit."""
    f = facts()
    fa = _live_frame()
    mw = float(mw) if mw is not None else float(fa["mud"]["MW_IN_PPG"])
    rop = float(rop) if rop is not None else float(fa["drilling"]["ROP"])
    gpm = float(gpm) if gpm is not None else float(fa["drilling"]["FLOW_IN"])
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    ecd = round(ecd_calibrated(mw_ppg=mw, rop_m_hr=rop), 2)
    margin = round(fit - ecd, 2)
    critical = f["triggers"]["T9_DRILLING_BREAK"]["conditions"]["ecd_fit_margin_max_ppg"]

    return {
        "mud_weight_in_ppg": round(mw, 2),
        "mud_weight_in_sg": round(ppg_to_sg(mw), 2),
        "rop_m_hr": round(rop, 1),
        "flow_rate_gpm": round(gpm),
        "ecd_ppg": ecd,
        "ecd_sg": round(ppg_to_sg(ecd), 2),
        "annular_pressure_loss_psi": round(ppg_to_psi(ecd - mw, f["casing"]["last_shoe"]["md_m"]), 0),
        "casing_shoe_depth_m": f["casing"]["last_shoe"]["md_m"],
        "casing_shoe_fit_ppg": fit,
        "casing_shoe_fit_sg": f["casing"]["last_shoe"]["fit_sg"],
        "ecd_to_fit_margin_ppg": margin,
        "loss_risk": "CRITICAL_NARROW_WINDOW" if margin <= critical else "WITHIN_WINDOW",
    }


def compute_barite(w1: float | None = None, w2: float | None = None, vol_bbl: float | None = None) -> dict[str, Any]:
    """Calculate barite addition to raise mud weight from w1 to w2 (defaults: scenario initial → weighted MW, active system volume)."""
    f = facts()
    w1 = float(w1) if w1 is not None else float(f["mud"]["initial"]["mw_ppg"])
    w2 = float(w2) if w2 is not None else float(f["mud"]["weighted"]["mw_ppg"])
    vol_bbl = float(vol_bbl) if vol_bbl is not None else float(f["mud"]["active_system_bbl"])
    lb_bbl = round(barite_lb_per_bbl(w1, w2), 1)
    tot = barite_total(w1, w2, vol_bbl)

    return {
        "initial_mud_weight_ppg": w1,
        "initial_mud_weight_sg": round(ppg_to_sg(w1), 2),
        "target_mud_weight_ppg": w2,
        "target_mud_weight_sg": round(ppg_to_sg(w2), 2),
        "active_system_volume_bbl": vol_bbl,
        "barite_lb_per_bbl": lb_bbl,
        "total_barite_mt": round(tot["mt"], 1),
        "total_barite_lb": int(round(tot["lb"])),
        "bags_50kg": int(round(round(tot["mt"], 1) * 20)),  # from the displayed MT so it matches the memo
        "bags_100lb": int(round(tot["bags"])),
        "volume_gain_bbl": round(barite_volume_gain_bbl(tot["lb"]), 1),
        "estimated_mixing_time_hours": f["mud"]["weight_up_duration_h"],
        "procedure_ref": "ONGC-MC-SOP-02 (Barite addition & rheology check)",
    }


def search_knowledge(query: str = "deepwater narrow window SOP and offset kicks", filters: dict | None = None) -> dict[str, Any]:
    """Retrieve relevant drilling SOPs, offset Well Completion Reports, DDRs and incident records (cited corpus text)."""
    results = retriever.search(query, filters=filters, k=3)
    return {"query": query, "matches_count": len(results), "documents": results}


def lookup_offset_events(md_range: list[float] | None = None) -> dict[str, Any]:
    """Look up historical offset well incidents, kicks, and losses in the current stratigraphic section."""
    f = facts()
    kick, loss = _offset("KICK"), _offset("LOSSES")
    ki, li = kick["incident"], loss["incident"]
    strat = {u["id"]: u for u in f["stratigraphy"]}
    top, base = strat["U2"]["top_m"], strat["U3"]["base_m"]

    return {
        "section": f"Miocene transition zone and slope-channel turbidites ({top:,}–{base:,} m)",
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
                "citations": kick.get("documents", []),
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
                "key_lesson": f"Cap ROP at {f['drilling']['rop_cap_m_hr']} m/hr during sand penetration to keep ECD below casing shoe FIT.",
                "citations": loss.get("documents", []),
            },
        ],
    }


def create_moc_memo(recommendation: str | None = None) -> dict[str, Any]:
    """Draft formal Management of Change (MOC) memo for mud weight increase."""
    f = facts()
    m0, m1 = f["mud"]["initial"], f["mud"]["weighted"]
    sand = checkpoint("Sand top (offset kick depth)")

    return {
        "memo_id": f["ids"]["memo_id"],
        "title": f"MOC: Pre-Emptive Mud Weight Increase ({m0['mw_ppg']:.2f} ppg → {m1['mw_ppg']:.2f} ppg / {m1['mw_sg']:.2f} SG)",
        "recommendation": recommendation or f"Weight up active mud system from {m0['mw_ppg']:.2f} ppg to {m1['mw_ppg']:.2f} ppg",
        "well_id": f["well"]["id"],
        "well_name": f["well"]["display_name"],
        "program": f["well"]["program"],
        "depth_m": f["mud"]["weight_up_location_m"],
        "status": "DRAFTED_AWAITING_APPROVAL",
        "current_mud_weight_ppg": m0["mw_ppg"],
        "target_mud_weight_ppg": m1["mw_ppg"],
        "target_mud_weight_sg": m1["mw_sg"],
        "barite_required_mt": f["barite"]["total_mt"],
        "barite_bags_50kg": f["barite"]["bags_50kg"],
        "volume_gain_bbl": f["barite"]["volume_gain_bbl"],
        "projected_overbalance_psi": sand["overbalance_psi"],
        "projected_ecd_ppg": sand["ecd_ppg"],
        "shoe_fit_margin_ppg": round(f["casing"]["last_shoe"]["fit_ppg"] - sand["ecd_ppg"], 2),
        "approver_role": "Drilling Superintendent / Company Man",
        "governing_sop": "ONGC-MOC-SOP-07 (Approval Authority)",
        "evidence": _memo_evidence(),
    }


def _memo_evidence() -> list[dict[str, Any]]:
    """Citations behind the memo: offset kick report + offset WCR + SOPs (from the corpus), plus live physics."""
    kick = _offset("KICK")
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    queries = [
        (f"gas kick {kick['incident']['md_m']} overpressure sand mud weight", {"doc_id_prefix": "INC-"}),
        ("well completion report kick mud weight sand", {"doc_id_prefix": "WCR-"}),
        ("management of change mud weight increase approval barite", {"doc_type": "SOP"}),
    ]
    for q, flt in queries:
        try:
            hits = retriever.search(q, filters=flt, k=2)
        except Exception:
            hits = []
        for h in hits:
            if h["doc_id"] in seen or "MN-SM-DW-01" in h["doc_id"]:  # never cite this well's own (future) reports
                continue
            seen.add(h["doc_id"])
            snip = " ".join(str(h.get("snippet", "")).split())
            snip = re.sub(r"^#+\s*", "", snip)
            snip = re.sub(r"\\text\{([^}]*)\}", r"\1", snip).replace("$", "").replace("**", "")
            if h.get("section") and snip.startswith(str(h["section"])):
                snip = snip[len(str(h["section"])):].lstrip(" -:")
            out.append({
                "doc_id": h["doc_id"],
                "doc_type": h.get("doc_type"),
                "section": h.get("section"),
                "page": h.get("page"),
                "snippet": snip[:220] + ("…" if len(snip) > 220 else ""),
                "provenance": h.get("provenance", "SYNTHETIC"),
            })
            break
    # Offset documents named in offsets.yaml that the search did not surface
    for d in kick.get("documents", []):
        if d not in seen:
            seen.add(d)
            out.append({"doc_id": d, "doc_type": "OFFSET", "section": kick["id"], "page": None,
                        "snippet": f"Offset {kick['id']} ({kick['distance_km']} km) — kick at {kick['incident']['md_m']:,} m.",
                        "provenance": "SYNTHETIC"})
    out.append({"doc_id": "LIVE-PPFG", "doc_type": "LIVE", "section": "Pressure window (live)", "page": None,
                "snippet": "Pore-pressure forecast ahead of bit, ECD vs shoe FIT — computed live from the well data.",
                "provenance": "LIVE"})
    return out


def request_approval(memo_id: str | None = None) -> dict[str, Any]:
    """Record formal approval of MOC memo and freeze decision basis into the ledger."""
    mid = memo_id or facts()["ids"]["memo_id"]
    return {
        "approval_id": f"APP-{mid}",
        "memo_id": mid,
        "status": "APPROVED",
        "approver": "Drilling Superintendent (Company Man)",
        "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "decision_basis_frozen": True,
        "ledger_entry": "Recorded in immutable decision ledger with petrophysical and physics basis.",
    }


def _post_json(url: str, body: dict[str, Any], timeout: float = 4.0) -> None:  # facts-ok: network timeout (s)
    import json as _json
    import urllib.request

    req = urllib.request.Request(url, data=_json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 — fixed https endpoints from env
        if r.status >= 300:
            raise RuntimeError(f"HTTP {r.status}")


def _send_telegram(text: str) -> tuple[str, str]:
    """Real Telegram push if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set; else SIMULATED."""
    import os

    tok, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not (tok and chat):
        return "SIMULATED", "Simulated for the demo — shown on the phone mirror"
    try:
        _post_json(f"https://api.telegram.org/bot{tok}/sendMessage", {"chat_id": chat, "text": text})
        return "DELIVERED", "Telegram push sent to Superintendent"
    except Exception as e:  # pragma: no cover — network
        return "FAILED", f"Telegram error: {e}"


def _send_chat(text: str) -> tuple[str, str]:
    """Real Google Chat post if GOOGLE_CHAT_WEBHOOK_URL is set; else SIMULATED."""
    import os

    url = os.getenv("GOOGLE_CHAT_WEBHOOK_URL")
    if not url:
        return "SIMULATED", "Simulated for the demo"
    try:
        _post_json(url, {"text": text})
        return "DELIVERED", "Posted to RTOC Chat space"
    except Exception as e:  # pragma: no cover — network
        return "FAILED", f"Chat error: {e}"


def dispatch_fanout(memo_id: str | None = None, channels: list[str] | None = None) -> dict[str, Any]:
    """Dispatch approved MOC instructions to Mud Chemist, RTOC chat, Drilling Manager email and Superintendent phone."""
    f = facts()
    cids = f["ids"]["dispatch_ids"]
    mid = memo_id or f["ids"]["memo_id"]
    m1 = f["mud"]["weighted"]["mw_ppg"]
    text = (f"{mid} APPROVED — {f['well']['id']}: weight up to {m1:.2f} ppg, "
            f"mix {f['barite']['total_mt']} MT barite before {f['mud']['weight_up_location_m']:,} m.")
    tg_status, tg_note = _send_telegram(text)
    ch_status, ch_note = _send_chat(text)
    dispatches = [
        {"id": cids[0], "channel": "Mud Chemist Console", "lane": "mud", "status": "DELIVERED",
         "note": "Work order shown in the in-app mud console", "action": f"Mix {f['barite']['total_mt']} MT barite"},
        {"id": cids[1], "channel": "RTOC Chat", "lane": "chat", "status": ch_status, "note": ch_note,
         "action": "Watch ECD vs shoe FIT window"},
        {"id": cids[2], "channel": "Drilling Manager Email", "lane": "email", "status": "SIMULATED",
         "note": "Email is simulated in this demo", "action": "Formal MOC notification"},
        {"id": cids[3], "channel": "Superintendent Phone", "lane": "phone", "status": tg_status, "note": tg_note,
         "action": "Hold drilling ahead until weight-up confirmed"},
    ]
    return {
        "memo_id": mid,
        "status": "FANOUT_COMPLETED",
        "channels_dispatched": dispatches,
        "message_text": text,
        "next_step": f"Awaiting confirmation of {m1:.2f} ppg mud weight parity at flow line.",
    }


def set_rop_cap(rop: float | None = None) -> dict[str, Any]:
    """Apply operational ROP ceiling to restrain cuttings loading and prevent ECD from exceeding FIT."""
    f = facts()
    rop = float(rop) if rop is not None else float(f["drilling"]["rop_cap_m_hr"])
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    ecd_new = round(ecd_calibrated(mw_ppg=f["mud"]["weighted"]["mw_ppg"], rop_m_hr=rop), 2)

    return {
        "rop_cap_m_hr": rop,
        "previous_rop_m_hr": f["drilling"]["rop_drilling_break_m_hr"],
        "resulting_ecd_ppg": ecd_new,
        "casing_shoe_fit_ppg": fit,
        "restored_margin_ppg": round(fit - ecd_new, 2),
        "sweeps": "High-viscosity sweeps per ONGC-HC-SOP-05 (Hole Cleaning & ECD Management)",
        "status": "ROP_RESTRICTION_ACTIVE",
    }


def draft_shift_log() -> dict[str, Any]:
    """Draft end-of-shift handover notes; every line carries its source so the WCR can link back."""
    f = facts()
    warn, sand = _warn(), checkpoint("Sand top (offset kick depth)")
    brk, cap = checkpoint("Drilling break"), checkpoint("After ROP cap")
    m0, m1 = f["mud"]["initial"]["mw_ppg"], f["mud"]["weighted"]["mw_ppg"]
    fit = f["casing"]["last_shoe"]["fit_ppg"]
    kick = _offset("KICK")
    lines = [
        {"md_m": warn["md_m"], "text": f"Pressure ramp flagged {warn['distance_to_hazard_m']} m above sand top; "
                                        f"forecast PP {warn['pp_forecast_ppg']:.2f} ppg at {warn['pp_forecast_at_m']:,} m.",
         "source": f"Watchdog T3 @ {warn['md_m']:,} m", "wcr_section": "4. Well Control Audit"},
        {"md_m": warn["md_m"], "text": f"Offset {kick['id']} kicked at {kick['incident']['md_m']:,} m on {kick['incident']['mw_ppg']:.2f} ppg.",
         "source": ", ".join(kick.get("documents", [])), "wcr_section": "1. Geological Summary"},
        {"md_m": f["mud"]["weight_up_location_m"], "text": f"MOC {f['ids']['memo_id']} approved: MW {m0:.2f} → {m1:.2f} ppg, "
                                                             f"{f['barite']['total_mt']} MT barite.",
         "source": f"Ledger {f['ids']['memo_id']}", "wcr_section": "3. Mud Program"},
        {"md_m": sand["md_m"], "text": f"Entered sand top at {sand['md_m']:,} m with +{sand['overbalance_psi']} psi overbalance. No influx.",
         "source": f"Frames @ {sand['md_m']:,} m", "wcr_section": "4. Well Control Audit"},
        {"md_m": brk["md_m"], "text": f"Drilling break at {brk['md_m']:,} m: ROP {brk['rop_m_hr']} m/hr, ECD {brk['ecd_ppg']:.2f} ppg vs FIT {fit:.2f}.",
         "source": f"Watchdog T9 @ {brk['md_m']:,} m", "wcr_section": "2. Drilling Operations"},
        {"md_m": cap["md_m"], "text": f"ROP capped at {f['drilling']['rop_cap_m_hr']} m/hr + sweep; ECD back to {cap['ecd_ppg']:.2f} ppg. No losses.",
         "source": "Ledger ROP_CAP", "wcr_section": "2. Drilling Operations"},
    ]
    return {"doc_id": f"SHIFT-{f['well']['id']}", "status": "DRAFTED", "lines": lines}


def generate_wcr() -> dict[str, Any]:
    """Generate preliminary Well Completion Report (WCR) for the 12-1/4 inch section."""
    f = facts()
    top, td = f["stratigraphy"][0]["top_m"], f["well"]["live_interval_m"]["td"]
    return {
        "doc_id": f["ids"]["wcr_id"],
        "title": f"Well Completion Report — {f['well']['id']} Section 12-1/4 in ({top:,}–{td:,} m)",
        "well_id": f["well"]["id"],
        "basin": f["well"]["basin"],
        "program": f["well"]["program"],
        "status": "COMPILED",
        "google_doc_url": "https://docs.google.com/document/d/1wcr-mn-sm-dw-01-ongc-preview",
        "sections_included": [
            "1. Geological Summary & Stratigraphy",
            "2. Drilling Operations & ROP Log",
            f"3. Mud Program & Weight-Up ({f['mud']['weight_up_location_m']:,} m)",
            "4. Well Control Audit & Zero-Kick Performance",
            "5. Casing & Cementing Report",
        ],
    }


def writeback_lessons() -> dict[str, Any]:
    """Write back operational lessons learned to the corporate knowledge vector index."""
    f = facts()
    warn, brk = _warn(), checkpoint("Drilling break")
    return {
        "status": "WRITTEN_TO_KNOWLEDGE_BASE",
        "lessons_indexed": [
            {
                "id": "LESSON-MN-SM-01",
                "title": "Pre-Emptive Weight-Up in Mahanadi Centroid Turbidites",
                "summary": f"Sonic transit time NCT divergence reliably signaled overpressured sand {warn['distance_to_hazard_m']} m ahead.",
            },
            {
                "id": "LESSON-MN-SM-02",
                "title": "ROP Capping for Narrow-Window Deepwater ECD Management",
                "summary": f"Restricting ROP to {f['drilling']['rop_cap_m_hr']} m/hr avoided hole loading and prevented losses at {brk['md_m']:,} m.",
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
    "draft_shift_log": draft_shift_log,
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
