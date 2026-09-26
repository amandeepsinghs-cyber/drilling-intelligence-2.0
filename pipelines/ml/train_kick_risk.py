"""pipelines.ml.train_kick_risk — train kick/loss risk model on synthetic offset events.

Features:
  - DT departure from NCT (curves.DT - trend.DT_NCT)
  - Resistivity ratio (curves.RDEP / trend.RDEP_NCT)
  - Formation bulk density (curves.RHOB)
  - Neutron porosity (curves.NPHI)
  - Photoelectric factor (curves.PEF)
  - Depth relative to reservoir top (md_m - 4195)

Target:
  - p_kick: look-ahead kick probability
  - p_loss: look-ahead loss probability

Persists model and metrics into data/models/kick_risk/.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.scenario.facts import facts, profiles  # noqa: E402

FEATURES = ["dt_departure", "rdep_ratio", "rhob", "nphi", "pef", "dist_to_sand"]


def prepare_event_dataset() -> pd.DataFrame:
    offsets_dir = ROOT / "data" / "processed" / "offsets"
    df_01 = pd.read_parquet(offsets_dir / "mn_dw_01_synth_hires.parquet")
    df_02 = pd.read_parquet(offsets_dir / "mn_dw_02_synth_hires.parquet")
    df_03 = pd.read_parquet(offsets_dir / "mn_dw_03_synth_hires.parquet")

    dfs = []
    anchors = np.array(profiles()["ml_baseline"]["p_kick_anchors"], dtype=float)

    for wid, df in [("MN-DW-01", df_01), ("MN-DW-02", df_02), ("MN-DW-03", df_03)]:
        sub = pd.DataFrame()
        md = df["md_m"].to_numpy()
        sub["md_m"] = md
        sub["dt_departure"] = df["DT"] - df["trend_DT_NCT"]
        sub["rdep_ratio"] = df["RDEP"] / np.maximum(df["trend_RDEP_NCT"], 0.1)
        sub["rhob"] = df["RHOB"]
        sub["nphi"] = df["NPHI"]
        sub["pef"] = df["PEF"]
        sub["dist_to_sand"] = 4195.0 - md

        # Baseline p_kick target anchored to physical ramp
        base_p = np.interp(md, anchors[:, 0], anchors[:, 1])
        if wid == "MN-DW-02":
            # Higher kick sensitivity leading into kick depth
            ramp = np.clip((md - 4150.0) / 45.0, 0.0, 1.0)
            sub["target_p_kick"] = np.clip(base_p * 0.5 + 0.5 * ramp, 0.01, 0.85)
        else:
            sub["target_p_kick"] = np.clip(base_p, 0.01, 0.75)

        # Loss target (elevated below 4,200 m in drilling break)
        loss_ramp = np.clip((md - 4200.0) / 30.0, 0.0, 1.0) * 0.65
        sub["target_p_loss"] = np.clip(loss_ramp, 0.01, 0.70)
        dfs.append(sub)

    return pd.concat(dfs, ignore_index=True)


def train_and_evaluate() -> dict:
    df = prepare_event_dataset()
    X = df[FEATURES]
    y_kick = df["target_p_kick"]

    model_kick = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    model_kick.fit(X, y_kick)
    preds = model_kick.predict(X)
    r2 = float(r2_score(y_kick, preds))
    rmse = float(np.sqrt(mean_squared_error(y_kick, preds)))

    print(f"[eval] Kick model R2: {r2:.4f}, RMSE: {rmse:.4f}")

    models_dir = ROOT / "data" / "models" / "kick_risk"
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / "kick_risk_model.joblib"
    joblib.dump(model_kick, model_path)

    metrics = {
        "model_name": "GradientBoostingRegressor",
        "features": FEATURES,
        "r2_score": round(r2, 4),
        "rmse": round(rmse, 4),
        "feature_importances": {f: round(float(imp), 4) for f, imp in zip(FEATURES, model_kick.feature_importances_)},
    }
    metrics_path = models_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2))

    print(f"[ok] Kick risk model saved to {model_path}")
    print(f"[ok] Metrics saved to {metrics_path}")
    return metrics


if __name__ == "__main__":
    train_and_evaluate()
