"""O6 guard tests: the hi-res synthetic logs must obey the physics the story relies on.

Numbers are read from the scenario YAMLs (never hard-coded) except physical tolerances.
"""
import numpy as np
import pytest

from app.scenario.facts import facts
from app.scenario.frames import build_frames


@pytest.fixture(scope="module")
def fs():
    return build_frames()


@pytest.fixture(scope="module")
def df(fs):
    return fs.df


def _at(df, md):
    return df.iloc[int(np.argmin(np.abs(df["md_m"].to_numpy() - md)))]


def _clean_gas_sand(df, margin_m=1.0):
    """Gas-leg sand samples at least `margin_m` from any bed boundary (no shoulder-bed smearing)."""
    md = df["md_m"].to_numpy()
    sand = (df["truth.LITHO"] == "SAND").to_numpy()
    k = int(round(margin_m / (md[1] - md[0])))
    core = sand.copy()
    for s in range(1, k + 1):
        core[s:] &= sand[:-s]
        core[:-s] &= sand[s:]
    return core & (md < facts()["reservoir"]["gwc_m"] - 2)


def test_grid_is_high_resolution(fs):
    assert fs.meta["grid"]["step_m"] == pytest.approx(0.125)
    for cp in facts()["checkpoints"]:                         # every checkpoint lands on a sample
        assert np.isclose(fs.df["md_m"], cp["md_m"]).any()


def test_dt_departure_at_t3(df, fs):
    trig = facts()["triggers"]["T3_PRESSURE_RAMP"]
    r = _at(df, trig["md_m"])
    need = trig["conditions"]["dt_above_nct_us_ft"]
    assert r["curves.DT"] - r["trend.DT_NCT"] == pytest.approx(need, abs=1.0)
    warn = next(c for c in facts()["checkpoints"] if c["label"] == "Warning point")
    assert r["curves.DT"] == pytest.approx(warn["dt_us_ft"], abs=0.5)
    d = fs.meta["lwd_source"]["dt_decomposition_at_trigger"]
    assert 0 < d["eaton_us_ft"] < d["transition_gas_us_ft"]                   # documented split
    assert d["nct_us_ft"] + d["eaton_us_ft"] + d["transition_gas_us_ft"] + d["noise_us_ft"] == pytest.approx(
        d["logged_us_ft"], abs=0.05)


def test_rdep_below_trend_in_transition(df):
    r = _at(df, facts()["triggers"]["T3_PRESSURE_RAMP"]["md_m"])
    assert r["curves.RDEP"] < 0.95 * r["trend.RDEP_NCT"]


def test_density_neutron_crossover_only_in_gas_leg(df):
    phid = (2.71 - df["curves.RHOB"]) / 1.71                    # limestone-matrix density porosity
    sep = phid - df["curves.NPHI"]
    md = df["md_m"]
    gwc = facts()["reservoir"]["gwc_m"]
    sand = df["truth.LITHO"] == "SAND"
    assert sep[_clean_gas_sand(df)].median() > 0.08            # gas effect
    assert sep[sand & (md > gwc + 2)].median() < 0.05          # water leg: matrix effect only
    assert sep[md < 4150].median() < -0.05                     # shale: neutron > density


def test_sobm_resistivity_profile(df):
    md = df["md_m"]
    gwc = facts()["reservoir"]["gwc_m"]
    water = (df["truth.LITHO"] == "SAND") & (md > gwc + 2)
    sh, me, de = (df[f"curves.{k}"][water].median() for k in ("RSHAL", "RMED", "RDEP"))
    assert sh > me > de                                        # oil filtrate raises Rxo over brine
    gas = _clean_gas_sand(df)
    ratio = (df["curves.RSHAL"][gas] / df["curves.RDEP"][gas]).median()
    assert ratio == pytest.approx(1.0, abs=0.15)               # gas leg: curves stack (no conductive invasion)


def test_ranges_match_yaml(df):
    units = {u["id"]: u for u in facts()["stratigraphy"]}
    md = df["md_m"]
    u1 = (md >= units["U1"]["top_m"]) & (md < units["U1"]["base_m"])
    lo, hi = units["U1"]["gr_api"]
    assert lo <= df["curves.GR"][u1].median() <= hi
    lo, hi = units["U1"]["rdep_ohmm"]
    assert lo <= df["curves.RDEP"][u1].median() <= hi
    gas = _clean_gas_sand(df)
    lo, hi = units["U3"]["gr_api"]
    assert lo <= df["curves.GR"][gas].median() <= hi
    lo, hi = units["U3"]["rdep_ohmm"]
    assert lo <= df["curves.RDEP"][gas].median() <= hi


def test_reservoir_properties(df, fs):
    res = facts()["reservoir"]
    gas_net = (df["truth.LITHO"] == "SAND") & (df["md_m"] < res["gwc_m"])
    assert df["truth.PHIE"][gas_net].mean() == pytest.approx(res["phie_pct"] / 100, abs=0.005)
    assert fs.meta["lwd_source"]["u3_ntg"] == pytest.approx(res["net_to_gross"], abs=0.03)
    q = (df["truth.VQTZ"] / (1 - df["truth.PHIT"]))[gas_net].median()
    assert q == pytest.approx(res["quartz_pct"] / 100, abs=0.02)
    assert df["curves.SW"][_clean_gas_sand(df)].median() == pytest.approx(res["sw_gas_leg"], abs=0.05)


def test_dry_gas_in_u3(df):
    u3 = (df["md_m"] >= 4195) & (df["md_m"] < 4290)
    hc = sum(df[f"mudlog.C{i}"] for i in range(1, 6))
    c1 = (df["mudlog.C1"] / hc)[u3].median() * 100
    assert c1 > facts()["reservoir"]["gas_c1_pct_min"]


def test_cuttings_lag_and_sum(df):
    tot = df["mudlog.CUT_SHALE_PCT"] + df["mudlog.CUT_CARB_PCT"] + df["mudlog.CUT_SAND_SILT_PCT"]
    assert np.allclose(tot, 100)
    lag_min = facts()["mudlog"]["bottoms_up_lag_min"]
    r = _at(df, 4120)
    assert r["mudlog.LAG_M"] == pytest.approx(r["drilling.ROP"] * lag_min / 60)
    # sand reaches the shakers only after the bit is a lag-distance into U3
    top = facts()["reservoir"]["sand_top_m"]
    assert _at(df, top + 1)["mudlog.CUT_SAND_SILT_PCT"] < 60


def test_no_sp_curve(df):
    assert not any(c.endswith(".SP") for c in df.columns)     # SOBM: SP cannot be recorded


def test_truth_volumes_close(df):
    s = df["truth.VCL"] + df["truth.VQTZ"] + df["truth.VCALC"] + df["truth.PHIT"]
    assert np.allclose(s, 1.0, atol=1e-9)
