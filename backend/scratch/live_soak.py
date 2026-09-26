"""Live soak: one /ws/live session for SOAK_MIN minutes, a prompt every GAP_S seconds, a forced resume
(debug_reconnect, needs backend DI_DEBUG_RECONNECT=1) at FORCE_AT_S, natural GoAways logged, and a final
memory question about turn 1. Prints one line per turn + a summary. Usage: python live_soak.py"""
import asyncio, json, os, time
import websockets

SOAK_MIN = float(os.environ.get("SOAK_MIN", "32"))
GAP_S = float(os.environ.get("GAP_S", "150"))
FORCE_AT_S = float(os.environ.get("FORCE_AT_S", "300"))
PROMPTS = [
    ("Sir, pehla sawaal: abhi kaunsi formation hai bit pe?", 4150),
    ("Well ka status batao.", 4152),
    ("Paas wale rig pe kya hua tha, kaise mitigate kiya?", 4155),
    ("Pressure window samjhao — kick side aur loss side.", 4160),
    ("Agle zone tak kitna time lagega?", 4162),
    ("U3 pay sand, 4195 meter.", 4162),
    ("Mud weight kitna hona chahiye?", 4165),
    ("Barite kitna lagega?", 4168),
    ("Well ka status batao.", 4170),
    ("Abhi overbalance kitna hai?", 4171),
    ("Well ka status batao.", 4172),
    ("Sir, is conversation mein maine sabse pehla sawaal kya poocha tha?", 4172),
]


async def recv_until_done(ws, ts, limit=60):
    first_audio, text, tools, statuses = None, [], [], []
    while time.time() - ts < limit:
        try:
            raw = await asyncio.wait_for(ws.recv(), limit)
        except asyncio.TimeoutError:
            break
        if isinstance(raw, bytes):
            first_audio = first_audio or time.time() - ts
            continue
        m = json.loads(raw)
        ty = m.get("type")
        if ty == "audio" and first_audio is None:
            first_audio = time.time() - ts
        elif ty == "caption_delta":
            text.append(m.get("text", ""))
        elif ty == "tool_call" and m.get("status") != "done":
            tools.append(m.get("name"))
        elif ty == "status":
            statuses.append(m.get("status"))
        elif ty == "turn_complete":
            text = [m.get("full_text")] if m.get("full_text") else text
            break
    return first_audio, "".join(text), tools, statuses


async def main():
    t_start = time.time()
    results, all_status, forced = [], [], False
    url = os.environ.get("SOAK_URL", "ws://localhost:8765/ws/live")
    tok = os.environ.get("SOAK_TOKEN")
    hdrs = {"Authorization": f"Bearer {tok}"} if tok else None
    async with websockets.connect(url, max_size=None, ping_interval=20, additional_headers=hdrs) as ws:
        while time.time() - t_start < 25:
            m = json.loads(await ws.recv())
            if m.get("type") == "status":
                all_status.append(m.get("status"))
                if m.get("status") in ("connected", "fallback", "rehearsal_active"):
                    break
        print("initial status:", all_status, flush=True)
        i = 0
        while time.time() - t_start < SOAK_MIN * 60:
            el = time.time() - t_start
            if not forced and el >= FORCE_AT_S:
                await ws.send(json.dumps({"type": "debug_reconnect"}))
                forced = True
                print(f"[{el/60:5.1f} min] sent debug_reconnect", flush=True)
                await asyncio.sleep(8)
            last = (time.time() - t_start) > SOAK_MIN * 60 - GAP_S - 60
            p, md = PROMPTS[-1] if last else PROMPTS[i % (len(PROMPTS) - 1)]
            ts = time.time()
            await ws.send(json.dumps({"type": "prompt", "text": p, "turn": 99, "md_m": float(md)}))
            fa, text, tools, st = await recv_until_done(ws, ts)
            all_status += st
            ok = bool(text.strip())
            results.append((el, p, fa, tools, ok, text))
            print(f"[{el/60:5.1f} min] {'OK ' if ok else 'EMPTY'} first_audio={fa and round(fa,1)}s tools={tools} status={st}\n    >> {p}\n    << {text[:400]}", flush=True)
            i += 1
            if last:
                break
            # keep the socket busy-idle until the next prompt, collecting statuses
            t_next = ts + GAP_S
            while time.time() < t_next:
                try:
                    raw = await asyncio.wait_for(ws.recv(), max(0.5, t_next - time.time()))
                    if not isinstance(raw, bytes):
                        m = json.loads(raw)
                        if m.get("type") == "status":
                            all_status.append(m.get("status"))
                            print(f"    status: {m}", flush=True)
                except asyncio.TimeoutError:
                    pass
    empty = sum(1 for r in results if not r[4])
    fas = [r[2] for r in results if r[2]]
    print("\n=== SUMMARY ===")
    print(f"duration_min={(time.time()-t_start)/60:.1f} turns={len(results)} empty={empty} forced_reconnect={forced}")
    print(f"first_audio_s median={sorted(fas)[len(fas)//2] if fas else None} max={max(fas) if fas else None}")
    print(f"statuses={all_status}")
    print(f"final_memory_answer={results[-1][5][:500] if results else None}")


asyncio.run(main())
