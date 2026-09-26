# Drilling Intelligence 2.0 — Build Guide (`build.md`, living document)

> **How to use:** execute phases in order. Each step has a **Done when** line. Tick progress in [`checklist.md`](checklist.md). Design authority is [`docs/SDD.md`](docs/SDD.md), and the numbers come from [`data/scenario/mn_sm_dw_01.yaml`](data/scenario/mn_sm_dw_01.yaml).
> **This file will change.** Record edits in §12 (Change Log).

---

## 0. Prerequisites

| Tool | Version | Check |
| :--- | :--- | :--- |
| Python | 3.12+ | `python3 --version` |
| uv (Python env / deps) | latest | `uv --version` |
| Node.js | 20 LTS+ | `node -v` |
| npm | 10+ | `npm -v` (pnpm not required) |
| gcloud CLI | latest | `gcloud --version` |
| Terraform | 1.7+ | `terraform -version` (Phase 7) |
| Docker | 24+ | `docker -v` (optional locally) |

**GCP (Phase 4+):** project `drilling-intelligence-2-509714`, region `asia-south1`.

```bash
gcloud auth login && gcloud auth application-default login
gcloud config set project drilling-intelligence-2-509714
gcloud services enable aiplatform.googleapis.com run.googleapis.com bigquery.googleapis.com \
  storage.googleapis.com firestore.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com docs.googleapis.com \
  gmail.googleapis.com chat.googleapis.com maps-backend.googleapis.com
```

**Environment:** `cp .env.example .env`, then fill in the keys. Never commit `.env`.

---

## Phase 0 — Docs & Scaffold ✅ (this commit)
1. `brief.md` v2.1, `docs/SDD.md`, `build.md`, `checklist.md`.
2. Full repo tree (see `README.md`), contracts in `data/contracts/`, and canonical facts in `data/scenario/`.

**Done when:** the tree exists, the scenario YAML matches brief §3C, and the SDD is approved.

---

## Phase 1 — Front-End Shell on Stub Data ✅ (code complete 2026-09-25; 36/36 backend tests, tsc + vite build green)

### 1.1 Backend skeleton + stub frames
```bash
cd backend
# Option A (project env)
uv sync --extra dev && uv run python ../pipelines/synth/generate_stub_frames.py
uv run uvicorn app.main:app --reload --port 8765
# Option B (no project env; used on Cloudtop)
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml,numpy,pandas,pyarrow,pydantic \
  python ../pipelines/synth/generate_stub_frames.py
~/.local/bin/uv run --no-project --python 3.12 --with fastapi,uvicorn,pyyaml,numpy,pandas,pyarrow,pydantic \
  uvicorn app.main:app --port 8765
# Tests
~/.local/bin/uv run --no-project --python 3.12 --with pytest,httpx,fastapi,pyyaml,numpy,pandas,pyarrow,pydantic \
  python -m pytest -q tests
```
> [!NOTE]
> On Cloudtop, ports 8080 and 8090 are often taken (for example by Jetski). The default is **8765**, and the Vite proxy reads `DI2_API_PORT`.

The stub generator writes `data/processed/{lwd,mudlog,mud_chemistry,depth_frames}/` and `frontend/public/mocks/{frames,scenario,wells}.json`. The UI falls back to these mocks when the API is down.

**Endpoints:** `GET /api/health`, `/api/wells`, `/api/scenario`, `/api/scenario/{id}/frames?from&to&step` (columnar), `/api/scenario/{id}/frame?md=`, `/api/scenario/{id}/meta`, `POST /api/scenario/reload`, `POST /api/physics/whatif`.

**Done when:** the frames reproduce every checkpoint (ECD 11.42 / 11.84 / 12.02, +122 psi, p_kick 0.71 @ 4172 m). ✅

### 1.2 Frontend bootstrap
```bash
cd frontend && npm install
cp .env.example .env.local     # VITE_GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_MAP_ID (VITE_API_BASE empty in dev)
DI2_API_PORT=8765 npm run dev  # http://localhost:5173  (presenter: /presenter)
npm run typecheck && npm run build
```
With no Maps key, `BasinMap` falls back to a deck.gl-only basemap.

