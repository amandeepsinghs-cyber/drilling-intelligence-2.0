# Drilling Intelligence 2.0 — Priority Checklist (`checklist.md` v0.6)

> **In-flight work, open bugs and the Flash queue live in [`ACTIVE_DEBUGGING_AND_EXECUTION.md`](ACTIVE_DEBUGGING_AND_EXECUTION.md).** This file stays the long-term source of truth.

## §0. v0.6 work packages (cockpit #4) — current plan, see [`build.md`](build.md) §3

Each box is ticked only after its **Verify** line in `build.md` / [`docs/FLASH_PLAYBOOK.md`](docs/FLASH_PLAYBOOK.md) has passed.

- [x] **WP-01** Docs: build.md v0.6, Flash playbook, API contract, tracking file · Opus · serves: quota resilience
- [x] **WP-02** Design system + cockpit grid + shared depth axis · Opus · V5, V6, V7
- [x] **WP-03** Wellbore schematic column (casing to scale) · Opus · V2, V7
- [x] **WP-04** Agent stage panel (never empty; captions, reasoning, citations) · Opus · V1, V3
- [ ] **WP-05** Backend real-time API + show state + honest channel status · Opus · V4, "APIs work in real time"
- [x] **WP-06** Multi-log renderer (SAFIR, 10 tracks, Board/Engineer subsets, mudlog lag) · Flash · V5, V6
- [x] **WP-07** Pressure track (kick + loss side, ML MW, look-ahead ghost) · Flash · V7
- [x] **WP-08** Act 3 action panel (ActionTheatre, live MOC memo, animated APPROVED stamp, fan-out lanes, phone mirror) · Flash · V4
- [x] **WP-09** Act 4 + Shift notes ⇄ WCR (targetMd 4,195 m, side-by-side with bidirectional cross-highlighting) · Flash · V9
- [x] **WP-10** Basin map offline (bundled GeoJSON coastline, shelf edge, deepwater block, non-overlapping labels) · Flash · map → live well
- [x] **WP-11** Presenter console on show state (turn, act, md, next turn preview, dual BC + WS sync, latency meter) · Flash · stage control
- [x] **WP-12** ML lithology fix + trained models (RandomForest lithology + GradientBoosting kick risk on offset wells, 1.0 accuracy, MODEL_INFERENCE label) · Flash → Opus review · V6, V7
- [ ] **WP-13** Dense embeddings (Hinglish recall) · Opus · V3
- [x] **WP-14** Verification harness (per act Playwright verify_acts green, Live smoke 1.32s first audio, 59/59 backend, 9/9 frontend, fact gate 0/0) · Opus + Flash · all
- [ ] **WP-15** LAS calibration + DT Option A + narrative · Opus · **parked until last** (owner)

### §0.1 Front-end fine-tuning (FT-xx, build.md §3.1)
- [ ] FT-1 wellbore label overlap · Flash
- [ ] FT-2 favicon 404 · Flash
- [ ] FT-3 memo evidence citations · Opus
- [ ] FT-6 pressure labels · Flash
- [ ] FT-7 smooth GR shading · Flash
- [ ] FT-8 light theme pass · Flash
- [ ] FT-9 takeaway + closing card · Flash
- [ ] FT-10 scrubber markers · Flash
- [ ] FT-11 remove old components (ask owner) · Opus
- [ ] FT-12 scripted-mode chips → scripted turns · Opus
- [ ] FT-16 what-if / audit drawers on cockpit · Flash
- [x] FT-17 play flicker fixed · Opus · verified `node scratch/flicker_probe.mjs` → 0 blank frames / 174

> Sections below are the v0.5 history (P0/P1/P2). Items there that are not ticked are now covered by the WPs above.

---


> **Rule:** work strictly top-down. **No P1 work starts until every P0 box is ticked.** No P2 work starts until P1 is done.
> **Tick rule:** a box is ticked only when its **Verify** line has actually been run and passed. No ticking from memory.
> **Owners:** **Opus** = high-value / cross-cutting engineering and all reviews. **Flash** = well-specified, file-scoped tasks (prompts in [`DELEGATION_PLAYBOOK.md`](DELEGATION_PLAYBOOK.md)).
> **Traceability:** `V#` = requirement in [`verbatim.md`](verbatim.md) (see §A). `M#` = the 5 core messages (see §A). `D#` / `FE#` = data / front-end packages (see [`build.md`](build.md) §0).
> **Numbers authority:** [`data/scenario/mn_sm_dw_01.yaml`](data/scenario/mn_sm_dw_01.yaml) + [`offsets.yaml`](data/scenario/offsets.yaml). If a document disagrees with the YAML, the document is wrong.

