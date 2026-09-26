"""agent.watchdog — evaluates triggers and formats SYSTEM_EVENTs for proactive speech (SDD §10.4).

Every number in a payload / prompt injection is read from data/scenario/*.yaml (O3 / P0-4).
No literal fallbacks: a missing fact raises KeyError at import-time tests rather than letting the
agent speak an invented value.
"""
from __future__ import annotations

from typing import Any

from app.scenario.facts import checkpoint, facts, offsets


def _offset(offset_id: str) -> dict[str, Any]:
    return next(o for o in offsets()["offsets"] if o["id"] == offset_id)


def _fmt_m(v: float) -> str:
    return f"{v:,.0f}"


def evaluate_watchdog_triggers(
    md_m: float,
    frame: dict[str, Any],
    fired_triggers: set[str] | None = None,
) -> dict[str, Any] | None:
    """Evaluate well conditions against canonical triggers and return trigger payload if fired."""
    fired = fired_triggers or set()
    f = facts()
    trigs = f["triggers"]
    kick_offset = _offset("MN-DW-02")
    loss_offset = _offset("MN-DW-03")
    horizon = f["ml"]["kick_horizon_m"]

    # T3_PRESSURE_RAMP — warning point
    t3 = trigs["T3_PRESSURE_RAMP"]
    if "T3_PRESSURE_RAMP" not in fired and abs(md_m - t3["md_m"]) <= 0.5:
        cp = checkpoint("Warning point")
        cond = t3["conditions"]
        gas = frame.get("mudlog", {}).get("CONN_GAS", cp["conn_gas_pct"]["to"])
        pk = frame.get("ml", {}).get("p_kick", cp["p_kick_30m_if_unchanged"])
        return {
            "trigger_id": "T3_PRESSURE_RAMP",
            "md_m": md_m,
            "severity": "CRITICAL_WARNING",
            "headline": "Overpressure ramp detected ahead of bit",
            "facts": {
                "dxc_reversal_from_m": cond["dxc_reversal_from_m"],
                "dt_above_nct_us_ft": cond["dt_above_nct_us_ft"],
                "connection_gas_pct": gas,
                "p_kick_30m": pk,
                "forecast_sand_top_m": cp["pp_forecast_at_m"],
                "forecast_pp_ppg": cp["pp_forecast_ppg"],
                "distance_to_sand_m": cp["distance_to_hazard_m"],
                "overbalance_if_unchanged_psi": cp["overbalance_if_unchanged_psi"],
            },
            "prompt_injection": (
                f"SYSTEM_EVENT{{trigger_id='T3_PRESSURE_RAMP', md={t3['md_m']}, "
                f"facts='dxc reversed from {_fmt_m(cond['dxc_reversal_from_m'])} m, DT is +{cond['dt_above_nct_us_ft']} us/ft above NCT, "
                f"conn gas is {gas}%, kick probability next {horizon} m is {round(pk * 100)}%, "
                f"forecast PP at {_fmt_m(cp['pp_forecast_at_m'])} m sand is {cp['pp_forecast_ppg']:.2f} ppg "
                f"({cp['overbalance_if_unchanged_psi']} psi underbalanced)'. "
                "Instruction: Speak immediately unprompted in Hinglish starting with 'Sir, ek minute —', "
                "warn about the pressure ramp and offset kick precedent, and recommend pre-emptive weight-up.}"
            ),
        }

    # T8_OFFSET_DEPTH — sand top at the offset kick depth
    t8 = trigs["T8_OFFSET_DEPTH"]
    if "T8_OFFSET_DEPTH" not in fired and abs(md_m - t8["md_m"]) <= 0.5:
        cp = checkpoint("Sand top (offset kick depth)")
        mw = frame.get("mud", {}).get("MW_IN_PPG", cp["mw_ppg"])
        inc = kick_offset["incident"]
        return {
            "trigger_id": "T8_OFFSET_DEPTH",
            "md_m": md_m,
            "severity": "INFO_REASSURANCE",
            "headline": "Sand top penetrated at offset kick depth",
            "facts": {
                "depth_m": cp["md_m"],
                "active_mw_ppg": mw,
                "pore_pressure_ppg": cp["pp_ppg"],
                "overbalance_psi": cp["overbalance_psi"],
                "p_kick_30m": cp["p_kick_30m"],
            },
            "prompt_injection": (
                f"SYSTEM_EVENT{{trigger_id='T8_OFFSET_DEPTH', md={t8['md_m']}, "
                f"facts='Sand top penetrated at {_fmt_m(cp['md_m'])} m with weighted {mw:.2f} ppg mud, "
                f"overbalance +{cp['overbalance_psi']} psi, kick probability reduced to {round(cp['p_kick_30m'] * 100)}%'. "
                "Instruction: Speak concisely, confirm well is completely stable "
                f"where offset {kick_offset['id']} took a {inc['gain_bbl']} bbl kick.}}"
            ),
        }

    # T9_DRILLING_BREAK — ECD approaching shoe FIT
    t9 = trigs["T9_DRILLING_BREAK"]
    if "T9_DRILLING_BREAK" not in fired and abs(md_m - t9["md_m"]) <= 0.5:
        cp = checkpoint("Drilling break")
        fit = f["casing"]["last_shoe"]["fit_ppg"]
        cap = f["drilling"]["rop_cap_m_hr"]
        return {
            "trigger_id": "T9_DRILLING_BREAK",
            "md_m": md_m,
            "severity": "WARNING_LOSS_RISK",
            "headline": "Drilling break in sand — ECD approaching shoe FIT",
            "facts": {
                "depth_m": cp["md_m"],
                "rop_jump_m_hr": cp["rop_m_hr"],
                "ecd_ppg": cp["ecd_ppg"],
                "shoe_fit_ppg": fit,
                "margin_to_fit_ppg": cp["ecd_fit_margin_ppg"],
            },
            "prompt_injection": (
                f"SYSTEM_EVENT{{trigger_id='T9_DRILLING_BREAK', md={t9['md_m']}, "
                f"facts='ROP jumped to {cp['rop_m_hr']} m/hr drilling break, ECD surged to {cp['ecd_ppg']:.2f} ppg "
                f"leaving only {cp['ecd_fit_margin_ppg']:.2f} ppg margin to shoe FIT ({fit:.2f} ppg)'. "
                f"Instruction: Alert the Driller unprompted to cap ROP at {cap} m/hr "
                f"and pump a high-viscosity sweep to avoid losses like offset {loss_offset['id']}.}}"
            ),
        }

    return None
