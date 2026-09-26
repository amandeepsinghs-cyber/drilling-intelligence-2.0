"""Frames must reproduce every brief §3C checkpoint and carry honest provenance."""
import numpy as np
import pytest

from app.scenario.frames import build_frames, frame_at, to_columnar


@pytest.fixture(scope="module")
def fs():
    return build_frames()


def row(fs, md):
    df = fs.df
    return df.iloc[int(np.argmin(np.abs(df["md_m"].to_numpy() - md)))]


def test_grid(fs):
    assert fs.df["md_m"].iloc[0] == 4000 and fs.df["md_m"].iloc[-1] == 4460 and len(fs.df) == 3681


@pytest.mark.parametrize("md,mw,ecd,rop,pk", [
    (4120, 11.20, 11.42, 22, 0.04),     # Before
    (4195, 11.65, 11.84, 12, 0.06),     # Sand top
    (4205, 11.65, 12.02, 34, 0.05),     # Drilling break
    (4205.5, 11.65, 11.86, 12, 0.04),   # After ROP cap
])
def test_checkpoints(fs, md, mw, ecd, rop, pk):
    r = row(fs, md)
    assert r["mud.MW_IN_PPG"] == pytest.approx(mw)
    assert r["derived.ECD"] == pytest.approx(ecd, abs=0.005)
    assert r["drilling.ROP"] == pytest.approx(rop, abs=0.3)
    assert r["ml.p_kick"] == pytest.approx(pk, abs=0.005)


def test_margins(fs):
    assert row(fs, 4205)["derived.ECD_FIT_MARGIN"] == pytest.approx(0.08, abs=0.005)
    assert row(fs, 4205.5)["derived.ECD_FIT_MARGIN"] == pytest.approx(0.24, abs=0.005)


def test_pressure_and_overbalance(fs):
    r = row(fs, 4195)
    assert r["derived.PP"] == pytest.approx(11.48, abs=0.005)
    assert r["derived.OVERBAL_PSI"] == pytest.approx(120, abs=5)
    assert row(fs, 4120)["derived.PP"] == pytest.approx(10.95)
    assert row(fs, 4195)["derived.OBG"] == pytest.approx(14.0, abs=0.1)


def test_t3_signatures(fs):
    r = row(fs, 4172)
    assert r["ml.p_kick"] == pytest.approx(0.71, abs=0.005)
    assert r["curves.DT"] - r["trend.DT_NCT"] >= 10
    assert r["mudlog.CONN_GAS"] == pytest.approx(1.1)
    assert r["drilling.DXC"] < row(fs, 4150)["drilling.DXC"]           # dxc reversal
    assert r["curves.RDEP"] < r["trend.RDEP_NCT"]                       # resistivity below trend


def test_ghost_path_is_unchanged_mw(fs):
    assert row(fs, 4195)["ghost.MW_UNCHANGED"] == pytest.approx(11.20)


def test_provenance_labels(fs):
    p = fs.provenance
    # Petrophysics is high-resolution SYNTHETIC (O6); no real log is loaded.
    assert all(p[f"curves.{c}"] == "SYNTHETIC" for c in ("GR", "RDEP", "DT"))
    assert p["truth.VSH"] == "SYNTHETIC" and fs.meta["lwd_source"]["source"] == "synthetic_hires"
    assert p["derived.ECD"] == "DERIVED" and p["drilling.ROP"] == "SIMULATED"
    assert p["ml.p_kick"] == "MODEL_INFERENCE"


def test_payloads(fs):
    col = to_columnar(fs, 4100, 4200, 2)
    assert col["md_m"][0] >= 4100 and "derived.ECD" in col["columns"]
    f = frame_at(fs, 4172)
    assert f["md_m"] == 4172 and "GR" in f["curves"] and f["ml"]["litho"]["class"] == "SILTSTONE"


def test_deterministic():
    a, b = build_frames(), build_frames()
    assert np.allclose(a.df["curves.GR"], b.df["curves.GR"], equal_nan=True)
