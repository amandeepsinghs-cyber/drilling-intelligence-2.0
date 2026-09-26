"""agent.live_session — ADK bidi-streaming proxy between browser WebSocket and Gemini Live (SDD §10.2).

Handles:
- Upstream audio PCM (16 kHz mono) streamed from browser microphone via push-to-talk.
- Downstream audio PCM (24 kHz mono) streamed to browser for low-latency playback.
- Real-time tool execution against physics models and canonical scenario facts.
- Proactive watchdog event injections (4,172 m, 4,195 m, 4,205 m).
- Automatic UI side-effect dispatch (memos, approvals, fan-out, ROP capping).
- Graceful offline / rehearsal fallback if network or quota is unavailable.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.agent.prompts import get_agent_system_prompt
from app.agent.tools import execute_tool
from app.core.config import get_settings

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
        "description": "Calculate barite addition (lb/bbl, MT, sacks) to weight up active mud system.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "w1": {"type": "NUMBER", "description": "Initial mud weight in ppg"},
                "w2": {"type": "NUMBER", "description": "Target mud weight in ppg"},
                "vol_bbl": {"type": "NUMBER", "description": "Active system volume in barrels"},
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
        "description": "Submit MOC memo for Drilling Superintendent approval and freeze decision basis.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "memo_id": {"type": "STRING", "description": "MOC memo ID to approve"},
            },
        },
    },
    {
        "name": "dispatch_fanout",
        "description": "Fan out approved instructions to Mud Chemist, RTOC, Drilling Manager, and Rig Floor.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "memo_id": {"type": "STRING", "description": "Approved memo ID to dispatch"},
            },
        },
    },
    {
        "name": "set_rop_cap",
        "description": "Apply operational ROP ceiling to restrain cuttings loading and keep ECD below shoe FIT.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "rop": {"type": "NUMBER", "description": "Maximum allowable ROP in m/hr"},
            },
        },
    },
    {
        "name": "generate_wcr",
        "description": "Generate preliminary Well Completion Report (WCR) draft for the 12-1/4 in section.",
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


async def handle_live_websocket(websocket: WebSocket) -> None:
    """Entry point for /ws/live WebSocket connections."""
    await websocket.accept()
    settings = get_settings()

    # If offline mode is requested, run deterministic offline session
    if settings.offline:
        await _run_offline_session(websocket)
        return

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            vertexai=True,
            project=settings.project_id or "drilling-intelligence",
            location=settings.region or "us-central1",
        )

        system_prompt = get_agent_system_prompt()
        tools = _build_genai_tools()

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            system_instruction=types.Content(parts=[types.Part.from_text(text=system_prompt)]),
            tools=tools,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            ),
        )

        model_name = settings.models.get("live", "gemini-3.8-live")

        logger.info(f"Connecting to Gemini Live with model {model_name}...")
        await websocket.send_json({"type": "status", "status": "connecting", "model": model_name})

        async with client.aio.live.connect(model=model_name, config=config) as session:
            await websocket.send_json({"type": "status", "status": "connected", "model": model_name})
            await _run_bidi_stream(websocket, session)

    except Exception as e:
        logger.warning(f"Gemini Live online connection failed: {e}. Falling back to rehearsal session.")
        await websocket.send_json({
            "type": "status",
            "status": "fallback",
            "message": f"Online session unavailable ({type(e).__name__}). Running rehearsal engine.",
        })
        await _run_offline_session(websocket)


async def _run_bidi_stream(websocket: WebSocket, session: Any) -> None:
    """Manages the two concurrent streaming tasks: client -> gemini and gemini -> client."""
    from google.genai import types

    stop_event = asyncio.Event()

    async def client_to_gemini():
        try:
            while not stop_event.is_set():
                message = await websocket.receive()
                if "bytes" in message and message["bytes"]:
                    # Binary PCM 16kHz audio from mic
                    pcm_data = message["bytes"]
                    await session.send_realtime_input(
                        media=types.Blob(data=pcm_data, mime_type="audio/pcm;rate=16000")
                    )
                elif "text" in message and message["text"]:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type")
                        if msg_type == "text" or msg_type == "prompt":
                            text_prompt = data.get("text", "")
                            await websocket.send_json({"type": "voice_state", "state": "thinking"})
                            await session.send_client_content(
                                turns=[types.Content(parts=[types.Part.from_text(text=text_prompt)])],
                                turn_complete=True,
                            )
                        elif msg_type == "proactive_event":
                            prompt = data.get("prompt") or data.get("prompt_injection", "")
                            await websocket.send_json({"type": "voice_state", "state": "alert"})
                            await session.send_client_content(
                                turns=[types.Content(parts=[types.Part.from_text(text=prompt)])],
                                turn_complete=True,
                            )
                        elif msg_type == "interrupt":
                            await websocket.send_json({"type": "interrupted"})
                    except json.JSONDecodeError:
                        pass
        except WebSocketDisconnect:
            stop_event.set()
        except Exception as e:
            logger.error(f"client_to_gemini error: {e}")
            stop_event.set()

    async def gemini_to_client():
        try:
            current_caption = []
            while not stop_event.is_set():
                async for response in session.receive():
                    # 1. Check for tool calls
                    if response.tool_call is not None:
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

                            # Execute tool
                            result = execute_tool(fc.name, fc.args)

                            # Notify UI of tool result
                            await websocket.send_json({
                                "type": "tool_call",
                                "name": fc.name,
                                "status": "done",
                                "result": result,
                            })

                            # Dispatch UI side-effects for actions
                            if fc.name == "create_moc_memo":
                                await websocket.send_json({"type": "action", "kind": "memo", "payload": result})
                            elif fc.name == "request_approval":
                                await websocket.send_json({"type": "action", "kind": "approval", "payload": result})
                            elif fc.name == "dispatch_fanout":
                                await websocket.send_json({"type": "action", "kind": "dispatch", "payload": result})
                            elif fc.name == "set_rop_cap":
                                await websocket.send_json({"type": "action", "kind": "rop_cap", "payload": result})
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
                                    # Send binary 24 kHz audio chunk directly to browser
                                    await websocket.send_bytes(part.inline_data.data)
                                    await websocket.send_json({"type": "voice_state", "state": "speaking"})
                                if part.text:
                                    current_caption.append(part.text)
                                    await websocket.send_json({
                                        "type": "caption_delta",
                                        "text": part.text,
                                        "role": "agent",
                                    })

                        if sc.turn_complete:
                            full_text = " ".join(current_caption).strip()
                            current_caption = []
                            await websocket.send_json({
                                "type": "turn_complete",
                                "full_text": full_text,
                            })
                            await websocket.send_json({"type": "voice_state", "state": "idle"})

        except WebSocketDisconnect:
            stop_event.set()
        except Exception as e:
            logger.error(f"gemini_to_client error: {e}")
            stop_event.set()

    t1 = asyncio.create_task(client_to_gemini())
    t2 = asyncio.create_task(gemini_to_client())

    done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
    for p in pending:
        p.cancel()


async def _run_offline_session(websocket: WebSocket) -> None:
    """Runs interactive rehearsal session if offline or fallback."""
    from app.scenario.facts import facts, turns

    await websocket.send_json({"type": "status", "status": "rehearsal_active"})
    try:
        while True:
            msg = await websocket.receive()
            if "text" in msg and msg["text"]:
                data = json.loads(msg["text"])
                mtype = data.get("type")
                if mtype in ("text", "prompt", "proactive_event"):
                    await websocket.send_json({"type": "voice_state", "state": "speaking"})
                    # Echo rehearsal response or tool events
                    turn_num = data.get("turn", 0)
                    t_list = turns().get("turns", [])
                    turn_spec = next((t for t in t_list if t["n"] == turn_num), None)
                    if turn_spec and turn_spec.get("tools"):
                        for tname in turn_spec["tools"]:
                            res = execute_tool(tname)
                            await websocket.send_json({"type": "tool_call", "name": tname, "status": "done", "result": res})
                    await asyncio.sleep(0.5)
                    await websocket.send_json({"type": "voice_state", "state": "idle"})
    except WebSocketDisconnect:
        pass
