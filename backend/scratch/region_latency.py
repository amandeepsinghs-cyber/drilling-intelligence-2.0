"""Latency probe: Gemini Live connect time + time-to-first-audio per Vertex region.

Run from repo root:
  ~/.local/bin/uv run --no-project --python 3.12 --with google-genai python -u backend/scratch/region_latency.py
Read-only: opens short Live sessions, sends one short text turn each, closes. No project changes.
"""
import asyncio
import statistics
import sys
import os
import time

from google import genai
from google.genai import types

PROJECT = os.getenv("DI_PROJECT", "drilling-intelligence")
MODEL = "gemini-3.8-live"
REGIONS = sys.argv[1:] or ["us-central1", "asia-south1", "asia-southeast1", "europe-west2", "global"]
TRIES = 3
PROMPTS = ["Reply with exactly one short sentence: the well is stable.",
           "Reply with one short sentence in Hindi: sab theek hai.",
           "Reply with one short sentence: mud weight is eleven point two ppg."]


async def one(client, prompt):
    cfg = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=types.Content(parts=[types.Part.from_text(text="You are a concise drilling assistant.")]),
    )
    t0 = time.perf_counter()
    async with client.aio.live.connect(model=MODEL, config=cfg) as s:
        t_conn = time.perf_counter() - t0
        t1 = time.perf_counter()
        await s.send_client_content(turns=types.Content(role="user", parts=[types.Part.from_text(text=prompt)]), turn_complete=True)
        first = None
        async for m in s.receive():
            sc = getattr(m, "server_content", None)
            if first is None and sc and sc.model_turn and any(p.inline_data for p in (sc.model_turn.parts or [])):
                first = time.perf_counter() - t1
            if sc and sc.turn_complete:
                break
        done = time.perf_counter() - t1
    return t_conn, first, done


async def main():
    print(f"model={MODEL} project={PROJECT} tries={TRIES}")
    rows = []
    for region in REGIONS:
        client = genai.Client(vertexai=True, project=PROJECT, location=region)
        conns, firsts, dones, err = [], [], [], None
        for i in range(TRIES):
            try:
                c, f, d = await asyncio.wait_for(one(client, PROMPTS[i % len(PROMPTS)]), timeout=40)
                conns.append(c); dones.append(d)
                if f is not None: firsts.append(f)
            except Exception as e:  # noqa: BLE001 - report and move on
                err = f"{type(e).__name__}: {str(e)[:140]}"
                break
        med = lambda xs: f"{statistics.median(xs)*1000:.0f}" if xs else "-"
        rows.append((region, med(conns), med(firsts), med(dones), len(firsts), err))
        print(f"{region:16s} connect={med(conns):>6} ms  first_audio={med(firsts):>6} ms  turn_done={med(dones):>6} ms  n={len(firsts)}  {err or ''}", flush=True)
    print("\nMEDIANS (ms): region | connect | first audio | turn complete | n | error")
    for r in rows:
        print(" | ".join(str(x) for x in r))


asyncio.run(main())
