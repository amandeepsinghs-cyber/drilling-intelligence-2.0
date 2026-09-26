# Drilling Intelligence 2.0 (Sagar Drishti) — Master Feature Inventory (`FEATURE_LIST.md`)

> **Executive Scope**: live demonstration for the ONGC Board of Directors on deepwater well `MN-SM-DW-01` (*Project Samudra Manthan*, Mahanadi Basin). All data is mock/synthetic — the demo shows the art of the possible. **No monetary figures anywhere.**
> **Where things live (v0.6):** plan = [`build.md`](build.md) (work packages WP-xx + fine-tuning backlog FT-xx) · ticks = [`checklist.md`](checklist.md) · in flight = [`ACTIVE_DEBUGGING_AND_EXECUTION.md`](ACTIVE_DEBUGGING_AND_EXECUTION.md) · Flash prompts = [`docs/FLASH_PLAYBOOK.md`](docs/FLASH_PLAYBOOK.md). Numbers authority: `data/scenario/*.yaml`. Architecture: [`docs/SDD.md`](docs/SDD.md).
> Sections 1–6 below are the original v0.5 inventory (descriptive; file names there may be superseded by the cockpit files in §0).

## 0. Feature status (v0.6, 2026-09-26) — read this first

Legend: ✅ built & verified · 🟡 built, needs polish · ⬜ not built · ✖ dropped (owner decision)

