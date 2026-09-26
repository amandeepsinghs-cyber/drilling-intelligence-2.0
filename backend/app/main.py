"""FastAPI entrypoint (SDD §13). Serves scenario, physics, live voice agent WebSocket (/ws/live)."""
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.agent.live_session import handle_live_websocket
from app.api.routes_actions import router as tools_router
from app.api.routes_physics import router as physics_router
from app.api.routes_scenario import router as scenario_router
from app.core.config import get_settings

app = FastAPI(title="Drilling Intelligence 2.0", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(scenario_router)
app.include_router(physics_router)
app.include_router(tools_router)


@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    s = get_settings()
    return {"status": "ok", "env": s.env, "offline": s.offline, "region": s.region, "models": s.models}


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    """Bidi audio + event streaming between browser and Gemini Live (SDD §10.2)."""
    await handle_live_websocket(websocket)


# In-memory subscriber list for scenario / presenter events
_event_subscribers: list[WebSocket] = []


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket) -> None:
    """Scenario, trigger, and presenter sync event stream (SDD §13)."""
    await websocket.accept()
    _event_subscribers.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast received events to other subscribers (e.g. PresenterConsole sync)
            for sub in _event_subscribers:
                if sub != websocket:
                    try:
                        await sub.send_text(data)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        if websocket in _event_subscribers:
            _event_subscribers.remove(websocket)


# Mount built frontend if present (for unified Cloud Run single-container deployment)
STATIC_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if not STATIC_DIR.exists():
    STATIC_DIR = Path("/app/frontend/dist")

if STATIC_DIR.exists():
    from fastapi.responses import FileResponse

    _INDEX = STATIC_DIR / "index.html"

    class _SPAStaticFiles(StaticFiles):
        """Serve built assets; unknown non-API paths (React routes like /well/..., /presenter) -> index.html."""

        async def get_response(self, path: str, scope):  # type: ignore[override]
            try:
                return await super().get_response(path, scope)
            except Exception:
                if path.startswith(("api/", "ws/")) or not _INDEX.exists():
                    raise
                return FileResponse(_INDEX)

    app.mount("/", _SPAStaticFiles(directory=str(STATIC_DIR), html=True), name="frontend")

