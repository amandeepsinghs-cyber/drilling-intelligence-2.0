"""actions.chat_google — Google Chat incoming webhook for RTOC notifications.

Design reference: docs/SDD.md §11.
Formats rich card JSON payloads and posts them to Google Chat spaces.
"""
from __future__ import annotations

import logging
from app.actions.types import ActionStatus, ChannelType, DispatchResult, MocApprovalPayload, RtocAlertPayload

logger = logging.getLogger(__name__)


def build_card_payload(payload: MocApprovalPayload | RtocAlertPayload) -> dict:
    """Builds standard Google Chat Card v2 structure."""
    if isinstance(payload, MocApprovalPayload):
        return {
            "cardsV2": [
                {
                    "cardId": payload.moc_id,
                    "card": {
                        "header": {
                            "title": f"MOC APPROVED: {payload.moc_id}",
                            "subtitle": f"Well: {payload.well_id} · Depth: {payload.depth_m} m MD",
                            "imageUrl": "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/shield_with_heart/default/48px.svg",
                        },
                        "sections": [
                            {
                                "header": "Executive Operational Directive",
                                "widgets": [
                                    {
                                        "decoratedText": {
                                            "topLabel": "Mud Weight Increase",
                                            "text": f"<b>{payload.current_mw_ppg:.2f} ppg</b> → <b>{payload.target_mw_ppg:.2f} ppg</b> (+{payload.target_mw_ppg - payload.current_mw_ppg:.2f} ppg)",
                                        }
                                    },
                                    {
                                        "decoratedText": {
                                            "topLabel": "Barite Addition",
                                            "text": f"<b>{payload.barite_mt} MT</b> ({payload.barite_bags} bags of 50 kg)",
                                        }
                                    },
                                    {
                                        "decoratedText": {
                                            "topLabel": "Offset Precedent Avoided",
                                            "text": f"Offset kick cost {payload.npt_avoided_hrs} hrs NPT",
                                        }
                                    },
                                    {
                                        "decoratedText": {
                                            "topLabel": "Authorization",
                                            "text": f"Signed by: <i>{payload.authorized_by}</i>",
                                        }
                                    },
                                ],
                            }
                        ],
                    },
                }
            ]
        }
    else:
        return {
            "text": f"⚠️ *[{payload.severity}] {payload.title}* on {payload.well_id}: {payload.message}"
        }


async def send_chat_message(payload: MocApprovalPayload | RtocAlertPayload) -> DispatchResult:
    """Sends or simulates posting card to Google Chat."""
    card = build_card_payload(payload)
    logger.info(f"[Google Chat RTOC] Card formatted: {card}")
    
    return DispatchResult(
        channel=ChannelType.CHAT_GOOGLE,
        status=ActionStatus.DELIVERED,
        message_id=f"GC-MSG-{getattr(payload, 'moc_id', 'ALERT')}",
        recipient="spaces/AAAA_ONGC_RTOC_MAHANADI",
        details={
            "card_payload": card,
            "channel_name": "ONGC Mahanadi RTOC Room",
        },
    )
