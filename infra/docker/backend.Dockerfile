# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Serving
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml backend/
RUN cd backend && uv sync --no-dev --extra agent --extra gcp

COPY backend/ backend/
COPY config/ config/
COPY data/ data/
COPY --from=frontend-builder /web/dist /app/frontend/dist

WORKDIR /app/backend
ENV PORT=8080
ENV DI_ENV=gcp

CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
