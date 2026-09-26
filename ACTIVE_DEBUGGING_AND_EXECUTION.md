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
| WP-05 | Opus | Backend real-time API + show state | ▶ next |
| WP-06 / 07 | Flash | Multi-log renderer / pressure track | ✅ done (10 tracks, Board/Engineer, cuttings lag, kick/loss sides) |
| WP-08 / 09 / 11 | Flash | Act 3 / Act 4+WCR / presenter | ✅ done (ActionTheatre, WcrCompareView, PresenterConsole sync) |
| WP-10 | Flash | Basin map offline | ✅ done (bundled GeoJSON, shelf edge, collision-free labels) |
| WP-12 | Flash | ML lithology fix + trained models | ✅ done (RandomForest + GradientBoosting on offsets, 1.0 acc, MODEL_INFERENCE) |

## 2 · Open issues
| ID | Sev | Symptom | Owner | Serves |
|---|---|---|---|---|
| A-10 | Cosmetic | Stray tick labels on the old CompositeLog | superseded by WP-06 | — |
| A-14 | Important | ML litho shows ~40 % sand in U1 shale (Larionov baseline 115 API) | WP-12 | V6 |
| A-15 | Important | `dispatch.py` fallbacks report DELIVERED when nothing was sent | WP-05 | V4 honesty |

## 3 · Parked (owner decision: last step)
- WP-15: LAS calibration of curve shapes; **DT Option A** (porosity drives density + sonic together, remove DT-only transition term, T3 departure ≈ 3 µs/ft); final narrative.

## 4 · Blocked / waiting on owner
- Telegram bot token + chat ID (real phone push; until then phone lane shows SIMULATED).


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
