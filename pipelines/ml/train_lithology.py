"""pipelines.ml.train_lithology — train RandomForest lithology classifier on synthetic offset wells.

Generates offset wells MN-DW-01, MN-DW-02, MN-DW-03 via hires_well (O6 forward physics),
trains a RandomForest on MN-DW-01 and MN-DW-03, evaluates on held-out MN-DW-02 (accuracy >= 0.85),
and saves the model and metrics into data/models/lithology/.

Usage:
  uv run --no-project --python 3.12 --with pyyaml,numpy,pandas,pyarrow,pydantic,scikit-learn,joblib \
    python pipelines/ml/train_lithology.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.provenance import CURVES  # noqa: E402
from app.scenario import profiles as prof  # noqa: E402
from app.scenario.hires_well import hires_well  # noqa: E402

FEATURES = ["GR", "RHOB", "NPHI", "PEF", "DT", "RDEP_LOG"]
CLASSES = ("SHALE", "SILTSTONE", "SAND", "LIMESTONE", "DOLOMITE")


def generate_offset(well_id: str, out_dir: Path) -> Path:
    md = prof.grid()
    hw = hires_well(md, well_id)
    cols = {"md_m": md}
    cols.update({c: hw["curves"][c] for c in CURVES})
    cols.update({f"truth_{k}": v for k, v in hw["truth"].items()})
    cols.update({f"trend_{k}": v for k, v in hw["trend"].items()})
    out = out_dir / f"{well_id.lower().replace('-', '_')}_synth_hires.parquet"
    out.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(cols).to_parquet(out, index=False)
    meta = dict(
        hw["meta"],
        well_id=well_id,
        provenance="SYNTHETIC",
        grid={"top_m": float(md[0]), "base_m": float(md[-1]), "step_m": float(md[1] - md[0]), "n": len(md)},
        column_contract="docs/data/column_contract.md",
    )
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(f"[ok] Generated offset {well_id} -> {out}")
    return out


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    X = pd.DataFrame()
    X["GR"] = df["GR"]
    X["RHOB"] = df["RHOB"]
    X["NPHI"] = df["NPHI"]
    X["PEF"] = df["PEF"]
    X["DT"] = df["DT"]
    X["RDEP_LOG"] = np.log10(np.clip(df["RDEP"], 0.1, 1000.0))
    y = df["truth_LITHO"]
    return X, y


def train_and_evaluate() -> dict:
    offsets_dir = ROOT / "data" / "processed" / "offsets"
    offsets_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate offset wells if needed
    for wid in ["MN-DW-01", "MN-DW-02", "MN-DW-03"]:
        generate_offset(wid, offsets_dir)

    # 2. Load training and evaluation sets
    df_01 = pd.read_parquet(offsets_dir / "mn_dw_01_synth_hires.parquet")
    df_03 = pd.read_parquet(offsets_dir / "mn_dw_03_synth_hires.parquet")
    df_train = pd.concat([df_01, df_03], ignore_index=True)

    df_test = pd.read_parquet(offsets_dir / "mn_dw_02_synth_hires.parquet")

    X_train, y_train = prepare_features(df_train)
    X_test, y_test = prepare_features(df_test)

    # 3. Train RandomForest model
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    # 4. Evaluate on held-out MN-DW-02
    y_pred = clf.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    rep = classification_report(y_test, y_pred, output_dict=True)

    print(f"[eval] Held-out MN-DW-02 Accuracy: {acc:.4f} (requirement >= 0.85)")
    print(f"[eval] Held-out MN-DW-02 Macro F1: {macro_f1:.4f}")
    assert acc >= 0.85, f"Accuracy {acc} is below required 0.85 threshold"

    # 5. Persist model artifact and model card
    models_dir = ROOT / "data" / "models" / "lithology"
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / "random_forest_litho.joblib"
    joblib.dump(clf, model_path)

    metrics = {
        "model_name": "RandomForestClassifier",
        "features": FEATURES,
        "classes": list(clf.classes_),
        "train_wells": ["MN-DW-01", "MN-DW-03"],
        "test_well": "MN-DW-02",
        "held_out_accuracy": round(acc, 4),
        "held_out_macro_f1": round(macro_f1, 4),
        "classification_report": rep,
        "feature_importances": {f: round(float(imp), 4) for f, imp in zip(FEATURES, clf.feature_importances_)},
    }
    metrics_path = models_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2))

    print(f"[ok] Model saved to {model_path}")
    print(f"[ok] Metrics saved to {metrics_path}")
    return metrics


if __name__ == "__main__":
    train_and_evaluate()
