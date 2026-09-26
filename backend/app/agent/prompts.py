"""agent.prompts — loads and interpolates config/prompts/agent_system_prompt.md (SDD §10.4, checklist P0-3).

Placeholders use dotted paths into the canonical scenario YAML, e.g. ``{{reservoir.gwc_m}}`` or
``{{stratigraphy.2.base_m}}`` (integers index lists). Unresolved placeholders raise, so a typo
can never leak ``{{...}}`` into the live model's instructions.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.scenario.facts import facts

REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPT_FILE = REPO_ROOT / "config" / "prompts" / "agent_system_prompt.md"
_PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z0-9_.]+)\s*\}\}")


def _lookup(data: Any, path: str) -> Any:
    cur = data
    for part in path.split("."):
        if isinstance(cur, list) and part.isdigit():
            cur = cur[int(part)]
        elif isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            raise KeyError(path)
    return cur


def _fmt(v: Any) -> str:
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def render_prompt(template: str, data: dict) -> str:
    missing: list[str] = []

    def sub(m: re.Match) -> str:
        try:
            return _fmt(_lookup(data, m.group(1)))
        except (KeyError, IndexError, TypeError):
            missing.append(m.group(1))
            return m.group(0)

    out = _PLACEHOLDER.sub(sub, template)
    if missing:
        raise KeyError(f"Unresolved prompt placeholders: {sorted(set(missing))}")
    return out


def get_agent_system_prompt() -> str:
    """Load agent system prompt with canonical well facts interpolated."""
    text = PROMPT_FILE.read_text(encoding="utf-8") if PROMPT_FILE.exists() else ""
    return render_prompt(text, facts())
