# Drilling Intelligence 2.0 — Build Guide (`build.md` v0.5, living document)

> **How to use:** execute phases in order. Each step has a **Done when** line. Tick progress in [`checklist.md`](checklist.md). Design authority is [`docs/SDD.md`](docs/SDD.md), and the numbers come from [`data/scenario/mn_sm_dw_01.yaml`](data/scenario/mn_sm_dw_01.yaml).
> **This file will change.** Record edits in §12 (Change Log).

---

## 0. Prerequisites & Scope Authority

> [!IMPORTANT]
> **v0.5 build order (2026-09-26): priority beats phase.** Phases 0–3 and most of Phase 1 UI are built. The remaining work is sequenced in [`checklist.md`](checklist.md) as **P0 (blockers) → P1 (high value) → P2 (polish) → Frozen**, traced to [`verbatim.md`](verbatim.md). Split of work: [`DELEGATION_PLAYBOOK.md`](DELEGATION_PLAYBOOK.md) (Opus vs Gemini Flash, with file ownership).
>
> | Priority | What | Where in this guide |
> | :--- | :--- | :--- |
> | **P0-1/2** | Live session resilience + single `LIVE \| SCRIPTED` source of truth (*code landed; real-network verify pending*) | Phase 4 §4.A |
> | **P0-3** | Agent behaviour contract (tool-grounded numbers, clarifying questions, flow-check-first) | Phase 4 §4.B |
> | **P0-4** | Reservoir block in YAML + hardened fact validator + drift corrections | Phase 3 §3.2 |
> | **P0-5** | Real retriever over the corpus with citations (replaces hardcoded `search_knowledge`) | Phase 3 §3.4 |
> | **P0-6** | **D1** high-resolution, physics-consistent **synthetic** well + offsets + real lithology model | §0.1 D1 |
> | **P0-7** | **FE-1** act-staged layouts (4 acts, takeaway cards, presenter-only controls) | §0.1 FE-1 |
> | **P0-8** | **FE-2** SAFIR-03-style multi-log (Input → Output + mudlog lag) | §0.1 FE-2 |
> | **P1** | Crescendo v2 (14 turns / 4 acts), FE-3 pressure both sides, real Telegram push, FE-4 agent stage, FE-5 action theatre, FE-6 shift notes → WCR, latency harness, offline run | Phase 4 §4.C, Phase 5, §0.1 |
> | **P2** | FE-7 visual system (light executive default), FE-8 bugs / code-split | §0.1 |
> | **Frozen** | Phase 6 real-data downloads, Phase 7 (Cloud Run, Terraform, RAG Engine), Gmail/SMS, extra scenario variants | — |
>
> **Feature inventory:** [`FEATURE_LIST.md`](FEATURE_LIST.md). **Numbers authority:** `data/scenario/*.yaml` only.

### 0.1 v0.5 packages (data + front end)

**Act structure (4 acts).** Each act = one hero panel + agent stage + ≤ 3 KPIs, ending on a takeaway card.

| Act | Depth | Messages | Hero panel | Turns |
|---|---|---|---|---|
| 1 · See the rock before the mudlog | 4,120–4,145 m | M1, M2 | Multi-log + offset MN-DW-02 composite | T0–T3 |
| 2 · The window closes | 4,145–4,172 m | M3, V7 | Pressure window, both sides | T4a–T6 |
| 3 · Human decides, agent executes | hold 4,172 m | M4, V4 | Action theatre + phone mirror | T7–T9 |
| 4 · Other side of the window + the report | 4,172–4,450 m | M5, V7 | Loss side (ROP cap) → Shift notes ↔ WCR | T10–T13 |

**D1 · Synthetic well data (P0-6).** Replaces the IODP C0002P PUBLIC override (Nankai Trough, depth-stretched), which cannot line up with the scenario geology.
1. `pipelines/synth/generate_hires_well.py` (Opus): grid **0.1524 m**, 4,000–4,460 m. Geology from YAML `units` + `reservoir` (seeded laminations, limestone stringers, washouts). Forward models: Vsh→GR · compaction + facies→PHIE · mineral mixing→RHOB/NPHI/PEF (gas crossover in U3 above GWC 4,270 m) · Wyllie + Eaton departure→DT (+10 µs/ft before 4,172 m) · Archie→SW, invasion RSHAL < RMED < RDEP in gas · CALI · SP · mudlog lithology lagged by `mudlog.bottoms_up_lag_min` (depth = ROP × 45/60) · C1–C5 · conn gas 0.4→1.1 %. Deterministic seed.
2. `docs/data/column_contract.md` (Opus): names/units/ranges/provenance for every column. **Single interface** for FE-2 and ML.
3. `backend/app/scenario/frames.py`: serve synthetic only; PUBLIC override removed; IODP kept as a basin-map citation.
4. Offsets MN-DW-01/02/03 from the same generator (Flash) → `data/processed/offsets/`.
5. `pipelines/ml/train_lithology.py` (Flash): train on offsets, infer on live well → `ml.litho.*`, `vol.*`, `ml.sw`, `ml.phie` (MODEL_INFERENCE).

