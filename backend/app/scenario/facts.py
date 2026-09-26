"""Canonical scenario facts loader (SDD §5.2). Single source of truth: data/scenario/*.yaml."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

from app.core.config import REPO_ROOT

SCENARIO_DIR = REPO_ROOT / "data" / "scenario"


def _load(name: str) -> dict:
    return yaml.safe_load((SCENARIO_DIR / name).read_text(encoding="utf-8"))


@lru_cache
def facts() -> dict:
    return _load("mn_sm_dw_01.yaml")


@lru_cache
def offsets() -> dict:
    return _load("offsets.yaml")


@lru_cache
def turns() -> dict:
    return _load("turns.yaml")


@lru_cache
def profiles() -> dict:
    return _load("profiles.yaml")


@lru_cache
def shift_notes() -> dict:
    return _load("shift_notes.yaml")


def unit_at(md_m: float) -> dict:
    """Stratigraphic unit containing md (top inclusive, base exclusive; last unit inclusive)."""
    units = facts()["stratigraphy"]
    for u in units:
        if u["top_m"] <= md_m < u["base_m"]:
            return u
    return units[-1] if md_m >= units[-1]["base_m"] else units[0]


def checkpoint(label: str) -> dict:
    return next(c for c in facts()["checkpoints"] if c["label"] == label)


def scenario_bundle() -> dict:
    """Everything the frontend needs to render the narrative without hard-coded numbers."""
    return {
        "facts": facts(),
        "offsets": offsets(),
        "turns": turns()["turns"],
        "shift_notes": shift_notes(),
    }


def data_dir() -> Path:
    return REPO_ROOT / "data"

