# Flash Playbook — copy-paste prompts for Gemini Flash

> **Why this exists.** If Opus quota runs out, any Flash session can continue the build from here. Each prompt is **self-contained**: paste the "Common preamble" and then one package prompt. Opus (or the owner) reviews the hand-back against the Acceptance list.
> Order and dependencies: see [`../build.md`](../build.md) §3. **Do not start a package whose dependencies are not marked ✅ in [`../ACTIVE_DEBUGGING_AND_EXECUTION.md`](../ACTIVE_DEBUGGING_AND_EXECUTION.md).**

---

## Common preamble (paste first, every time)

```
You are working in the repo at:
/usr/local/google/home/amandeepsinghs/O&G_slidedeck_agentic_transformation/Oil & Gas Agent Portfolio/cloud_run_apps/Drilling-Intelligence-2.0
Read build.md §0–§2 first. They are the rules and the shared contracts.

HARD RULES
1. Numbers only from data/scenario/*.yaml or the frame data (useScenario()). Never type a depth,
   pressure, mud weight, volume, time or percentage literal into code or UI text. Scale min/max values
   for log tracks (e.g. GR 0–150 API) are allowed only inside the TRACKS config object, marked `// facts-ok scale`.
2. No money: no ₹, crore, savings or costs anywhere.
3. Touch ONLY the files listed under "Files". If you need another file, stop and ask.
4. Never run git commit or git push.
5. Curves stop at the current bit depth (useDepth().bitMd). Nothing below the bit except items explicitly allowed.
6. Keep the provenance footer visible. All data is SYNTHETIC.
7. Style: use tokens from frontend/src/design/tokens.ts. Fonts: Inter (text), JetBrains Mono with
   font-variant-numeric: tabular-nums (numbers), Noto Sans Devanagari (Hindi). Main screen minimum 14 px.
8. Before handing back, run every command in "Verify" and paste the tail of each output.

HAND-BACK FORMAT (reply exactly like this)
- Files changed: <list>
- What I did: <5 bullets max>
- Verify output: <pasted>
- Screenshots: <paths>
- Open questions / anything I could not do: <list or "none">
```

---

## P-06 · Multi-log renderer (SAFIR style, Canvas)  — ✅ BUILT by Opus (2026-09-26). Use this prompt only for polish/fixes; files now exist as `cockpit/logs/{MultiLog.tsx,draw.ts,tracks.ts,patterns.ts}` (one file for all tracks).

```
GOAL
Replace the Plotly composite log with crisp Canvas tracks that sit on the shared depth axis, like the
SAFIR-03 sample: docs/design/inspiration/sample_interpreted_logs/shale_sand_limestone_lithology_log.webp
and mock-up docs/design/mockups/4_engineer_view_cockpit.jpg (centre column).

READ FIRST
- build.md §2 (useDepth, Track, CanvasLayer, TRACK_HEADER_PX) — already built in
  frontend/src/components/cockpit/. Use them, do not re-create them.
- docs/data/column_contract.md (what each column means).
- frontend/src/components/logs/CompositeLog.tsx and logPatterns.ts (old version: reuse the litho patterns).

FILES (create/edit only these)
- frontend/src/components/cockpit/logs/tracks.ts       (TRACKS config: ids, columns, scales, colours)
- frontend/src/components/cockpit/logs/GrCaliTrack.tsx
- frontend/src/components/cockpit/logs/DepthTopsTrack.tsx
- frontend/src/components/cockpit/logs/DensityNeutronTrack.tsx
- frontend/src/components/cockpit/logs/ResistivityTrack.tsx
- frontend/src/components/cockpit/logs/SaturationTrack.tsx
- frontend/src/components/cockpit/logs/PorosityTrack.tsx
- frontend/src/components/cockpit/logs/LithoTrack.tsx
- frontend/src/components/cockpit/logs/CuttingsLagTrack.tsx
- frontend/src/components/cockpit/logs/MultiLog.tsx     (lays the tracks out; exports default)
- frontend/src/components/cockpit/logs/draw.ts          (shared canvas helpers: polyline, fill-between, log scale, patterns)
- frontend/tests/unit/multilog.test.ts