**Done when:** `test_hires_physics.py` passes (crossover only in U3 gas leg; RDEP > RMED > RSHAL in gas; DT +10 ± 1 µs/ft at 4,172 m; overbalance 120 ± 2 psi at 4,195 m; held-out offset lithology accuracy ≥ 0.85) and the validator exits 0.

**FE-1 · Act stages (P0-7, Opus).** `ACTS` → 4 entries (depth range, hero, KPIs, takeaway). `CommandCenter` renders the active act's stage; hidden panels are unmounted, not squeezed. Takeaway card on `Enter` / after the act's last turn. Turn buttons, speed, 3D/What-if/Audit move to `/presenter` (visible in Engineer mode). Acts on `Shift+1…4`; turns keep `0–9`.

**FE-2 · Multi-log (P0-8, Flash to spec, Opus review).** `CompositeLog.tsx`: **INPUT** ① GR/CALI/BIT/SP ② depth ③ tops ④ RHOB/NPHI/PEF + sand-crossover fill ⑤ RDEP/RMED/RSHAL (log) ‖ **OUTPUT (ML)** ⑥ SW/SXO + GWC ⑦ PHIE/BVW with residual / movable HC / water fill ⑧ lithology 0–100 % patterned fill ‖ **LAG** ⑨ mudlog lithology ending ROP × 45/60 m above the bit, hatched "cuttings in transit", "+45 min". Board = ①④⑤‖⑦⑧‖⑨; Engineer = all. Reference: `docs/design/inspiration/sample_interpreted_logs/` (design only; never shipped in the UI).

**FE-3 · Pressure both sides (P1).** Shaded kick zone (MW < PP) and loss zone (ECD > FIT/FG); MW, ECD, ML-recommended MW 11.65 ppg; look-ahead band; "if unchanged" ghost; labelled margins.

**FE-4 agent stage · FE-5 action theatre · FE-6 shift notes ↔ WCR (P1) · FE-7 visual system · FE-8 bugs (P2):** see [`checklist.md`](checklist.md) P1-4…P1-6, P2.


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
1. Design tokens and themes (`src/design/`): dark/light, board/engineer, with persistent localStorage toggle (`T`).
2. `BasinMap`: Google Maps dark vector (Map ID with cloud styling) + deck.gl layers (wells, incidents, U1445 pin) + fly-in camera.
3. `CommandCenter` layout grid: Well Pulse, SPWLA log tracks, agent panel, timeline.
4. **Composite LogTracks (Input vs. Output / ML Inversion Layout with Horizontal Scroller)**:
   - **Horizontal Scroller Container**: Wrapped in `overflow-x-auto min-w-[1400px]` with dual grouped header banners (`INPUT: Raw LWD Telemetry` vs. `OUTPUT: Real-Time ML Inversion & Geomechanics`).
   - **INPUT TRACKS (Raw Sensors)**:
     * **Track 1 (GR & Caliper)**: Gamma Ray (0–150 API) & Caliper (6–16 in) against bit size (12.25 in).
     * **Track 2 (Multi-Depth Resistivity)**: True log scale (0.2–200 $\Omega\cdot\text{m}$) with `RDEP`, `RMED`, `RSHAL`, and `R_NCT`.
     * **Track 3 (Sonic Slowness & Geomechanics)**: Compressional slowness `DT` (130–50 $\mu\text{s/ft}$) with `DT_NCT` excursion and shear wave `DTSM`.
     * **Track 4 (Density-Neutron & Gas Sand Crossover)**: `CNCF` (Neutron) & `ZDEN` (Density) with **yellow gas-sand crossover shading** (matching `SAFIR-03` inspiration).
   - **OUTPUT TRACKS (Real-Time ML Inversion & Geomechanics)**:
     * **Track 5 (Geopressure & ML Mud Weight Window)**: Pre-drill pore pressure study baseline, dynamic Eaton PP (10.95 → 11.48 ppg), fracture gradient (FG), 13-3/8" shoe FIT (12.10 ppg), active MW (11.20 ppg), **ML Recommended Optimal Mud Weight (11.65 ppg)**, and green safe operating corridor.
     * **Track 6 (ML Lithology & Cumulative Mineralogy)**: Real-time XGBoost cumulative mineralogy volume fraction (Sandstone, Shale, Limestone, Siltstone) eliminating the 45-min mudlog lag.
     * **Track 7 (Saturation & Fluid Partitioning)**: Effective Porosity ($\Phi_e$), Movable Gas (yellow), Residual Gas (green), and Gas-Water Contact (`GWC 4,270 m`).
     * **Track 8 (Drilling Dynamics & dxc)**: ROP (0–50 m/hr with gradient fill), torque, and corrected d-exponent (`dxc` 0.6–1.4).