---

## §A. What the demo must prove (from verbatim + later direction)

| ID | Requirement | Verbatim source |
|---|---|---|
| V1 | Presenter **speaks** (Hindi/Hinglish), agent replies by voice with context. This is *the* demo | Audio 1, 2 |
| V2 | Agent knows the **live borehole**: depth, MW, ECD, parameters | Audio 1, 3 |
| V3 | Agent recalls **previous wells, incidents, SOPs, WCRs** (RAG) | Audio 1, 2, 3 |
| V4 | Agent **acts**: mud chemist message, email, memo for approval, message to base, **SMS/phone "if possible"** | Audio 3 |
| V5 | Logs must **look real** ("if it doesn't look real, we're a goner"). *Owner direction 2026-09-26: satisfied by high-resolution, physics-consistent **synthetic** logs, not public logs from another basin* | Audio 3 + direction |
| V6 | **ML lithology column 0–100 %**, ahead of the mudlog lag, shown on a **SAFIR-03-style Input → Output multi-log** | Audio 2, 5 + direction |
| V7 | **PP / FG / MW** with ML optimal mud weight (deterministic + probabilistic); warn of kick *and* fracture in the next zone | Audio 2, 5 + direction |
| V8 | **10–15 back-and-forth turns** to a crescendo, in categories, incl. a **clarifying follow-up** ("which zone? what depth?") | Audio 5 |
| V9 | **Draft WCR** at the end from all data | Audio 3 |
| V10 | Board feels **"deploy now or leave money on the table"** | Audio 6 |
| V11 | Map → live well → LWD (verbatim: "might be unnecessary") | Audio 2 |
| V12 | **3–4 acts, each clear and clean**, each ending on a takeaway | Direction 2026-09-26 |

**Core messages → acts (v0.5, 4 acts):**

| Act | Depth | Message | Hero panel | Takeaway card |
|---|---|---|---|---|
| 1 · See the rock before the mudlog (T0–T3) | 4,120–4,145 m | M1 + M2 | Multi-log (Input → Output + mudlog lag) + offset composite | "ML reads the rock at the bit — before cuttings reach the surface." |
| 2 · The window closes (T4a–T6) | 4,145–4,172 m | M3 + V7 | Pressure window, both sides | "It remembers every offset well and warns before the kick — with the mud weight to fix it." |
| 3 · Human decides, agent executes (T7–T9) | hold at 4,172 m | M4 + V4 | Action theatre (memo → approval → fan-out → phone) | "Nothing touches the well without human approval — then it's done in seconds." |
| 4 · Other side of the window + the report (T10–T13) | 4,172–4,450 m | M5 + V7 | Loss side (ROP cap), then Shift notes → WCR | "It prevents the opposite failure too — and hands you the first-draft WCR." |

---

## §B. Verified OK — keep as is (checked in code/runtime on 2026-09-26)

- [x] Basin map opener + link to live well (V11) — *labels overlap, basemap off → FE-8*
- [x] Pressure window: PP, FG, shoe FIT, active MW, recommended MW; physics tests pass (V7) — *visual upgrade → FE-3*
- [x] What-if ECD drawer, Well Pulse KPIs, distance-to-hazard, ghost curve (V2)
- [x] Memo overlay, decision ledger, audit drawer (V4, M4)
- [x] WCR document + Shift Notes tab (V9, M5), with fixes pending in P1-7
- [x] Presenter console (`/presenter`) with BroadcastChannel bridge
- [x] Gemini Live **connects**; resilience code in place (P0-1)
- [x] 25 synthetic knowledge docs + 25 PDFs exist (accuracy fix pending in P0-4)

