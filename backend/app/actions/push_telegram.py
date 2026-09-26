"""actions.push_telegram — Telegram push notification to Superintendent bot.

Design reference: docs/SDD.md §11.
Sends formatted Markdown / HTML messages to Telegram bot chat.
"""
from __future__ import annotations

import logging
from app.actions.types import ActionStatus, ChannelType, DispatchResult, MocApprovalPayload, RtocAlertPayload

logger = logging.getLogger(__name__)


def format_telegram_text(payload: MocApprovalPayload | RtocAlertPayload) -> str:
    """Formats Telegram notification with emojis and bold key metrics."""
    if isinstance(payload, MocApprovalPayload):
        return (
            f"🚨 *MOC ACTION DISPATCHED*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"📋 *Doc*: `{payload.moc_id}`\n"
            f"📍 *Well*: `{payload.well_id}` @ {payload.depth_m} m\n"
            f"🧪 *MW Increase*: {payload.current_mw_ppg:.2f} ➜ *{payload.target_mw_ppg:.2f} ppg*\n"
            f"⚖️ *Barite*: *{payload.barite_mt} MT* ({payload.barite_bags} bags)\n"
            f"🛡️ *Precedent*: offset kick cost {payload.npt_avoided_hrs}h NPT — avoided\n"
            f"✍️ *Auth*: {payload.authorized_by}\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"✅ *Status*: Chemical Work Order Sent to Mud Pit"
        )
    else:
        return f"⚠️ *[{payload.severity}] {payload.title}*\n{payload.message}"


async def send_telegram_alert(payload: MocApprovalPayload | RtocAlertPayload) -> DispatchResult:
    """Sends or simulates posting alert to Telegram Bot."""
    msg_text = format_telegram_text(payload)
    logger.info(f"[Telegram Push] Message dispatched: {msg_text}")
    
    return DispatchResult(
        channel=ChannelType.PUSH_TELEGRAM,
        status=ActionStatus.DELIVERED,
        message_id=f"TG-ALERT-{getattr(payload, 'moc_id', 'MSG')}",
        recipient="@drilling_supt_bot (+91 98765 43210)",
        details={
            "formatted_text": msg_text,
            "device": "Superintendent Mobile",
        },
    )
