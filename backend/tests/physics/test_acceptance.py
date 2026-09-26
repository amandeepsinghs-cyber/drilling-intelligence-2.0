"""Physics acceptance tests: every value must match brief §3C / data/scenario/mn_sm_dw_01.yaml."""
import pytest

from app.physics import (
    barite_lb_per_bbl, barite_total, barite_volume_gain_bbl, ecd_calibrated, fg_matthews_kelly,
    loss_limit, obg_ppg, overbalance_psi, pp_eaton_sonic, ppg_to_sg,
)


def test_obg_at_sand_top_is_about_14_ppg():
    assert obg_ppg(4195, water_depth_m=1620, air_gap_m=25, sediment_density_gcc=2.1) == pytest.approx(14.0, abs=0.1)


def test_fit_below_obg_physically_consistent():
    assert 11.48 < 12.10 < obg_ppg(4195, 1620, 25)


@pytest.mark.parametrize("ppg,sg", [(10.95, 1.31), (11.20, 1.34), (11.48, 1.38), (11.65, 1.40), (12.10, 1.45)])
def test_sg_conversions(ppg, sg):
    assert round(ppg_to_sg(ppg), 2) == sg


def test_overbalance_psi():
    assert overbalance_psi(11.20, 11.48, 4195) == pytest.approx(-200, abs=5)
    assert overbalance_psi(11.65, 11.48, 4195) == pytest.approx(120, abs=5)


def test_barite():
    assert barite_lb_per_bbl(11.20, 11.65) == pytest.approx(28.3, abs=0.1)
    t = barite_total(11.20, 11.65, 3100)
    assert t["mt"] == pytest.approx(39.8, abs=0.2)
    assert t["bags"] == pytest.approx(796, abs=2)
    assert barite_volume_gain_bbl(t["lb"]) == pytest.approx(60, abs=1)


@pytest.mark.parametrize("mw,rop,resid,expected", [
    (11.20, 22, 0.0, 11.42),   # before
    (11.65, 12, 0.0, 11.84),   # sand top after weight-up
    (11.65, 34, 0.0, 12.02),   # drilling break
    (11.65, 12, 0.02, 11.86),  # after ROP cap (residual cuttings bed)
])
def test_ecd_checkpoints(mw, rop, resid, expected):
    assert ecd_calibrated(mw, rop, resid) == pytest.approx(expected, abs=0.005)


def test_eaton_identity_on_trend():
    assert pp_eaton_sonic(obg=14.0, pn=8.7, dt_normal=90, dt_observed=90) == pytest.approx(8.7)


def test_eaton_increases_off_trend():
    assert pp_eaton_sonic(14.0, 8.7, 88, 108) > pp_eaton_sonic(14.0, 8.7, 88, 95)


def test_loss_limit_uses_weaker():
    fg = fg_matthews_kelly(obg=14.0, pp=11.48, ki=0.6)
    assert loss_limit(fg, 12.10) == 12.10
