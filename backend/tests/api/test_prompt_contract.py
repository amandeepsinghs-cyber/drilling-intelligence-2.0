"""P0-3 behaviour contract: the system prompt renders fully from the YAML and carries every hard rule."""
from app.agent.prompts import get_agent_system_prompt, render_prompt
from app.scenario.facts import facts

import pytest


def test_prompt_renders_without_placeholders():
    p = get_agent_system_prompt()
    assert "{{" not in p and "}}" not in p


def test_prompt_contains_contract_rules():
    p = get_agent_system_prompt()
    for must in ("No invented numbers", "Clarify when ambiguous", "Well control first", "Approval gate",
                 "[WATCHDOG EVENT", "[AGENT CONTINUATION", "both sides", "Sir, ek minute"):
        assert must in p, must


def test_well_facts_come_from_yaml():
    f = facts()
    p = get_agent_system_prompt()
    r = f["reservoir"]
    for v in (r["gwc_m"], r["phie_pct"], r["quartz_pct"], r["gross_gas_column_m"], f["casing"]["last_shoe"]["fit_ppg"]):
        assert str(v) in p
    assert f["ids"]["memo_id"] in p


def test_unknown_placeholder_fails_loudly():
    with pytest.raises(KeyError):
        render_prompt("x {{reservoir.no_such_key}}", facts())
