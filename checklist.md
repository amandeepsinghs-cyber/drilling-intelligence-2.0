# Drilling Intelligence 2.0 — Checklist (`checklist.md`)

> Tick `[x]` as items complete. Phases mirror [`build.md`](build.md). Acceptance criteria refer to [`docs/SDD.md`](docs/SDD.md) §2.

## Phase 0 — Docs & Scaffold
- [x] `brief.md` updated to v2.1 (stack, data, design learnings)
- [x] `docs/SDD.md` v1.0 written
- [x] `build.md` v0.1 written (phases, data sources, commands)
- [x] `checklist.md` created
- [x] Repo tree scaffolded (backend, frontend, data, pipelines, config, infra, docs, tests)
- [x] Data contracts (`data/contracts/*.schema.json`)
- [x] Canonical scenario facts (`data/scenario/mn_sm_dw_01.yaml`, `offsets.yaml`, `turns.yaml`)
- [x] SDD reviewed and approved by owner (2026-09-25)
- [ ] Initial git commit (owner to approve)

## Phase 1 — Front-End Shell (stub data)
- [x] Stub frame generator produces 4,000–4,460 m @ 0.5 m, schema-valid (921 frames)
- [x] FastAPI health + frames endpoints (+ frame, meta, reload, what-if)
- [x] Design tokens, dark/light theme, board/engineer mode
- [x] Basin Map: Google Maps dark vector + deck.gl wells/incidents/U1445 pin + fly-in (deck.gl fallback w/o key)
- [ ] Google Maps API key + vector Map ID supplied (`frontend/.env.local`)
- [x] Command Center grid layout (1920×1080)
- [x] Well Pulse KPIs with provenance chips
- [x] Plotly tracks: GR, Resistivity, Pressure Window, Litho column (+ engineer expand)
- [x] Distance-to-hazard ruler + offset ghost curve
- [x] 2.5D wellbore schematic
- [x] Optional R3F 3D offset-well view (toggle, lazy-loaded)
- [x] Timeline with event markers + what-if drawer (API + offline mirror)
- [x] Agent panel with mock captions (hi + en), tool chips, citation cards
- [x] Memo overlay, WCR viewer, audit drawer
- [x] Presenter Console with turn hotkeys 0–10 (synced via BroadcastChannel, same browser; phone sync over `/ws/events` in Phase 4)
- [x] `tsc` + `vite build` green; dev smoke test (API, proxy, UI) passed
- [x] Unit test suite green (physics & unit calculations)
- [x] Branding updated: **Sagar Drishti AI Agent** (Project Samudra Manthan)
- [x] Live on network: `http://localhost:5173` (Command Center: `/well/MN-SM-DW-01`, Presenter: `/presenter`)
- [x] Real-LWD drop-in path ready (`inspect_logs` → manifest → `las_to_depth_frames` → reload), PUBLIC over SYNTHETIC

## Phase 2 — Scenario & Physics
- [x] Units, overburden, Eaton (sonic/res), centroid, Matthews-Kelly, FIT limit, ECD, barite, dxc
- [x] Physics acceptance tests pass (OBG ≈ 14.0, barite ≈ 39.8 MT, ±psi, ECD 11.84/12.02/11.86)
- [ ] Triggers T3 / T8 / T9 / SAFETY_UNDERBAL implemented from YAML (frontend playback gating done; backend engine pending)
- [ ] Turn snapshots generated
- [x] What-if wired to real ECD model (`POST /api/physics/whatif`)

## Phase 3 — Knowledge Base (RAG)
- [ ] Prompt templates for SOP / WCR / incident / DDR / mud program / lessons / legacy scan
- [ ] Synthetic corpus generated (6 SOP, 4 WCR, 6 incidents, ~60 DDR, 3 mud programs, 5 lessons, 1–3 scans)
- [ ] `validate_facts.py` passes (0 unknown numbers)
- [ ] (Optional) PDFs rendered
- [ ] Chunks created (section-aware, 600–800 tokens, 100 overlap)
- [ ] Embeddings built → `chunks_with_embeddings.json` (+ manifest)
- [ ] RAG eval: recall@5 ≥ 0.95, citation accuracy ≥ 95% (SC-5)
- [ ] Hindi queries evaluated

## Phase 4 — Voice Agent
- [ ] Model IDs pinned and verified (Gemini 3.8 Live, Pro/Flash, embedding)
- [ ] ADK bidi proxy + WebSocket `/ws/live`
- [ ] Tool catalogue implemented (SDD §10.3)
- [ ] Watchdog → proactive speech at 4,172 / 4,195 / 4,205 m (SC-3)
- [ ] Bilingual captions (hi Devanagari + en)
- [ ] Guardrails (scope, numeric post-check, Model Armor on GCP)
- [ ] Push-to-talk + barge-in
- [ ] Latency ≤ 1.5 s p90 (SC-1)
- [ ] Offline cache recorded per turn

## Phase 5 — Actions
- [ ] MOC memo generation + render
- [ ] Approval via voice / phone / UI
- [ ] Decision Ledger with frozen basis
- [ ] Google Chat (RTOC) post
- [ ] Gmail email (or `.eml` fallback)
- [ ] Telegram push to presenter phone
- [ ] Google Docs WCR from template
- [ ] Lessons write-back to RAG (new chunk ID visible)

## Phase 6 — Real Data & ML
- [ ] C0002N downloaded + loader validated
- [ ] C0002P downloaded + ingested (PUBLIC provenance)
- [ ] U1445A downloaded + map authenticity strip
- [ ] (Optional) U1450B / U1453A Bengal Fan, C0024 LWD
- [ ] FORCE 2020 cloned + lithology model trained (F1 reported)
- [ ] Kick-risk model trained on synthetic event library (disclosed)
- [ ] `DATA_PROVENANCE.md` complete (source, hole, depth shift, licence)

## Phase 7 — GCP
- [ ] Terraform apply (AR, Cloud Run, GCS, BigQuery, Firestore, Secret Manager, SAs)
- [ ] Raw → GCS, Parquet → BigQuery
- [ ] RAG Engine corpus populated
- [ ] Cloud Run deployed (`asia-south1`), `DI_ENV=gcp` verified

## Phase 8 — Stage Readiness
- [ ] Offline mode full run (SC-6)
- [ ] Fallback video recorded
- [ ] Venue projector test (dark + light)
- [ ] Lapel mic + clicker + hotspot tested
- [ ] Red-team rehearsal with drilling engineer
- [ ] Q&A crib reviewed (sovereignty, accuracy, "AI wrong?", pilot)
- [ ] 5 consecutive clean runs (SC-4)
- [ ] Numeric correctness check 100% (SC-2)

## Day-of-Show (T-60 min)
- [ ] Laptop on power, notifications off, display 1920×1080 mirrored
- [ ] Hotspot on; backend health green; Live session pre-warmed
- [ ] Presenter Console connected on phone; Telegram notifications ON
- [ ] Scenario reset to Turn 0; offline cache present
- [ ] Fallback video open in background tab
- [ ] Water, clicker batteries, lapel mic check
