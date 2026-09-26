"""Focused re-test for the two soak findings: barite must match the memo (39.8 MT / 796 bags) and the
first question must survive a forced reconnect (needs backend DI_DEBUG_RECONNECT=1)."""
import asyncio, json, time
import websockets


async def ask(ws, text, md):
    ts = time.time(); out = []; tools = []
    await ws.send(json.dumps({"type": "prompt", "text": text, "turn": 99, "md_m": md}))
    while time.time() - ts < 60:
        raw = await asyncio.wait_for(ws.recv(), 60)
        if isinstance(raw, bytes):
            continue
        m = json.loads(raw)
        if m.get("type") == "tool_call" and m.get("status") == "running":
            tools.append((m.get("name"), m.get("args")))
        if m.get("type") == "status":
            print("   status:", m.get("status"), m.get("memory", ""))
        if m.get("type") == "caption_delta":
            out.append(m.get("text", ""))
        if m.get("type") == "turn_complete" and (m.get("full_text") or out):
            return m.get("full_text") or "".join(out), tools
    return "".join(out), tools


async def main():
    async with websockets.connect("ws://localhost:8765/ws/live", max_size=None) as ws:
        while True:
            m = json.loads(await ws.recv())
            if m.get("type") == "status" and m.get("status") in ("connected", "fallback"):
                print("status:", m.get("status")); break
        for text, md in [("Sir, pehla sawaal: abhi kaunsi formation hai bit pe?", 4150.0),
                         ("Barite kitna lagega?", 4168.0)]:
            a, t = await ask(ws, text, md)
            print(f">> {text}\n   tools={t}\n<< {a}\n")
        await ws.send(json.dumps({"type": "debug_reconnect"}))
        print("-- forced reconnect --")
        await asyncio.sleep(6)
        for text, md in [("Well ka status batao.", 4170.0),
                         ("Sir, is conversation mein maine sabse pehla sawaal kya poocha tha?", 4171.0)]:
            a, t = await ask(ws, text, md)
            print(f">> {text}\n   tools={t}\n<< {a}\n")

asyncio.run(main())
