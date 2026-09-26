"""Real-LWD drop-in: registration math + PUBLIC-over-SYNTHETIC precedence without editing values."""
import json

import numpy as np
import pandas as pd
import pytest

from app.scenario import frames as frames_mod
from app.scenario.registration import convert, map_curves, register_depth, resample


def test_register_shift_stretch():
    reg = {"source_top_m": 500, "source_base_m": 730, "target_top_m": 4000, "target_base_m": 4460,
           "method": "shift_stretch"}
    assert register_depth(np.array([500, 615, 730]), reg).tolist() == [4000, 4230, 4460]


def test_register_shift():
    reg = {"source_top_m": 500, "target_top_m": 4000, "method": "shift"}
    assert register_depth(np.array([510.0]), reg)[0] == 4010


def test_units_and_nulls():
    df = pd.DataFrame({"DEPTH": [1, 2], "DTCO": [328.0, -999.25], "NPOR": [30.0, 31.0]})
    man = {"curves": [{"source_mnemonic": "DTCO", "canonical": "DT", "source_unit": "us/m", "target_unit": "us/ft"},
                      {"source_mnemonic": "NPOR", "canonical": "NPHI", "source_unit": "%", "target_unit": "v/v"}]}
    out = map_curves(df, man)
    assert out["DT"].iloc[0] == pytest.approx(99.97, abs=0.01) and np.isnan(out["DT"].iloc[1])
    assert out["NPHI"].tolist() == [0.30, 0.31]
    with pytest.raises(ValueError):
        convert(np.array([1.0]), "furlong", "us/ft")


def test_resample_keeps_gaps():
    df = pd.DataFrame({"DEPTH": [4000, 4001, 4010, 4011], "GR": [1.0, 2.0, 3.0, 4.0]})
    out = resample(df, "DEPTH", np.arange(4000, 4011.5, 0.5), max_gap_m=2.0)
    assert out["GR"].iloc[1] == pytest.approx(1.5)
    assert np.isnan(out.loc[out.md_m == 4005, "GR"]).all()


def test_public_curves_take_precedence(tmp_path, monkeypatch):
    md = np.round(np.arange(4000, 4460.25, 0.5), 3)
    real_gr = 50 + 10 * np.sin(md / 7)
    p = tmp_path / "mn_sm_dw_01.parquet"
    pd.DataFrame({"md_m": md, "GR": real_gr}).to_parquet(p, index=False)
    p.with_suffix(".meta.json").write_text(json.dumps({"provenance": "PUBLIC", "dataset_id": "test"}))
    monkeypatch.setattr(frames_mod, "lwd_path", lambda _w: p)
    fs = frames_mod.build_frames()
    assert fs.provenance["curves.GR"] == "PUBLIC"
    assert np.allclose(fs.df["curves.GR"], real_gr)          # values untouched
    assert fs.provenance["curves.DT"] == "SYNTHETIC"         # absent curve → labelled stand-in
    assert fs.provenance["overlays.DT_SCN"] == "SIMULATED"   # scenario signature as separate overlay
    assert fs.meta["curve_sources"]["GR"] == "public"