5. `DistanceToHazard`, `GhostCurve`, `ProvenanceChip`, `ProvenanceFooter`.
6. `WellboreSchematic2D` (SVG) and `Well3DView` (R3F, toggle).
7. `Timeline` with event markers, plus `WhatIfDrawer` (calls `/api/physics/whatif`, stubbed first).
8. `AgentPanel` with **mock** captions, tool chips and citations driven by `turns.yaml`.
9. Overlays: `MemoOverlay`, `WcrViewer`, `AuditDrawer`.
10. `PresenterConsole` (`/presenter`), with turn click cards and hotkeys synced over `BroadcastChannel`.

**Done when:** you can click through all 12 turns with mock agent content at 60 fps, and board/engineer and dark/light both work.
**Status:** every item 1–10 is built and verified. Hotkeys: `Space` play/pause, `0–9` and `-` for turns, `M` memo, `W` WCR, `A` audit, `D` what-if, `B` board/engineer, `T` theme, `L` language, `Shift+R` reset, `?` help.


---

## Phase 2 — Scenario & Physics Engine (with Expanded LWD Channels)
1. Implement `backend/app/physics/*` (formulas in SDD §7: Eaton pore pressure, Bingham/Herschel-Bulkley ECD, Matthews-Kelly fracture gradient, Barite mass balance, corrected d-exponent).
2. Expanded LWD Channel Suite:
   - Petrophysical curves: `GR`, `GR_UP`, `GR_DN`, `RDEP`, `RMED`, `RSHAL`, `RHOB`, `NPHI`, `PEF`, `PHIE`, `SW`.
   - Acoustic geomechanics: `DT`, `DTSM`, `VPVS`, `PR_DYN`.
   - Formation Pressure While Drilling: `FPWD_PRES`, `MOBILITY`.
   - Mud gas chromatography: `GAS_TOTAL`, `C1`–`C5`, `GAS_WETNESS`, `CONN_GAS`.
3. Implement `scenario/engine.py`, `triggers.py` and `turns.py`, reading from YAML.
4. Support new conversational queries:
   - **Prospective Zone & Lithology**: Target depth (4,195 m MD), reservoir quality (82% quartz, 24.2% porosity, 180 mD perm, 75 m gross, 0.84 N/G, dry gas $C_1 > 88\%$, GWC 4,270 m).
   - **Nearby Rig Complications & Mitigations**: `MN-DW-02` 12 bbl gas kick at 4,195 m (SIDPP 236 psi, killed with 11.65 ppg under SOP-04); `MN-DW-03` 28 bbl/hr losses at 4,222 m (mitigated with 40 ppb LCM pill & 12 m/hr ROP cap).
5. Generate turn snapshots: `uv run python -m app.scenario.turns --build-snapshots`.
6. Wire the what-if slider to the real ECD model.

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
**v0.4 (P0-4):** the validator must check **every number+unit** in the corpus, `data/scenario/shift_notes.yaml`, `config/prompts/*.md` and `frontend/src/mocks/agentScript.ts` against the YAMLs (allow-list for dates, IDs, page numbers). The v0.3 validator only checked 5 regexes and let drift through (18 vs 12 bbl kick, two memo IDs, barite 22.4 vs 28.3 lb/bbl, conn gas 2.4 vs 1.1 %).

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
**v0.4 (P0-3):** `backend/app/rag/retriever.py` serves top-k chunks (embeddings; BM25 fallback when offline). `search_knowledge` and `lookup_offset_events` must return retrieved chunks with real `doc_id` + section, not the hardcoded snippets in v0.3. **Done when:** 8 unscripted questions return the correct doc in top-3.

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

