"""agent.live_session — ADK bidi-streaming proxy between browser WebSocket and Gemini Live (SDD §10.2).

Handles:
- Upstream audio PCM (16 kHz mono) streamed from browser microphone via push-to-talk.
- Downstream audio PCM (24 kHz mono) streamed to browser for low-latency playback.
- Real-time tool execution against physics models and canonical scenario facts.
- Proactive watchdog event injections at the YAML trigger depths (T3 / T8 / T9).
- Automatic UI side-effect dispatch (memos, approvals, fan-out, ROP capping).
- Graceful offline / rehearsal fallback if network or quota is unavailable.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.agent.prompts import get_agent_system_prompt
from app.agent.tools import execute_tool, set_live_depth
from app.core.config import get_settings
from app.scenario.facts import facts

logger = logging.getLogger("di2.live_session")

# Function declarations for Gemini Live API
FUNCTION_DECLARATIONS_DATA = [
    {
        "name": "get_well_status",
        "description": "Get current live well status, depth, mud weight (ppg & SG), ECD, and pressure margins.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "well_id": {"type": "STRING", "description": "Optional well identifier"},
                "md_m": {"type": "NUMBER", "description": "Optional measured depth in meters"},
            },
        },
    },
    {
        "name": "get_lithology",
        "description": "Retrieve lithology classification, mineralogy probabilities, and SHAP drivers at depth.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "md": {"type": "NUMBER", "description": "Measured depth in meters"},
            },
        },
    },
    {
        "name": "forecast_pore_pressure",
        "description": "Forecast pore pressure ahead of the bit, detecting overpressure ramp and centroid sand.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "lookahead_m": {"type": "NUMBER", "description": "Lookahead distance in meters"},
            },
        },
    },
    {
        "name": "compute_ecd",
        "description": "Calculate Equivalent Circulating Density (ECD) and margin to casing shoe FIT.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "mw": {"type": "NUMBER", "description": "Mud weight in ppg"},
                "rop": {"type": "NUMBER", "description": "Rate of penetration in m/hr"},
                "gpm": {"type": "NUMBER", "description": "Mud flow rate in gallons per minute"},
            },
        },
    },
    {
        "name": "compute_barite",
        "description": ("Calculate barite addition (lb/bbl, MT, 50 kg bags) to weight up the well's active mud system. "
                        "For the planned weight-up call it with NO arguments: it uses the well's real active-system volume "
                        "and the current/planned mud weights. Pass w1/w2 only if the user states different mud weights."),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "w1": {"type": "NUMBER", "description": "Initial mud weight in ppg (omit to use current)"},
                "w2": {"type": "NUMBER", "description": "Target mud weight in ppg (omit to use the planned weighted mud)"},
            },
        },
    },
    {
        "name": "search_knowledge",
        "description": "Search corporate SOPs, offset incident reports, and lessons learned.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {"type": "STRING", "description": "Search query keywords or topic"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "lookup_offset_events",
        "description": "Search offset well incidents, kicks, and losses in the current section.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "md_range": {"type": "ARRAY", "items": {"type": "NUMBER"}, "description": "Optional depth range"},
            },
        },
    },
    {
        "name": "create_moc_memo",
        "description": "Draft formal Management of Change (MOC) memo for mud weight increase.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "recommendation": {"type": "STRING", "description": "Summary of proposed mud program change"},
            },
        },
    },
    {
        "name": "request_approval",
        "description": "Queue the MOC memo for the Drilling Superintendent. Does NOT approve: returns PENDING_HUMAN_APPROVAL. Approval happens only when he clicks Approve on screen (you then get a [HUMAN APPROVAL] message).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "memo_id": {"type": "STRING", "description": "MOC memo ID to queue for approval"},
            },
        },
    },
    {
        "name": "dispatch_fanout",
        "description": "Only after a [HUMAN APPROVAL] message: fan out the approved MOC to Mud Chemist console, RTOC chat, Drilling Manager email and Superintendent phone. Returns honest per-channel status (DELIVERED / SIMULATED / FAILED), or BLOCKED_AWAITING_APPROVAL if not yet approved on screen.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "memo_id": {"type": "STRING", "description": "Approved memo ID to dispatch"},
            },
        },
    },
    {
        "name": "set_rop_cap",
        "description": "Propose the operational ROP ceiling (+ hole-cleaning sweeps) to keep ECD below shoe FIT. Does NOT apply it: returns PENDING_HUMAN_APPROVAL until the Superintendent clicks 'Approve ROP cap' on screen (you then get a [HUMAN APPROVAL] message with the result).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "rop": {"type": "NUMBER", "description": "Maximum allowable ROP in m/hr"},
            },
        },
    },
    {
        "name": "draft_shift_log",
        "description": "Draft the end-of-shift handover notes (events, decisions, ledger) for the 12-1/4 in section, each line linked to its source.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
        },
    },
    {
        "name": "generate_wcr",
        "description": "Generate preliminary Well Completion Report (WCR) draft for the 12-1/4 in section of THIS well. Call ONLY when the user explicitly asks to create / prepare / make the WCR or completion report. NEVER call it for questions about offset or nearby wells (MN-DW-02, MN-DW-03) or their incidents — their source documents are WCRs, but use search_knowledge / lookup_offset_events for those.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
        },
    },
    {
        "name": "writeback_lessons",
        "description": "Write back operational lessons learned to the vector knowledge base.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
        },
    },
]


def _build_genai_tools() -> list[Any]:
    from google.genai import types

    func_decls = []
    for d in FUNCTION_DECLARATIONS_DATA:
        props = {}
        for p_name, p_spec in d["parameters"]["properties"].items():
            t = p_spec["type"]
            desc = p_spec.get("description", "")
            props[p_name] = types.Schema(type=t, description=desc)
        schema = types.Schema(
            type="OBJECT",
            properties=props,
            required=d["parameters"].get("required", []),
        )
        func_decls.append(
            types.FunctionDeclaration(
                name=d["name"],
                description=d["description"],
                parameters=schema,
            )
        )
    return [types.Tool(function_declarations=func_decls)]


_CLOSED = object()  # sentinel pushed on the inbound queue when the browser disconnects

MAX_CONSECUTIVE_FAILURES = 3
DEBUG_RECONNECT = os.getenv("DI_DEBUG_RECONNECT", "0") == "1"


async def _safe_send_json(websocket: WebSocket, payload: dict) -> bool:
    try:
        await websocket.send_json(payload)
        return True
    except Exception:
        return False


RECAP_KEEP_FIRST = 4    # always keep the opening exchange (the soak showed it can drop after resumes)
RECAP_KEEP_LAST = 16
RECAP_MAX_CHARS = 320


def _log_turn(state: dict[str, Any], role: str, text: str) -> None:
    """Append one line to the per-browser conversation log used for the reconnect recap."""
    text = " ".join((text or "").split())
    if text:
        state.setdefault("log", []).append((role, text[:RECAP_MAX_CHARS]))


def _recap_turns(state: dict[str, Any], types: Any) -> list[Any] | None:
    """Past turns re-sent after a reconnect so early turns survive resumption + context compression.

    Sent as alternating user/model history (not one text blob): a single user blob made the model
    answer the recap by repeating its last reply.
    """
    log = state.get("log") or []
    if not log:
        return None
    if len(log) > RECAP_KEEP_FIRST + RECAP_KEEP_LAST:
        lines = log[:RECAP_KEEP_FIRST] + log[-RECAP_KEEP_LAST:]
    else:
        lines = list(log)
    turns: list[Any] = []
    for role, text in lines:
        r = "model" if role == "Agent" else "user"
        if turns and turns[-1].role == r:  # merge consecutive same-role lines
            turns[-1].parts.append(types.Part.from_text(text=text))
        else:
            turns.append(types.Content(role=r, parts=[types.Part.from_text(text=text)]))
    if turns and turns[0].role == "user":
        turns[0].parts.insert(0, types.Part.from_text(text="[Earlier in this conversation — history only]"))
    return turns


def _sync_ui_state(state: dict[str, Any], ui: Any) -> None:
    """The screen is the source of truth for approvals already given (click, or rehearsal staging)."""
    if not isinstance(ui, dict):
        return
    if ui.get("approved_mw"):
        state.setdefault("approved_memos", set()).add(ui.get("memo_id") or facts()["ids"]["memo_id"])
    if ui.get("rop_capped"):
        state["rop_cap_approved"] = True


def _build_live_config(types: Any, system_prompt: str, tools: list[Any], handle: str | None) -> Any:
    """LiveConnectConfig with session resumption + sliding-window compression (P0-1)."""
    return types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(parts=[types.Part.from_text(text=system_prompt)]),
        tools=tools,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
            )
        ),
        # Resumption: server issues handles; reconnecting with the latest handle keeps conversation memory.
        session_resumption=types.SessionResumptionConfig(handle=handle),
        # Compression: lifts the audio-session length cap so a 30-min board demo never hits the wall.
        context_window_compression=types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow(),
        ),
    )


async def handle_live_websocket(websocket: WebSocket) -> None:
    """Entry point for /ws/live WebSocket connections.

    Lifecycle (P0-1):
      browser WS --(one reader task)--> inbound queue --> current Gemini session
      Gemini sessions are replaced transparently on GoAway / drop using a resumption handle,
      so the browser socket and the conversation memory survive. Only after
      MAX_CONSECUTIVE_FAILURES do we degrade to the rehearsal engine and tell the UI 'fallback'.
    """
    await websocket.accept()
    settings = get_settings()

    inbound: asyncio.Queue = asyncio.Queue()

    async def browser_reader() -> None:
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                await inbound.put(msg)
        except (WebSocketDisconnect, RuntimeError):
            pass
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"browser_reader error: {e}")
        finally:
            await inbound.put(_CLOSED)

    reader_task = asyncio.create_task(browser_reader())
    try:
        if settings.offline:
            await _safe_send_json(websocket, {"type": "status", "status": "fallback",
                                              "message": "DI_OFFLINE=1 - rehearsal engine."})
            await _run_offline_session(websocket, inbound)
            return
        await _run_resilient_live(websocket, inbound, settings)
    finally:
        reader_task.cancel()


async def _run_resilient_live(websocket: WebSocket, inbound: asyncio.Queue, settings: Any) -> None:
    try:
        from google import genai
        from google.genai import types
    except Exception as e:
        await _safe_send_json(websocket, {"type": "status", "status": "fallback",
                                          "message": f"google-genai unavailable ({type(e).__name__})."})
        await _run_offline_session(websocket, inbound)
        return

    client = genai.Client(
        vertexai=True,
        project=settings.project_id or "drilling-intelligence",
        location=settings.region or "us-central1",
    )
    try:
        system_prompt = get_agent_system_prompt()
        tools = _build_genai_tools()
    except Exception as e:  # a broken prompt/tool spec must degrade, not kill the socket
        logger.error(f"Live setup failed: {type(e).__name__}: {e}")
        await _safe_send_json(websocket, {"type": "status", "status": "fallback",
                                          "message": f"Agent setup error ({type(e).__name__}). Rehearsal engine active."})
        await _run_offline_session(websocket, inbound)
        return
    model_name = settings.models.get("live", "gemini-3.8-live")

    state: dict[str, Any] = {"handle": None, "resumable": False}
    failures = 0
    ever_connected = False

    while True:
        handle = state["handle"] if state["resumable"] else None
        resuming = ever_connected
        await _safe_send_json(websocket, {"type": "status",
                                          "status": "reconnecting" if resuming else "connecting",
                                          "model": model_name})
        try:
            config = _build_live_config(types, system_prompt, tools, handle)
            logger.info(f"Gemini Live connect model={model_name} resume={'yes' if handle else 'no'}")
            async with client.aio.live.connect(model=model_name, config=config) as session:
                failures = 0
                await _safe_send_json(websocket, {
                    "type": "status",
                    "status": "resumed" if resuming else "connected",
                    "model": model_name,
                    "memory": bool(handle),
                })
                ever_connected = True
                recap = _recap_turns(state, types) if resuming else None
                if recap:
                    try:
                        await session.send_client_content(turns=recap, turn_complete=False)
                        logger.info(f"Sent session recap ({len(state.get('log', []))} lines)")
                    except Exception as e:  # recap is best-effort; never fail the resume
                        logger.warning(f"Recap send failed: {type(e).__name__}: {e}")
                reason = await _run_bidi_stream(websocket, session, inbound, state)
            logger.info(f"Gemini Live session ended: {reason}")
            if reason == "browser_closed":
                return
            # go_away / server_closed / debug_reconnect -> loop and resume with the latest handle.
            continue
        except Exception as e:
            failures += 1
            logger.warning(f"Gemini Live failure {failures}/{MAX_CONSECUTIVE_FAILURES}: "
                           f"{type(e).__name__}: {e}")
            if failures >= MAX_CONSECUTIVE_FAILURES:
                await _safe_send_json(websocket, {
                    "type": "status",
                    "status": "fallback",
                    "message": f"Gemini Live unavailable ({type(e).__name__}). Rehearsal engine active.",
                })
                await _run_offline_session(websocket, inbound)
                return
            # A stale handle can itself be the cause; drop it after the second failure.
            if failures >= 2:
                state["resumable"] = False
            await asyncio.sleep(0.5 * failures)


async def _run_bidi_stream(websocket: WebSocket, session: Any, inbound: asyncio.Queue,
                           state: dict[str, Any]) -> str:
    """Pump one Gemini session. Returns why it ended:
    'browser_closed' | 'go_away' | 'server_closed' | 'debug_reconnect'.
    Raises on unexpected upstream errors so the caller can count failures.
    """
    from google.genai import types

    async def client_to_gemini() -> str:
        while True:
            message = await inbound.get()
            if message is _CLOSED:
                return "browser_closed"
            if message.get("bytes"):
                await session.send_realtime_input(
                    audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000")
                )
                continue
            if not message.get("text"):
                continue
            try:
                data = json.loads(message["text"])
            except json.JSONDecodeError:
                continue
            msg_type = data.get("type")
            if isinstance(data.get("md_m"), (int, float)):
                set_live_depth(float(data["md_m"]))  # A-8: tools answer for the live bit depth
            _sync_ui_state(state, data.get("ui_state"))
            if msg_type == "context":
                continue
            if msg_type in ("text", "prompt"):
                text = data.get("text", "")
                _log_turn(state, "Presenter", text)
                await _safe_send_json(websocket, {"type": "voice_state", "state": "thinking"})
                await session.send_client_content(
                    turns=[types.Content(role="user", parts=[types.Part.from_text(text=text)])],
                    turn_complete=True,
                )
            elif msg_type == "proactive_event":
                prompt = data.get("prompt") or data.get("prompt_injection", "")
                await _safe_send_json(websocket, {"type": "voice_state", "state": "alert"})
                await session.send_client_content(
                    turns=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
                    turn_complete=True,
                )
            elif msg_type == "human_approval":
                # The ONLY path to an approval: the presenter clicked Approve on screen.
                stamp = datetime.now(timezone.utc).strftime("%H:%M UTC")
                if data.get("approval") == "rop_cap":
                    # Approval 2 — ROP cap instruction at the drilling break.
                    state["rop_cap_approved"] = True
                    result = execute_tool("set_rop_cap", {})
                    await _safe_send_json(websocket, {"type": "action", "kind": "rop_cap", "payload": result})
                    note = (f"[HUMAN APPROVAL] Drilling Superintendent clicked 'Approve ROP cap' at {stamp}. "
                            f"Applied: {json.dumps(result)}. Confirm in one short Hinglish sentence using these numbers "
                            "(ROP cap, resulting ECD, margin to FIT). Do not call set_rop_cap again.")
                else:
                    mid = data.get("memo_id") or facts()["ids"]["memo_id"]
                    state.setdefault("approved_memos", set()).add(mid)
                    result = execute_tool("request_approval", {"memo_id": mid})
                    await _safe_send_json(websocket, {"type": "action", "kind": "approval", "payload": result})
                    note = (f"[HUMAN APPROVAL] Drilling Superintendent clicked Approve for {mid} at {stamp}. "
                            "Acknowledge in one short Hinglish sentence and call dispatch_fanout now.")
                _log_turn(state, "System", note)
                await _safe_send_json(websocket, {"type": "voice_state", "state": "thinking"})
                await session.send_client_content(
                    turns=[types.Content(role="user", parts=[types.Part.from_text(text=note)])],
                    turn_complete=True,
                )
            elif msg_type == "audio_end":
                await session.send_realtime_input(audio_stream_end=True)
            elif msg_type == "interrupt":
                await _safe_send_json(websocket, {"type": "interrupted"})
            elif msg_type == "debug_reconnect" and DEBUG_RECONNECT:
                return "debug_reconnect"

    async def gemini_to_client() -> str:
            current_caption: list[str] = []
            # Gemini emits an empty turn_complete right after a tool call, before it speaks the answer.
            # Forwarding it made the browser treat the turn as finished ~0.5 s in (A-2). Swallow it.
            turn_output = False
            tool_since_output = False
            while True:
                got_any = False
                async for response in session.receive():
                    got_any = True
                    # 0. Session lifecycle: resumption handles + GoAway
                    sru = getattr(response, "session_resumption_update", None)
                    if sru is not None and getattr(sru, "resumable", False) and getattr(sru, "new_handle", None):
                        state["handle"] = sru.new_handle
                        state["resumable"] = True
                    if getattr(response, "go_away", None) is not None:
                        logger.info(f"Gemini Live GoAway (time_left={response.go_away.time_left})")
                        return "go_away"

                    # 1. Check for tool calls
                    if response.tool_call is not None:
                        tool_since_output = True
                        await websocket.send_json({"type": "voice_state", "state": "thinking"})
                        tool_responses = []
                        for fc in response.tool_call.function_calls:
                            # Notify UI of running tool
                            await websocket.send_json({
                                "type": "tool_call",
                                "name": fc.name,
                                "status": "running",
                                "args": fc.args,
                            })

                            # Execute tool. Approval is human-only: the model may only queue the memo;
                            # the approval itself happens when the presenter clicks Approve on screen.
                            approved: set = state.setdefault("approved_memos", set())
                            memo_arg = (fc.args or {}).get("memo_id") or facts()["ids"]["memo_id"]
                            gated = False
                            already = False
                            if fc.name in ("create_moc_memo", "request_approval") and approved:
                                # The memo was already approved on screen (click, or rehearsal staging) — never re-ask.
                                already = True
                                result = {
                                    "status": "ALREADY_APPROVED", "approval": "moc", "memo_id": sorted(approved)[0],
                                    "approved_at_md_m": facts()["mud"]["weight_up_location_m"],
                                    "message": "This MOC is already approved by the Drilling Superintendent on screen and "
                                               "dispatched. Do not ask for a click. A new memo is only for a new mud-weight change.",
                                }
                            elif fc.name == "set_rop_cap" and state.get("rop_cap_approved"):
                                already = True
                                result = {"status": "ALREADY_APPLIED", "approval": "rop_cap",
                                          "applied": execute_tool(fc.name, {}),
                                          "message": "The ROP cap was already approved on screen and is in force. Do not ask for a click."}
                            elif fc.name == "request_approval":
                                gated = True
                                result = {
                                    "status": "PENDING_HUMAN_APPROVAL", "approval": "moc", "memo_id": memo_arg,
                                    "message": "Memo is on screen awaiting the Drilling Superintendent. "
                                               "Approval happens ONLY when he clicks the Approve button. "
                                               "Do not say it is approved.",
                                }
                            elif fc.name == "dispatch_fanout" and not approved:
                                gated = True
                                result = {
                                    "status": "BLOCKED_AWAITING_APPROVAL", "approval": "moc", "memo_id": memo_arg,
                                    "message": "Nothing sent. The MOC has not been approved on screen yet.",
                                }
                            elif fc.name == "set_rop_cap" and not state.get("rop_cap_approved"):
                                # Approval 2: the ROP cap instruction is a proposal until the on-screen click.
                                gated = True
                                result = {
                                    "status": "PENDING_HUMAN_APPROVAL", "approval": "rop_cap",
                                    "proposal": execute_tool(fc.name, fc.args),
                                    "message": "ROP cap instruction is on screen awaiting the Drilling Superintendent. "
                                               "It is NOT applied until he clicks 'Approve ROP cap'. "
                                               "Recommend it and ask him to click; do not say it is applied.",
                                }
                            else:
                                result = execute_tool(fc.name, fc.args)

                            # Notify UI of tool result
                            await websocket.send_json({
                                "type": "tool_call",
                                "name": fc.name,
                                "status": "done",
                                "result": result,
                            })

                            # Dispatch UI side-effects for actions
                            if already:
                                pass  # nothing new on screen; the agent just says it is already approved
                            elif gated:
                                await websocket.send_json({"type": "action", "kind": "approval_pending", "payload": result})
                            elif fc.name == "create_moc_memo":
                                await websocket.send_json({"type": "action", "kind": "memo", "payload": result})
                            elif fc.name == "dispatch_fanout":
                                await websocket.send_json({"type": "action", "kind": "dispatch", "payload": result})
                            elif fc.name == "set_rop_cap":
                                await websocket.send_json({"type": "action", "kind": "rop_cap", "payload": result})
                            elif fc.name == "draft_shift_log":
                                await websocket.send_json({"type": "action", "kind": "shift_log", "payload": result})
                            elif fc.name == "generate_wcr":
                                await websocket.send_json({"type": "action", "kind": "wcr", "payload": result})

                            tool_responses.append(
                                types.FunctionResponse(
                                    name=fc.name,
                                    response={"result": result},
                                    id=fc.id,
                                )
                            )

                        # Send response back to Gemini
                        await session.send_tool_response(function_responses=tool_responses)

                    # 2. Check for server content (audio & transcription)
                    sc = response.server_content
                    if sc is not None:
                        # Transcription from output_audio_transcription
                        if getattr(sc, "output_transcription", None):
                            ot = sc.output_transcription
                            if getattr(ot, "text", None):
                                turn_output = True
                                current_caption.append(ot.text)
                                await websocket.send_json({
                                    "type": "caption_delta",
                                    "text": ot.text,
                                    "role": "agent",
                                })

                        # Model audio turn
                        if sc.model_turn is not None:
                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    turn_output = True
                                    # Send binary 24 kHz audio chunk directly to browser
                                    await websocket.send_bytes(part.inline_data.data)
                                    await websocket.send_json({"type": "voice_state", "state": "speaking"})
                                if part.text:
                                    turn_output = True
                                    current_caption.append(part.text)
                                    await websocket.send_json({
                                        "type": "caption_delta",
                                        "text": part.text,
                                        "role": "agent",
                                    })

                        if sc.turn_complete and not turn_output and tool_since_output:
                            logger.debug("Swallowed empty turn_complete after tool call")
                        elif sc.turn_complete:
                            turn_output = False
                            tool_since_output = False
                            full_text = " ".join(current_caption).strip()
                            current_caption = []
                            heard = "".join(state.pop("heard", [])).strip()
                            if heard:
                                _log_turn(state, "Presenter", heard)
                            _log_turn(state, "Agent", full_text)
                            await websocket.send_json({
                                "type": "turn_complete",
                                "full_text": full_text,
                            })
                            await websocket.send_json({"type": "voice_state", "state": "idle"})

                        # Presenter speech transcription (Hindi/Hinglish) for on-screen captions
                        it = getattr(sc, "input_transcription", None)
                        if it is not None and getattr(it, "text", None):
                            state.setdefault("heard", []).append(it.text)
                            await _safe_send_json(websocket, {"type": "input_transcript", "text": it.text})

                if not got_any:
                    # receive() yielded nothing: upstream closed cleanly. Let the caller resume.
                    return "server_closed"

    async def guarded_gemini_to_client() -> str:
        try:
            return await gemini_to_client()
        except Exception as e:
            # Normal close codes (1000/1001, e.g. "GoAway deadline exceeded") are resumable, not failures.
            try:
                from websockets.exceptions import ConnectionClosedOK
                if isinstance(e, ConnectionClosedOK):
                    return "server_closed"
            except Exception:
                pass
            if "1000" in str(e) or "1001" in str(e):
                return "server_closed"
            raise

    t1 = asyncio.create_task(client_to_gemini())
    t2 = asyncio.create_task(guarded_gemini_to_client())

    done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
    for p in pending:
        p.cancel()
    for p in pending:
        try:
            await p
        except (asyncio.CancelledError, Exception):
            pass
    finished = done.pop()
    return finished.result()  # re-raises upstream errors for the caller's failure counter


async def _run_offline_session(websocket: WebSocket, inbound: asyncio.Queue) -> None:
    """Runs interactive rehearsal session if offline or fallback. Reads from the shared inbound queue."""
    from app.scenario.facts import turns

    await _safe_send_json(websocket, {"type": "status", "status": "rehearsal_active"})
    while True:
        msg = await inbound.get()
        if msg is _CLOSED:
            return
        if not msg.get("text"):
            continue
        try:
            data = json.loads(msg["text"])
        except json.JSONDecodeError:
            continue
        mtype = data.get("type")
        if mtype in ("text", "prompt", "proactive_event"):
            await _safe_send_json(websocket, {"type": "voice_state", "state": "speaking"})
            turn_num = data.get("turn", 0)
            t_list = turns().get("turns", [])
            turn_spec = next((t for t in t_list if t["n"] == turn_num), None)
            if turn_spec and turn_spec.get("tools"):
                for tname in turn_spec["tools"]:
                    res = execute_tool(tname)
                    await _safe_send_json(websocket, {"type": "tool_call", "name": tname, "status": "done", "result": res})
            await asyncio.sleep(0.5)
            await _safe_send_json(websocket, {"type": "turn_complete", "full_text": ""})
            await _safe_send_json(websocket, {"type": "voice_state", "state": "idle"})
