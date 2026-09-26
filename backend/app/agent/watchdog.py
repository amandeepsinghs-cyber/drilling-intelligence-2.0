"""agent.watchdog — evaluates triggers and formats SYSTEM_EVENTs for proactive speech (SDD §10.4)."""
from __future__ import annotations

from typing import Any
from app.scenario.facts import facts


def evaluate_watchdog_triggers(
    md_m: float,
    frame: dict[str, Any],
    fired_triggers: set[str] | None = None,
) -> dict[str, Any] | None:
    """Evaluate well conditions against canonical triggers and return trigger payload if fired."""
    fired = fired_triggers or set()
    f = facts()
    trigs = f.get("triggers", {})

    # T3_PRESSURE_RAMP at 4172 m
    t3 = trigs.get("T3_PRESSURE_RAMP", {})
    if "T3_PRESSURE_RAMP" not in fired and abs(md_m - t3.get("md_m", 4172.0)) <= 0.5:
        return {
            "trigger_id": "T3_PRESSURE_RAMP",
            "md_m": md_m,
            "severity": "CRITICAL_WARNING",
            "headline": "Overpressure ramp detected ahead of bit",
            "facts": {
                "dxc_reversal_from_m": 4160.0,
                "dt_above_nct_us_ft": 10.0,
                "connection_gas_pct": frame.get("mudlog", {}).get("CONN_GAS", 1.1),
                "p_kick_30m": frame.get("ml", {}).get("p_kick", 0.71),
                "forecast_sand_top_m": 4195.0,
                "forecast_pp_ppg": 11.48,
                "distance_to_sand_m": 23.0,
                "overbalance_if_unchanged_psi": -200,
            },
            "prompt_injection": (
                "SYSTEM_EVENT{trigger_id='T3_PRESSURE_RAMP', md=4172, "
                "facts='dxc reversed from 4,160 m, DT is +10 us/ft above NCT, conn gas is 1.1%, "
                "kick probability next 30m is 71%, forecast PP at 4,195 m sand is 11.48 ppg (-200 psi underbalanced)'. "
                "Instruction: Speak immediately unprompted in Hinglish starting with 'Sir, ek minute —', "
                "warn about the pressure ramp and offset kick precedent, and recommend pre-emptive weight-up.}"
            ),
        }

    # T8_OFFSET_DEPTH at 4195 m
    t8 = trigs.get("T8_OFFSET_DEPTH", {})
    if "T8_OFFSET_DEPTH" not in fired and abs(md_m - t8.get("md_m", 4195.0)) <= 0.5:
        return {
            "trigger_id": "T8_OFFSET_DEPTH",
            "md_m": md_m,
            "severity": "INFO_REASSURANCE",
            "headline": "Sand top penetrated at offset kick depth",
            "facts": {
                "depth_m": 4195.0,
                "active_mw_ppg": frame.get("mud", {}).get("MW_IN_PPG", 11.65),
                "pore_pressure_ppg": 11.48,
                "overbalance_psi": 120,
                "p_kick_30m": 0.06,
            },
            "prompt_injection": (
                "SYSTEM_EVENT{trigger_id='T8_OFFSET_DEPTH', md=4195, "
                "facts='Sand top penetrated at 4,195 m with weighted 11.65 ppg mud, overbalance +120 psi, "
                "kick probability reduced to 6%'. Instruction: Speak concisely, confirm well is completely stable "
                "where offset MN-DW-02 took an 18 bbl kick.}"
            ),
        }

    # T9_DRILLING_BREAK at 4205 m
    t9 = trigs.get("T9_DRILLING_BREAK", {})
    if "T9_DRILLING_BREAK" not in fired and abs(md_m - t9.get("md_m", 4205.0)) <= 0.5:
        return {
            "trigger_id": "T9_DRILLING_BREAK",
            "md_m": md_m,
            "severity": "WARNING_LOSS_RISK",
            "headline": "Drilling break in sand — ECD approaching shoe FIT",
            "facts": {
                "depth_m": 4205.0,
                "rop_jump_m_hr": 34.0,
                "ecd_ppg": 12.02,
                "shoe_fit_ppg": 12.10,
                "margin_to_fit_ppg": 0.08,
            },
            "prompt_injection": (
                "SYSTEM_EVENT{trigger_id='T9_DRILLING_BREAK', md=4205, "
                "facts='ROP jumped to 34 m/hr drilling break, ECD surged to 12.02 ppg leaving only 0.08 ppg "
                "margin to shoe FIT (12.10 ppg)'. Instruction: Alert the Driller unprompted to cap ROP at 12 m/hr "
                "and pump a high-viscosity sweep to avoid losses like offset MN-DW-03.}"
            ),
        }

    return None