**Removed from §B in v0.5 (were over-claimed):**
- ~~SAFIR-03-style composite log~~ → only the INPUT/OUTPUT header labels exist; tracks are cramped and cut off, with no saturation, fluid-fill, crossover or mudlog-lag tracks → **P0-8**
- ~~Real public LWD (IODP C0002P)~~ → a Nankai Trough well depth-stretched onto a Mahanadi scenario, and inconsistent with the synthetic curves beside it → replaced by **P0-6**
- ~~3-Act nav bar with hotkeys 1/2/3~~ → label strip only; hotkeys collide with turn hotkeys → **P0-7**

---

## P0 — Blockers (nothing else until these pass)

### P0-1 · Live voice survives a 30-minute session · **Opus** · V1 — *code done, live soak pending*
- [x] Session resumption (`SessionResumptionConfig`) + context-window compression enabled in `live_session.py` (+ input-audio transcription)
- [x] `go_away` handled: reconnect with resumption handle, browser socket stays open; conversation memory preserved — *proved by `tests/api/test_live_resilience.py::test_goaway_resumes_with_handle_and_keeps_socket` (fake Gemini)*
- [x] Mid-session failure → retry ×3 → visible `fallback` status + rehearsal engine on the same socket — *proved by `test_outage_falls_back_to_rehearsal_on_same_socket`; also observed live when ADC expired*
- [ ] **Verify (real network):** soak ≥ 30 min through ≥ 1 real GoAway, still answers a question referring to turn 1. *Blocked: ADC expired → run `gcloud auth application-default login`.* Debug aid: start backend with `DI_DEBUG_RECONNECT=1` and send `{"type":"debug_reconnect"}` to force a resume.

### P0-2 · One source of truth for what the agent says · **Opus** · V1, V8 — *code done, in-browser LIVE check pending*
- [x] Explicit `LIVE | SCRIPTED` agent mode (`uiStore.agentMode`, persisted), hotkey **V**, chip in AgentPanel, button in Presenter Console
- [x] In LIVE: `turnMachine.ts` pushes no scripted agent bubble and no fake `speak()`; agent text comes only from Live transcription; side effects come from Live tool calls, with an idempotent safety net so the show never stalls; watchdog/continuation prompts carry a live data snapshot instead of the scripted answer
- [x] In SCRIPTED (or Live not connected): previous mock behaviour unchanged; Live dropping mid-turn finishes that turn from the script; `fallback` auto-switches to SCRIPTED with a toast
- [ ] **Verify (browser, needs ADC):** in LIVE, run turns 0–3 → caption text == Live transcript; no duplicate agent bubbles.

### P0-3 · Agent behaviour contract (system prompt) · **Opus** · V1, V2, V7, V8 — *moved up: Live now speaks freely*
- [ ] `config/prompts/agent_system_prompt.md`: Hinglish persona; max 3 sentences; **never state a number not returned by a tool or in the event snapshot**; ask a **clarifying question** when a zone/depth is ambiguous; **flow-check-first** rule if underbalanced (`SAFETY_UNDERBAL`); never act without explicit approval; act-aware (knows which act it is in)
- **Verify:** 5 adversarial prompts (ambiguous zone, "just do it without memo", invented-number bait, English↔Hindi switch, underbalance) behave per contract.

### P0-4 · Numbers are consistent everywhere · **Opus** (YAML + validator) + **Flash** (corrections) · V2, V10
- [x] **Opus:** add owner-approved `reservoir:` block to `mn_sm_dw_01.yaml`: quartz 82 %, PHIE 24.2 %, k 180 mD, gross 75 m, N/G 0.84, C1 > 88 %, GWC 4,270 m; add `mudlog.bottoms_up_lag_min: 45` (depth lag derived = ROP × 45/60 ≈ 16.5 m at 22 m/hr) ✅ *YAML done 2026-09-26*; fix U3 ETA to (distance ÷ YAML ROP) ✅ *A-8, live-verified 2026-09-26*
- [x] **Opus:** hardened validator = `pipelines/synth/fact_gate.py` (corpus, `shift_notes.yaml`, prompts + placeholder resolution, all frontend TS/TSX, all `backend/app/**`, frames at checkpoints; unit-aware allow-list + `facts-ok`). *2026-09-26: code = 0 errors; remaining 9 corpus → Flash F1, 2 frames → O6*
- [ ] **Flash:** fix drift → kick gain **12 bbl** (not 18) · memo ID **MEMO-SM-2026-09** · barite **28.3 lb/bbl, +60 bbl** · conn gas **0.4 → 1.1 %** · DT **+10 µs/ft** · sand-top overbalance **120 psi**. Files: `watchdog.py`, `docs_wcr.py`, `actions/types.py`, `shift_notes.yaml`, DDR/INC markdowns — *code + `shift_notes.yaml` done by Opus (O3); corpus generators = F1 (`brain/…/FLASH_F1_CORPUS_PROMPT.md`)*
- [ ] **Flash:** regenerate `shift_notes.json` mock → chunks → PDFs (part of F1)
- **Verify:** `fact_gate.py` exits 0 (currently 11 E: 9 corpus, 2 frames).