TRACKS (frame column names in backticks)
INPUT
1 GR·CALI: `curves.GR` 0–150 API green, fill from the GR line to the left edge shaded by GR (sand yellow → shale grey);
  `curves.CALI` dashed and the bit size 12.25 in as a thin reference (read the bit size from YAML facts, not literal).
2 Depth + tops: depth labels every 10 m, stratigraphic tops from facts.stratigraphy (id + name tooltip).
3 RHOB·NPHI·PEF: `curves.RHOB` 1.95–2.95 g/cc red, `curves.NPHI` 0.45→−0.15 reversed blue; fill yellow where
  NPHI plots left of RHOB (gas/sand crossover), grey where it plots right (shale). `curves.PEF` 0–10 thin purple.
4 Resistivity (LOG scale 0.2–200 Ω·m): `curves.RSHAL` dotted, `curves.RMED` dashed, `curves.RDEP` solid.
OUTPUT
5 SW·SXO: `curves.SW` 1→0 blue, `truth.SXO_W` 1→0 dashed; fill between = movable hydrocarbon (green).
6 PHIE: `curves.PHIE` 0.5→0; fill split: hydrocarbon pore volume PHIE·(1−SW) green, water PHIE·SW blue.
7 Lithology 0–100 %: stacked areas from `vol.SHALE`, `vol.SAND`, `vol.LIME`, `vol.PHIE` with the patterns
  from logPatterns.ts (shale dashes, sand dots, limestone bricks). Caption "ML lithology at the bit".
LAG
8 Cuttings: blocky 1 m bins from `mudlog.CUT_SHALE_PCT`, `mudlog.CUT_SAND_SILT_PCT`, `mudlog.CUT_CARB_PCT`.
  The column ENDS at bitMd − `mudlog.LAG_M` (value at the bit row). Between that depth and the bit draw a hatched
  box labelled "in transit · <LAG> m" (number from the frame).

SUBSETS
- Board (default in Act 1 & 2): tracks 1, 2, 3, 4, 7, 8.
- Engineer (press key E, toggles; store flag in frontend/src/state/uiStore.ts is NOT in your file list — instead
  keep the flag local in MultiLog.tsx with a keydown listener).
Track widths share the column width: board ≈ equal; engineer = narrower. No horizontal scroll.

PERFORMANCE
3,681 rows. Draw only rows inside [topMd, min(baseMd, bitMd)]. Redraw < 8 ms per track. Use
requestAnimationFrame when bitMd changes.

