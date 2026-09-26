"""P0-1 contract tests for /ws/live session resilience, using a fake Gemini Live client.

Proves, without network:
  1. A GoAway from Gemini does NOT close the browser socket; the proxy reconnects with the latest
     session-resumption handle and reports status 'resumed' with memory=True.
  2. If Gemini cannot be reached, the proxy retries, then reports 'fallback' and serves the
     rehearsal engine on the SAME socket (turn_complete still arrives).
"""
from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace as NS

import pytest
from fastapi.testclient import TestClient

import app.agent.live_session as ls
from app.core.config import Settings
from app.main import app

TURN_END = "TURN_END"


def _msg(**kw):
    base = dict(session_resumption_update=None, go_away=None, tool_call=None, server_content=None)
    base.update(kw)
    return NS(**base)


def _caption(text, done=False):
    return _msg(server_content=NS(output_transcription=NS(text=text), model_turn=None,
                                  turn_complete=done, input_transcription=None))


class FakeSession:
    def __init__(self, idx: int, handle: str | None):
        self.idx, self.handle = idx, handle
        self.q: asyncio.Queue = asyncio.Queue()
        # Server issues a resumable handle right after connect.
        self.q.put_nowait(_msg(session_resumption_update=NS(new_handle=f"H{idx + 1}", resumable=True)))

    async def send_client_content(self, turns, turn_complete=True):
        reply = "Namaste" if self.idx == 0 else "Resumed"
        self.q.put_nowait(_caption(reply))
        self.q.put_nowait(_caption("", done=True))
        if self.idx == 0:
            self.q.put_nowait(_msg(go_away=NS(time_left="5s")))  # server asks us to leave after turn 1

    async def send_realtime_input(self, **kw):
        pass

    async def send_tool_response(self, **kw):
        pass

    async def receive(self):
        while True:
            m = await self.q.get()
            yield m
            sc = m.server_content
            if sc is not None and sc.turn_complete:
                return
            if m.go_away is not None:
                return


class FakeConnect:
    def __init__(self, owner, config):
        self.owner, self.config = owner, config

    async def __aenter__(self):
        if self.owner.fail:
            raise ConnectionError("simulated outage")
        handle = self.config.session_resumption.handle
        self.owner.handles.append(handle)
        return FakeSession(len(self.owner.handles) - 1, handle)

    async def __aexit__(self, *a):
        return False


class FakeClient:
    fail = False
    handles: list = []

    def __init__(self, **kw):
        self.aio = NS(live=NS(connect=lambda model, config: FakeConnect(FakeClient, config)))


def _recv_until(ws, pred, limit=50):
    seen = []
    for _ in range(limit):
        m = ws.receive_json()
        seen.append(m)
        if pred(m):
            return m, seen
    raise AssertionError(f"condition not met; saw {seen}")


@pytest.fixture
def fake_genai(monkeypatch):
    import google.genai as genai_mod

    FakeClient.fail = False
    FakeClient.handles = []
    monkeypatch.setattr(genai_mod, "Client", FakeClient)
    monkeypatch.setattr(ls, "get_settings", lambda: Settings(offline=False, models={"live": "fake-live"}))
    return FakeClient


def test_goaway_resumes_with_handle_and_keeps_socket(fake_genai):
    c = TestClient(app)
    with c.websocket_connect("/ws/live") as ws:
        _recv_until(ws, lambda m: m.get("status") == "connected")
        ws.send_text(json.dumps({"type": "prompt", "text": "status?"}))
        _, seen = _recv_until(ws, lambda m: m.get("type") == "turn_complete")
        assert any(m.get("type") == "caption_delta" and m["text"] == "Namaste" for m in seen)

        # GoAway → transparent resume on the same browser socket, with memory.
        resumed, _ = _recv_until(ws, lambda m: m.get("status") == "resumed")
        assert resumed["memory"] is True

        ws.send_text(json.dumps({"type": "prompt", "text": "and now?"}))
        _, seen2 = _recv_until(ws, lambda m: m.get("type") == "turn_complete")
        assert any(m.get("type") == "caption_delta" and m["text"] == "Resumed" for m in seen2)

    assert fake_genai.handles == [None, "H1"], "second session must reuse the handle issued by the first"


def test_outage_falls_back_to_rehearsal_on_same_socket(fake_genai):
    fake_genai.fail = True
    c = TestClient(app)
    with c.websocket_connect("/ws/live") as ws:
        _recv_until(ws, lambda m: m.get("status") == "fallback", limit=20)
        _recv_until(ws, lambda m: m.get("status") == "rehearsal_active")
        ws.send_text(json.dumps({"type": "prompt", "text": "status?", "turn": 0}))
        _recv_until(ws, lambda m: m.get("type") == "turn_complete")