| # | Feature | Status | Package | Where in code |
|---|---|---|---|---|
| 1 | Cockpit layout #4 (wellbore · logs · pressure · agent on one depth axis, one bit line) | ✅ | WP-02 | `frontend/src/screens/CommandCenter/Cockpit.tsx`, `components/cockpit/*` |
| 2 | Top bar: 4-act stepper, LIVE/SCRIPTED, bit depth | ✅ | WP-02 | `cockpit/TopBar.tsx` |
| 3 | Wellbore: whole-well strip (casing from YAML) + to-scale zoom (caliper wall, bit, units, offset kick/loss) | 🟡 FT-1 | WP-03 | `cockpit/wellbore/WellboreColumn.tsx` |
| 4 | SAFIR multi-log input: GR·CALI, depth+tops, RHOB·NPHI·PEF crossover, RSHAL·RMED·RDEP log scale | ✅ | WP-06 | `cockpit/logs/MultiLog.tsx` |
| 5 | Output tracks (engineer view, key B): SW·SXO movable-HC fill, PHIE HC/water fill | ✅ | WP-06 | same |
| 6 | ML lithology 0–100 % with rock patterns | 🟡 U1 reads ~40 % sand (A-14) | WP-12 | `backend/app/ml/*`, frame `vol.*` |
| 7 | Mudlog cuttings column ending LAG m above the bit + "in transit" hatch | ✅ | WP-06 | `MultiLog.tsx › CuttingsTrack` |
| 8 | Pressure track: PP/FG/FIT/MW/ECD, kick side red, loss side amber, ahead-of-bit forecast, "if unchanged", ML MW + P10–P90 | 🟡 FT-6 | WP-07 | `cockpit/pressure/PressureTrack.tsx` |
| 9 | 6 KPI tiles per act + depth scrubber + play | ✅ flicker fixed | WP-02 | `wellpulse/WellPulse.tsx`, `timeline/Timeline.tsx` |
| 10 | Agent stage: Hindi-first caption, plain-words steps, evidence cards, idle "well at a glance" + example chips | ✅ | WP-04 | `components/agent/AgentPanel.tsx` |
| 11 | Gemini Live voice agent grounded in live bit depth (clarifying question, ETA, offsets, memo) | ✅ verified in UI | — | `backend/app/agent/*`, `frontend/src/live/*` |
| 12 | Hold-to-talk microphone | ✅ on `localhost`/https only (SSH tunnel) | — | `live/micCapture.ts` |
| 13 | RAG with citations (BM25); dense Hinglish embeddings | ✅ / ⬜ | WP-13 | `backend/app/rag/retriever.py` |
| 14 | MOC memo document with Approve | ✅ evidence cards (offset INC, offset WCR, SOP, live PP/FG) | WP-08 | `cockpit/act3/Act3ActionPanel.tsx`, `actions/MemoOverlay.tsx`, `agent/tools.py › create_moc_memo` |
| 15 | Act 3 action panel (#5): memo → APPROVED stamp → 4 lanes → phone mirror → ledger | ✅ LIVE + SCRIPTED | WP-08 | `cockpit/act3/Act3ActionPanel.tsx`, `state/turnMachine.ts › approveAndDispatch` |
| 16 | Honest channel status DELIVERED / SIMULATED / FAILED | ✅ | WP-05 | `agent/tools.py › dispatch_fanout`, `state/ledgerStore.ts › toChannelStatus` |
| 17 | Real phone push (Telegram) / phone call | ⏸ **parked by owner** (Argolis bot/credential risk) — lanes show SIMULATED by design; code path exists but stays off (no env keys) | owner | `agent/tools.py › _send_telegram` |
| 18 | Act 4: loss side at 4,222 + Shift notes ⇄ WCR side-by-side with source links | ✅ notes from `draft_shift_log`, hover → WCR section | WP-09 | `cockpit/act4/Act4ShiftWcr.tsx` |
| 19 | Backend REST (tools/actions/ledger/WCR) + show state on `/ws/events` | 🟡 `/api/tools/{name}` done; rest open | WP-05 | `backend/app/api/routes_actions.py` |
| 19b | Scripted fallback: chips / typed text → matching scripted turn | ✅ | FT-12 | `state/turnMachine.ts › askAgent` |
| 20 | Presenter console synced to the stage | 🟡 old | WP-11 | `screens/PresenterConsole/index.tsx` |
| 21 | Basin map: offline basemap, no label overlap, click → live well | 🟡 | WP-10 | `screens/BasinMap/*` |
| 22 | Trained ML models (RF lithology, kick risk) | 🟡 in progress | WP-12 | `backend/app/ml/*`, `data/models/*` |
| 23 | Takeaway card per act; "4 layers of AI" closing card | ✅ | FT-9 | `common/TakeawayCard.tsx`, `common/ClosingCard.tsx` |
| 24 | What-if and audit drawers (keys W, A) on new layout | ✅ | FT-16 | `whatif/*`, `audit/*` |
| 25 | Verification harness (per act, API, 15-turn Live, adversarial 5, soak, offline) | 🟡 probes exist | WP-14 | `frontend/scratch/*.mjs`, `backend/scratch/live_smoke.py` |
| 26 | 3D hero / cinematic stage | ✖ dropped ("theatre") | — | `well3d/*` unmounted |
| 27 | LAS-calibrated curves, DT Option A | ✖ parked (mock data accepted) | WP-15 | — |

---

## 1. Subsurface & LWD Telemetry Cockpit (SPWLA & SAFIR-03 Inspiration Layout)

- **Input vs. Output (ML Model) Composite Layout (`LogTracks.tsx`)**:
  - Structured after industry-standard composite logs (inspired by `SAFIR-03`):
    * **INPUT SECTION (Raw Telemetry)**: GR & Caliper, Multi-Depth Resistivity, Sonic Slowness (`DT`), and Density-Neutron (`CNCF / ZDEN`) with **yellow gas-sand crossover shading**.
    * **OUTPUT SECTION (Real-Time ML & Geomechanics)**: Dynamic Geopressure & ML Optimal Mud Weight Window, ML Lithology & Cumulative Mineralogy Ribbon, and Porosity/Fluid Partitioning.
  - **Horizontal Scroller (`overflow-x-auto min-w-[1400px]`)**: Enclosed in a smooth horizontal scroll pane, allowing all 8 comprehensive tracks to render with high fidelity on 1920×1080 displays without squishing curves.

- **Dynamic Geopressure & ML Optimal Mud Weight Window**:
  - **Pre-Drill & Real-Time Pore Pressure (PP)**: Calibrated against pre-drill basin geomechanical studies and updated in real-time via Eaton sonic departure and dxc trend reversal (10.95 → 11.48 ppg).
  - **Fracture Gradient (FG) & Casing Shoe FIT**: 13-3/8" shoe Formation Integrity Test line at 12.10 ppg, defining the critical upper loss boundary.
  - **Active Mud Weight (MW)**: Current system density (11.20 ppg / 1.34 SG).
  - **ML Optimal Recommended Mud Weight**: Continuous predictive model forecasting kick and fracture hazards in the upcoming zone:
    * Predicts: *"In the next zone at 4,195 m, pore pressure ramps to 11.48 ppg. Drilling at 11.20 ppg will cause an underbalanced gas kick. Raising mud weight too high will fracture the shoe at 12.10 ppg. Optimal ML recommended mud weight is **11.65 ppg (1.40 SG)**, providing +120 psi overbalance while maintaining circulating ECD at 11.84 ppg (safe by 0.26 ppg)."*
  - **Dynamic Green Safe Window Corridor**: Shaded green margin between Pore Pressure + safety trip margin and Shoe Fracture Gradient - surge margin.
  - **Annular Dynamic ECD**: Real-time equivalent circulating density (11.42 → 12.02 ppg) reflecting hole-cleaning cuttings load.

- **3-Act Narrative Architecture with Live Takeaway Badges**:
  - Integrated Act Navigation Bar at the top of the Command Center:
    * `[ 🟢 Act I: Real-Time ML Lithology & Borehole Q&A ]` (Takeaway: Eliminates 45-min mudlogging cuttings lag).
    * `[ 🔴 Act II: Offset Precedent & Human-in-the-Loop MOC ]` (Takeaway: Instant institutional memory).
    * `[ 🟡 Act III: Secondary Loss Defense & Autonomous WCR ]` (Takeaway: Shift notes to instant audit-ready WCR).


- **Real-Time Well Pulse KPI Ribbon (`WellPulse.tsx`)**:
  - Live digital readouts with explicit data provenance chips (`PUBLIC`, `SIMULATED`, `DERIVED`, `MODEL_INFERENCE`, `ASSUMED`).
  - Current Bit Depth & TVD (`4,172.0 m MD`).
  - Active Mud Weight (`11.20 ppg` / `1.34 SG`) and ML Recommended Mud Weight (`11.65 ppg` / `1.40 SG`).
  - Annular ECD & Margin to Shoe FIT (`11.42 ppg`, margin `+0.68 ppg`).
  - Pore Pressure & Overbalance (`11.22 ppg`, overbalance `-12 psi` / `+122 psi`).
  - Machine Learning Kick Risk Probability (next 30 m window): Real-time gauge leaping from 4% to **71%** upon entering the transition zone.
  - Distance to Geohazard Ruler (`23 m ahead` to top of overpressured Miocene sand at 4,195 m).

- **2.5D Schematic & 3D Offset View (`WellboreSchematic2D.tsx` & `Well3DView.tsx`)**:
  - SVG wellbore schematic detailing 13-3/8" casing shoe at 3,850 m MD, 12-1/4" open hole section, and BHA tool string.
  - Optional WebGL (React Three Fiber) 3D subsurface trajectory view showing offset wells `MN-DW-02` and `MN-DW-03` spatial proximity.

- **Dual Presentation Themes (`uiStore.ts`)**:
  - **Executive Light Mode**: Clean, high-contrast white aesthetic tailored for boardroom slide decks and well-lit executive presentations.
  - **Mission-Control Dark Mode**: Deep terminal aesthetic for high-intensity rig-floor simulation. Keyboard toggle (`T`).

---

## 2. Expanded LWD Telemetry Suite (Data Foundation)

Comprehensive petrophysical and geomechanical channels expanding beyond basic logs to enterprise deepwater standards:

| Category | Channel Mnemonics | Description | Units | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **Gamma Ray** | `GR`, `GR_UP`, `GR_DN` | Total, Upper, and Downward Azimuthal Gamma Ray | API | `PUBLIC` / `SYNTHETIC` |
| **Resistivity** | `RDEP`, `RMED`, `RSHAL` | Deep (40"), Medium (28"), and Shallow (16") Phase Resistivity | $\Omega\cdot\text{m}$ | `PUBLIC` / `SYNTHETIC` |
| **Acoustic Sonic**| `DT` / `DTC`, `DTSM`, `VPVS` | Compressional & Shear Acoustic Slowness, $V_p/V_s$ Ratio | $\mu\text{s/ft}$, ratio | `PUBLIC` / `DERIVED` |
| **Density/Neutron**| `RHOB`, `NPHI`, `PEF` | Bulk Density, Neutron Porosity, Photoelectric Absorption | $\text{g/cm}^3$, $\text{v/v}$, $\text{b/e}$ | `PUBLIC` / `SYNTHETIC` |
| **Petrophysics** | `PHIE`, `PHIT`, `SW` | Effective Porosity (24.2%), Total Porosity, Water Saturation (18%) | $\text{v/v}$ | `MODEL_INFERENCE` |
| **Formation Press**| `FPWD_PRES`, `MOBILITY` | Direct Formation Pressure while Drilling & Fluid Mobility | psi, mD/cP | `DERIVED` |
| **Drilling Dynamics**| `ROP`, `WOB`, `RPM`, `TORQUE`, `SPP`, `HKLD`, `DXC` | Mechanical drilling parameters & corrected d-exponent | m/hr, klbf, rpm, psi, klbf | `SIMULATED` |
| **Mud Hydraulics**| `MW_IN_PPG`, `MW_OUT_PPG`, `PV`, `YP`, `ECD`, `OVERBAL_PSI` | Active mud properties, Annular ECD, Overbalance margin | ppg, cP, $\text{lb/100ft}^2$, psi | `SIMULATED` / `DERIVED` |
| **Gas Chromatography**| `GAS_TOTAL`, `C1`, `C2`, `C3`, `C4`, `C5`, `CONN_GAS`, `GAS_WETNESS` | Hydrocarbon mud gas chromatograph breakdown & Wetness Ratio ($W_h$) | %, ppm, % | `SIMULATED` |

---

## 3. Gemini 3.8 Live Bilingual Voice Agent

- **Hands-Free Bidirectional Audio (`live_session.py`, `liveClient.ts`)**:
  - Low-latency WebSocket duplex audio streaming: 16 kHz PCM upstream microphone input, 24 kHz PCM downstream synthesized voice.
  - Push-to-talk hotkey (`Space`), mouse hold, or fully autonomous open-mic mode.
  - Natural audio barge-in (interruption handling): speaking immediately halts when the presenter interrupts.

- **Bilingual Rig-Floor Hinglish & English (`agent_system_prompt.md`)**:
  - Understands and speaks natural colloquial Hindi/Hinglish (*"Aur bhai kaisa chal raha hai?"*, *"Paas wale rig par kya complication aayi thi?"*).
  - Seamlessly code-switches to English technical drill-floor terminology (*"11.65 ppg (1.40 SG) kill mud"*, *"12 bbl kick with 236 psi SIDPP"*, *"annular preventer shut-in"*).
  - Boardroom-ready concise delivery: maximum 3 impactful sentences per answer unless detailed drill-down is requested.

- **Proactive Watchdog Trigger System (`watchdog.py`)**:
  - Continuous multi-sensor background monitoring: tracks dxc trend reversal, acoustic sonic departure ($\Delta t > 12\,\mu\text{s/ft}$ above NCT), and connection gas spikes.
  - **Turn 3 Proactive Alert at 4,172 m MD**: Voice agent interrupts unprompted with chime alert, warning the presenter that the well will become 200 psi underbalanced in 23 m.
  - **Turn 8 Offset Depth Warning at 4,195 m MD**: Proactive verification when reaching the exact depth where `MN-DW-02` kicked.
  - **Turn 9 Drilling Break & Loss Precedent at 4,205 m MD**: Proactive alert when ROP jumps from 12 to 34 m/hr, pushing ECD to 12.02 ppg (0.08 ppg from fracturing the 13-3/8" shoe).

---

## 4. Subsurface Inquiries: Lithology, Prospective Zone & Offset Complications

- **Lithology & Prospective Zone Prediction (Crescendo v2 T3, T4a/T4b)**:
  > ⚠️ Reservoir-quality numbers below are **not yet in the scenario YAML** and must be added (or dropped) before use; see `build.md` §4.C warning. ETA must be computed from YAML ROP.
  - *Query*: *"Hamara prospective zone (main pay sand) kab aayega, aur uski reservoir quality kaisi hai?"*
  - *Response*: Real-time ML XGBoost facies breakdown. Forecasts Miocene Unit U3 sand top at 4,195 m MD (~55 m / 1 hr 34 min ahead). Reports 82% clean quartz sand, 24.2% average porosity, ~180 mD permeability, 75 m gross section (0.84 net-to-gross), dry gas signature ($C_1 > 88\%$), and predicted Gas-Water Contact at 4,270 m.

- **Nearby Rig Complications & Mitigations Inquiry (Turn 4)**:
  - *Query*: *"Paas wale rig par—MN-DW-02 par—kahan complication aayi thi? Aur kya aayi thi, and how did they mitigate it?"*
  - *Response*: Deep retrieval from synthetic incident library:
    1. **MN-DW-02 (1.8 km East)**: 12 bbl gas kick at 4,195 m MD with 11.15 ppg mud against 11.48 ppg pore pressure (150 psi underbalanced); 236 psi SIDPP; 36.5 hrs NPT. Mitigated by shut-in on annular preventer, circulating out kick via choke manifold, and killing with 11.65 ppg (1.40 SG) mud under `ONGC-SM-SOP-04`.
    2. **MN-DW-03 (2.4 km SSE)**: Severe losses of 28 bbl/hr at 4,222 m MD when bit drilled unchecked at 26 m/hr; cuttings surged ECD to 12.18 ppg, exceeding the 12.10 ppg shoe FIT. Mitigated by pumping a 40 ppb LCM pill, squeezing the casing shoe, and mandating a 12 m/hr ROP cap.

---

## 5. Closed-Loop Governance, MOC & Multi-Channel Fanout

- **1-Click Management of Change (MOC) Memo (`MemoOverlay.tsx`)**:
  - Live drafting of formal memo `MEMO-SM-2026-09` specifying mud weight increase from 11.20 to 11.65 ppg.
  - Exact barite mass calculation live from active pit volume: 28.3 lb/bbl, 39.8 Metric Tonnes, 796 bags (50 kg each), +60 bbl volume increase.
  - Direct display of operational impact: **"36.5 hours NPT avoided"** (no monetary figures — owner decision).

- **Tamper-Evident Decision Ledger (`ledgerStore.ts`, `AuditDrawer.tsx`)**:
  - Immutable audit trail recording every recommendation, calculation, citation, and presenter approval timestamp.
  - Frozen physics snapshot at 4,172 m MD (ECD, pore pressure, sonic slowness, kick probability).

- **Multi-Channel Instant Fan-Out (`fanout.py`)**:
  - Simultaneous dispatch across enterprise channels:
    * Mud Chemist: Automated chemical addition work order `WO-MC-4172`.
    * RTOC Cockpit: Real-time mission control notification `RTOC-ALERT-884`.
    * Drilling Manager: Official email notification `EML-DM-4172`.
    * Superintendent Phone: Instant mobile push alert `PUSH-MOB-01`.

- **Automated Well Completion Report (WCR) & Lessons Write-Back (`WcrViewer.tsx`)**:
  - TD reached at 4,450 m MD.
  - Autonomous generation of formal Google Docs WCR (`WCR-MN-SM-DW-01`) summarizing full geomechanical history, mud consumption, and MOC records.
  - Automatic indexing of 2 newly learned operational lessons into the enterprise RAG lakehouse for future Mahanadi deepwater campaigns.

---

## 6. Enterprise GCP Data Lakehouse & Deployment Architecture

- **Google Cloud Storage (`gs://sagar-drishti-data/`)**:
  - Tiered lakehouse layout:
    * `raw/`: Original DLIS/LAS well logs and seismic velocity cubes.
    * `processed/`: Partitioned Parquet depth frames (0.5 m sampling).
    * `knowledge/`: 15 synthetic enterprise documents (SOPs, WCRs, DDRs, Incidents) + 15 rendered executive PDFs.
    * `embeddings/`: 59 semantic text chunks with 768-dim embeddings (`chunks_with_embeddings.json`).
- **Google BigQuery Analytics Engine (`drilling-intelligence-2-509714.drilling_intel.*`)**:
  - Columnar serving tables: `depth_frames`, `well_telemetry`, `mud_chemistry`, `decision_ledger`.
  - Mandatory enterprise resource attribution labels (`--label datacloud:jetski`).
- **Containerized Cloud Run Microservices**:
  - High-performance FastAPI backend with uvicorn and websockets.
  - Production React 18 / Vite frontend serving responsive RTOC Command Center.