### 1.3 Build order (UI)
1. Design tokens and themes (`src/design/`): dark/light, board/engineer.
2. `BasinMap`: Google Maps dark vector (Map ID with cloud styling) + deck.gl layers (wells, incidents, U1445 pin) + fly-in camera.
3. `CommandCenter` layout grid: Well Pulse, log area, agent panel, timeline.
4. `LogTracks` with Plotly `scattergl`: GR, Resistivity (log), **PressureWindow** (PP / FG / FIT / MW / ECD / ghost band), LithoColumn.
5. `DistanceToHazard`, `GhostCurve`, `ProvenanceChip`, `ProvenanceFooter`.
6. `WellboreSchematic2D` (SVG) and `Well3DView` (R3F, toggle).
7. `Timeline` with event markers, plus `WhatIfDrawer` (calls `/api/physics/whatif`, stubbed first).
8. `AgentPanel` with **mock** captions, tool chips and citations driven by `turns.yaml`.
9. Overlays: `MemoOverlay`, `WcrViewer`, `AuditDrawer`.
10. `PresenterConsole` (`/presenter`), with hotkeys synced over `/ws/events`.

**Done when:** you can click through all 11 turns with mock agent content at 60 fps, and board/engineer and dark/light both work.
**Status:** every item 1–10 is built. Hotkeys: `Space` play/pause, `0–9` and `-` for turns, `M` memo, `W` WCR, `A` audit, `D` what-if, `B` board/engineer, `T` theme, `L` language, `Shift+R` reset, `?` help. **Still open:** a 60 fps check on the stage laptop, and code-splitting Plotly (main chunk ≈ 5.9 MB, 1.8 MB gzip).

---

## Phase 2 — Scenario & Physics Engine
1. Implement `backend/app/physics/*` (formulas in SDD §7). Unit tests must hit the acceptance values.
2. Implement `scenario/engine.py`, `triggers.py` and `turns.py`, reading from YAML.
3. Generate turn snapshots: `uv run python -m app.scenario.turns --build-snapshots`.
4. Wire the what-if slider to the real ECD model.

**Done when:** `pytest backend/tests/physics` is green, triggers fire at 4,172 / 4,195 / 4,205 m, and the what-if ECD crosses FIT at the expected ROP.

---

## Phase 3 — Knowledge Base (RAG): Synthetic Corpus → Embeddings

