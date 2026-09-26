"""O3 / A-11 guard: tools and watchdog speak only YAML facts; search_knowledge returns cited corpus text."""
from __future__ import annotations

from app.agent import tools
from app.agent.watchdog import evaluate_watchdog_triggers
from app.scenario.facts import checkpoint, facts, offsets


def test_every_tool_runs_with_defaults():
    tools.set_live_depth(facts()["well"]["live_interval_m"]["start"])
    for name in tools.TOOL_MAP:
        out = tools.execute_tool(name, {})
        assert "error" not in out, (name, out)


def test_defaults_come_from_yaml():
    f = facts()
    b = tools.compute_barite()
    assert b["total_barite_mt"] == f["barite"]["total_mt"]
    assert b["estimated_mixing_time_hours"] == f["mud"]["weight_up_duration_h"]
    assert tools.set_rop_cap()["rop_cap_m_hr"] == f["drilling"]["rop_cap_m_hr"]
    m = tools.create_moc_memo()
    sand = checkpoint("Sand top (offset kick depth)")
    assert m["projected_overbalance_psi"] == sand["overbalance_psi"] and m["projected_ecd_ppg"] == sand["ecd_ppg"]
    assert tools.forecast_pore_pressure()["lookahead_window_m"] == f["ml"]["pp_lookahead_m"]


def test_watchdog_matches_yaml_including_offset_gain():
    f = facts()
    kick = next(o for o in offsets()["offsets"] if o["id"] == "MN-DW-02")["incident"]
    t8 = evaluate_watchdog_triggers(f["triggers"]["T8_OFFSET_DEPTH"]["md_m"], {})
    assert f"{kick['gain_bbl']} bbl kick" in t8["prompt_injection"]
    t3 = evaluate_watchdog_triggers(f["triggers"]["T3_PRESSURE_RAMP"]["md_m"], {})
    warn = checkpoint("Warning point")
    assert f"{warn['overbalance_if_unchanged_psi']} psi" in t3["prompt_injection"]
    assert f"next {f['ml']['kick_horizon_m']} m" in t3["prompt_injection"]
    t9 = evaluate_watchdog_triggers(f["triggers"]["T9_DRILLING_BREAK"]["md_m"], {})
    assert f"cap ROP at {f['drilling']['rop_cap_m_hr']} m/hr" in t9["prompt_injection"]


def test_search_knowledge_returns_corpus_citations():
    out = tools.search_knowledge("offset MN-DW-02 kick at sand top 4195 SIDPP")
    ids = [d["doc_id"] for d in out["documents"]]
    assert out["matches_count"] >= 1 and any("MN-DW-02" in i for i in ids), ids
    sop = tools.search_knowledge("barite weight-up rheology sign-off", {"doc_type": "SOP"})
    assert sop["documents"] and all(d["doc_type"] == "SOP" for d in sop["documents"])
    assert sop["documents"][0]["doc_id"] == "ONGC-MC-SOP-02", [d["doc_id"] for d in sop["documents"]]
