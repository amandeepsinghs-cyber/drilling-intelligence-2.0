# Unified Cloud Run image — Sagar Drishti AI Agent (frontend dist + FastAPI /api + /ws, one origin).
# Build context = repo root. Data needed at runtime is BAKED IN (see .gcloudignore for what is sent):
#   data/processed (well-log parquet), data/models (joblib ML), data/scenario, data/knowledge, contracts, geo.
# data/raw (36 MB source DLIS/LAS) is excluded — it lives in the GCS data lake, not on the request path.

# Stage 1 (frontend) is built LOCALLY before submit: `cd frontend && npm run build`.
# Reason: package-lock.json resolves all packages via the corp Airlock proxy (airlock-proxy.uplink.goog),
# which Cloud Build cannot reach (npm crashes with "Exit handler never called"). Shipping the locally
# built dist also guarantees the image serves exactly the bundle that was tested.

# Stage 2: Production Python Backend + Static Serving
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml backend/uv.lock backend/
# agent = google-genai (Gemini Live); gcp = storage/bigquery clients. scikit-learn pinned to the version the
# joblib models were trained with (1.9.1) — the full `ml` extra (xgboost, shap) is not needed at runtime.
RUN cd backend && uv sync --frozen --no-dev --no-install-project --extra agent --extra gcp \
    && uv pip install --python .venv/bin/python "scikit-learn==1.9.1" joblib

COPY backend/ backend/
COPY config/ config/
COPY data/ data/
COPY frontend/dist /app/frontend/dist

WORKDIR /app/backend
ENV PORT=8080 \
    DI_ENV=cloudrun \
    PYTHONUNBUFFERED=1

# Call the venv directly: `uv run` would re-sync without the extras and strip google-genai.
CMD ["sh", "-c", "exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --ws-ping-interval 20 --ws-ping-timeout 20"]
