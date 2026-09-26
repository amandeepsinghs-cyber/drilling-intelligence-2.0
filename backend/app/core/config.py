"""Settings loader: DI_ENV selects config/settings.<env>.yaml (SDD §4.2)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseModel):
    env: str = "local"
    project_id: str = ""
    region: str = "asia-south1"
    offline: bool = False
    adapters: dict = {}
    models: dict = {}
    rag: dict = {}
    voice: dict = {}
    actions: dict = {}
    raw: dict = {}


@lru_cache
def get_settings() -> Settings:
    env = os.getenv("DI_ENV", "local")
    cfg_path = REPO_ROOT / "config" / f"settings.{env}.yaml"
    data = yaml.safe_load(cfg_path.read_text()) if cfg_path.exists() else {}
    offline = os.getenv("DI_OFFLINE", "0") == "1" or bool(data.get("offline", False))
    return Settings(
        env=env, project_id=data.get("project_id", ""), region=data.get("region", "asia-south1"),
        offline=offline, adapters=data.get("adapters", {}), models=data.get("models", {}),
        rag=data.get("rag", {}), voice=data.get("voice", {}), actions=data.get("actions", {}), raw=data,
    )
