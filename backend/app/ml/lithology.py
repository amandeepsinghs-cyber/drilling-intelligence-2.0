"""ml.lithology — Trained RandomForest lithology classifier serving module (W10 / SDD §8).

Loads the trained model from data/models/lithology/random_forest_litho.joblib.
Predicts lithology class and class probabilities for all 5 canonical classes:
('SHALE', 'SILTSTONE', 'SAND', 'LIMESTONE', 'DOLOMITE').
Falls back to baseline heuristic if the model file is not available.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

CLASSES = ("SHALE", "SILTSTONE", "SAND", "LIMESTONE", "DOLOMITE")
_MODEL: Any | None = None
_MODEL_LOAD_ATTEMPTED = False

MODEL_PATH = Path(__file__).resolve().parents[3] / "data" / "models" / "lithology" / "random_forest_litho.joblib"


def get_model() -> Any | None:
    global _MODEL, _MODEL_LOAD_ATTEMPTED
    if not _MODEL_LOAD_ATTEMPTED:
        _MODEL_LOAD_ATTEMPTED = True
        if MODEL_PATH.exists():
            try:
                import joblib
                _MODEL = joblib.load(MODEL_PATH)
                logger.info(f"Loaded trained lithology model from {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Failed to load lithology model: {e}")
                _MODEL = None
        else:
            logger.info(f"Lithology model not found at {MODEL_PATH}; using baseline heuristic")
    return _MODEL


def is_trained_model_loaded() -> bool:
    return get_model() is not None


def predict_litho(curves: dict[str, np.ndarray]) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    """Predict lithology classes and probability vectors using trained RandomForest.

    Args:
        curves: Mapping containing at least:
                'curves.GR' (or 'GR')
                'curves.RHOB' (or 'RHOB')
                'curves.NPHI' (or 'NPHI')
                'curves.PEF' (or 'PEF')
                'curves.DT' (or 'DT')
                'curves.RDEP' (or 'RDEP')

    Returns:
        tuple of (class_array, dict_of_class_probabilities)
    """
    model = get_model()
    pick = lambda k: curves.get(k) if k in curves else curves.get(f"curves.{k}")

    gr = pick("GR")
    rhob = pick("RHOB")
    nphi = pick("NPHI")
    pef = pick("PEF")
    dt = pick("DT")
    rdep = pick("RDEP")

    if model is None or gr is None:
        from app.ml import baseline
        from app.scenario import profiles
        md = curves.get("md_m")
        if md is None:
            md = profiles.grid()
        return baseline.litho_probs(md)

    n = len(gr)
    rdep_log = np.log10(np.clip(rdep if rdep is not None else np.full(n, 10.0), 0.1, 1000.0))

    X = pd.DataFrame({
        "GR": gr,
        "RHOB": rhob if rhob is not None else np.full(n, 2.45),
        "NPHI": nphi if nphi is not None else np.full(n, 0.25),
        "PEF": pef if pef is not None else np.full(n, 3.0),
        "DT": dt if dt is not None else np.full(n, 90.0),
        "RDEP_LOG": rdep_log,
    })

    classes = list(model.classes_)
    raw_probs = model.predict_proba(X)
    pred_cls = model.predict(X)

    probs: dict[str, np.ndarray] = {}
    for c in CLASSES:
        if c in classes:
            idx = classes.index(c)
            probs[c] = raw_probs[:, idx]
        else:
            probs[c] = np.zeros(n, dtype=float)

    return pred_cls, probs
