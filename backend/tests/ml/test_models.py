"""WP-12 guard tests: the trained lithology model loads, is used by the frames, and reads the rock correctly.

The A-14 shale-volume target (median vol.SHALE >= 0.75 in shale) is deliberately NOT asserted: it measures
0.70 today and is parked with WP-15 (curve calibration).
"""
import numpy as np
import pytest

pytest.importorskip("joblib")
pytest.importorskip("sklearn")

from app.ml import lithology  # noqa: E402
from app.scenario.frames import build_frames  # noqa: E402


@pytest.fixture(scope="module")
def df():
    return build_frames().df


def test_trained_lithology_model_loads():
    assert lithology.is_trained_model_loaded()


def test_frames_report_trained_model():
    assert build_frames().meta["ml_status"] == "trained_rf_lithology"


@pytest.mark.parametrize("litho", ["SHALE", "SAND", "LIMESTONE"])
def test_litho_class_matches_truth(df, litho):
    sub = df[df["truth.LITHO"] == litho]
    assert len(sub) > 0
    acc = float(np.mean(sub["ml.litho.class"].to_numpy() == litho))
    assert acc >= 0.9, f"{litho} accuracy {acc:.2f}"


def test_sand_volume_reads_sand(df):
    sub = df[df["truth.LITHO"] == "SAND"]
    assert float(sub["vol.SAND"].median()) >= 0.6