### P0-5 · Real institutional memory (RAG) · **Opus** · V3, M3
- [ ] `backend/app/rag/retriever.py`: embeddings over `corpus_chunks.json` (`gemini-embedding-001`), BM25 fallback offline — *BM25 done 2026-09-26 (9/10 on a 10-question probe; misses Hinglish "paas wale rig…" → needs dense)*
- [x] `search_knowledge` / `lookup_offset_events` return retrieved chunks with real `doc_id` + section citations (no hardcoded snippets) — *verified by `test_tools_facts.py`*
- [ ] Citation cards in UI show the retrieved doc IDs
- **Verify:** 8 unscripted questions (incl. MH-112 differential sticking, MN-DW-03 losses, SOP-04 ROP cap) each return the correct doc in top-3.

### P0-6 · D1 High-resolution synthetic well data · **Opus** (core physics + column contract) + **Flash** (offsets, ML training) · V5, V6, V7
- [ ] **Opus:** `pipelines/synth/generate_hires_well.py`: 0.1524 m grid 4,000–4,460 m (≈ 3,020 samples); geology from YAML units + seeded laminations / limestone stringers / shale washouts; forward models: Vsh→GR, compaction→PHIE, mineral mixing→RHOB/NPHI/PEF with **gas crossover** in U3 above GWC, Wyllie + **Eaton departure (+10 µs/ft ramp before 4,172 m)**→DT, Archie→SW with **RSHAL < RMED < RDEP invasion separation** in gas, CALI, SP; mudlog with **lag** (45 min bottoms-up, depth derived from ROP); C1–C5 dry gas in U3; conn gas 0.4→1.1 %
- [ ] **Opus:** column contract `docs/data/column_contract.md` (names, units, ranges, provenance) — the single interface for FE-2 and the ML pipeline
- [ ] **Opus:** `backend/app/scenario/frames.py` serves the synthetic well only (PUBLIC override removed; IODP kept as a basin-map citation only); provenance chip reads "Synthetic scenario data (physics-consistent)"
- [ ] **Flash:** same generator for offsets MN-DW-01 (clean), MN-DW-02 (kick 4,195 m), MN-DW-03 (losses 4,222 m) → `data/processed/offsets/*.parquet`
- [ ] **Flash:** `pipelines/ml/train_lithology.py` trains on offsets, infers on the live well → `ml.litho.*`, `vol.*`, `ml.sw`, `ml.phie` (real model, labelled MODEL_INFERENCE)
- **Verify:** `pytest backend/tests/scenario/test_hires_physics.py` (to be written with D1): crossover present only in the U3 gas leg; RDEP > RMED > RSHAL in gas; DT departure = +10 ± 1 µs/ft at 4,172 m; overbalance at 4,195 m = 120 ± 2 psi; the lithology model's accuracy on a held-out offset ≥ 0.85; validator (P0-4) exits 0.