## Phase 4 — Voice Agent (Gemini 3.8 Live)

**Status (verified 2026-09-26):** `live_session.py` connects (`gemini-3.8-live` → `connected`), 12 tool declarations, UI side effects via `action` events. **Gaps:** sessions end on `GoAway deadline exceeded` with no resumption; scripted captions run in parallel with Live; `guardrails.py` is a stub; `watchdog.py` is never called (proactive turns are driven by `turnMachine.ts`).

### 4.A Live resilience + single source of truth (P0-1, P0-2 · Opus)
1. `LiveConnectConfig`: add `session_resumption` (store latest handle) and `context_window_compression` (sliding window).
2. On `go_away`: open a new session with the stored handle before `time_left` expires; keep the browser socket open.
3. On unrecoverable error: send `status: fallback` and switch the UI to SCRIPTED with a visible chip.
4. Add `mode: LIVE | SCRIPTED` to `uiStore`. In LIVE, `turnMachine` sends trigger/prompt to Live and **does not** push scripted captions; captions = Live transcription; side effects = Live tool calls. In SCRIPTED, current mock behaviour.

**Done when:** a ≥ 30-min soak through ≥ 1 GoAway still answers a question that refers to turn 1; in LIVE no duplicate agent bubbles.

### 4.B Behaviour contract (P0-5 · Opus)
`config/prompts/agent_system_prompt.md` must enforce: Hinglish persona, ≤ 3 sentences; **numbers only from tool results**; **ask a clarifying question** when a zone/depth is ambiguous; **flow-check first** if static MW < PP or pit gain (`SAFETY_UNDERBAL`); never dispatch without explicit approval.

### 4.C Crescendo v2 — 15 turns, 4 acts (P1-1 · Flash drafts, Opus reviews)

| Turn | Depth | Leader | Presenter line (gist) | Agent must do | Tools | Proves |
|---|---|---|---|---|---|---|
| **Act 1 — See the rock before the mudlog (M1, M2)** |||||||
| T0 | 4,120 | Presenter (typed) | "Hey, I hope everything is going okay" | Short status | `get_well_status` | V1 |
| T1 | 4,120 | Presenter | "Mujhe bata dena jab kuch bhi gadbad ho, theek hai?" | Confirms it is watching (Hindi) | — | V1 |
| T2 | 4,130 | Presenter | "Thoda batayenge abhi well ke andar kya chal raha hai?" | Depth, MW, ECD, ROP in Hindi | `get_well_status` | V2 |
| T3 | 4,140 | Presenter | "Abhi kaunsi formation mein hain? Mudlog to baad mein aayega" | ML lithology fractions now vs cuttings lag | `get_lithology` | **M1**, V6 |
| **Act 2 — The window closes (M3, V7)** |||||||
| T4a | 4,145 | Presenter | "Agle zone tak kitna time lagega?" | **Asks back:** "Kaunsa zone — U3 pay sand, 4,195 m?" | — | **V8** |
| T4b | 4,145 | Presenter | "Haan, pay sand" | ETA = (4,195 − bit) ÷ current ROP (≈ 2.3 h at 22 m/hr); reservoir preview from offset MN-DW-02 (`reservoir:` block); PP/FG/MW preview: kick side vs loss side | `forecast_pore_pressure`, `get_lithology` | **M2**, V7 |
| T5 | 4,172 | Agent (proactive, T3 trigger) | — | "Sir, ek minute —" pressure ramp, −200 psi if unchanged | `forecast_pore_pressure` | V2, V7 |
| T6 | 4,172 | Presenter | "Paas wale rig par kya complication aayi thi, aur kaise mitigate kiya?" | Retrieved MN-DW-02 kick + MN-DW-03 losses with citations | `search_knowledge`, `lookup_offset_events` | **M3**, V3 |
| **Act 3 — Human decides, agent executes (M4, V4)** |||||||
| T7 | 4,172 | Presenter | "Mud weight kaafi kam lag raha hai, thoda badha sakte hain?" | ML optimal MW between kick and fracture limits; barite; drafts memo | `compute_barite`, `compute_ecd`, `create_moc_memo` | V7 |
| T8 | 4,172 | Presenter | "Theek hai, kar do" | Freezes basis; asks who to inform | `request_approval` | **M4** |
| T9 | 4,172 | Presenter | "Mud chemist ko message, manager ko email, base ko bhi bata do" | Fan-out; **real phone push** | `dispatch_fanout` | V4 |
| **Act 4 — Other side of the window + the report (M5, V7)** |||||||
| T10 | 4,195 | Agent (proactive, T8) | — | Sand top crossed at offset kick depth, overbalance from tool | `get_well_status` | V3 |
| T11 | 4,205 | Agent (proactive, T9) | "…dheere kar lo, mud observe karte rehna" | ROP cap; ECD back under FIT | `compute_ecd`, `set_rop_cap` | V7 |
| T12 | 4,300 | Presenter | "Is shift ka handover note bana do" | Shift log draft from shift notes + ledger | `draft_shift_log` | **M5** |
| T13 | 4,450 | Presenter | "Well complete ho gaya, completion report ka pehla draft bana do" | WCR draft + lessons written back | `generate_wcr`, `writeback_lessons` | **M5**, V9 |
| Open | any | Board member | Unscripted question | Grounded answer with citation | `search_knowledge` | V3, V10 |

