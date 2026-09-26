"""In-process FrameSet cache. `reload()` rebuilds after a real-LWD drop-in (POST /api/scenario/reload)."""
from __future__ import annotations

import threading

from app.scenario.facts import facts, offsets, profiles, turns
from app.scenario.frames import FrameSet, build_frames

_lock = threading.Lock()
_cache: dict[str, FrameSet] = {}


def get(well_id: str | None = None) -> FrameSet:
    wid = well_id or facts()["well"]["id"]
    with _lock:
        if wid not in _cache:
            _cache[wid] = build_frames(wid)
        return _cache[wid]


def reload() -> FrameSet:
    for fn in (facts, offsets, turns, profiles):
        fn.cache_clear()
    with _lock:
        _cache.clear()
    return get()
