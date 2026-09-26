# Drilling Intelligence 2.0 — Master Brief & Architecture Specification (`brief.md` · v2.1)

> **v2.1 changes (stack lock-in):**
> - **Stack.** Front end is React + Vite + TypeScript + Tailwind + **Plotly.js**. Basin map is **Google Maps (dark vector) + deck.gl**, with a 2.5D wellbore schematic and an **optional R3F 3D offset-well view**.
> - **Voice and agent.** **Gemini 3.8 Live** voice via **ADK**; **Vertex AI RAG Engine** with Gemini embeddings.
> - **Data.** **IODP 348 C0002P** is the primary live-well analog, and **IODP 353 U1445A** is the Mahanadi authenticity asset.
> - **Local-first → GCP** data architecture.
> - **Design learnings** from EnergyFlow AI (§13).
> - **Companion docs:** [`docs/SDD.md`](docs/SDD.md) (design to follow), [`build.md`](build.md) (living build steps and data sources), [`checklist.md`](checklist.md).
>
> **v2.0 changes (from the board-readiness review):** (1) Physically consistent depth and pressure model: hazard moved from 2,838 m to **4,195 m MD**. (2) **Proactive, agent-led** well-control logic: weight up *before* the sand, then the loss side appears at the drilling break. (3) **Real public data with transparent provenance.** (4) **MOC/approval before dispatch**, with a single fan-out command. (5) Mobile alerts via **DLT-free push channel**. Full change log in §12. `verbatim.md` is unchanged.

---

## 1. Executive Summary & 30-Minute Room Strategy

* **The Stage Context**: A 30-minute executive session with the **ONGC Executive Board and industry experts**. Topic of the day: *AI in Exploration & Production*. Split: ~10 min narrative deck, **15 min live interactive show-and-tell**, 5 min Q&A.
* **The Presenter Posture**: Standing, calm, in control. One typed check-in at the laptop, then a **lapel mic + push-to-talk clicker**, conversing in **Hindi / rig-floor Hinglish**. On screen, live: real LWD and drilling curves, forward geomechanics, ML models, offset reports and SOPs, and closed-loop actions.
* **The One-Sentence Story**: *"An AI co-pilot that watches the well with you, warns you **before** trouble in your own language, remembers every offset well ONGC has ever drilled, and executes the paperwork, all with a human approval in the loop."*
* **The Hero Moment**: The agent **interrupts the presenter unprompted** ~23 m above a sand where an offset well took a kick. Minutes later the bit reaches that exact depth. The offset's kick replays as a **ghost curve** while the live well stays stable.
* **The 4-Layer AI Value Proposition**:
  1. **Language & Voice Layer**: Typed English → spoken Hindi/Hinglish via **Gemini Live API (native audio, barge-in, proactive speech)** with full borehole context. Optional: an invited expert asks in their own Indian language.
  2. **Physics + Machine Learning Layer**: Forward geomechanics (**Eaton pore pressure** in shales with **centroid transfer** to sands, **Matthews-Kelly FG** calibrated to the **shoe FIT**, **annular ECD**) plus ML (**lithology classifier**, **kick/loss probability detector**, **ROP optimiser**). The physics defines the window; the ML gives early warning within it.
  3. **Institutional Knowledge Layer (RAG)**: embedded corpus of **illustrative Mahanadi offset WCRs, incident reports, DDRs, mud programs and SOPs** (synthetic, fact-validated), optionally enriched with **real public DDRs / well reports** (Equinor Volve, IODP proceedings). Page-level citations. Legacy scanned-paper ingestion is shown live.
  4. **Closed-Loop Agentic Action Layer**: Recommendation → **MOC / Deviation Memo** → **named human approval** → **one fan-out** (Mud Chemist, RTOC, Email, Mobile push) → audit trail → **First-Draft WCR** at TD, with lessons written back to the knowledge base.

---

## 2. Project, Cloud & Tech Stack Metadata

