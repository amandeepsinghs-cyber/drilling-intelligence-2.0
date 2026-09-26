"""agent.prompts — loads and interpolates config/prompts/agent_system_prompt.md (SDD §10.4)."""
from __future__ import annotations

from pathlib import Path
from app.scenario.facts import facts

REPO_ROOT = Path(__file__).resolve().parents[3]


def get_agent_system_prompt() -> str:
    """Load agent system prompt with canonical well facts interpolated."""
    prompt_file = REPO_ROOT / "config" / "prompts" / "agent_system_prompt.md"
    f = facts()
    w = f["well"]

    text = prompt_file.read_text(encoding="utf-8") if prompt_file.exists() else ""
    text = text.replace("{{well.display_name}}", w.get("display_name", "MN-SM-DW-01"))
    text = text.replace("{{well.basin}}", w.get("basin", "Mahanadi Offshore Deepwater"))
    text = text.replace("{{well.water_depth_m}}", str(w.get("water_depth_m", 1620)))
    return text
