# Drilling Intelligence 2.0 — Build Guide (`build.md` v0.6)

> **What this is.** The single plan for finishing the demo. It is organised as **work packages (WP-xx)**. Each WP stands alone: any model (Opus or Gemini Flash) can pick it up without reading earlier chats.
> **Progress lives in** [`ACTIVE_DEBUGGING_AND_EXECUTION.md`](ACTIVE_DEBUGGING_AND_EXECUTION.md) (what is in flight) and [`checklist.md`](checklist.md) (long-term ticks).
> **Copy-paste prompts for Flash:** [`docs/FLASH_PLAYBOOK.md`](docs/FLASH_PLAYBOOK.md). **API shapes:** [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). **Requirements:** [`verbatim.md`](verbatim.md). **Old v0.5 guide (phases 0–8):** [`docs/archive/build_v0.5.md`](docs/archive/build_v0.5.md).

---

## 0. Rules that apply to every WP

1. **Numbers come only from `data/scenario/*.yaml`.** Never type a depth, pressure, mud weight, volume or time into code or text. The fact gate must stay at **0 errors / 0 warnings**.
2. **No money anywhere.** No ₹, no "crore", no savings figures.
3. **Touch only the files your WP lists.** If you need another file, stop and ask.
4. **Never `git commit` or `git push`.** The owner commits.
5. **Every curve stops at the bit.** Nothing is drawn below the current bit depth, except the "if unchanged" forecast in the pressure track, which is dashed and labelled.
6. **All data is SYNTHETIC** (see [`docs/data/column_contract.md`](docs/data/column_contract.md)). The provenance footer must stay visible.
7. **Finish = run the WP's Verify line and paste the output.** A WP is not done until its Verify passes.

**Standard verify commands** (run from the repo root, `cloud_run_apps/Drilling-Intelligence-2.0`):
```bash
# Fact gate (must print 0 errors / 0 warnings)
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml python pipelines/synth/fact_gate.py
# Backend tests
~/.local/bin/uv run --no-project --python 3.12 --with pytest,fastapi,httpx,pyyaml,numpy,pandas,pyarrow,pydantic,google-genai,websockets pytest backend/tests -q
# Frontend: types + unit tests + build
cd frontend && npx tsc --noEmit -p . && npm test && npm run build
# Act walk-through (Playwright)
cd frontend && node scratch/verify_acts.mjs
# Screenshot of one act (N = 1..4) — use Playwright; headless chrome --screenshot mis-measures the layout
cd frontend && node scratch/probe_cockpit.mjs N out.png [comma-separated keys, e.g. v,n]
# (legacy) google-chrome --headless=new --no-sandbox --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=15000 --screenshot=out.png "http://localhost:5173/well/MN-SM-DW-01?act=N"
# Rebuild offline mocks after any backend/YAML change
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml,numpy,pandas,pyarrow,pydantic python pipelines/synth/generate_stub_frames.py
```
Dev servers: FastAPI `:8765` (auto-reloads on save under `backend/`), Vite `:5173`.

---

## 1. What we are building (the target)

**Chosen design: mock-up #4, "engineer-view cockpit"**, with #5 as its Act 3 variant. Images: `docs/design/mockups/4_engineer_view_cockpit.jpg`, `5_engineer_view_act3.jpg` (also at `http://localhost:5173/mockups/`).
**Rejected: mock-ups #1–3** (cinematic 3D stage). Do not build 3D heroes.

### 1.1 Screen layout (1920 × 1080, no scrolling, no empty areas)