| Attribute | Specification |
| :--- | :--- |
| **GitHub Repository** | `https://github.com/amandeepsinghs-cyber/drilling-intelligence-2.0` |
| **GCP Project ID** | `drilling-intelligence-2-509714` |
| **GCP Region (data residency)** | **`asia-south1` (Mumbai)** primary; `asia-south2` (Delhi) as the DR talking point |
| **Verbatim Reference** | [`verbatim.md`](file:///usr/local/google/home/amandeepsinghs/O%26G_slidedeck_agentic_transformation/Oil%20%26%20Gas%20Agent%20Portfolio/cloud_run_apps/Drilling-Intelligence-2.0/verbatim.md) (word-for-word transcript of all 4 audio recordings) |
| **Frontend Stack** | **React 18 + Vite + TypeScript + Tailwind + Zustand + Framer Motion**. **Plotly.js (WebGL `scattergl`)** for log tracks, pressure window and what-if charts. **Google Maps JS API (cloud-styled dark vector) + deck.gl `GoogleMapsOverlay`** for the basin map. SVG 2.5D wellbore schematic. **Optional React-Three-Fiber 3D offset-well view** (toggle) |
| **Voice** | **Gemini Live API on Vertex AI: `Gemini 3.8 Live`** (native audio, barge-in, **asynchronous function calling**, auto language detection incl. Hindi). `Gemini 3.8 Live Extended Thinking` is optional for deep-reasoning turns. **Pin the exact model ID at build time.** Fallback: **Cloud STT/TTS Chirp 3 (Hindi)** |
| **Agent Orchestration** | **Agent Development Kit (ADK)** with bidi-streaming. Runs on Cloud Run (option: Vertex AI Agent Engine) |
| **Reasoning / Generation** | **Gemini 3.x (latest GA Pro for WCR, Flash for fast turns)** with structured JSON output |
| **Backend** | **Python 3.12 (FastAPI)**, a deterministic **Scenario Engine** (single source of truth for every number), physics engine, and tool/function endpoints |
| **ML** | `scikit-learn` / **XGBoost**: lithology classifier, kick/loss probability detector, ROP optimiser. **SHAP** explanations |
| **Knowledge Base (RAG)** | Local: **Gemini embeddings → `chunks_with_embeddings.json`** + NumPy cosine search. GCP: **Vertex AI RAG Engine** (+ Vertex ranking). Page/section-level citations |
| **Data Layer** | Local: **Parquet + DuckDB**. GCP: **BigQuery** (4 logical stores) + **GCS** (raw files) + **Firestore** (live state, Decision Ledger, presenter sync). Switched by `DI_ENV=local\|gcp` adapters |
| **Action Integrations** | In-app **Mud Chemist Console** & **RTOC Console**, **Email** (Gmail API / SMTP), **Mobile push via Telegram Bot API** (primary, instant, no DLT), **Google Chat webhook** (secondary), **DLT-registered SMS** (optional, only if a registered sender ID and template exist) |

> [!IMPORTANT]
> **Indian SMS rule:** Commercial SMS to Indian numbers requires **TRAI DLT** sender-ID and template registration. Without it, Twilio-style messages may be blocked or delayed. The phone buzz on stage therefore uses **Telegram push** by default.

---

## 3. Geological & Basin Grounding: Mahanadi Deepwater (*Samudra Manthan*) + Carbonate Option

The scenario is an **illustrative** Mahanadi deepwater well aligned with the national deepwater exploration mission (*Samudra Manthan*). An optional **Mumbai High carbonate** offset is available for comparison. Well and block identifiers are **fictional**, and no real ONGC personnel or real well names are used.

### A. Primary Live Well: `MN-SM-DW-01` (illustrative)
* **Setting**: Mahanadi offshore deepwater, Bay of Bengal slope, ~110 km off Odisha. **Ultra-deepwater drillship.**
* **Water Depth**: `1,620 m`. **Air gap (RKB–MSL)**: `25 m`. **Well profile**: near-vertical (MD ≈ TVD in the interval of interest).
* **Casing**: 13⅜" shoe at `3,850 m MD`. **FIT at shoe = `12.10 ppg EMW (1.45 SG)`**. This is the hard loss limit.
* **Active hole section**: 12¼", **SOBM** (synthetic oil-based mud).
* **Live demo interval**: `4,120 m → TD 4,450 m MD`.
* **Stratigraphy & Log Character**:
  1. **`4,000 – 4,150 m`**: *Upper Miocene compact marine shale & silty claystone* (seal). GR `95–115 API`, Rdeep `2.2–3.5 Ω·m`, on the normal compaction trend (NCT).
  2. **`4,150 – 4,195 m`**: *Miocene transition zone*: interbedded calcareous siltstone, thin limestone/dolomitic stringers, **overpressured prodelta shale**. Corrected d-exponent (**dxc**) reverses. **DT rises `88 → 108 µs/ft`** and Rdeep falls below the NCT. Connection and background gas trend up.
  3. **`4,195 – 4,290 m`**: *Main pay: Miocene slope-channel turbidite sandstone*. Clean, blocky to fining-upward. GR `38–52 API`, Rdeep `28–45 Ω·m` in the hydrocarbon-bearing sand. **Drilling break** (ROP jumps). High kick sensitivity at the top of the sand.
  4. **`4,290 – 4,460 m`**: *Basal Miocene / Oligocene argillaceous limestone & dolomitic mudstone*. Hard marker: ROP drops, torque rises. **TD / casing point at `4,450 m`.**

### B. Pressure Model Sanity Check (why these numbers are physically consistent)

```
Sediment below mudline at 4,195 m ≈ 4,195 − 1,620 − 25 ≈ 2,550 m (avg bulk density ~2.1 g/cc)
OBG ≈ (1,620 × 1.03 + 2,550 × 2.1) / 4,195 ≈ 1.67 SG ≈ 14.0 ppg
PP (sand top) = 11.48 ppg (1.38 SG)  <  FIT 12.10 ppg (1.45 SG)  <  OBG ~14.0 ppg   ✅
```

* **Pore pressure** is computed by **Eaton in the shales** (from sonic/resistivity deviation off the NCT). **Sand pressure** at the top of the channel sand comes from **centroid / lateral-transfer** correction. That is why the sand can be more pressured than the adjacent shale trend suggests.
* **Fracture gradient**: the continuous curve is **Matthews-Kelly**. The **governing limit** is the **13⅜" shoe FIT (12.10 ppg)**.
* **Why the window is "both-sides-sensitive"**: the deep water column lowers the overburden, which caps the FG. Rapid Mio-Pliocene deposition traps fluids in the channel sands, which raises the PP.

```
   10.95 ppg               11.48 ppg          12.10 ppg              ~14.0 ppg
 (1.31 SG)                (1.38 SG)           (1.45 SG)              (1.68 SG)
──────┼───────────────────────┼──────────────────┼──────────────────────┼──────► EMW
      │  shale PP (normal)    │  🟢 SAFE WINDOW  │  🔴 LOSSES (shoe FIT) │ Overburden
      │   🔴 KICK if MW <     │   0.62 ppg only  │  if ECD >             │
      │   sand PP at 4,195 m  │                  │                       │
```

### C. Scenario Numbers (single source of truth: the Scenario Engine)

| Quantity | Before (4,120 m) | Warning point (4,172 m) | Sand top (4,195 m) | Drilling break (4,205 m) | After ROP cap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Static MW** | 11.20 ppg (1.34 SG) | 11.20 → **11.65 ppg (1.40 SG)** | 11.65 (1.40 SG) | 11.65 | 11.65 |
| **ECD** | 11.42 (1.37 SG) @ 22 m/hr | circulating | 11.84 (1.42 SG) @ 12 m/hr | **12.02 (1.44 SG) @ 34 m/hr** ⚠️ | **11.86 (1.42 SG) @ 12 m/hr** ✅ |
| **PP** | 10.95 (1.31 SG) | forecast ramp to **11.48 at 4,195 m** | 11.48 (1.38 SG) | 11.48 | 11.48 |
| **Loss limit** | 12.10 FIT | 12.10 | 12.10 | margin only 0.08 ppg | margin 0.24 ppg |
| **Overbalance (static)** | n/a | would be **−0.28 ppg ≈ −200 psi** at 11.20 | **+0.17 ppg ≈ +120 psi** | +0.17 | +0.17 |
| **ML kick probability (next 30 m)** | 0.04 | **0.71 if MW left at 11.20** | 0.06 | 0.05 | 0.04 |

* **Barite for the weight-up (Agent calculates live from `db_mud_chemistry`)**:
  * Additive rate: `1470 × (11.65 − 11.20) / (35 − 11.65)` ≈ **28.3 lb/bbl**.
  * Active circulating system (surface pits + ~1,950 bbl riser + casing and open hole) ≈ **3,100 bbl**.
  * **Barite ≈ 87,700 lb ≈ 39.8 MT ≈ 796 × 50-kg bags.**
  * **Volume gain from barite ≈ 60 bbl.** The watchdog must account for this so it is **not mistaken for a pit gain**.
* **SOBM kick-detection caveat (the agent says this)**: gas dissolves in synthetic oil-based mud, so pit gain can lag. The watchdog therefore weights **flow-out delta, connection/background gas, SPP and dxc** above pit volume alone.
* **Time compression**: the weight-up is done over ~1.5 circulations with drilling suspended at 4,172 m (≈3 hrs in reality). The demo slider compresses this, and the UI says so.

---

## 4. Real Public Data, Forward Models & ML Suite

### A. Data Sources & Provenance (no synthetic sine waves; transparent labelling)

| Dataset | Use in Demo | Licence / Access | Notes |
| :--- | :--- | :--- | :--- |
| **IODP Exp. 348, Hole C0002P** (D/V *Chikyu*, Nankai Trough) — **PRIMARY** | **Live-well stream**: a riser-drilled deepwater well (~1.9 km water, ~3 km below seafloor; verify in the readme) with **LWD** through Mio-Pliocene turbidite / hemipelagic sequences | **CC0**, Zenodo record `3942008` (~979 MB) | Depth-register to the §3 interval and rename the formations only. **Curve values are never edited.** Drilling mechanics and mud-log channels are synthesised where absent (labelled *Simulated*) |
| **IODP Exp. 348, Hole C0002N** | Small companion dataset for quick loader tests | **CC0**, Zenodo `3942006` (~4 MB) | Use first to validate the LAS/DLIS loader |
| **IODP Exp. 353, Hole U1445A (Mahanadi Basin)** | **Map opener**: *"This curve is a real log from the Mahanadi Basin."* Also the shallow-hazard / top-hole context | **CC0**, Zenodo `5668873` (~1.03 GB) | Shallow scientific hole. Used for authenticity and the top-hole section |
| **FORCE 2020 Lithology** (~118 Norwegian wells) | **Train and validate the lithology classifier**. Show the real hold-out F1 score | NOLD 2.0 (open), GitHub | Mostly wireline curves. On stage say "trained on 100+ offset wells" |
| **Equinor Volve** — *optional* | **Real DDRs / final well reports** as public-precedent text in the RAG; WITSML drilling channels if needed | Equinor Open Data Licence (via Equinor portal) | Not reachable by script from Cloudtop. Manual download |
| **NGHP-02 (2015), KG + Mahanadi LWD** | **Not used.** Positioned as **pilot data** via DGH's National Data Repository | DGH / NDR (restricted) | This is the "with your data" hook for the closing ask |
| Illustrative Mahanadi offset WCRs, SOPs, incident reports, DDRs | RAG institutional memory (§5) | **Synthetic**, generated from `data/scenario/*.yaml` facts, labelled **(illustrative)** | A fact-validator guarantees the numbers match §3C |

* **On-screen provenance footer (always visible)**:
  > *"Petrophysical data: real public logs (IODP / FORCE 2020, CC0 / NOLD), depth-registered to an illustrative Mahanadi deepwater scenario. Drilling, mud-log and chemistry channels, offset reports & SOPs are simulated. Plug-in to ONGC data = pilot scope."*
* **`data/DATA_PROVENANCE.md`** (required): source, wellbore, original depth range, shift applied, curves used, licence and attribution text.

### B. Log Display (board-first, expert-deep)
* **Default view: 4 tracks** (clean for executives):
  1. **GR (API)** with lithology shading.
  2. **Resistivity** (RDEP / RMED, log scale 0.2–200 Ω·m).
  3. **Pressure Window (ppg with SG secondary axis)**:
     * PP (red dashed, Eaton + centroid).
     * FG (orange dashed, Matthews-Kelly) with the **shoe FIT line at 12.10**.
     * Planned MW (grey dashed).
     * Static MW and live ECD (cyan / emerald solid).
     * ML-recommended MW band (magenta).
     * **Offset MN-DW-02 ghost curve** (translucent).
  4. **ML Lithology column** with class probabilities.
* **"Expand to full suite" (for experts)**:
  * Caliper / SP.
  * RHOB–NPHI crossover and DT.
  * **Drilling mechanics**: ROP, WOB, RPM, torque, SPP, hookload, **dxc**.
  * **Mud logging**: total gas, C1–C5, connection gas, MW in/out, **flow-out delta**, pit volume.
* **Always-on widgets**:
  * **Distance-to-hazard countdown** ("Offset kick depth in 23 m").
  * **Overbalance gauge** (ppg / psi).
  * **ECD-to-FIT margin gauge**.
  * **What-if slider** (ROP and MW → ECD, live).

### C. Forward Models vs. ML Models

| Category | Model | Inputs | Live Output |
| :--- | :--- | :--- | :--- |
| **Forward 1** | **Eaton pore pressure (shale) + centroid transfer (sand)** | DT, Rdeep, dxc, NCT, overburden σv, sand geometry | PP (ppg / SG), predicted **PP ramp ahead of the bit**, kick margin |
| **Forward 2** | **Matthews-Kelly FG + shoe FIT calibration** | σv, PP, K₀(z), FIT | FG curve and the **governing loss limit** |
| **Forward 3** | **Annular hydraulics / ECD** | MW, PV, YP, GPM, **ROP (cuttings loading)**, hole and pipe geometry | Live ECD. Drives the **what-if slider** |
| **ML 1** | **XGBoost / RF lithology classifier** (trained on FORCE 2020) | GR, RDEP, RHOB, NPHI, DT, PEF, ROP | Facies with probabilities, plus **SHAP** "why" |
| **ML 2** | **Kick / loss probability detector** (gradient boosting + anomaly detection) | Flow-out delta, pit volume, SPP, connection gas, dxc, ECD margin, offset event labels | **P(kick) and P(loss) over the next 30 m** |
| **ML 3** | **ROP optimiser within the window** | ECD model, lithology, hole cleaning | **Maximum safe ROP** that keeps ECD ≤ FIT − 0.2 ppg |

> **Framing on stage:** *"Physics draws the safe window. ML gives early warning and optimises inside it. The agent explains both, and a human approves."*

---

## 5. Multi-Database Architecture & RAG Knowledge Base

Four logical operational stores in BigQuery, with a Parquet mirror for offline mode. All four are synthesised into the First-Draft WCR at TD.

1. **`db_lwd_logs`**: 0.5 m petrophysical curves (GR, RDEP, RMED, RHOB, NPHI, DT, PEF), plus ML lithology and forward-model outputs.
2. **`db_drilling_mudlog`**: ROP, WOB, RPM, torque, hookload, SPP, flow-in/out, dxc, total gas, C1–C5 ppm, connection gas, lagged cuttings description.
3. **`db_mud_chemistry`**: mud type (SOBM), MW in/out (ppg & SG), funnel viscosity, PV, YP, electrical stability, water-phase salinity, **barite used (MT / bags)**, **active system volume (bbl)**, pit volumes.
4. **`db_rag` (Institutional Memory)**:
   * **Real public corpus (optional enrichment)**: **Volve daily drilling reports & final well reports** and **IODP Exp. 348 / 353 proceedings** (operations and drilling chapters). Source shown in the citation.
   * **Illustrative Mahanadi offset reports**:
     * `WCR-MN-DW-02 (illustrative)`: 1.8 km away. **12-bbl gas kick at 4,195 m** at the top of the Miocene channel sand with 11.15 ppg (1.34 SG) mud. SIDPP ≈ 236 psi, giving a formation pressure of ≈ 11.48 ppg. Killed and weighted up to **11.65 ppg (1.40 SG)**. ROP restricted to **11–12 m/hr** through the sand.
     * `WCR-MN-DW-03 (illustrative)`: **Partial losses of 28 bbl/hr at 4,222 m** when **ECD reached 12.18 ppg** during a drilling break at **26 m/hr** without an ROP cap or hole-cleaning sweeps.
     * `WCR-MH-112 (illustrative)`: Mumbai High carbonate reference (vuggy losses, differential sticking).
   * **Illustrative SOPs**:
     * `ONGC-SM-SOP-04 (illustrative)`: *Deepwater Narrow-Window Drilling: Pre-emptive Weight-Up, Flow-Check Triggers, ROP Cap at Drilling Breaks*.
     * `ONGC-MC-SOP-02 (illustrative)`: *Barite Weight-Up, Rheology Check, Barite-Volume Logging & Mud Chemist Sign-Off*.
     * `ONGC-MOC-SOP-07 (illustrative)`: *Mud Program Deviation: Management of Change & Approval Authority*.
     * `ONGC-WCR-SOP-09 (illustrative)`: *End-of-Well Completion Report Compilation (structured to mirror the DGH/NDR WCR submission; confirm against the DGH template)*.
   * **Legacy paper demo asset**: one **scanned, handwritten 1990s-style DDR page** (synthetic), ingested live with Gemini multimodal (§8).
* **Citations**: every RAG answer shows **document, section and page**. Clicking opens the source chunk.

---

## 6. Complete Stage Run-of-Show: Map Entry + 10 Agent-Led Turns

### Stage Opening — Screen 1: Interactive Offshore Basin Map (`0:00 – 1:00`)
1. Full-screen **Indian offshore map**: Mahanadi deepwater, KG, Mumbai High.
2. **Authenticity beat**: hover over the IODP Site U1445 marker to show a small real log strip. *"Yeh Mahanadi basin ka asli log hai."* ("This is a real log from the Mahanadi basin.")
3. Wells: `MN-DW-01 [Completed]`, `MN-DW-02 [Offset — Kick @ 4,195 m]`, `MN-DW-03 [Offset — Losses @ 4,222 m]`, **`MN-SM-DW-01 [🔴 LIVE — 4,120 m MD]`**.
4. Click the live well to open its summary card, then **`[🚀 Open Live LWD & AI Command Center]`** to go to Screen 2.

---

### Screen 2 — The Live Conversation (`1:00 – 15:00`)

#### Turn 0 — Typed English Warm-Up (`4,120 m`)
* **You type**:
  > *"Hey, I hope everything is going okay. Give me a quick check on the well."*
* **Agent (text + voice)**:
  > *"All good on MN-SM-DW-01. We're drilling 12¼-inch hole at 4,120 m MD in the Upper Miocene marine shale. ROP 22 m/hr, mud weight 11.20 ppg (1.34 SG), ECD 11.42 ppg. Pore pressure 10.95 ppg, and the shoe FIT limit is 12.10 ppg. Lithology and kick-risk models are normal."*

---

#### Turn 1 — Switch to Hindi Voice: Arm the Predictive Watchdog (`4,120 m`)
* **You say**:
  > **"Aur bhai kaisa chal raha hai? Mujhe bata dena jab kuch bhi gadbad hone wali ho. Agar kuch bhi off lage to pehle hi bata dena. Theek hai?"**
  > *(और भाई कैसा चल रहा है? मुझे बता देना जब कुछ भी गड़बड़ होने वाली हो। अगर कुछ भी ऑफ लगे तो पहले ही बता देना। ठीक है?)*
  > *("So how's it going? Tell me when anything is about to go wrong. If anything looks off, tell me early. Okay?")*
* **Agent says**:
  > *"Bilkul Sir! Main LWD, drilling parameters, mud gas aur mud chemistry ko lagataar dekh raha hoon — aur offset wells se compare bhi kar raha hoon. Gadbad hone se pehle hi aapko bata dunga."*
  > *("Absolutely, Sir! I'm continuously watching the LWD, drilling parameters, mud gas and mud chemistry, and comparing against the offset wells. I'll tell you before anything goes wrong.")*
* **Screen**: Voice orb switches to `🟢 PREDICTIVE WATCHDOG ARMED`.

---

#### Turn 2 — Status & Live ML Lithology (`4,140 m`)
* **Action**: Advance the slider from 4,120 to 4,140 m.
* **You say**:
  > **"Thoda batayenge abhi well ke andar kya chal raha hai? ML model kya lithology dikha raha hai?"**
  > *(थोड़ा बताएंगे अभी वेल के अंदर क्या चल रहा है? ML मॉडल क्या लिथोलॉजी दिखा रहा है?)*
  > *("Can you tell me what's happening inside the well right now? What lithology is the ML model showing?")*
* **Agent says**:
  > *"Sir, 4,140 meter par hum abhi bhi Upper Miocene marine shale mein hain — ML model 91% confidence se shale dikha raha hai. Gamma Ray 105 API, resistivity normal compaction trend par hai. Mud weight 1.34 SG, sab stable hai."*
  > *("Sir, at 4,140 m we're still in the Upper Miocene marine shale. The ML model shows shale with 91% confidence. Gamma ray is 105 API and resistivity is on the normal compaction trend. Mud weight 1.34 SG, everything stable.")*
* **Screen**: SHAP mini-bar shows GR and RHOB–NPHI as the top drivers.

---

#### Turn 3 — 🔔 THE AGENT INTERRUPTS, UNPROMPTED (`4,172 m`) — *Hero Moment #1*
* **Action**: Advance to 4,172 m. **Before the presenter speaks**, the agent breaks in.
* **Agent says (proactive)**:
  > *"Sir, ek minute — dhyaan dijiye. 4,160 meter se d-exponent reverse ho raha hai, sonic 88 se 101 tak badha hai aur resistivity trend se neeche gir rahi hai — connection gas bhi 0.4 se 1.1 percent. Eaton model ke hisaab se aage lagbhag 23 meter par, 4,195 meter par, pore pressure 11.48 ppg tak jaayega. Aur isi depth par offset well MN-DW-02 mein 12-barrel gas kick aayi thi. Agar hum 11.20 par hi chalte rahe, to wahan 200 psi underbalanced honge."*
  > *("Sir, one minute, please pay attention. From 4,160 m the d-exponent is reversing, sonic has risen from 88 to 101 and resistivity is dropping below the trend. Connection gas is also up from 0.4 to 1.1 percent. By the Eaton model, about 23 m ahead, at 4,195 m, pore pressure will rise to 11.48 ppg. And at this same depth offset well MN-DW-02 took a 12-barrel gas kick. If we carry on at 11.20, we'll be 200 psi underbalanced there.")*
* **Screen**:
  * Alert banner.
  * **Distance-to-hazard: 23 m.**
  * **MN-DW-02 ghost curve** fades in on the pressure track.
  * ML P(kick) = **0.71** if MW stays unchanged.

---

#### Turn 4 — Institutional Memory: Offsets & SOP (`4,172 m`)
* **You say**:
  > **"Pichhle wells mein is zone ke paas kya hua tha? WCR aur SOP mein kya likha hai?"**
  > *(पिछले वेल्स में इस ज़ोन के पास क्या हुआ था? WCR और SOP में क्या लिखा है?)*
  > *("What happened near this zone in the earlier wells? What do the WCR and SOP say?")*
* **Agent says**:
  > *"Sir, do sabak hain. Pehla — MN-DW-02 mein 4,195 meter par 11.15 ppg mud ke saath kick aayi thi; unhe 11.65 tak weight-up karna pada. Doosra — MN-DW-03 mein jab sand mein drilling break aaya aur 26 meter per hour se drill kiya, to ECD 12.18 tak gaya aur 28 barrel per hour losses hue. Isliye SOP-04 kehta hai: sand se pehle hi weight-up karo, aur drilling break par ROP cap lagao."*
  > *("Sir, there are two lessons. First: in MN-DW-02 there was a kick at 4,195 m with 11.15 ppg mud, and they had to weight up to 11.65. Second: in MN-DW-03, when the drilling break came in the sand and they drilled at 26 m/hr, ECD reached 12.18 and they had losses of 28 barrels per hour. That's why SOP-04 says: weight up before the sand, and put an ROP cap on at the drilling break.")*
* **Screen**: RAG panel shows **three citation cards with page refs**: `WCR-MN-DW-02`, `WCR-MN-DW-03`, `ONGC-SM-SOP-04`. Optionally, one **real public DDR / proceedings excerpt** (Volve or IODP) is shown as corroborating industry precedent, with its source caption.

---

#### Turn 5 — Agent Recommends; Presenter Asks for the Memo (`4,172 m`)
* **Agent says (continuing)**:
  > *"Meri salah: drilling rok kar circulate karte hue mud weight 1.34 se 1.40 SG, yaani 11.65 ppg karein. Isse sand par 120 psi overbalance milega, aur ECD 11.84 rahega — shoe FIT 12.10 se safe. Iske liye lagbhag 40 MT barite, yaani qareeb 800 bags chahiye. Barite se lagbhag 60 barrel volume badhega — main use pit gain nahi maanunga. Yeh mud program se deviation hai — kya main MOC memo bana doon?"*
  > *("My advice: stop drilling and, while circulating, raise mud weight from 1.34 to 1.40 SG, that is 11.65 ppg. That gives 120 psi overbalance at the sand, and ECD stays at 11.84, safe against the 12.10 shoe FIT. It needs about 40 MT of barite, roughly 800 bags. The barite will add about 60 barrels of volume, and I won't count that as a pit gain. This is a deviation from the mud program. Shall I prepare the MOC memo?")*
* **You say**:
  > **"Haan, memo bana do."**
  > *(हाँ, मेमो बना दो।)*
  > *("Yes, prepare the memo.")*

---

#### Turn 6 — MOC / Deviation Memo & Human Approval (`4,172 m`)
* **Agent says**:
  > *"Memo MEMO-SM-2026-09 aapki screen par hai — Eaton forecast, offset evidence, barite calculation aur SOP-04 reference ke saath. Approval ke liye taiyaar hai."*
  > *("Memo MEMO-SM-2026-09 is on your screen, with the Eaton forecast, offset evidence, barite calculation and the SOP-04 reference. It's ready for approval.")*
* **Screen**: Memo card with a `[Awaiting Approval — Drilling Superintendent]` stamp.
* **You say** (or tap Approve on your phone):
  > **"Approved."**
* **Screen**: The stamp flips to `✅ APPROVED — <Name/Role>, <timestamp>`. An audit-trail entry is created.

---

#### Turn 7 — One Fan-Out Command: Chemist + RTOC + Email + Phone (`4,172 m`)
* **You say**:
  > **"Ab sabko bata do — Mud Chemist ko weight-up ka instruction, Onshore base ko update, Drilling Manager ko email, aur mere phone par alert bhej do."**
  > *(अब सबको बता दो — मड केमिस्ट को वेट-अप का इंस्ट्रक्शन, ऑनशोर बेस को अपडेट, ड्रिलिंग मैनेजर को ईमेल, और मेरे फ़ोन पर अलर्ट भेज दो।)*
  > *("Now tell everyone: the weight-up instruction to the Mud Chemist, an update to the onshore base, an email to the Drilling Manager, and an alert to my phone.")*
* **Agent says**:
  > *"Ho gaya Sir. Mud Chemist ko Priority-1 instruction: SOBM 1.34 se 1.40 SG, 40 MT barite, YP 18 maintain, barite volume log karein, har 15 minute flow-out aur gas report. RTOC ko status alert, Drilling Manager ko memo aur log snapshot ke saath email, aur aapke phone par alert bhej diya hai."*
  > *("Done, Sir. Priority-1 instruction to the Mud Chemist: SOBM from 1.34 to 1.40 SG, 40 MT barite, maintain YP 18, log the barite volume, and report flow-out and gas every 15 minutes. Status alert sent to the RTOC, email to the Drilling Manager with the memo and a log snapshot, and an alert sent to your phone.")*
* **Screen**: Four dispatch cards light up green with IDs and timestamps (`MC-SM-4172`, `RTOC-4172`, `EMAIL-4172`, `PUSH-4172`). **The presenter's phone buzzes live** (Telegram push).
  > Push text: `[MN-SM-DW-01] 4,172m: PP ramp forecast to 11.48 ppg @ 4,195m (offset kick depth). MOC approved: MW 1.34→1.40 SG, ROP cap at sand. Well stable.`

---

#### Turn 8 — 🎯 The Bit Reaches the Offset Kick Depth (`4,195 m`) — *Hero Moment #2*
* **Action**: The slider notes the weight-up is complete (time-compressed), then advances to 4,195 m. GR drops to 44 API and Rdeep rises into the sand. The **ghost curve replays MN-DW-02's kick** (pit gain spike) while the live well stays flat.
* **Agent says (proactive)**:
  > *"Sir, yahi woh depth hai — 4,195 meter — jahan pichhle well mein kick aayi thi. Hum Miocene channel sand mein enter kar chuke hain, aur 1.40 SG mud ke saath 120 psi overbalanced hain. Flow-out aur gas normal hain. Well stable hai."*
  > *("Sir, this is the depth, 4,195 m, where the earlier well took a kick. We've entered the Miocene channel sand, and with 1.40 SG mud we're 120 psi overbalanced. Flow-out and gas are normal. The well is stable.")*

---

#### Turn 9 — The Other Side of the Window: Drilling Break → Loss Risk (`4,205 m`)
* **Action**: ROP jumps from 22 to **34 m/hr** in the clean sand (drilling break). **ECD climbs to 12.02**, only 0.08 below the FIT.
* **Agent says (proactive)**:
  > *"Sir, ab doosri taraf ka khatra hai. Sand mein drilling break aaya hai — ROP 34 ho gaya, aur cuttings loading se ECD 12.02 par hai, shoe FIT 12.10 ke bilkul paas. MN-DW-03 mein isi tarah losses hue the."*
  > *("Sir, now the risk is on the other side. There's a drilling break in the sand: ROP is up to 34, and with the cuttings load ECD is at 12.02, right next to the 12.10 shoe FIT. MN-DW-03 had losses in exactly this situation.")*
* **You say**:
  > **"Thoda dheere kar lo. Yahan pe dheere-dheere jayenge to better hai, aur mud observe karte rehna."**
  > *(थोड़ा धीरे कर लो। यहाँ पे धीरे-धीरे जाएंगे तो बेटर है, और मड ऑब्ज़र्व करते रहना।)*
  > *("Slow it down a bit. It's better to go slowly here, and keep watching the mud.")*
* **Agent says**:
  > *"Bilkul Sir. ROP 12 meter per hour par cap kar diya — ECD ab 11.86, FIT se 0.24 ppg margin. Dono taraf safe hain."*
  > *("Absolutely, Sir. ROP capped at 12 m/hr. ECD is now 11.86, a 0.24 ppg margin to the FIT. We're safe on both sides.")*
* **Screen**: **What-if slider demo.** The presenter drags ROP from 12 to 30 and back, and ECD crosses the FIT line live, then returns. *"Yeh script nahi, physics hai."* ("This isn't a script, it's physics.")

---

#### Turn 10 — TD → First-Draft WCR + Lessons Written Back (`4,450 m`)
* **Action**: Advance through the sand into the limestone. ROP drops and torque rises. **TD 4,450 m.** All parameters stay green.
* **You say**:
  > **"Chalo badhiya, well target depth tak pahunch gaya. Jo bhi data hai — well logs, mud logs, mud chemistry, aur incidents — sab mila kar Well Completion Report ka pehla draft bana do."**
  > *(चलो बढ़िया, वेल टारगेट डेप्थ तक पहुँच गया। जो भी डेटा है — वेल लॉग्स, मड लॉग्स, मड केमिस्ट्री, और इंसिडेंट्स — सब मिला कर वेल कंप्लीशन रिपोर्ट का पहला ड्राफ्ट बना दो।)*
  > *("Great, the well has reached target depth. Take all the data we have (well logs, mud logs, mud chemistry and incidents) and make a first draft of the Well Completion Report.")*
* **Agent says**:
  > *"Well complete, Sir! Chaaron databases ko mila kar WCR-MN-SM-DW-01 Draft v1.0 taiyaar hai — aur is well ke lessons knowledge base mein wapas likh diye hain, taaki agla well inse seekh sake."*
  > *("Well complete, Sir! WCR-MN-SM-DW-01 Draft v1.0 is ready, combining all four databases. And this well's lessons have been written back into the knowledge base, so the next well can learn from them.")*
* **Screen**: **First-Draft WCR** opens:
  1. Well summary & metadata.
  2. Stratigraphy & ML lithology summary (4,000–4,450 m).
  3. Mud program vs. actual: MW / ECD window audit (ppg & SG).
  4. Pressure event at 4,172–4,205 m: forecast, MOC, actions, outcome, with a full **audit trail**.
  5. Lessons learned, written back to RAG (the new chunk ID is shown).
  6. **Value note**: *"Offset-analogue kick avoided. Indicative NPT avoided: X days (assumptions on hover)."*
* **Closing line (presenter, to the board)**:
  > *"Yeh sab public data par tha. Aapke NDR aur RTOC data par, yeh 90 din mein live ho sakta hai."*
  > *("All of this ran on public data. On your NDR and RTOC data, this can be live in 90 days.")*

---

## 7. Pitch Wrap-Around (Deck Hooks & Close)

* **Deck hooks (10 min)**:
  * Deepwater push (*Samudra Manthan*).
  * Narrow-window NPT.
  * Workforce and knowledge retention.
  * Multilingual frontline.
  * "Physics + ML + Language + Action" in one agent.
* **Value slide**:
  * Kick, loss and wellbore-instability share of deepwater NPT.
  * Drillship spread rate × days avoided.
  * **Use only citable figures** (SPE / IADC sources), with the assumptions shown.
* **Security & sovereignty answer (pre-built)**:
  * Vertex AI in **asia-south1 / asia-south2**.
  * Data residency; customer data not used to train foundation models.
  * **Google Distributed Cloud (air-gapped)** option.
  * Human approval and audit trail on every safety-critical action.
* **The Ask: a 90-day pilot**:
  * 1 RTOC, 3–5 offset wells from NDR / ONGC archives.
  * **KPI: early-warning lead time vs. actual historical kick/loss events (backtest).**
  * Secondary KPI: WCR drafting time.
* **30-second teaser**: the same agent pattern applied to a Mumbai High ESP-failure or production-surveillance use case (platform, not a point demo).

---

## 8. Optional "Next-Level" Beats (use if time allows)

1. **Legacy paper → memory**: drag a **scanned handwritten DDR** into the chat. Gemini reads it, extracts the incident, and it becomes searchable in RAG live.
2. **"Ask it in your language"**: invite one expert to ask a question in Odia, Telugu, Tamil, Marathi, Gujarati or Bengali. Keep a bounded scope, and pre-check that the Live API supports the chosen language.
3. **Cuttings photo**: show a shaker or cuttings image, and Gemini describes the lithology and cross-checks the ML call.

---

## 9. Guardrails & Engineering Principles

* **Numbers come only from tools.** The Scenario Engine and models own every value. The LLM narrates and never invents a ppg, psi or depth.
* **Safety-critical actions need a named human approval** (MOC). Everything is audit-logged.
* **Well-control logic follows standard practice.** If the live well is ever underbalanced with gain or flow indicators, the agent's **first** recommendation is *"pumps off, flow check"* (and shut-in if flowing), never "drill ahead".
* **Honesty cues**: the agent says *"I'm not confident"* when a model's confidence is low. The provenance footer is always visible.
* **No real personnel names**, no real well or block IDs, and illustrative documents are labelled as such.

---

## 10. Stage-Risk Plan

| Risk | Mitigation |
| :--- | :--- |
| Hindi STT errors / room noise | Lapel mic + **push-to-talk clicker**. Rehearse with your own accent and code-switching. Keyword fallbacks per turn |
| Network | Dedicated 5G hotspot plus venue Wi-Fi. Pre-warmed Live session. **Latency budget < 1.5 s** per turn |
| Scenario drift | **"Jump to Turn N" hotkeys** with state snapshots. Deterministic Scenario Engine |
| Phone push fails | Telegram primary, Google Chat secondary. The on-screen card still confirms |
| Total failure | **Screen-recorded full run** 1 click away. **Offline mode** (Parquet + cached responses + local TTS) |
| Expert challenge on numbers | **Red-team rehearsal with a drilling / geomechanics engineer** (ideally ex-ONGC). `DATA_PROVENANCE.md` and the §3B calculation ready to show |

---

## 11. Modular Build Plan

> The authoritative, step-by-step plan is in **[`build.md`](build.md)**. The design is in **[`docs/SDD.md`](docs/SDD.md)**, and progress is tracked in **[`checklist.md`](checklist.md)**. Summary:

1. **Phase 0 — Docs & scaffold**: brief v2.1, SDD, build.md, checklist.md, full repo tree, data contracts, canonical scenario YAML.
2. **Phase 1 — Front-end shell (stub data)**: design system, Basin Map (Google Maps + deck.gl), Command Center (Plotly tracks, Well Pulse, pressure window, what-if, 2.5D schematic, optional R3F 3D), overlays, Presenter Console.
3. **Phase 2 — Scenario & physics engine**: Eaton + centroid, Matthews-Kelly + FIT, ECD, barite, triggers at 4,172 / 4,195 / 4,205 m.
4. **Phase 3 — Knowledge base (RAG)**: synthetic corpus from scenario facts (SOPs, WCRs, incidents, DDRs, mud programs, lessons) → fact validation → chunking → Gemini embeddings → local JSON index → Vertex AI RAG Engine.
5. **Phase 4 — Voice agent**: Gemini 3.8 Live via ADK, bilingual captions, tool chips, proactive watchdog.
6. **Phase 5 — Actions**: MOC memo + approval, Gmail, Google Chat, Telegram, Google Docs WCR, Decision Ledger.
7. **Phase 6 — Real data drop-in & ML**: IODP C0002P / U1445A loaders, FORCE 2020 lithology training, provenance.
8. **Phase 7 — GCP deployment**: GCS, BigQuery, Firestore, Cloud Run (`asia-south1`) via Terraform.
9. **Phase 8 — Stage hardening**: offline mode, fallback video, projector test, rehearsals.

---

## 12. Change Log (v1 → v2.0)

| Area | v1 | v2.0 | Reason |
| :--- | :--- | :--- | :--- |
| Hazard depth | 2,838 m MD | **4,195 m MD** (interval 4,120–4,450 m) | At 2,838 m with 1,620 m water, OBG ≈ 12.07 ppg < FG 12.10, which is physically impossible |
| Loss limit | Generic FG 12.10 | **Shoe FIT 12.10 ppg** at 3,850 m | The measured weakest point is how drillers actually think |
| Well-control logic | Reactive; drilling ahead 0.28 ppg (≈200 psi) underbalanced | **Predictive weight-up before the sand**; flow-check rule | Standard well-control practice |
| Who leads | Presenter spots the risk | **Agent interrupts unprompted** | Restores the verbatim intent: *"gadbad **hone wali** ho"* |
| Window story | Kick side only | **Kick side (Turn 3–8), then loss side (Turn 9)** | Shows the true "both-sides" window |
| Action order | Chemist → Memo | **Memo → Approval → Fan-out** | MOC / OISD discipline; human in the loop |
| Dispatches | 4 separate turns | **1 fan-out turn** | Frees ~3 min for hero moments |
| Barite | 11.4 MT | **~40 MT (~796 × 50-kg bags), ~60 bbl volume gain** | Deepwater system ≥3,000 bbl including riser |
| Units | ppg only | **ppg + SG** | Indian rig practice |
| ML Model 2 | RF "optimal mud weight" | **Kick/loss probability + ROP optimiser within the physics window** | Defensible in front of experts |
| Data | Volve/FORCE "faked" as Mahanadi | **Real public data + visible provenance**; IODP 353 Mahanadi opener; NGHP-02 as the pilot hook | Credibility with the data owner |
| RAG | Synthetic only | **Real Volve DDRs / final well reports** + illustrative offsets, page citations | Authentic institutional text |
| Mobile | Twilio SMS | **Telegram push** (DLT-free); DLT SMS optional | TRAI DLT rules |
| Voice | STT + LLM + TTS | **Gemini Live API native audio** | Latency and proactive speech |
| Log display | 7 tracks | **4-track default + expand** | Board readability |
| Close | None | **90-day pilot ask + value slide + sovereignty answer** | Turns applause into a decision |

**v2.0 → v2.1**

| Area | v2.0 | v2.1 | Reason |
| :--- | :--- | :--- | :--- |
| Live-well data | Volve | **IODP 348 C0002P** (CC0, deepwater riser well) | Closer deepwater analog, scriptable download |
| RAG corpus | Volve DDRs primary | **Synthetic fact-validated corpus** + optional public enrichment | Controlled, consistent numbers |
| Front end | JS + Canvas + Plotly | **React + TS + Plotly.js + Google Maps/deck.gl + optional R3F** | Premium look and maintainability |
| Voice | "latest Live model" | **Gemini 3.8 Live** via **ADK** | Named model, async function calling |
| Data platform | BigQuery + Parquet | **Local-first adapters (Parquet / DuckDB / JSON / SQLite) → GCP (GCS / BigQuery / RAG Engine / Firestore)** | Build offline now, promote later |

---

## 13. Front-End Design Principles & External Learnings

**Direction: "mission control, not sci-fi."** Premium means calm, legible and verifiable.

* **Visual rules**:
  * Graphite surfaces and **one accent (cyan)**. **Amber/red only for real risk.**
  * Inter / IBM Plex Sans + JetBrains Mono with tabular figures. Key numbers at 48–72 px.
  * Motion **only on state change** (150–250 ms). One soft chime for a proactive alert.
  * Glass / blur only on overlays. Projector-safe contrast, and a light theme kept in reserve.
* **Board mode ↔ Engineer mode** toggle: 4 tracks and big KPIs vs. the full suite.
* **Live bilingual captions** (Devanagari Hindi + English) on every agent and presenter utterance.
* **Show the machinery**:
  * Tool-call chips (Eaton, ECD, RAG, Barite).
  * Citation cards with page refs.
  * **Provenance chip on every number**, with an **audit drawer** behind each figure.
  * A **Decision Ledger** that freezes each decision's basis at decision time.
* **Presenter Console** on your phone: turn hotkeys, reset, mute, and a one-tap fallback video.
* **Learnings from EnergyFlow AI (`energyflowai.up.railway.app`)**:
  * *Adopted:*
    * "Every figure says what it rests on" provenance labels (Measured / Derived / Simulated / Assumed / Public / Synthetic / Model inference / Not recorded).
    * Audit drawer.
    * Decisions keep their basis.
    * "Follow one question from alarm to decision".
    * Explicit public/simulated disclaimer.
    * Light/dark theme.
  * *Avoided:*
    * Breadth (dozens of sectors and agents).
    * A multi-vendor model picker. **Gemini only.**
    * Heavy 3D everywhere (we use one 2.5D schematic plus an *optional* 3D view).
    * Generated portraits, login screens and "Initializing…" theatrics.
  * *Differentiator:* Hindi voice + proactive warning + institutional memory + closed-loop approval + real logs.
