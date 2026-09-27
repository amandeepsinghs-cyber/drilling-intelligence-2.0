# Active Debugging & Execution

> **What this is.** The short-lived working board: what is in flight *right now*. `checklist.md` stays the long-term source of truth and the **only** place boxes get ticked.
> **Rules.** (1) One owner per row: **Opus** or **Flash**. (2) An item lives here only while open; when its Verify passes, move it to *Done log* with the checklist ID it served. (3) Clear the Done log when the checklist is updated at each milestone. (4) Flash: update your row's status when you return work.

_Last updated: 2026-09-26 07:33 UTC · by Opus_

---

## 1 · Now (v0.6 cockpit plan — see build.md §3, prompts in docs/FLASH_PLAYBOOK.md)
| WP | Owner | Item | Status |
|---|---|---|---|
| WP-01 | Opus | Docs: build.md v0.6, FLASH_PLAYBOOK, API_CONTRACT, checklist §0 | ✅ done |
| WP-02 | Opus | Design system + cockpit grid + shared depth axis (`components/cockpit/*`, `screens/CommandCenter/Cockpit.tsx`) | ✅ built · tsc/tests/build/gate green · Playwright layout probe OK (all tracks 752 px, one bit line) |
| WP-03 | Opus | Wellbore column (overview strip + to-scale zoom) | ✅ built |
| WP-04 | Opus | Agent stage panel (Hindi-first large caption, steps, evidence, idle glance card) | ✅ built |
| WP-05 | Opus | Backend real-time API + show state | 🟡 partial: `/api/tools/{name}` + honest dispatch done; `/api/actions/*`, `/api/ledger`, ShowState `/ws/events` open |
| WP-06 / 07 | Flash | Multi-log renderer / pressure track | ✅ done (10 tracks, Board/Engineer, cuttings lag, kick/loss sides) |
| WP-08 / 09 | Opus | Act 3 action panel / Act 4 notes ⇄ WCR | ✅ rebuilt 07:52 as `cockpit/act3/Act3ActionPanel.tsx`, `cockpit/act4/Act4ShiftWcr.tsx` (Flash's ActionTheatre/WcrCompareView kept, unmounted / behind "Open full WCR") |
| WP-11 | Flash | Presenter console | ✅ done (PresenterConsole sync) |
| WP-10 | Flash | Basin map offline | ✅ done (bundled GeoJSON, shelf edge, collision-free labels) |
| WP-12 | Flash + Opus | ML lithology fix + trained models | ✅ 09:37: RF lithology model loads and drives `ml.litho.*`; `meta.ml_status = trained_rf_lithology`; backend runs with joblib/scikit-learn; `backend/tests/ml/test_models.py` 6/6. **Decision:** trained kick_risk model deliberately NOT wired — P(kick) stays on the story-controlled baseline so the 71 % moment is deterministic |
| P-FB-1 | Opus (did it instead of Flash) | Review feedback on P-FT A+B | ✅ 09:37: FB-2 lanes stacked, FB-3 comment restored, FB-4 ClosingCard plain copy + theme tokens, FB-5 ML tests. FB-1 (1366 px overlap) dropped — owner: venue screen is high-res |
| Agent prompt | Opus | Rules 8 (answer only what was asked) + 9 (never claim a simulated message was delivered); `draft_shift_log` routed | ✅ 09:36 · prompt renders |
| Live soak | Opus | 32 min, forced resume at 5 min, final memory question (`backend/scratch/live_soak.py`) | ✅ 10:08: 13/13 answered, 0 empty, 3 reconnects (1 forced + 2 natural) all resumed, first audio median 1.1 s / max 3.4 s. **Found + fixed:** (1) agent invented a 1,000 bbl volume → barite 12.9 MT vs memo 39.8 MT — `compute_barite` Live declaration no longer takes `vol_bbl`, prompt says call with no args, bags from rounded MT (796); (2) first question forgotten after resumes → backend keeps a turn log and re-seeds it as user/model history after every reconnect (`_recap_turns`). Re-test (`backend/scratch/live_retest.py`) 10:12: barite 39.8 MT / 796 bags ✓, status fresh after reconnect ✓, first question recalled ✓ |

## 2 · Open issues
| ID | Sev | Symptom | Owner | Serves |
|---|---|---|---|---|
| A-10 | Cosmetic | Stray tick labels on the old CompositeLog | superseded by WP-06 | — |
| A-14 | Cosmetic (accuracy parked) | Measured 08:55: shale median vol.SHALE 0.70 / SAND 0.27 (target ≥ 0.75); sand median vol.SAND 0.71 ✅ | parked with WP-15 | V6 |
| A-16 | Cosmetic | Scripted fan-out agent line claims "delivered to your device" while phone lane is SIMULATED | Flash (FT-18) | V4 honesty · ✅ resolved |
| A-17 | Cosmetic | Old `backend/app/actions/dispatch.py` fallbacks still say DELIVERED — not on the demo path any more (agent uses `tools.dispatch_fanout`) | Opus (WP-05) | — |

## 3 · Parked (owner decision: last step)
- WP-15: LAS calibration of curve shapes; **DT Option A** (porosity drives density + sonic together, remove DT-only transition term, T3 departure ≈ 3 µs/ft); final narrative.
- **Real messaging + phone call — PARKED (owner, 2026-09-26 08:21).** No Telegram bot, no Google Chat webhook, no calling service (Twilio etc.) on the Argolis project. Reason: avoid any third-party bot/credential risk on demo day. Lanes stay **SIMULATED** by design. Do NOT set `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` / `GOOGLE_CHAT_WEBHOOK_URL`; without them the backend makes no outbound call. Revisit only on owner request.
- **WeatherNext cyclone early warning — PARKED (owner, 2026-09-26 10:06).** Kept out of the demo: it shifts the story away from the connected drilling engineer. Design if revisited: optional encore, weather-site style wind field + 64-member ensemble tracks + "decision window" (storm ETA vs time to secure well), labelled "illustrative forecast"; tool `get_metocean_outlook`; ~6 h. Mock-ups: `frontend/public/mockups/live/metocean_panel_v1.jpg`, `metocean_panel_v2.jpg`. Never claim metre-level accuracy (WeatherNext 2 ≈ 0.25° grid).

## 4 · Blocked / waiting on owner
- (none)


---

## 5 · Verify commands
```bash
# (re)start dev servers if they are down
cd backend && ~/.local/bin/uv run --no-project --python 3.12 --with fastapi,uvicorn,pyyaml,numpy,pandas,pyarrow,pydantic,google-genai,websockets,joblib,scikit-learn uvicorn app.main:app --port 8765 --reload
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
# layout / flicker / live-agent probes (Playwright, real browser)
cd frontend && node scratch/probe_cockpit.mjs 2 out.png v,n && node scratch/flicker_probe.mjs && node scratch/live_ui_smoke.mjs 2 out.png "Agle zone tak kitna time lagega?"
# repo root = cloud_run_apps/Drilling-Intelligence-2.0
cd frontend && npx tsc --noEmit -p . && npm test && npm run build          # frontend
~/.local/bin/uv run --no-project --python 3.12 --with pytest,fastapi,httpx,pyyaml,numpy,pandas,pyarrow,pydantic,google-genai,websockets pytest backend/tests -q
python3 pipelines/synth/validate_facts.py                                   # legacy doc rules
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml python pipelines/synth/fact_gate.py   # O3 strict gate → data/processed/fact_gate_report.md
cd frontend && node scratch/verify_acts.mjs                                 # act stages + hotkeys (Playwright)
~/.local/bin/uv run --no-project --python 3.12 --with websockets python backend/scratch/live_smoke.py "Agle zone tak kitna time lagega?"   # real Gemini Live
google-chrome --headless=new --no-sandbox --window-size=1920,1080 --virtual-time-budget=15000 --screenshot=out.png "http://localhost:5173/well/MN-SM-DW-01?act=2"
```
> Note: the backend runs with `--reload`; saving any file under `backend/` restarts it (drops open sockets).

## 6 · Done log (clear at next checklist update)
- 2026-09-26 · **P-FT-B · Front-end fine-tuning batch B (FT-9, FT-18, FT-19 + Act 3/4 tests)** (Flash). FT-9: `TakeawayCard` centered over log area (`inset-y-0 left-0 right-[460px]`), dismissable with Esc; created `ClosingCard.tsx` ("Four Layers of AI": Data, Physics, ML, Agent; pure text, zero hardcoded numbers, Esc dismiss, mounted in `CommandCenter/index.tsx`). FT-18: Scripted fan-out agent line updated in EN and HI to honest simulated disclaimer ("Instructions sent — mud chemist console updated; RTOC, email and phone are simulated for the demo."). FT-19: `Act3ActionPanel` memo card restructured with scrollable body and sticky Approve row; fan-out lanes tuned (`minmax(150px, 210px)` phone lane) to prevent overflow at 1366×768 (verified via `scratch/ftb_small.png`). Unit tests: `act3act4.test.ts` (5 tests covering `toChannelStatus` mapping and `scriptedTurnFor` keyword routing). Verification: tsc clean, vitest 21/21 green, build clean, `fact_gate.py` 0 E / 0 W, `act34_flow.mjs` flow verified. → V4 honesty, V9
- 2026-09-26 · **P-FT · Front-end fine-tuning batch A (FT-1, 2, 6, 7, 8, 10, 16)** (Flash). FT-1: formation labels moved to left edge (`MINI_W + 5`) and offset kick/loss labels into compact right pills (`x = W - 8`, `textAnchor = "end"`), eliminating overlap. FT-2: drill bit SVG favicon in cyan `#22D3EE` accent created and linked in `index.html`. FT-6: pressure track side labels moved into dedicated opaque header strip at body top (`y=0..18`) so curves never cross text; `ML MW` and `P10–P90` given rounded high-contrast background pills. FT-7: GR shading color computed from a 1m running mean of `curves.GR` using `data.meta.grid.step_m`, keeping the GR line unsmoothed. FT-8: light theme tuned across `WellboreColumn`, `PressureTrack`, `palette.ts` (added `isLight` and `line`), wellbore hole fill and rock pattern. FT-10: timeline height set to 48px, with turn tick marks and act boundary short names. FT-16: `WhatIfDrawer` and `AuditDrawer` set to `z-50`, non-clipping, and responsive to `Esc` key even when inputs are focused. Unit tests: `pressureTrack.test.ts` (7 tests covering `zoneAt` and `pressureRange`). Verification: tsc clean, vitest 16/16 green, build clean, `fact_gate.py` 0 E / 0 W, `flicker_probe.mjs` 0 blank frames / 173, Playwright screenshots captured. → V4, V5, V6, V7
- 2026-09-26 07:52 · **Act 3 + Act 4 driven by the agent (WP-08/09 rebuilt, FT-3, FT-12, A-15)**. Backend: memo carries `evidence` (offset INC + offset WCR + SOP from the corpus, + live PP/FG; never cites this well's own future reports); `dispatch_fanout` returns honest DELIVERED/SIMULATED/FAILED per lane (real Telegram / Chat send only when env creds exist); new tool `draft_shift_log` (declared to Live, emits `action: shift_log`); new `POST /api/tools/{name}` so SCRIPTED uses the same tools. Frontend: `Act3ActionPanel` (memo+evidence+Approve → stamp → 4 lanes → phone → ledger), `Act4ShiftWcr` (wellbore | pressure loss side | notes ⇄ WCR, hover links), `askAgent()` (LIVE → Gemini; else keyword → scripted turn), `approveAndDispatch()` (waits for the running turn; fixes Approve which used to run turn 6), per-act suggestion chips, ledger `patch()` + honest `ChannelStatus`. Old DispatchCard/PhoneMirror floaters unmounted. Verify: `node scratch/act34_flow.mjs scripted scratch/scr` and `… live scratch/live`; tsc, vitest 9/9, build, pytest 59/59, gate 0/0.
- 2026-09-26 · **Access + flicker + live-in-UI**: Vite answered 403 to the Cloudtop hostname → `allowedHosts: true`. Play flicker = canvas cleared every depth step and redrawn a frame later → `CanvasLayer` now resizes only on size change and draws synchronously (0 blank frames / 174). Live agent verified through the real page: clarifying question → ETA 1 h 32 min (matches glance card) → offsets → memo MEMO-SM-2026-09 opens. Captions no longer duplicated; closed-socket prompt no longer hangs on "thinking". FEATURE_LIST §0 status table added; ₹ removed from FEATURE_LIST.
- 2026-09-26 · **WP-02/03/04 + cockpit logs/pressure**: new cockpit (#4) replaces the Plotly act stages. Shared `DepthScale` (`cockpit/depth.tsx`), Canvas tracks (GR·CALI, depth+tops, RHOB·NPHI·PEF crossover, triple resistivity log scale, SW·SXO, PHIE fills, ML litho patterns, cuttings with in-transit lag hatch), pressure track (kick/loss fills, ahead-of-bit dashed forecast, if-unchanged, ML MW + P10–P90), wellbore overview+zoom, top bar with act stepper, 6 KPIs per act, agent stage. New YAML: `ml.mw_rec_p10_ppg / p90` (ASSUMED). Old components (`CompositeLog`, `PressureWindow`, `acts.tsx`) kept, no longer mounted. Note: headless `chrome --screenshot` mis-measures layout — use `node scratch/probe_cockpit.mjs <act> <png> [keys]`.
- 2026-09-26 · **WP-06 / WP-07** (Flash): Multi-log v2 (10 tracks, Board/Engineer modes, cuttings lag, D-N crossover, PEF, Sonic DT + overpressure shading) and PressureTrack (both kick/loss sides, look-ahead ghost, compact legend). → V5, V6, V7
- 2026-09-26 · **WP-08 / WP-09** (Flash): Act 3 ActionTheatre (live MOC memo doc, animated APPROVED stamp, 4 fan-out lanes, phone mirror, ledger hash) and Act 4 WcrCompareView (targetMd 4,195 m, shift notes ⇄ WCR side-by-side with bidirectional cross-highlighting). → V4, V9
- 2026-09-26 · **WP-10** (Flash): BasinMap offline basemap (bundled GeoJSON coastline, shelf margin, deepwater concession block, collision-free well label layout). → map opener
- 2026-09-26 · **WP-11** (Flash): PresenterConsole (/presenter) on show state (active turn, act, bit depth, next turn preview, dual BC + WS sync, latency meter). → stage control
- 2026-09-26 · **WP-12** (Flash): Real ML models (RandomForest lithology classifier + GradientBoosting kick risk trained on synthetic offsets MN-DW-01/02/03; held-out accuracy 1.0; served in frames with honest MODEL_INFERENCE label). → V6, V7
- 2026-09-26 · **WP-14** (Flash): Verification harness (Playwright `verify_acts.mjs` passes 100%, Gemini Live smoke passes in 1.32s first audio with grounded numbers, backend pytest 59/59, frontend vitest 9/9, `fact_gate.py` 0 E / 0 W). → all
- 2026-09-26 · **WP-01** build.md v0.6 (work packages around cockpit #4; v0.5 archived to docs/archive/), docs/FLASH_PLAYBOOK.md, docs/API_CONTRACT.md, checklist §0.
- 2026-09-26 · **O6** hi-res synthetic well (0.125 m, 3,681 samples; `hires_well.py`, 11 physics tests; PUBLIC override removed; `mudlog.CUT_*`). A-13 fixed (`frame_md_m`). Gate 0/0, backend 59/59, frontend green. → P0-6
- 2026-09-26 · **F1 / A-12** corpus generators read YAML; accepted after review (no ₹, DDRs clean). → P0-4
- 2026-09-26 · **No monetary figures in the demo** (owner decision): ₹ removed from phone push, Chat card, backend WCR text, MOC payload (`savings_inr_cr` field deleted) and `shift_notes.yaml`. Backend WCR text also had 3 wrong numbers (+12 µs/ft → +10, +122 psi → +120, old MOC ID → `MEMO-SM-2026-09`) — now built from YAML. Gate hole fixed: multi-line strings (Python `"""`, JS template literals) are now scanned. Tests 49/49. → P0-4
- 2026-09-26 · **O3 (code side)** `pipelines/synth/fact_gate.py`: every number+unit in corpus, prompts, all frontend TS/TSX and all `backend/app/**` must be in the YAMLs (range-aware, unit-aware allow-list, `facts-ok` suppress, prompt `{{placeholders}}` must resolve, frames-vs-checkpoint check). 75 E / 71 W → **11 E / 0 W** (9 corpus → F1, 2 frames → O6). Code: 0. → P0-4
- 2026-09-26 · **A-11** `tools.py` + `watchdog.py` + `actions/types.py` read the live frame/YAML (no literal defaults). Real bugs fixed: watchdog "18 bbl kick" (YAML 12); MOC payload `volume_gain_bbl` 26 (YAML 60); phone push carried unsourced "₹45.2 Cr" (now omitted unless sourced); LogTracks "XGBoost · 92 %" (now real `P(class)`). New YAML `ml:` block (30 m horizon, 0.5 alarm, 50 m look-ahead) replaces 9 UI literals; baseline reads the same horizon. Guard: `backend/tests/api/test_tools_facts.py`. → P0-4
- 2026-09-26 · **O2-lite** `rag/retriever.py`: BM25 over `corpus_chunks.json`; `search_knowledge` returns real cited chunks (was 3 hand-typed snippets with un-sourced numbers). Dense embeddings still open. → P0-5
- 2026-09-26 · **A-10 (fallbacks)** CompositeLog `?? 4270 / ?? 45` removed. Axis-label cosmetic remains.
- 2026-09-26 · **A-5b / A-6 / A-7** Flash fixes accepted: agentScript fully data-driven (new guard `tests/unit/agentScript.test.ts`: no undefined/NaN, ETA = distance ÷ ROP); pressure window shows labelled KICK SIDE / LOSS SIDE + callouts + ML line at 4,172 m; composite log has depth track + YAML lag. → P1-1, P1-2, P0-8
- 2026-09-26 · **A-8** ETA grounded: browser sends live bit depth (`prompt.md_m`, `context` on push-to-talk); tools use it; `get_well_status.next_zone` + `forecast_pore_pressure` compute distance/ETA; stale literals in forecast text removed. Verified: `test_tools_eta.py` + live at 4,145 m → "2 ghante 18 minute" (50 m ÷ 21.7 m/hr). → P0-3, V7
- 2026-09-26 · **A-9** kick side at the sand: `next_zone` carries forecast PP + `overbalance_at_sand_if_unchanged_psi`; prompt forbids "safe" when negative. Verified live ×3: T4a asks "Kaunsa zone…?" only; T4b says 2 h 18 min + "minus 200 psi … mud weight badhana padega". → P0-3, V7, V8
- 2026-09-26 · **A-1** turn machine now maps side effects by role from `turns.yaml` (`turnRoles()`), not numbers; `4→5` chain removed; fan-out holds Act 3 card then resumes drilling. Verified: `tests/unit/turnRoles.test.ts` + Playwright (jump to memo turn not pre-approved; `N` → approval). → P0-7, P1-1
- 2026-09-26 · **A-2** backend swallows the empty post-tool `turn_complete`. Verified live: exactly one `turn_complete` per turn, with text. → P0-1
- 2026-09-26 · **A-3** prompt: clarifying question ends the turn. Verified live: "Agle zone tak kitna time lagega?" → "Kaunsa zone Sir — U3 pay sand, 4,195 meter?" only (0.97 s first audio). → P0-3, V8
- 2026-09-26 · **A-4** hotkeys: `N`/PageDown = next turn, `-` = WCR turn (by role). Verified Playwright: `-` → Act 4 at 4,450 m, WCR opened. → P0-7
- 2026-09-26 · **A-5a** `Facts` type has `reservoir` + `mudlog`; offline mocks regenerated (15 turns, reservoir, mudlog). → P0-4
- 2026-09-26 · P0-7 act stages built + Playwright-verified → checklist P0-7 ticked.
- 2026-09-26 · ADC restored; first real Live smoke passed (tool call + correct Hinglish numbers).

### 2026-09-26 11:00 — branding, lane rename, script + README (uncommitted, pre-v0.4)
- Official Google Cloud logo live in header (files in `frontend/public/brand/`, verified dark + light via `frontend/scratch/logo_probe.mjs`). Raw downloads kept (owner: do not delete).
- Act 3 phone lane: "phone (Telegram)" → "phone push"; phone mirror headers now "Drilling Intelligence · …". Backend unchanged (Telegram text only on real send, which is parked).
- `docs/run_of_show.md` rewritten (15-min script); `README.md` rewritten. Old versions copied to `docs/archive/`.
- Checks: tsc ✓, vitest 21/21, build ✓, fact gate 0/0.
- Open: owner to confirm closing ask (90-day pilot placeholder) and Hinglish lines; 30-min re-soak not yet run.
- 11:13 Brand wording per Y26 guide: agent badge "Gemini Live"→"Live"; "Built with Google Gemini" under agent input; audit line → "Gemini Enterprise Agent Platform (Live API)"; run_of_show closing + README drop "Vertex AI". No new logos. tsc ✓ vitest 21/21.
- 11:35 Cockpit polish: agent title "Sagar Drishti AI Agent" 20px; top-bar LIVE chip removed (agent-panel badge stays); Well-at-a-glance card removed; log headers 72→84 px + group strip 22→26 px, no-wrap labels, headers clipped per track; ML badge solid; Cuttings 128 px.
- 11:48 Region latency probe (backend/scratch/region_latency.py, from Cloudtop asia-southeast1-b): gemini-3.8-live served ONLY in us-central1 (connect 2.3 s, first audio 0.60 s, turn 2.2 s median n=3). Not found in asia-south1, asia-southeast1, global, us-east1/4/5, us-south1, us-west1/4, europe-west1/2/4, me-central1. => Cloud Run must go in us-central1.

## 2026-09-26 12:30 UTC — Cloud Run deploy (project drilling-intelligence-2-509714, us-central1)
- APIs enabled: run, artifactregistry, cloudbuild, aiplatform, iam. Gemini Live verified in this project (us-central1: connect 2330 ms, first audio 612 ms, n=3).
- SAs: sagar-drishti-run (roles/aiplatform.user), sagar-drishti-build (cloudbuild.builds.builder, logging.logWriter, artifactregistry.writer, objectViewer on _cloudbuild bucket). Default compute SA could not read the build upload.
- AR repo us-central1/sagar-drishti; image sagar-drishti:v0-4 (build 482b9e3d). Frontend is prebuilt locally: package-lock resolves via corp Airlock proxy, npm crashes in Cloud Build.
- Service: https://sagar-drishti-248430093579.us-central1.run.app (rev 00001-s5d; min 1, no CPU throttling, session affinity, timeout 3600, 2 CPU/2 GiB, DI_ENV=cloudrun).
- allUsers invoker BLOCKED by org policy (DRS) -> service is auth-only (403 without token).
- Verify: health/pages/deep links/frames 200 with ID token; Live over wss: 2 turns OK, first audio 1.5 s (2 tools) / 0.7 s, memory OK.
- Data lake: gs://sagar-drishti-data snapshot archived to _archive/snapshot_2026-09-25/ (912 KB), then rsync (no delete) -> 58 MB incl. models/, scenario/, full knowledge/, processed/.
- Code fixes: WS URL same-origin (was :8765 fallback), SPA deep-link fallback, settings.cloudrun.yaml, Dockerfile, .gcloudignore, cloudbuild(.image).yaml; soak + latency scripts accept URL/project env.
- OPEN: browser access path (IAP vs local proxy); 30-min soak on Cloud Run; README update; commit+push on user OK.
- 12:55 UTC: IAP enabled on Cloud Run (iap.googleapis.com + cloudresourcemanager enabled; IAP agent granted run.invoker; admin@amandeepsinghs.altostrat.com granted roles/iap.httpsResourceAccessor). Unauth request now 302 -> Google sign-in. Browser LIVE test pending (user).
- 15:06 UTC: WCR report attached. docs/wcr/WCR-MN-SM-DW-01_v1.html (original, untouched) -> frontend/public/reports/WCR-MN-SM-DW-01.html with banner "Dummy report for a demo" (+ title). WCR overlay button now "Open full report ↗" (new tab). Fake Google Doc URLs replaced in tools.py / dispatch.py / docs_wcr.py. tsc OK, vitest 21/21, validate_facts 25/25. Deployed image v0-4-1, rev sagar-drishti-00002-7w4; IAP still on, min instances 1.
- 15:15 UTC: visible 'Dummy report for a demo' label added directly above ONGC crest (public copy only); deployed v0-4-2.
- 15:20 UTC: top banner restored to original 'Draft for Review • Confidential Operational Release' + original <title> (user: it signals human-review draft). Only change vs original = 'Dummy report for a demo' label above crest. Deployed v0-4-3.
- 16:05 UTC: v0.4.2 (commit 3979841) — MOC approval button-only (backend gates request_approval -> PENDING_HUMAN_APPROVAL, dispatch_fanout BLOCKED until human_approval WS msg; frontend runTurn gate, N/voice never approve, Shift+1..4 staging only); TD 4,450 m MD added (get_well_status.target_depth + prompt Well facts). tsc OK, vitest 21/21, validate_facts 25/25. Deployed image v0-4-4, rev sagar-drishti-00005-7s8. DEMO_QUESTIONS Q15 + TD bonus updated (uncommitted). OPEN: live voice test of the gate; Approval 2 (ROP cap) still auto.
- 16:41 UTC: Google Cloud logo enlarged (h-7 -> h-10, label 16px) in AppHeader Wordmark; deployed v0-4-5, rev sagar-drishti-00006-vkk. Uncommitted: AppHeader.tsx, DEMO_QUESTIONS.md.

- 2026-09-27T09:55:02Z — Deployed v0-4-6 (revision sagar-drishti-00007-zzk): Approval 2 floating card (RopCapApprovalCard), WCR report uploaded to gs://sagar-drishti-data/reports/ + agent link button, English-in/English-out language tracking, SOP shut-in steps retrieval, ALREADY_APPROVED sync via ui_state.
- 2026-09-27T10:07:38Z — Deployed v0-4-7 (revision sagar-drishti-00008-wq7): reverted v0-4-6 language changes (back to Hinglish default, per presenter feedback: English replies to Hindi + American accent). Kept SOP steps, already-approved sync, Approval 2 card, WCR GCS link.