```
┌─ Top bar: brand · well MN-SM-DW-01 · Act stepper 1▸2▸3▸4 · LIVE/SCRIPTED · clock ────────────────┐
├──────────┬───────────────────────────────────────────┬──────────────┬────────────────────────────┤
│ Wellbore │  Multi-log (SAFIR style)                   │ Pressure     │ Agent stage                │
│ schematic│  INPUT: GR/CALI │ depth+tops │ RHOB/NPHI/   │ PP·FG·FIT·   │ Hindi caption (large)      │
│ casing,  │  PEF │ RSHAL/RMED/RDEP (log)               │ MW·ECD·ML-MW │ English line               │
│ shoe,    │  OUTPUT: SW/SXO │ PHIE fills │ litho 0-100% │ kick side red│ reasoning steps            │
│ units,   │  LAG: cuttings column, ends LAG m above bit │ loss side amb│ citation card              │
│ bit      │                                            │              │ next action                │
│          │ ═══════════ one shared depth axis, one bit line across all four columns ═══════════ │
├──────────┴───────────────────────────────────────────┴──────────────┴────────────────────────────┤
│ 6 KPI tiles (change per act) · depth scrubber                                   provenance footer │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Act 1 (logs/evidence):** default layout.
- **Act 2 (window closes):** same layout; pressure track gets wider and "if unchanged" appears.
- **Act 3 (decision):** multi-log + pressure are replaced by memo → APPROVED stamp → 4 fan-out lanes (mud chemist, email, base/RTOC, phone) → phone mirror → decision ledger. Wellbore and agent stay.
- **Act 4 (loss side + report):** starts at the U3 top depth (YAML `stratigraphy.U3.top_m`). It shows the loss side, then Shift notes ⇄ WCR side by side.

### 1.2 What makes it look premium
No wasted space. Custom, crisp curves (Canvas, not Plotly). Fonts: Inter for text, JetBrains Mono with tabular numbers for values, Noto Sans Devanagari for Hindi. Nothing smaller than 14 px on the main screen. Smooth 180 ms transitions. Act changes are clean slides, not page reloads.

### 1.3 Mistakes in the mock-up images (do not copy)
Curves drawn below the bit. The label "4,225" (YAML says 4,222). The schematic not drawn to depth scale.

---

## 2. Shared front-end contracts (built in WP-02; every track uses them)

**Depth scale** — `frontend/src/components/cockpit/depth.tsx`
```ts
export interface DepthScale {
  topMd: number; baseMd: number;   // visible window (m MD)
  bitMd: number;                   // current bit depth (from scenarioStore)
  heightPx: number;                // body height in px (same for every track)
  y(md: number): number;           // md → px inside the body
  md(y: number): number;           // px → md
}
export function useDepth(): DepthScale;           // React context, provided by <CockpitGrid>
export const TRACK_HEADER_PX = 72;                // every track header has this height
```
**Track component contract** — `frontend/src/components/cockpit/Track.tsx`
```tsx
<Track title="GR · CALI" scales={[{label:'GR', min:0, max:150, unit:'API', color}]} width={140}>
  {/* body: a <CanvasLayer draw={(ctx, scale) => ...}/> or SVG sized scale.heightPx */}
