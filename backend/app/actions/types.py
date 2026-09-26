"""actions.types — Data contracts for closed-loop governance and multi-channel actions.

Design reference: docs/SDD.md §11.
Defines payloads for MOC approval, RTOC alarms, Telegram mobile push, and WCR report generation.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from pydantic import BaseModel, Field


class ChannelType(StrEnum):
    CHAT_GOOGLE = "chat_google"
    PUSH_TELEGRAM = "push_telegram"
    EMAIL_GMAIL = "email_gmail"
    DOCS_WCR = "docs_wcr"
    SMS_DLT = "sms_dlt"
    LEDGER = "ledger"


class ActionStatus(StrEnum):
    DELIVERED = "delivered"
    QUEUED = "queued"
    SIMULATED = "simulated"
    FAILED = "failed"


class DispatchResult(BaseModel):
    channel: ChannelType
    status: ActionStatus
    message_id: str
    recipient: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


def _f() -> dict[str, Any]:
    from app.scenario.facts import facts
    return facts()


def _kick_offset() -> dict[str, Any]:
    from app.scenario.facts import offsets
    return next(o for o in offsets()["offsets"] if o.get("incident", {}).get("type") == "KICK")["incident"]


def _rationale() -> str:
    f = _f()
    warn = next(c for c in f["checkpoints"] if c["label"] == "Warning point")
    return (f"Proactive weight-up to mitigate {abs(warn['overbalance_if_unchanged_psi'])} psi underbalance ramp in "
            f"{f['reservoir']['unit']} turbidite sand top at {f['reservoir']['sand_top_m']:,} m MD.")


class MocApprovalPayload(BaseModel):
    """Defaults resolve from data/scenario/*.yaml (O3) — never typed literals."""
    moc_id: str = Field(default_factory=lambda: _f()["ids"]["memo_id"])
    well_id: str = Field(default_factory=lambda: _f()["well"]["id"])
    depth_m: float = Field(default_factory=lambda: _f()["mud"]["weight_up_location_m"])
    current_mw_ppg: float = Field(default_factory=lambda: _f()["mud"]["initial"]["mw_ppg"])
    target_mw_ppg: float = Field(default_factory=lambda: _f()["mud"]["weighted"]["mw_ppg"])
    barite_mt: float = Field(default_factory=lambda: _f()["barite"]["total_mt"])
    barite_bags: int = Field(default_factory=lambda: _f()["barite"]["bags_50kg"])
    volume_gain_bbl: float = Field(default_factory=lambda: _f()["barite"]["volume_gain_bbl"])
    npt_avoided_hrs: float = Field(default_factory=lambda: _kick_offset()["npt_h"])
    authorized_by: str = "Amandeep Singh (Drilling Superintendent)"
    rationale: str = Field(default_factory=_rationale)


class RtocAlertPayload(BaseModel):
    alert_id: str = "RTOC-ALERT-884"
    well_id: str = Field(default_factory=lambda: _f()["well"]["id"])
    severity: str = "HIGH"
    title: str = "Proactive Geopressure Influx Hazard"
    message: str
    metrics: dict[str, Any] = Field(default_factory=dict)


class WcrExportPayload(BaseModel):
    wcr_id: str = Field(default_factory=lambda: _f()["ids"]["wcr_id"])
    well_id: str = Field(default_factory=lambda: _f()["well"]["id"])
    td_m: float = Field(default_factory=lambda: _f()["well"]["live_interval_m"]["td"])
    sections: list[str] = Field(
        default_factory=lambda: [
            "Well Summary",
            "Stratigraphy",
            "Pore-Pressure Narrative",
            "Decisions & MOC Log",
            "Events & Incidents Ledger",
            "Lessons Learned Write-Back",
            "Data Provenance",
        ]
    )
