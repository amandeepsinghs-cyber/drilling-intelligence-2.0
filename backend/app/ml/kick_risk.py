"""ml.kick_risk — Trained GradientBoosting kick/loss risk detector serving module (W10 / SDD §8).

Loads the trained model from data/models/kick_risk/kick_risk_model.joblib.
Predicts look-ahead kick probability (p_kick) based on acoustic overpressure departure,
resistivity ratio, density, neutron porosity, and distance to hazard sand.
Falls back to baseline heuristic if the model file is not available.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL: Any | None = None
_MODEL_LOAD_ATTEMPTED = False

MODEL_PATH = Path(__file__).resolve().parents[3] / "data" / "models" / "kick_risk" / "kick_risk_model.joblib"


def get_model() -> Any | None:
    global _MODEL, _MODEL_LOAD_ATTEMPTED
    if not _MODEL_LOAD_ATTEMPTED:
        _MODEL_LOAD_ATTEMPTED = True
        if MODEL_PATH.exists():
            try:
                import joblib
                _MODEL = joblib.load(MODEL_PATH)
                logger.info(f"Loaded trained kick risk model from {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Failed to load kick risk model: {e}")
                _MODEL = None
        else:
            logger.info(f"Kick risk model not found at {MODEL_PATH}; using baseline heuristic")
    return _MODEL


def is_kick_model_loaded() -> bool:
    return get_model() is not None


def predict_kick_risk(curves: dict[str, np.ndarray], md: np.ndarray) -> np.ndarray:
    """Predict p_kick over the look-ahead horizon using trained GradientBoosting regressor.

    Args:
        curves: dict with 'curves.DT', 'trend.DT_NCT', 'curves.RDEP', 'trend.RDEP_NCT',
                'curves.RHOB', 'curves.NPHI', 'curves.PEF'
        md: array of depths md_m

    Returns:
        np.ndarray of p_kick probabilities in [0.0, 0.99]
    """
    model = get_model()
    if model is None:
        from app.ml import baseline
        return baseline.p_kick_frames(md)

    pick = lambda k: curves.get(k) if k in curves else curves.get(f"curves.{k}")
    pick_trend = lambda k: curves.get(k) if k in curves else curves.get(f"trend.{k}")

    dt = pick("DT")
    dt_nct = pick_trend("DT_NCT")
    rdep = pick("RDEP")
    rdep_nct = pick_trend("RDEP_NCT")
    rhob = pick("RHOB")
    nphi = pick("NPHI")
    pef = pick("PEF")

    n = len(md)
    if dt is None or dt_nct is None:
        from app.ml import baseline
        return baseline.p_kick_frames(md)

    X = pd.DataFrame({
        "dt_departure": dt - dt_nct,
        "rdep_ratio": (rdep if rdep is not None else np.full(n, 1.0)) / np.maximum(rdep_nct if rdep_nct is not None else np.full(n, 1.0), 0.1),
        "rhob": rhob if rhob is not None else np.full(n, 2.45),
        "nphi": nphi if nphi is not None else np.full(n, 0.25),
        "pef": pef if pef is not None else np.full(n, 3.0),
        "dist_to_sand": 4195.0 - md,
    })

    preds = model.predict(X)
    return np.clip(preds, 0.0, 0.99)