</Track>
```
- The header shows the curve names, units and min–max scale bars, like a paper log.
- `CanvasLayer` handles devicePixelRatio (DPR), resize, and redraw when the depth scale or frame changes.
- Frames data comes from `useScenario()` (`frontend/src/state/scenarioStore.ts`). Column names are in [`docs/data/column_contract.md`](docs/data/column_contract.md).
- **Bit line:** `<BitLine/>` is drawn once by the grid across all columns, not by each track.

**Show state** (built in WP-05): the server is the one source of truth for act, turn, bit depth, memo status and ledger. It is broadcast on `/ws/events`. The frontend store mirrors it. Scripted mode drives the same state through the same backend calls.

---

## 3. Work packages

Legend: **Owner** O = Opus, F = Flash (Opus reviews). **Status** in the tracking file.

| WP | Title | Owner | Depends on |
|---|---|---|---|
| WP-01 | Docs: build.md v0.6, Flash playbook, API contract, tracking | O | — |
| WP-02 | Design system + cockpit grid + shared depth axis + top bar + KPI strip | O | — |
| WP-03 | Wellbore schematic column (casing to scale) | O | WP-02 |
| WP-04 | Agent stage panel | O | WP-02 |
| WP-05 | Backend real-time API + show state + honest channel status | O | — |
| WP-06 | Multi-log renderer (SAFIR tracks on Canvas) — **built by Opus with WP-02**; Flash: polish only | O ✅ | WP-02 |
| WP-07 | Pressure track on the shared depth axis — **built by Opus with WP-02**; Flash: polish only | O ✅ | WP-02 |
| WP-08 | Act 3 action panel (#5) | F | WP-02, WP-05 |
| WP-09 | Act 4 + Shift notes ⇄ WCR | F | WP-02, WP-05 |
| WP-10 | Basin map: offline basemap + label collision | F | — |
| WP-11 | Presenter console on show state | F | WP-05 |
| WP-12 | ML lithology fix + real trained models (RF lithology, kick/MW) | F → O review | — |
| WP-13 | Dense embeddings for Hinglish retrieval | O | WP-05 |
| WP-14 | Verification harness (Playwright per act, API contract tests, 15-turn Live smoke, 5 adversarial prompts, 30-min soak, offline run) | O + F | all |
| WP-15 | **Last:** LAS calibration, DT Option A, final narrative | O | owner's LAS files |

---

### WP-02 · Design system + cockpit grid (Opus)
**Goal.** The #4 frame: top bar, 4 columns on one depth axis, KPI strip, scrubber, footer, and act switching.
**Files.** New: `frontend/src/components/cockpit/{depth.tsx,Track.tsx,CanvasLayer.tsx,BitLine.tsx,CockpitGrid.tsx,TopBar.tsx,KpiStrip.tsx,DepthScrubber.tsx}`, `frontend/src/screens/CommandCenter/Cockpit.tsx`. Edit: `design/tokens.ts`, `design/theme.css`, `screens/CommandCenter/{index.tsx,acts.tsx}`, `index.html` (fonts).
**Spec.**
- CSS grid: `wellbore 180px | multi-log 1fr | pressure 300px (Act 2: 420px) | agent 440px`; rows `56px | 1fr | 112px | 28px`.
- Depth window: default 4,000–4,460 m (YAML `profiles.grid`), and follows the bit in Act 2.
- KPIs per act come from a config object whose values are read from the frame/YAML.
- Act 4 starts at `stratigraphy.U3.top_m`.
- Dark theme is the default; light theme is optional.
**Acceptance.** At 1920×1080, no area over 5 % is empty. All columns share the same `y(md)` (checked by a unit test). The act stepper switches with the existing hotkeys.
**Verify.** Frontend build + `verify_acts.mjs` + 4 screenshots.

### WP-03 · Wellbore schematic column (Opus)
**Files.** `components/wellbore/WellboreSchematic2D.tsx` (rewrite) → used by `Cockpit.tsx`.
**Spec.**
- Two zones:
  - a compressed inset (sea → seabed → 36″ → 20″ → 13⅜″ shoe with FIT from `casing.last_shoe`);
  - to-scale open hole on the shared depth axis.
- In the to-scale zone, draw the 12¼″ hole, U1–U4 colour bands, the offset kick and loss depth markers (from `offsets.yaml`), and the bit at `bitMd`.
- Casing depths come from `casing.program` only.
**Acceptance.** The bit on the schematic is on the same pixel row as the bit line in the logs.

### WP-04 · Agent stage panel (Opus)
**Files.** `components/agent/{AgentPanel.tsx,Captions.tsx,CitationCard.tsx,ToolChips.tsx}`.
**Spec.**
- Idle state is never empty: it shows the well status summary and "Ask me" example chips (Hindi + English).
- During a turn it shows:
  - the Hindi caption at 26 px or larger, with the English line below;
  - reasoning steps (the tool calls, in plain words) with ticks;
  - a citation card (doc id, page, snippet);
  - a "Next action" button.
- The connection state is a small pill, not a blocking "CONNECTING…".

### WP-05 · Backend real-time API (Opus)
**Files.**
- `backend/app/api/{routes_actions.py,routes_rag.py,ws_events.py,schemas.py}`, `backend/app/main.py`.
- `backend/app/actions/{memo.py,approval.py,ledger.py,dispatch.py}`, `backend/app/scenario/engine.py`.
- Tests under `backend/tests/api/`.
- `docs/API_CONTRACT.md`.
**Spec.** Endpoints are listed in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).
- Tool endpoints reuse the exact functions used by the Live tools.
- Channel status is `DELIVERED | SIMULATED | FAILED`, never a fake DELIVERED.
- Add GZip.
- `/frame?md_m=`.
- `/ws/events` broadcasts show state.
**Acceptance.** Every endpoint has a contract test. Scripted mode in the UI calls these endpoints.

### WP-06 · Multi-log renderer (Flash) — prompt in playbook §P-06
Canvas tracks per §2. Board subset in Act 1 = GR · depth/tops · RHOB-NPHI · RDEP · litho · cuttings. Engineer subset (toggle `E`) = all tracks listed in §1.1. Replaces `CompositeLog.tsx` in the cockpit. The old file stays until WP-14 passes.

### WP-07 · Pressure track (Flash) — playbook §P-07
One track on the shared axis. It shows:
- PP, FG, FIT and MW, with ECD and the ML-recommended MW with its P10–P90 band;
- the kick side filled red where MW < PP, and the loss side filled amber where ECD > FG;
- an "if unchanged" dashed forecast below the bit, in Act 2 only.

### WP-08 · Act 3 action panel (Flash) — playbook §P-08
### WP-09 · Act 4 + Shift notes ⇄ WCR (Flash) — playbook §P-09
### WP-10 · Basin map (Flash) — playbook §P-10
### WP-11 · Presenter console (Flash) — playbook §P-11
### WP-12 · ML lithology + trained models (Flash) — playbook §P-12
### WP-13 · Dense embeddings (Opus)
Embed `corpus_chunks.json` with a multilingual model. Use hybrid retrieval (BM25 + dense). "paas wale rig" must retrieve the offset-well documents. Eval set: 20 Hinglish queries, recall@3 ≥ 0.9.
### WP-14 · Verification harness
See the checklist section "V" and the playbook §P-14.
### WP-15 · Parked until the end
LAS-based calibration of curve shapes, DT Option A (porosity drives density and sonic together), and the final narrative wording.

## 3.1 Front-end fine-tuning backlog (FT-xx) — small, self-contained items

Owner **F** = safe for Flash (prompt: playbook §P-FT). Owner **O** = Opus (touches live agent, backend or shared contracts).

| ID | Item | Owner | Files | Done when |
|---|---|---|---|---|
| FT-1 | Wellbore: offset-event label (KICK/LOSS) overlaps the unit id (U3) label | F | `cockpit/wellbore/WellboreColumn.tsx` | No overlap at bit 4,160 / 4,195 / 4,222 (screenshots) |
| FT-2 | Console 404 (favicon) | F | `frontend/index.html`, `frontend/public/favicon.svg` | No console errors on load |
| FT-3 | Memo "Evidence" is empty — pass the offset/SOP citations found by `search_knowledge` / `lookup_offset_events` into the memo | O | `backend/app/agent/tools.py`, `components/actions/MemoOverlay.tsx` | Memo lists ≥ 2 doc ids |
| FT-4 | Act 3 new action panel | F (after WP-05) | see WP-08 | WP-08 acceptance |
| FT-5 | Act 4: make the loss event visible — window reaches 4,222, ECD rise after the drilling break, amber fill; WCR side-by-side | F (after WP-05) | see WP-09 | WP-09 acceptance |
| FT-6 | Pressure track: "KICK SIDE" label crosses the PP line; ML MW / P10–P90 labels low contrast | F | `cockpit/pressure/PressureTrack.tsx` | Labels readable, not over curves |
| FT-7 | GR shading looks stripy — colour by a smoothed GR (e.g. 1 m running mean) | F | `cockpit/logs/MultiLog.tsx › GrTrack` | Smooth colour ramp |
| FT-8 | Light theme pass on the cockpit (canvas colours come from `cockpit/palette.ts`) | F | `cockpit/palette.ts`, `design/theme.css` | `T` toggles; everything readable |
| FT-9 | Takeaway card on the new layout + "4 layers of AI" closing card (data · physics · ML · agent) | F | `common/TakeawayCard.tsx`, new `common/ClosingCard.tsx` | `Enter` shows card; closing card after WCR |
| FT-10 | Scrubber: add turn markers + act boundaries; make it 48 px tall | F | `timeline/Timeline.tsx` | Visual check |
| FT-11 | Remove unmounted old components after WP-14 passes (`logs/CompositeLog.tsx`, `logs/LogTracks.tsx`, `pressure/PressureWindow.tsx`, `CommandCenter/acts.tsx`, `common/ActNavBar.tsx`, `well3d/*`) | O (ask owner first) | those files | Build green, no imports left |
| FT-12 | SCRIPTED mode: example chips / typed questions should map to the matching scripted turn instead of a warning toast | O | `live/liveClient.ts`, `state/turnMachine.ts` | Chip works with backend down |
| FT-13 | Presenter view (`/presenter`) shows the new act names and next-turn text | F (after WP-05) | see WP-11 | WP-11 acceptance |
| FT-14 | Basin map polish | F | see WP-10 | WP-10 acceptance |
| FT-16 | What-if (`W`) and audit (`A`) drawers open correctly over the cockpit | F | `whatif/WhatIfDrawer.tsx`, `audit/AuditDrawer.tsx` | Screenshots with each open |
| FT-17 | Play-button flicker | O | `cockpit/CanvasLayer.tsx` | ✅ fixed 2026-09-26 — `node scratch/flicker_probe.mjs` → 0 blank frames |

## 3.2 How to open the app
- Viewing: `http://amandeepsinghs.c.googlers.com:5173/well/MN-SM-DW-01` (`?act=1..4` jumps to an act). `vite.config.ts` has `allowedHosts: true`.
- Microphone (hold-to-talk) needs `localhost` or https: from the laptop run `ssh -L 5173:localhost:5173 amandeepsinghs.c.googlers.com`, then open `http://localhost:5173/well/MN-SM-DW-01`.
- Dev servers on the Cloudtop: FastAPI `:8765`, Vite `:5173`. Restart commands: see `ACTIVE_DEBUGGING_AND_EXECUTION.md` §5.
- Hotkeys: `N` next turn · `Shift+1..4` act · `Space` play · `B` board/engineer tracks · `V` LIVE/SCRIPTED · `-` WCR · `?` help.

---

## 4. Already done (collapsed)
Phases 0–4 core, the Live agent with tools and resilience, the 15-turn crescendo, the fact gate (0/0), the BM25 retriever, the F1 corpus from YAML, the O6 hi-res synthetic well (3,681 samples, 0.125 m), no-money cleanup, and A-1…A-13. Details: [`docs/archive/build_v0.5.md`](docs/archive/build_v0.5.md) and the Done log in the tracking file.

## 5. Change log
- **v0.6 (2026-09-26):** rewritten as work packages around the #4 cockpit; cinematic direction rejected; data refinement parked until last.
- v0.5: see archive.