ACCEPTANCE
- Every track stops at the bit line (unit test: no drawn point with md > bitMd — test the path-building helper in draw.ts).
- U3 sand shows D-N crossover fill, RDEP up, SW down, litho mostly sand; U1 reads shale.
- Cuttings end exactly LAG m above the bit, with the hatch.
- No Plotly import in cockpit/logs/*.
- Fact gate 0/0.

VERIFY
cd frontend && npx tsc --noEmit -p . && npm test && npm run build
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml python pipelines/synth/fact_gate.py
google-chrome --headless=new --no-sandbox --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=15000 --screenshot=frontend/scratch/p06_act1.png "http://localhost:5173/well/MN-SM-DW-01?act=1"
```

---

## P-07 · Pressure track on the shared axis  — ✅ BUILT by Opus (`cockpit/pressure/PressureTrack.tsx`). Remaining Flash task: add `frontend/tests/unit/pressureTrack.test.ts` for `zoneAt()` + `pressureRange()`.

```
GOAL
One vertical track (depth down, pressure in ppg across) on the shared depth axis, replacing the Plotly
PressureWindow in the cockpit. Mock-up: docs/design/mockups/4_engineer_view_cockpit.jpg (4th column).

READ FIRST: build.md §2; frontend/src/components/pressure/PressureWindow.tsx (reuse its ML-MW and "if unchanged"
logic — copy the maths, do not import Plotly).

FILES
- frontend/src/components/cockpit/pressure/PressureTrack.tsx
- frontend/src/components/cockpit/pressure/pressureModel.ts   (pure functions: series + zones, unit-tested)
- frontend/tests/unit/pressureTrack.test.ts

DRAW
- `derived.PP` red, `derived.FG` amber, `derived.FIT` amber dotted step at the shoe, `mud.MW_IN_PPG` cyan,
  `derived.ECD` green, ML-recommended MW (same source as PressureWindow) purple with its P10–P90 band.
- KICK SIDE: fill red where MW < PP. LOSS SIDE: fill amber where ECD > FG. Labels "KICK SIDE" / "LOSS SIDE".
- Below the bit, only in Act 2: `ghost.MW_UNCHANGED` vs forecast PP as dashed lines, labelled "if unchanged",
  with the overbalance value at the U3 top from get_well_status data already in the store.
- Header scale: x range from facts (min PP − margin … max FG + margin), computed, not typed.

ACCEPTANCE: at bit 4,172 m (T3 checkpoint) the kick-side zone is visible at U3 in "if unchanged"; at 4,222 m the
loss-side zone is visible. Unit tests cover the zone maths. Fact gate 0/0.
VERIFY: same frontend + gate commands as P-06; screenshots ?act=2 and ?act=4.
```

---

## P-08 · Act 3 action panel (mock-up #5)  — depends on WP-02, WP-05

```
GOAL
In Act 3 the centre + pressure columns become the action panel: memo document → APPROVED stamp → 4 fan-out
lanes → phone mirror → decision ledger. Mock-up: docs/design/mockups/5_engineer_view_act3.jpg.

READ FIRST: docs/API_CONTRACT.md §2.3–2.4 (endpoints + ShowState); frontend/src/components/actions/* (old version).

FILES
- frontend/src/components/cockpit/act3/{ActionPanel.tsx,MemoDoc.tsx,ApprovedStamp.tsx,FanoutLanes.tsx,PhoneMirror.tsx,DecisionLedger.tsx}
- frontend/src/api/actions.ts   (typed fetch wrappers for /api/actions/*, /api/ledger)
- frontend/tests/unit/act3.test.ts

BEHAVIOUR
- Everything is driven by ShowState from /ws/events (memo.status, channels[], ledger). No local fake timers
  for status. Animations only (stamp drop 300 ms, lane tick 180 ms).
- Lanes: mud_chemist, email, rtoc_chat, phone_push. Show the status chip exactly as the server says:
  DELIVERED (green), SIMULATED (grey, label "simulated – no credentials"), FAILED (red + detail). Never show
  DELIVERED for a SIMULATED channel.
- Memo body = body_md from the server (numbers come from there).
- Ledger = newest first, time · actor · action · ref · status.
ACCEPTANCE: pressing N through the Act 3 turns shows DRAFT → APPROVED → lanes resolve; with no Telegram token
phone_push shows SIMULATED. No area > 5 % empty at 1920×1080.
VERIFY: frontend commands + `node scratch/verify_acts.mjs` + screenshot ?act=3.
```

---

## P-09 · Act 4 + Shift notes ⇄ WCR  — depends on WP-02, WP-05

```
GOAL
Act 4 opens at facts.stratigraphy U3 top_m, shows the loss side, then a side-by-side view: left = shift
notes (DDR excerpts), right = the WCR draft generated by POST /api/wcr, with each WCR sentence linked
to its source note (hover highlights both).

FILES
- frontend/src/components/cockpit/act4/{Act4Stage.tsx,ShiftNotesWcr.tsx,SourceLink.tsx}
- frontend/src/api/wcr.ts
- frontend/tests/unit/act4.test.ts
Reuse ideas from frontend/src/screens/WcrViewer/* but do not edit those files.

RULES: shift notes come from the backend (GET via /api/tools/generate_wcr or /api/wcr sources), not from
frontend/public/mocks, except in offline mode. No overlapping cards; legend on one line.
ACCEPTANCE: opening Act 4 shows bit at the U3 top; the '-' hotkey opens the WCR view; every WCR paragraph has
≥ 1 source link. Fact gate 0/0.
VERIFY: frontend commands + screenshot ?act=4 (before and after pressing '-').
```

---

## P-10 · Basin map (offline basemap + labels)  — independent

```
GOAL
The map must look good with NO Google key: draw an offline coastline/land polygon for the Mahanadi offshore
area and avoid overlapping well labels.

FILES
- frontend/src/screens/BasinMap/{index.tsx,layers.ts,coastline.ts}
- frontend/public/geo/mahanadi_coast.geojson (new; simplified, < 200 KB; source: Natural Earth 1:10m land,
  public domain — note the source in a comment)
- frontend/tests/unit/basinLabels.test.ts

SPEC: land fill + coastline line + bathymetry-style gradient sea; wells from GET /api/wells; the live well pulses
and is clickable → /well/MN-SM-DW-01. Label collision: greedy placement (N, NE, E, SE, S…) and hide the lowest-priority
label if no slot fits; offsets always visible.
ACCEPTANCE: screenshot of / with no overlapping labels; no console errors without a key.
VERIFY: frontend commands + screenshot http://localhost:5173/.
```

---

## P-11 · Presenter console on show state  — depends on WP-05

```
FILES: frontend/src/screens/PresenterConsole/index.tsx, frontend/src/state/presenter.ts
SPEC: the presenter console reads ShowState from /ws/events and sends cmd messages (next_turn, goto_act, set_md,
approve, reset). Show: current act/turn, next turn text (Hindi + English), the expected tool calls, a
LIVE/SCRIPTED switch, and a big "NEXT" button. Two browser windows (stage + presenter) stay in sync.
ACCEPTANCE: pressing NEXT in the presenter advances the stage window within 300 ms.
VERIFY: frontend commands + a Playwright script with two pages (add as frontend/scratch/verify_presenter.mjs).
```

---

## P-12 · ML lithology fix + trained models  — independent (Opus reviews)

```
GOAL
(a) The ML lithology column must read shale in U1 (today ~40 % sand because the Larionov baseline is 115 API).
(b) Replace rule-based "ML" with small real models trained on synthetic offset wells.

FILES
- backend/app/ml/{features.py,lithology.py,kick_risk.py,explain.py}
- backend/app/scenario/baseline.py (only the lithology_volumes function)
- pipelines/ml/train_models.py (new), data/models/ (new artefacts, joblib)
- backend/tests/ml/test_models.py (new)

SPEC
- (a) GR clean / shale endpoints from YAML (hires block or stratigraphy gr ranges), not literals. U1 median
  vol.SHALE ≥ 0.75; U3 median vol.SAND ≥ 0.6.
- (b) Generate 5 offset wells with hires_well.py using different seeds / unit thickness from offsets.yaml; train
  RandomForest lithology (features: GR, RHOB, NPHI, PEF, RDEP, DT) and a gradient-boosting kick-risk model
  (features: DXC trend, DT − NCT, gas, ECD margin). Hold out 1 well. Report accuracy / AUC in the hand-back.
  Frame columns ml.litho.* and ml.p_kick then come from the models; column names do not change.
ACCEPTANCE: backend tests green; fact gate 0/0; hold-out lithology accuracy ≥ 0.85; mocks regenerated.
VERIFY: backend pytest; fact gate; generate_stub_frames.py; screenshot ?act=1.
```

---

## P-14 · Verification harness (Flash part)

```
FILES: frontend/scratch/verify_acts.mjs (extend), frontend/scratch/verify_cockpit.mjs (new)
SPEC: for each act 1–4: load, wait for data, assert no console errors, assert the bit line y equals the
wellbore bit y (±1 px), assert curves' last drawn depth ≤ bit (read data-last-md attributes set by tracks),
save screenshot to frontend/scratch/verify_act{N}.png, and print PASS/FAIL per check.
VERIFY: node scratch/verify_cockpit.mjs → all PASS.
```

---

## P-FT · Front-end fine-tuning batch A (FT-1, 2, 6, 7, 8, 10, 16) — independent, can start now

```
GOAL
Polish the new cockpit screen. Read build.md §1, §2 and §3.1 first. Do the items below in order; each is small.
Open the app: http://localhost:5173/well/MN-SM-DW-01?act=N (N = 1..4). Screenshots MUST use Playwright:
  cd frontend && node scratch/probe_cockpit.mjs <act> <out.png> [keys e.g. v,n]
(headless `google-chrome --screenshot` mis-measures this layout — do not use it.)

FILES (only these)
- frontend/src/components/cockpit/wellbore/WellboreColumn.tsx      (FT-1)
- frontend/index.html, frontend/public/favicon.svg (new)           (FT-2)
- frontend/src/components/cockpit/pressure/PressureTrack.tsx       (FT-6)
- frontend/src/components/cockpit/logs/MultiLog.tsx (GrTrack only) (FT-7)
- frontend/src/components/cockpit/palette.ts, frontend/src/design/theme.css (FT-8)
- frontend/src/components/timeline/Timeline.tsx                    (FT-10)
- frontend/src/components/whatif/WhatIfDrawer.tsx, frontend/src/components/audit/AuditDrawer.tsx (FT-16)
- frontend/tests/unit/pressureTrack.test.ts (new: tests for zoneAt() and pressureRange())

ITEMS
FT-1  Wellbore zoom: the KICK/LOSS offset label box overlaps the unit id text (U3) drawn at the right edge.
      Move unit ids to the left edge of the zoom area, or shift the event label so they never overlap.
FT-2  Add a small SVG favicon (drill-bit/triangle in the accent colour #22D3EE) and link it in index.html.
FT-6  Pressure track: move "◀ KICK SIDE" / "LOSS SIDE ▶" into the header strip area of the body top so they do not
      cross the PP line; give the "ML MW …" and "P10–P90 …" labels a dark rounded background pill for contrast.
FT-7  GR shading: compute the fill colour from a 1 m running mean of curves.GR (window = round(1 / grid.step_m)
      samples — read step from data.meta.grid.step_m), keep the GR line itself unsmoothed.
FT-8  Light theme (press T): make sure every canvas track, the wellbore SVG and the pressure track stay readable.
      Canvas colours come from usePalette(); fix any hard-coded dark colours in the files you own.
FT-10 Timeline: height 48 px; add small tick marks for each turn (bundle.turns[].md_m) and label the 4 act
      boundaries with the short act names used in cockpit/TopBar.tsx (copy the SHORT map, do not import).
FT-16 Press W and A: the drawers must open above the cockpit (z-index), not be clipped, and close with Esc.

ACCEPTANCE
- tsc + unit tests + build green; fact gate 0 errors / 0 warnings.
- Screenshots of act 1, 2, 4 (dark) + act 2 (light) + act 2 with W open → frontend/scratch/ft_*.png
- node scratch/flicker_probe.mjs still prints blank: 0.

VERIFY
cd frontend && npx tsc --noEmit -p . && npm test && npm run build
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml python pipelines/synth/fact_gate.py
cd frontend && node scratch/flicker_probe.mjs
```

---

## Review checklist (for Opus / owner when a hand-back arrives)
1. Only the listed files changed (`git status --short`).
2. Fact gate 0/0 and no ₹ (`grep -rn "₹\|crore" frontend/src backend/app`).
3. Curves stop at the bit (screenshot).
4. Numbers visible in the UI match YAML (spot-check 3).
5. Verify output pasted and green.
Then move the row to "Done log" in ACTIVE_DEBUGGING_AND_EXECUTION.md.