> [!NOTE]
> **Resolved v0.5:** owner approved the reservoir values; they go into `mn_sm_dw_01.yaml` under `reservoir:` (P0-4): quartz 82 %, PHIE 24.2 %, k 180 mD, **75 m gross gas column (sand top 4,195 m → GWC 4,270 m)**, N/G 0.84, C1 > 88 %. Mudlog lag `bottoms_up_lag_min: 45` (depth derived: 16.5 m at 22 m/hr, 25.5 m in the drilling break). ETA is always computed (distance ÷ live ROP), never quoted from a document; the old "1 h 34 min" is wrong.

**Done when:** all 15 turns run in LIVE by voice with correct captions; SCRIPTED runs the same 15 offline; p90 time-to-first-audio ≤ 1.5 s (P1-5).

---

## Phase 5 — Actions & Decision Ledger (v0.4 scope)
1. Built and kept: memo overlay, approval, ledger, audit drawer, simulated channel payloads (`chat_google.py`, `docs_wcr.py`).
2. **P1-2:** `push_telegram.py` sends a **real** message to the presenter phone; `dispatch_fanout` tool calls `actions/dispatch.py`. Chat/email/base remain simulated but show payload + status.
3. **P1-3:** `draft_shift_log` tool (Turn 12).
4. **Frozen:** Gmail OAuth, SMS DLT, Google Docs API export, `rag/writeback.py` embedding upsert (writeback stays a visible ledger entry).

**Done when:** on T9 the phone buzzes within 3 s and the ledger records delivery.

---

## Phase 6 — Real Data Download & Drop-In

> **v0.5:** ❄️ **Frozen / superseded.** Owner direction: logs must *look* real, satisfied by the D1 physics-consistent synthetic generator (§0.1). The C0002P PUBLIC override is removed from the served frames (it is a Nankai Trough well depth-stretched onto a Mahanadi scenario). This section is kept for the post-pitch pilot (real ONGC/DGH data).

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

> **v0.4:** GCS sync and BigQuery load done (2026-09-26). Terraform, RAG Engine push and Cloud Run are **Frozen**; the pitch runs locally.
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
| 2026-09-26 | v0.4: priority build order (P0/P1/P2/Frozen) traced to verbatim; Phase 4 rewritten (live resilience, LIVE/SCRIPTED mode, behaviour contract, Crescendo v2 14 turns); Phase 5 scoped to one real phone push; Phase 6/7 frozen; drifted Turn 3 values (+12 µs/ft, 0.8→3.2 %) removed |
| 2026-09-26 | v0.5: owner-approved scope — 4 acts; D1 synthetic high-res data replaces IODP override (Phase 6 frozen/superseded); FE-1 act stages, FE-2 multi-log, FE-3..FE-8; Crescendo v2 regrouped to 15 turns / 4 acts; reservoir values resolved; §0.1 package specs added |
| 2026-09-26 | v0.3: Locked Master Feature Inventory in `FEATURE_LIST.md`; expanded LWD telemetry channels to SPWLA deepwater standards (Azimuthal GR, Shear DTSM, Density-Neutron, Effective Porosity, Mud Gas Wetness); added Prospective Zone & Lithology inquiry and Nearby Rig Complications & Mitigations turns |

