"""api.routes_actions — POST /api/tools/{name} (same tools the Live agent calls).

Design reference: docs/SDD.md §13, docs/API_CONTRACT.md.
Used by the SCRIPTED path so memo evidence and dispatch status come from the same backend code
as LIVE (honest DELIVERED / SIMULATED / FAILED). /api/actions/* and /api/ledger remain WP-05.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException

from app.agent.tools import TOOL_MAP, execute_tool

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/tools")
def list_tools() -> dict[str, Any]:
    return {"tools": sorted(TOOL_MAP)}


@router.post("/tools/{name}")
def run_tool(name: str, args: dict[str, Any] | None = Body(default=None)) -> dict[str, Any]:
    if name not in TOOL_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {name}")
    return execute_tool(name, args or {})
