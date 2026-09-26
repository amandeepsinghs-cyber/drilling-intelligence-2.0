"""A-8: tools answer for the live bit depth and compute distance / ETA (never quote a time)."""
from app.agent import tools
from app.scenario import store
from app.scenario.facts import facts
from app.scenario.frames import frame_at


def test_eta_follows_live_depth():
    f = facts()
    sand = f["reservoir"]["sand_top_m"]
    for md in (4120.0, 4145.0, 4172.0):
        tools.set_live_depth(md)
        st = tools.get_well_status()
        rop = float(frame_at(store.get(f["well"]["id"]), md)["drilling"]["ROP"])
        nz = st["next_zone"]
        assert st["depth_md_m"] == md
        assert nz["distance_m"] == round(sand - md, 1)
        assert abs(nz["eta_hours"] - round((sand - md) / rop, 2)) < 1e-9
        fc = tools.forecast_pore_pressure()
        assert fc["current_depth_m"] == md and fc["eta_to_sand_top_hours"] == nz["eta_hours"]
    tools.LIVE_CONTEXT["md_m"] = None


def test_forecast_text_has_no_stale_literals():
    tools.set_live_depth(4172.0)
    fc = tools.forecast_pore_pressure()
    f = facts()
    assert f"{f['mud']['weighted']['mw_ppg']:.2f}" in fc["recommendation"]
    tools.LIVE_CONTEXT["md_m"] = None


def test_next_zone_carries_sand_lookahead():
    tools.set_live_depth(4145.0)
    nz = tools.get_well_status()["next_zone"]
    warn = next(c for c in facts()["checkpoints"] if c["label"] == "Warning point")
    assert nz["overbalance_at_sand_if_unchanged_psi"] == warn["overbalance_if_unchanged_psi"]
    assert nz["kick_side_status"].startswith("UNDERBALANCED")
    tools.LIVE_CONTEXT["md_m"] = None