> [!IMPORTANT]
> **Every SOP, WCR, DDR, incident report, mud program and lesson-learned document is SYNTHETIC** (a user requirement). Each file carries `provenance: SYNTHETIC` front-matter, and the UI shows a SYNTHETIC chip on every citation. Only public reference text (IODP Proceedings, §6.1 #8) may be added as PUBLIC.

### 3.1 Generate the synthetic corpus (from scenario facts)
```bash
uv run python pipelines/synth/generate_knowledge_corpus.py \
  --facts data/scenario/ --templates config/prompts/synthetic/ \
  --out data/knowledge/source/ --model gemini-3-pro   # model ID per settings.yaml
```

| Doc type | Output folder | Target count |
| :--- | :--- | :--- |
| SOPs | `data/knowledge/source/sops/` | 6 |
| Offset WCRs | `data/knowledge/source/wcr/` | 4 |
| Incident reports | `data/knowledge/source/incidents/` | 6 |
| Daily Drilling Reports | `data/knowledge/source/ddr/` | ~60 |
| Mud programs | `data/knowledge/source/mud_programs/` | 3 |
| Lessons learned | `data/knowledge/source/lessons_learned/` | 5 |
| Legacy scan (image) | `data/knowledge/source/legacy_scans/` | 1–3 |

### 3.2 Validate facts (hard gate)
```bash
uv run python pipelines/synth/validate_facts.py --corpus data/knowledge/source/ --facts data/scenario/
```
**Done when:** 0 unknown numbers and 0 depth / unit mismatches.

### 3.3 Optional: render PDFs for realism
```bash
uv run python pipelines/synth/render_pdfs.py --in data/knowledge/source/ --out data/knowledge/rendered/
```

### 3.4 Chunk & embed (local)
```bash
uv run python pipelines/embeddings/chunk_corpus.py  --in data/knowledge/source/ --out data/knowledge/chunks/
uv run python pipelines/embeddings/build_embeddings.py --chunks data/knowledge/chunks/ \
  --out data/knowledge/embeddings/chunks_with_embeddings.json --model gemini-embedding-001 --dim 768
```

### 3.5 Evaluate
```bash
uv run python pipelines/embeddings/eval_rag.py --qa data/knowledge/eval/qa_pairs.yaml
```
**Done when:** recall@5 ≥ 0.95 and citation accuracy ≥ 95% (SDD SC-5).

### 3.6 Push to Vertex AI RAG Engine (Phase 7, or earlier if online)
```bash
uv run python pipelines/embeddings/push_to_rag_engine.py --corpus di2-knowledge --region asia-south1
```

---

## Phase 4 — Voice Agent (Gemini 3.8 Live via ADK)
1. Pin the model IDs in `config/settings.local.yaml → models` (verify on Vertex: `Gemini 3.8 Live`, `3.8 Live Extended Thinking`, Gemini 3.x Pro/Flash, embedding).
2. Implement `agent/live_session.py` (ADK bidi proxy), `tools.py` (SDD §10.3), `watchdog.py`, `captions.py` and `guardrails.py`.
3. Frontend: `live/micCapture.ts` (push-to-talk), `liveClient.ts`, `audioPlayer.ts` (barge-in).
4. Record the **offline cache** per turn: `uv run python -m app.agent.record_offline_cache`.

**Done when:** turns 0–10 run by voice, proactive alerts fire, captions show hi + en, and latency is ≤ 1.5 s p90 locally.

---

## Phase 5 — Actions & Decision Ledger
1. `actions/memo.py` (Gemini Pro structured → template), `approval.py` (voice / phone / UI), `ledger.py`.
2. Channels:
   - `chat_google.py` (webhook URL in `.env`).
   - `email_gmail.py` (OAuth or service account; local `.eml` fallback).
   - `push_telegram.py` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
   - `sms_dlt.py` (disabled by default).
3. `docs_wcr.py`: Google Docs API, from the template ID `GOOGLE_DOCS_WCR_TEMPLATE_ID`.
4. `rag/writeback.py`: lesson doc → validate → chunk → embed → upsert.

**Done when:** the phone buzzes, the email lands, the Chat post appears, the WCR opens as a Google Doc, and the ledger shows a frozen basis.

---

## Phase 6 — Real Data Download & Drop-In

### 6.1 Sources to try (in priority order)

| # | Dataset | Why | Size | Licence | How |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **IODP 348 C0002N** logging data | Tiny; validate the loader first | ~4 MB | CC0 | Script (Zenodo) |
| 2 | **IODP 348 C0002P** logging data | **Primary live-well analog**: deepwater riser well (Chikyu), LWD, Mio-Pliocene turbidites | ~979 MB | CC0 | Script (Zenodo) |
| 3 | **IODP 353 U1445A** logging data | **Real Mahanadi Basin** hole: map opener, top-hole | ~1.03 GB | CC0 | Script (Zenodo) |
| 4 | **IODP 354 U1450B / U1453A** logging data | **Bengal Fan** (Bay of Bengal) turbidites: East-Coast depositional analog | ~8 MB / ~361 MB | Check record | Script (Zenodo) |
| 5 | **IODP 358 C0024** LWD data | Extra deepwater LWD (Nankai) | ~127 MB | Check record | Script (Zenodo) |
| 6 | **FORCE 2020 lithology** | Train and validate the lithology classifier | ~0.5–1 GB | NOLD 2.0 | `git clone` |
| 7 | **Equinor Volve** | Real DDRs / well reports (RAG enrichment), WITSML | 5 TB total (pick subsets) | Equinor Open Data Licence | Manual: equinor.com → Volve data sharing |
| 8 | **IODP Proceedings 348 / 353 / 354** (PDF chapters: Methods, Operations, Site reports) | Public-reference RAG text | small | IODP open | Manual: publications.iodp.org |
| 9 | **Sodir FactPages** (e.g., deepwater Norwegian Sea wells such as Aasta Hansteen 6707/10-1) | Completion reports / logs as PDFs (deepwater gas turbidites) | small | NLOD | Manual (blocked from Cloudtop) |
| 10 | **Geoscience Australia NOPIMS** (e.g., Scarborough-1 deepwater fan) | WCRs + LAS | varies | Open (release rules changed 28 Nov 2025) | Manual portal |
| 11 | **GEBCO** bathymetry subset (Bay of Bengal) + **Natural Earth** coastlines | Offline map fallback | ~50 MB | Public domain | Manual (download.gebco.net) |
| 12 | **DGH National Data Repository (NGHP-02 LWD)** | Real Indian deepwater LWD. **Pilot hook** | n/a | Restricted | Through ONGC / DGH in the pilot |

### 6.2 Download script (Zenodo, scriptable from Cloudtop)
```bash
bash pipelines/download/download_public_data.sh            # all Zenodo sets
bash pipelines/download/download_public_data.sh c0002n     # single set
```
The script writes to `data/raw/logs/<dataset>/`, verifies size, unzips, and appends to `data/raw/DOWNLOAD_LOG.md`. Direct URLs:
```
https://zenodo.org/api/records/3942006/files/348-C0002N_logging_data.zip/content
https://zenodo.org/api/records/3942008/files/348-C0002P_logging_data.zip/content
https://zenodo.org/api/records/5668873/files/353-U1445A_logging_data.zip/content
https://zenodo.org/api/records/5668822  (U1450B — list files via API)
https://zenodo.org/api/records/5668808  (U1453A — list files via API)
https://zenodo.org/api/records/6909792  (C0024 LWD — list files via API)
```
FORCE 2020:
```bash
git clone --depth 1 https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition data/raw/logs/force_2020
```

### 6.3 Ingest: real LWD drop-in (the path for your downloaded files)

The design (SDD §5.5): **only `curves.*` are replaced.**
- Drilling, mudlog, mud and pressure stay scenario-driven, so every checkpoint and turn still holds.
- Real curves are labelled **PUBLIC**.
- Any curve the real log lacks stays **SYNTHETIC**.
- Scenario signatures the real log does not show (e.g., the DT excursion, the resistivity drop) are drawn as separate `overlays.*` traces labelled **SIMULATED**. Public values are never edited.

```bash
cd backend
UVX="$HOME/.local/bin/uv run --no-project --python 3.12 --with pyyaml,numpy,pandas,pyarrow,pydantic,lasio,dlisio"

# 1) Put the files in data/raw/logs/<dataset>/ (LAS, DLIS or ASCII; zips extracted)
# 2) Inventory the curves, mnemonics, units and depth ranges → data/interim/curve_inventory/
$UVX python ../pipelines/ingest/inspect_logs.py ../data/raw/logs/iodp_348_c0002p/
# 3) Fill the manifest: files, depth_mnemonic, curve map (GR/RDEP/RMED/RHOB/NPHI/DT/PEF/CALI),
#    units, source_top_m / source_base_m (the window to use), max_gap_m
$EDITOR ../data/contracts/manifests/iodp_348_c0002p.yaml
# 4) Register onto the scenario depth grid → data/processed/lwd/mn_sm_dw_01.parquet (+ .meta.json, PUBLIC)
$UVX python ../pipelines/ingest/las_to_depth_frames.py ../data/contracts/manifests/iodp_348_c0002p.yaml
# 5) Rebuild frames + UI mocks (PUBLIC takes precedence over SYNTHETIC), or hot-reload a running API
$UVX python ../pipelines/synth/generate_stub_frames.py
curl -X POST localhost:8765/api/scenario/reload        # or: make reload
# 6) Re-run the tests: the checkpoints must still pass
```
For a different dataset, copy the manifest to `data/contracts/manifests/<dataset>.yaml` and pass that path to steps 3–4.

Then update `data/DATA_PROVENANCE.md` with the source, hole, original depths, shift / stretch, curves and licence.

### 6.4 ML training
```bash
uv run python pipelines/ml/train_lithology.py   --data data/raw/logs/force_2020 --out data/models/lithology/
uv run python pipelines/ml/train_kick_risk.py   --events data/scenario/offsets.yaml --out data/models/kick_risk/
```
**Done when:** the UI shows PUBLIC provenance on the real curves, the lithology F1 is reported, and every screen is unchanged.

---

## Phase 7 — Promote to GCP
```bash
cd infra/terraform && terraform init && terraform apply -var project_id=drilling-intelligence-2-509714 -var region=asia-south1
uv run python pipelines/gcp/sync_gcs.py        # data/raw → gs://di2-raw-*
uv run python pipelines/gcp/load_bigquery.py   # processed Parquet → BigQuery drilling_intel.*
uv run python pipelines/embeddings/push_to_rag_engine.py
gcloud builds submit --config infra/cloudbuild.yaml
```
Set `DI_ENV=gcp`.
**Done when:** the Cloud Run URLs serve the full demo, and adapters read from BigQuery / RAG Engine / Firestore.

---

## Phase 8 — Stage Hardening
1. Offline mode verification (`DI_OFFLINE=1`, Wi-Fi off).
2. Record the fallback video (`docs/stage/fallback_run.mp4`).
3. Projector test (dark and light), lapel mic + clicker, and a 5G hotspot.
4. Red-team rehearsal with a drilling engineer. Walk through `docs/qa_crib.md`.
5. Five consecutive clean runs (SDD SC-4).

---

## 11. Commands Cheat-Sheet
```bash
make dev          # backend + frontend
make stub         # regenerate stub frames
make corpus       # synth corpus + validate
make embed        # chunk + embed + eval
make test         # unit + contract tests
make download     # Zenodo public data
make deploy       # Cloud Build → Cloud Run
```

## 12. Change Log
| Date | Change |
| :--- | :--- |
| 2026-09-25 | v0.1: initial build guide (Phases 0–8), data source list, Zenodo URLs verified reachable from Cloudtop |
| 2026-09-25 | v0.2: Phase 1 done (npm, uv --no-project commands, API port 8765); synthetic-corpus mandate in Phase 3; exact real-LWD drop-in steps in §6.3; Makefile `reload` target |