### P0-7 · FE-1 Act-staged layouts (4 acts) · **Opus** · V12, M1–M5 — *done 2026-09-26 (structure); hero visuals upgraded by F7 / F5 / FE-3*
- [x] `ACTS` redefined to 4 acts (§A table) with depth ranges, hero panel, KPI set (≤ 3), takeaway text
- [x] `CommandCenter` renders a **per-act stage**: hero panel + agent stage + ≤ 3 KPIs; other panels hidden, not squeezed
- [x] **Takeaway card** animates in at the end of each act (presenter hotkey `Enter` or auto after the act's last turn)
- [x] Board sees no turn buttons / speed / dev toggles; these move to `/presenter` (and stay available in Engineer mode)
- [x] Hotkey collision fixed: acts on `Shift+1…4` (or `PageUp/PageDown`), turns keep `0–9`
- **Verify:** SCRIPTED click-through Act 1→4: each act shows only its hero panel + agent + ≤ 3 KPIs; takeaway card appears; pressing `2` runs turn 2 only; 1920×1080 screenshot per act saved to `docs/stage/acts/`.
  - *Verified 2026-09-26 via `frontend/scratch/verify_acts.mjs` (Playwright, SCRIPTED): board hides speed/3D; Shift+3 → Act 3 @ 4,172 m with decision-flow hero; Enter shows / Esc hides takeaway; `2` runs turn 2 in Act 1 (4,140 m, no act jump); Act 1 takeaway auto-appears after its last turn. Screenshots act1–4.png + act3_takeaway.png. Also `?act=N` deep link added.*

### P0-8 · FE-2 Multi-log (SAFIR-03 style Input → Output + mudlog lag) · **Flash** builds to spec, **Opus** reviews · V5, V6, M1
- [ ] `frontend/src/components/logs/CompositeLog.tsx` with bands **INPUT (raw LWD at the bit)** · **OUTPUT (ML inversion)** · **LAG (what the mudlogger sees)**
- [ ] Tracks: ① GR/CALI/BIT/SP ② depth ③ tops U1–U4 ④ RHOB/NPHI/PEF with yellow sand-crossover fill ⑤ RDEP/RMED/RSHAL (log) ‖ ⑥ SW/SXO + GWC line ⑦ PHIE/BVW with residual (green) / movable HC (yellow) / water fill ⑧ lithology 0–100 % cumulative fill with patterns ‖ ⑨ mudlog lithology ending `lag_m = ROP × 45/60` above the bit + hatched "cuttings in transit" + "+45 min" label
- [ ] Board mode = ①④⑤ ‖ ⑦⑧ ‖ ⑨; Engineer mode = all 9; readable headers (≥ 12 px), no overlap, no horizontal cut-off at 1920×1080
- [ ] Offset composite (MN-DW-02) side panel for the prospective-zone question (Act 1)
- **Verify:** at bit 4,150 m the ML column reaches the bit and the mudlog column stops ≈ 16.5 m higher (ROP 22 m/hr × 45 min); after drilling to 4,250 m the gas crossover and the GWC line appear at 4,270 m; screenshot reviewed by Opus against the SAFIR-03 reference.

---

## P1 — High value (after P0)

### P1-1 · Crescendo v2: 15 turns across 4 acts · **Flash** drafts, **Opus** reviews · V8, M1–M5
- [ ] `data/scenario/turns.yaml` + `frontend/src/mocks/agentScript.ts` (hi + en) per the turn table in [`build.md` §4.C](build.md), grouped by act: Act 1 = T0–T3 · Act 2 = T4a–T6 · Act 3 = T7–T9 · Act 4 = T10–T13
- [ ] Must include: ML lithology vs mudlog lag (M1) · "agle zone tak kitna time?" → agent asks "kaunsa zone?" → ETA + PP/FG preview (V8) · "paas wale rig pe kya hua tha, kaise mitigate kiya?" (M3) · shift-handover draft (M5)
- **Verify:** SCRIPTED click-through of all 15 turns; every agent line passes the validator.

### P1-2 · FE-3 Pressure window: both sides · **Flash** (Opus spec) · V7
- [ ] Shaded **kick zone** (MW < PP) and **loss zone** (ECD > FIT/FG); MW, ECD, **ML-recommended MW 11.65 ppg** line; look-ahead band (bit → +50 m); "if unchanged" ghost crossing PP at 4,195 m; zone labels with margins
- **Verify:** at 4,172 m both margins are labelled on screen (kick side PP vs MW 11.20; loss side ECD vs FIT 12.10).

### P1-3 · One real action on a real phone · **Flash** (after token) + **Opus** wiring review · V4
- [ ] `dispatch_fanout` calls `actions/dispatch.py`; Telegram delivers to presenter phone (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- [ ] Other channels stay simulated but show payload + status
- **Verify:** on "Haan, bhej do", the phone buzzes within 3 s; ledger records delivery.

### P1-4 · FE-4 Agent stage · **Flash** · V1, V3
- [ ] Large Hindi-first captions (presenter + agent); live reasoning steps from `tool_call` events ("MN-DW-02 ka DDR dekh raha hoon…"); citation cards from retrieved doc IDs; clarifying-question highlight
- **Verify:** in LIVE, a tool-using turn shows ≥ 1 reasoning step and ≥ 1 citation card before the answer finishes.

### P1-5 · FE-5 Action theatre (Act 3) · **Flash** · V4, M4
- [ ] Memo → approve → fan-out as a single left-to-right sequence; phone mirror shows the real Telegram payload + delivered tick
- **Verify:** Act 3 SCRIPTED run shows all 4 steps in order within 10 s of approval.

### P1-6 · FE-6 Shift notes → WCR (Act 4) · **Flash** + **Opus** tool · V9, M5
- [ ] Tool `draft_shift_log(shift_id?)` from `shift_notes.yaml` + ledger; WCR draft side-by-side with notes; each WCR sentence highlights its source note
- **Verify:** Act 4 LIVE produces a draft citing the right depths; clicking a sentence highlights its source.

### P1-7 · WCR/Shift Notes cleanup · **Flash** · V5, V9
- [ ] Remove SAFIR-03 third-party image from `WcrDocument.tsx` and `ShiftNotesTab.tsx` (broken path; wrong well)
- **Verify:** WCR renders with no broken image; tsc + build green.

### P1-8 · Latency + rehearsal harness · **Opus** · V1
- [ ] Script that sends each turn's prompt to Live and records time-to-first-audio and tool calls
- **Verify:** p90 time-to-first-audio ≤ 1.5 s over 3 runs; report saved to `docs/stage/latency.md`.

### P1-9 · Offline safety net · **Opus** · V1
- [ ] SCRIPTED mode runs all 4 acts / 15 turns with backend down and Wi-Fi off
- **Verify:** `DI_OFFLINE=1` full run, zero errors in console.

---

## P2 — Polish (only after P1)

- [ ] **Flash · FE-7 visual system:** light executive theme as default (matches deck; dark kept as toggle); projector type scale ≥ 14 px in board mode; no truncated labels; one small "Synthetic scenario data" note replaces conflicting provenance chips
- [ ] **Flash · FE-8 bugs:** basin map label overlap + basemap; code-split the 5.9 MB bundle (Plotly/3D lazy)
- [ ] **Flash:** delete dead `backend/app/agent/watchdog.py`; update docs that claim it
- [ ] **Flash:** record per-turn offline audio/caption cache for SCRIPTED mode
- [ ] **Opus:** indicative value line with explicit assumptions *or* remove ROI figures (owner call; low priority)
- [ ] **Flash:** Hindi query RAG eval (5 questions)
- [ ] **Opus:** red-team rehearsal script for a drilling engineer (`docs/qa_crib.md`)

---

## Frozen — do not spend time before the pitch

Cloud Run deploy · Terraform · further BigQuery work (tables already loaded) · Vertex RAG Engine · Model Armor · Gmail/`.eml` · SMS DLT · more IODP downloads · FORCE training · more synthetic docs/PDFs · 3D view polish · extra scenario variants (generator supports them; only the primary scenario is in scope).

---

## Day-of-Show (T-60 min)
- [ ] Laptop on power, notifications off, display 1920×1080 mirrored
- [ ] Hotspot on; backend health green; Live session pre-warmed; mode chip = LIVE
- [ ] Presenter console open; Telegram notifications ON on presenter phone
- [ ] Scenario reset to Act 1 / Turn 0; SCRIPTED fallback tested once
- [ ] Fallback video open in background tab
- [ ] Water, clicker batteries, lapel mic check

## Change log
| Date | Change |
|---|---|
| 2026-09-26 | v0.4: rebuilt as verbatim-traced priority checklist (P0/P1/P2/Frozen) with Opus/Flash owners and Verify lines. Unverified Phase 4 ticks from v0.3 removed. |
| 2026-09-26 | v0.5: owner approved scope v0.5 — **4 acts**, **fully synthetic high-res data** (IODP override removed), reservoir values approved for YAML, light executive theme. Added P0-6 (D1 synthetic data), P0-7 (FE-1 act stages), P0-8 (FE-2 multi-log); P0-3 system prompt moved up; FE-3..FE-8 added to P1/P2; three over-claimed §B items removed; V5 reinterpreted, V12 added. P0-1/P0-2 code landed (tests 38/38). |
