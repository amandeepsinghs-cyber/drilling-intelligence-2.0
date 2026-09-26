"""Live smoke: connect to backend /ws/live, send one Hinglish prompt, report statuses, transcript, tool calls, latency."""
import asyncio, json, os, sys, time
import websockets

PROMPTS = sys.argv[1:] or ["Thoda batayenge abhi well ke andar kya chal raha hai?"]

async def main():
    async with websockets.connect("ws://localhost:8765/ws/live", max_size=None) as ws:
        t0 = time.time(); statuses = []
        # wait for connected / fallback
        while time.time() - t0 < 20:
            m = json.loads(await asyncio.wait_for(ws.recv(), 20)) if True else None
            if isinstance(m, dict) and m.get("type") == "status":
                statuses.append(m.get("status")); print("status:", m)
                if m.get("status") in ("connected", "fallback", "rehearsal_active"): break
        for p in PROMPTS:
            print("\n>>", p)
            ts = time.time(); first_audio = None; text = []; tools = []
            await ws.send(json.dumps({"type": "prompt", "text": p, "turn": 99, "md_m": float(os.environ.get("MD", "4145"))}))
            while time.time() - ts < 45:
                try:
                    raw = await asyncio.wait_for(ws.recv(), 45)
                except asyncio.TimeoutError:
                    break
                if isinstance(raw, bytes):
                    first_audio = first_audio or time.time() - ts; continue
                m = json.loads(raw); ty = m.get("type")
                if ty in ("audio",) and first_audio is None: first_audio = time.time() - ts
                if ty == "caption_delta": text.append(m.get("text", ""))
                if ty in ("tool_call", "tool_result", "tool"): tools.append(m.get("name") or m.get("tool"))
                if ty == "status": print("status:", m)
                if ty == "turn_complete":
                    print("turn_complete full_text len", len(m.get("full_text","")), "at", round(time.time()-ts,2))
                    if m.get("full_text") or text: break
            print(f"first_audio_s={first_audio and round(first_audio,2)} tools={tools}")
            print("agent:", "".join(text)[:1200])

asyncio.run(main())
