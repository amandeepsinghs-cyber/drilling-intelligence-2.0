# WCR Generation Guide — MN-SM-DW-01 (for Gemini Flash)

**Purpose.** Produce a 60–70 page *illustrative* Well Completion Report (WCR) for well MN-SM-DW-01 that agrees 100 % with the demo (same depths, mud weights, pressures, IDs), so the WCR viewer / "Open in Google Docs" can show a real document on stage.

**How to use this file (for the presenter)**
1. Open **Gemini** (gemini.google.com or AI Studio) → choose **Gemini 3 Flash** → start a **new chat**.
2. Attach **this whole file**. Paste **PROMPT 0** (Part C) and send. Flash replies "READY" + the outline.
3. Paste **PROMPT 1**, then **PROMPT 2**, … **PROMPT 12**, one per turn, in the same chat. Copy each reply into one Markdown file (`WCR-MN-SM-DW-01_v1.md`) in order.
4. Paste **PROMPT 13** (consistency audit). Apply the fixes it lists.
5. Hand the Markdown back to the engineering side for conversion to Google Docs + linking in the app.

> Why chapter-by-chapter: one Flash reply tops out around 40–50 pages of text. 13 turns ≈ 60–70 pages and every chapter gets full attention.

---

## Part A — Rules Flash must follow (the "brief")

### A1. Status of the document
- This is an **illustrative, synthetic** report prepared for a technology demonstration. It is **not** an official ONGC document.
- Footer on every page / end of every chapter: *"Illustrative scenario — synthetic data prepared for demonstration. Not an ONGC record."*
- Document ID: **WCR-MN-SM-DW-01 Draft v1.0**. Status: **DRAFT — Compiled with AI assistance, pending human review.**

### A2. Locked facts (never change, never round differently)
Every number below must appear exactly as written wherever it is used. If a chapter needs a number that is **not** here, invent a plausible one that does not contradict these (see A3).

**Well**
| Item | Value |
|---|---|
| Well | MN-SM-DW-01 (illustrative) |
| Basin / area | Mahanadi Offshore Deepwater, ~110 km off Odisha (illustrative coordinates 19.45° N, 87.35° E) |
| Rig | Ultra-deepwater drillship (name it "DS-1 (illustrative)") |
| Water depth | 1,620 m; air gap 25 m |
| Profile | Near-vertical (MD ≈ TVD in the interval of interest) |
| Section reported in detail | 12-1/4 in hole, SOBM, 3,850 m → TD 4,450 m MD |
| Live-monitored interval | 4,120 → 4,450 m MD |
| Onshore support | RTOC (Real-Time Operations Centre) |

**Casing**
| Size | Shoe MD | Role | Note |
|---|---|---|---|
| 36 in | 1,705 m | Conductor | schematic |
| 20 in | 2,650 m | Surface | schematic |
| 13-3/8 in | 3,850 m | Intermediate | **FIT 12.10 ppg (1.45 SG)** |
| 9-5/8 in | planned to 4,450 m | Production | run after TD |

**Stratigraphy (12-1/4 in section)**
| Unit | Top–Base (m MD) | Description | Key log signature |
|---|---|---|---|
| U1 | 4,000–4,150 | Upper Miocene compact marine shale & silty claystone (seal) | GR 95–115 API; Rdeep 2.2–3.5 Ω·m; on normal compaction trend |
| U2 | 4,150–4,195 | Miocene transition zone: calcareous siltstone, thin limestone/dolomitic stringers, overpressured prodelta shale | DT 88–108 µs/ft; dxc reversal; Rdeep below NCT; gas trending up |
| U3 | 4,195–4,290 | **Main pay:** Miocene slope-channel turbidite sandstone | GR 38–52 API; Rdeep 28–45 Ω·m; drilling break |
| U4 | 4,290–4,460 | Basal Miocene / Oligocene argillaceous limestone & dolomitic mudstone | ROP drops, torque rises; TD / casing point 4,450 m |

**Reservoir (U3)**: sand top 4,195 m; GWC 4,270 m; gross gas column 75 m; N/G 0.84; quartz 82 %; PHIE 24.2 %; permeability 180 mD; dry gas, C1 > 88 % of C1–C5.

**Pressure**: overburden 14.0 ppg (1.68 SG) at sand top; normal shale PP 10.95 ppg (1.31 SG); PP ramp starts 4,150 m; **sand-top PP 11.48 ppg (1.38 SG)**; loss limit = 13-3/8 in shoe FIT 12.10 ppg; mud-weight window at sand 0.62 ppg.

**Mud**: SOBM. Initial MW **11.20 ppg (1.34 SG)** → weighted **11.65 ppg (1.40 SG)**; YP 18 lb/100 ft²; PV 28 cP; active system 3,100 bbl; riser volume 1,950 bbl; **weight-up decided at 4,172 m**, duration ~3 h (~1.5 circulations).

**Barite**: formula lb/bbl = 1470 × (W2 − W1) / (35 − W2) → **28.3 lb/bbl; 87,700 lb; 39.8 MT; 796 × 50 kg bags; volume gain 60 bbl.**

**Drilling**: ROP 22 m/hr initial; drilling break 34 m/hr; **ROP cap 12 m/hr**; flow 850 gpm. Mud-log bottoms-up lag 45 min (depth lag = ROP × 45/60, e.g. 16.5 m at 22 m/hr).

**Key checkpoints (use this table verbatim in Exec Summary and Ch. 6)**
| MD (m) | Event | MW (ppg) | ECD (ppg) | ROP (m/hr) | PP (ppg) | Margin | P(kick, next 30 m) |
|---|---|---|---|---|---|---|---|
| 4,120 | Before | 11.20 | 11.42 | 22 | 10.95 | — | 0.04 |
| 4,172 | Warning point | 11.20 (target 11.65) | — | — | forecast 11.48 at 4,195 | −0.28 ppg / −200 psi if unchanged; 23 m to hazard | 0.71 if unchanged |
| 4,195 | Sand top (offset kick depth) | 11.65 | 11.84 | 12 | 11.48 | +0.17 ppg / +120 psi overbalance | 0.06 |
| 4,205 | Drilling break | 11.65 | 12.02 | 34 | — | ECD–FIT margin 0.08 ppg | 0.05 |
| 4,205 | After ROP cap | 11.65 | 11.86 | 12 | — | ECD–FIT margin 0.24 ppg | 0.04 |

At 4,172 m: DT 101 µs/ft; connection gas rose **0.4 % → 1.1 %**; dxc reversal from 4,160 m.

**Probabilistic MW recommendation (AI)**: P10 11.58 ppg, P50 11.65 ppg, P90 11.76 ppg.

**IDs**: MOC memo **MEMO-SM-2026-09**; dispatches MC-SM-4172, RTOC-4172, EMAIL-4172, PUSH-4172; WCR **WCR-MN-SM-DW-01 Draft v1.0**.

**Offset wells (all illustrative)**
| Well | Distance | Event | Key numbers |
|---|---|---|---|
| MN-DW-01 | 3.2 km | Reference, no well-control events | WD 1,595 m; TD 4,650 m; sand top 4,188 m; net pay 75 m; PHIE 22–26 %; 13-3/8 in shoe 3,820 m (FIT 12.15 ppg); MW 11.30 ppg; max conn gas 4.2 % |
| MN-DW-02 | 1.8 km | **Kick at 4,195 m** (U3) | MW 11.15 ppg (1.34 SG); underbalance 0.33 ppg = 236 psi; gain 12 bbl; SIDPP 236 psi; SICP 310 psi; gas peak 18.4 %; kill MW 11.65 ppg (1.40 SG); NPT 36.5 h; shoe 3,840 m (FIT 12.05); NCT departure 4,152 m; DT 86→104 µs/ft |
| MN-DW-03 | 2.4 km | **Losses at 4,222 m** (U3 drilling break) | MW 11.70 ppg; ECD 11.88 → 12.18 ppg; loss 28 bbl/hr; total 310 bbl; LCM 40 ppb; shoe 3,860 m; cause: no ROP cap or sweeps during drilling break |
| MH-112 | Mumbai High (reference) | Carbonate losses + differential sticking at 2,850 m | MW 10.80 ppg; 45 bbl/hr; jarring 14.5 h; NPT 48 h |

**SOPs referenced (illustrative)**: ONGC-SM-SOP-04 (weight up ≥ 20 m above sand, DT excursion trigger 8 µs/ft, ≥ 100 psi overbalance at sand); ONGC-HC-SOP-05 (APL ≤ 0.35 ppg, 20 bbl sweep every 100 m); ONGC-MC-SOP-02 (barite addition 2.5–3.0 h); ONGC-MOC-SOP-07; ONGC-WCR-SOP-09; ONGC-WC-SOP-01.

**Shift timeline (12-1/4 in section)**: 8 tours, 20–24 Sep 2026 — SHIFT-01 3,850–3,950 (drill out shoe, FIT), SHIFT-02 3,950–4,075, SHIFT-03 4,075–4,150, SHIFT-04 4,150–4,172 (warning, MOC), SHIFT-05 4,172–4,195 (weight-up 11.20→11.65), SHIFT-06 4,195–4,235 (sand top, break at 4,205, ROP cap), SHIFT-07 4,235–4,360 (into U4 at 4,290), SHIFT-08 4,360–4,450 (TD, wiper trip, ready for 9-5/8 in). **Outcome: zero kicks, zero losses, zero lost-time incidents.**

### A3. What Flash may invent (and how)
- Allowed: spud date (August 2026), earlier-section operations (36 in / 20 in / 17-1/2 in hole), bit & BHA records, survey stations, cement volumes, daily mud reports, logging runs, equipment lists, weather, personnel **roles**.
- Invented values must be **physically plausible**, **internally consistent** across chapters (keep a running "Invented values register" — see Prompt 0), and **never contradict A2**.
- People: roles only ("Drilling Superintendent", "Mud Engineer", "Tour A Driller"). If a name is unavoidable use only: *R. Sharma (Tour A Driller)*, *K. Das (Tour B Driller)*. **No other personal names.**
- **No** real rig names, service companies, vendors, block numbers, licence numbers, or real ONGC officials. No currency amounts (no ₹, no $).

### A4. Style
- Tone: formal, engineering, third person, past tense. Indian upstream conventions.
- Units: m MD (add "TVD" only where stated); mud weight **ppg with SG in brackets** on first use per chapter; pressure psi; ROP m/hr; volumes bbl; barite MT and bags.
- Numbers: thousands separator (4,195 m); keep the decimals exactly as in A2.
- Every chapter: numbered headings (e.g. 6.3.2), at least **2 tables**, a short "Key points" box at the top, and a "Data sources" line at the end (e.g. "Depth frames, mud log, MEMO-SM-2026-09").
- Mark AI involvement factually: "The Sagar Drishti AI Agent flagged … ; the Drilling Superintendent approved …". **Humans approve every decision.**
- Output **Markdown only**: `#` headings, GitHub tables, `<!-- pagebreak -->` between major sections. No images; where a figure would go, write `[Figure X.Y — caption]`.

---

## Part B — Report outline and page budget (~66 pages)

| # | Chapter | Pages | Must contain |
|---|---|---|---|
| 0 | Front matter | 3 | Cover, document control, distribution list (roles), approval table (blank signatures), abbreviations (≥ 40), table of contents |
| 1 | Executive summary | 3 | Outcome (zero kicks/losses/LTI), checkpoint table, value vs offsets (NPT avoided vs MN-DW-02 36.5 h, losses avoided vs MN-DW-03 310 bbl), headline recommendations |
| 2 | Well summary data | 4 | Location, rig, water depth, dates, casing table, well schematic `[Figure]`, time–depth summary table |
| 3 | Geological & stratigraphic summary | 6 | Regional setting (Mahanadi deepwater, Miocene turbidites), formation tops (prognosed vs actual), lithology per unit, cuttings descriptions |
| 4 | Drilling operations | 10 | Interval-by-interval: 36 in, 26 in/20 in, 17-1/2 in/13-3/8 in, 12-1/4 in (detailed by shift); bit/BHA summary; ROP & parameters; NPT table (zero in 12-1/4 in) |
| 5 | Pore pressure & geomechanics | 7 | NCT method, Eaton sonic & dxc, PP/FG profile, the 4,150 m ramp, 4,172 m warning, forecast vs actual, mud-weight window at sand |
| 6 | Well control & safety events | 6 | Warning at 4,172 m, flow check negative, MOC MEMO-SM-2026-09 (who/what/when), weight-up execution, sand-top reassurance at 4,195 m, drilling break 4,205 m and ROP cap, checkpoint table |
| 7 | Drilling fluids performance | 6 | Mud programme vs actual, properties table per shift, barite calculation shown step by step, volumes, solids control, SOP-02 compliance |
| 8 | Formation evaluation | 6 | LWD suite (GR, resistivity, density-neutron, PEF, sonic), mud-log gas & C1–C5, petrophysics of U3 (PHIE, Sw, N/G, perm, GWC), ML lithology cross-check |
| 9 | AI-assisted decision record | 4 | Timeline of agent alerts → human decisions → dispatches (MC-SM-4172, RTOC-4172, EMAIL-4172, PUSH-4172); P10/P50/P90 MW; audit trail; limitations |
| 10 | Lessons learned & recommendations | 3 | 6–10 lessons (pre-emptive weight-up, ROP cap at breaks, DT/dxc watch, lag awareness), linked SOP updates, recommendations for next well |
| 11 | Appendices A–C | 5 | A daily drilling reports (8 shift tables), B bit & BHA records, C daily mud reports |
| 12 | Appendices D–G | 5 | D deviation survey table (every 30 m in 12-1/4 in, inclination < 1.5°), E casing & cement summary, F offset well comparison, G references (SOP IDs, offset WCR IDs, incident IDs) |

---

## Part C — Exact prompts (copy-paste one per turn)

### PROMPT 0 — set-up
```
You are a senior drilling engineer writing an ILLUSTRATIVE Well Completion Report for a technology demo.
The attached file "WCR Generation Guide" is your only source of truth.
Rules: follow Part A exactly; locked facts in A2 must appear verbatim; invent only what A3 allows;
style per A4; output Markdown only.
Before writing anything, reply with:
1) the word READY,
2) the chapter list from Part B with page budgets,
3) an empty "Invented values register" table (columns: item | value | first used in chapter) that you will
   append to at the end of every chapter reply.
Do not write any chapter yet.
```

### PROMPT 1 — front matter
```
Write Chapter 0 (Front matter) per Part B: cover page, document control (ID WCR-MN-SM-DW-01 Draft v1.0,
status DRAFT — Compiled with AI assistance, pending human review), distribution list by role only,
approval table with blank signature cells, abbreviations list (at least 40 entries, alphabetical),
and a table of contents for Chapters 1–10 and Appendices A–G. About 3 pages.
End with the updated Invented values register.
```

### PROMPT 2 — executive summary
```
Write Chapter 1 (Executive summary), about 3 pages. Include the checkpoint table from A2 verbatim,
the outcome (zero kicks, zero losses, zero lost-time incidents in the 12-1/4 in section), a comparison with
offsets MN-DW-02 (kick at 4,195 m, 36.5 h NPT) and MN-DW-03 (losses at 4,222 m, 310 bbl), and 5 headline
recommendations. End with the updated Invented values register.
```

### PROMPT 3 — well summary data
```
Write Chapter 2 (Well summary data), about 4 pages: location and coordinates, rig "DS-1 (illustrative)",
water depth and air gap, key dates (invent a spud date in August 2026 consistent with TD on 24 Sep 2026),
casing table from A2 plus the planned 9-5/8 in, a [Figure 2.1 — Well schematic] placeholder, and a
time-versus-depth summary table by hole section. End with the updated Invented values register.
```

### PROMPT 4 — geology
```
Write Chapter 3 (Geological & stratigraphic summary), about 6 pages: regional setting of the Mahanadi
deepwater Miocene slope-channel system (general, no real block names), prognosed vs actual formation tops
table (actual tops must equal A2), detailed lithology and cuttings descriptions for U1–U4, and how the
U2 transition zone signalled overpressure. End with the updated Invented values register.
```

### PROMPT 5 — drilling operations
```
Write Chapter 4 (Drilling operations), about 10 pages. Cover each hole section: 36 in conductor to 1,705 m,
20 in surface to 2,650 m, 13-3/8 in intermediate to 3,850 m, then the 12-1/4 in section in detail using the
8-shift timeline in A2 (one sub-section per shift with depths, ROP, MW in/out, ECD, operations, handover).
Include a bit & BHA summary table, a drilling-parameters table (WOB, RPM, flow 850 gpm, SPP, torque), and an
NPT table (12-1/4 in section NPT = 0 h). End with the updated Invented values register.
```

### PROMPT 6 — pore pressure
```
Write Chapter 5 (Pore pressure & geomechanics), about 7 pages: normal compaction trend method, Eaton sonic
and dxc approach (explain in words, no heavy maths), PP/FG/overburden table every 25 m from 4,000 to 4,450 m
(PP 10.95 ppg normal, ramp from 4,150 m to 11.48 ppg at 4,195 m, overburden 14.0 ppg at sand top, loss limit
12.10 ppg FIT), the 4,172 m warning (DT 101 µs/ft, conn gas 0.4 % → 1.1 %, 23 m to hazard), forecast vs
actual, and the 0.62 ppg window at the sand. End with the updated Invented values register.
```

### PROMPT 7 — well control & safety
```
Write Chapter 6 (Well control & safety events), about 6 pages: chronological narrative of the 4,172 m
warning, negative flow check, MOC MEMO-SM-2026-09 (roles involved, approval time), weight-up 11.20 → 11.65 ppg
over ~3 h, arrival at 4,195 m with +120 psi overbalance, the drilling break at 4,205 m (ROP 34 m/hr, ECD
12.02 ppg, margin 0.08 ppg) and the ROP cap to 12 m/hr (ECD 11.86 ppg, margin 0.24 ppg). Include the
checkpoint table verbatim and an events log table (time, MD, event, decision, by whom).
End with the updated Invented values register.
```

### PROMPT 8 — drilling fluids
```
Write Chapter 7 (Drilling fluids performance), about 6 pages: SOBM programme vs actual, a per-shift mud
properties table (MW, PV 28, YP 18, gels, OWR, electrical stability, HTHP filtrate), the barite calculation
shown step by step with the formula in A2 giving 28.3 lb/bbl, 87,700 lb, 39.8 MT, 796 bags, 60 bbl gain,
system volumes (3,100 bbl active, 1,950 bbl riser), solids control, and compliance with ONGC-MC-SOP-02.
End with the updated Invented values register.
```

### PROMPT 9 — formation evaluation
```
Write Chapter 8 (Formation evaluation), about 6 pages: LWD suite and log quality, mud-log gas and C1–C5
chromatography (dry gas, C1 > 88 %), petrophysical summary of U3 (PHIE 24.2 %, N/G 0.84, 180 mD, quartz
82 %, GWC 4,270 m, 75 m gross gas column), a zone-by-zone results table for U1–U4, and the ML lithology
cross-check against cuttings (mention the 45-minute lag). End with the updated Invented values register.
```

### PROMPT 10 — AI decision record
```
Write Chapter 9 (AI-assisted decision record), about 4 pages: a timeline table of every Sagar Drishti AI
Agent alert, the human decision that followed, and the dispatch IDs (MC-SM-4172, RTOC-4172, EMAIL-4172,
PUSH-4172); the probabilistic mud-weight recommendation (P10 11.58, P50 11.65, P90 11.76 ppg); audit-trail
and human-approval principles; limitations and assumptions. Neutral tone, no marketing language.
End with the updated Invented values register.
```

### PROMPT 11 — lessons learned
```
Write Chapter 10 (Lessons learned & recommendations), about 3 pages: 6–10 numbered lessons, each with
observation, impact, recommendation and linked SOP (ONGC-SM-SOP-04, ONGC-HC-SOP-05, ONGC-MC-SOP-02,
ONGC-MOC-SOP-07, ONGC-WC-SOP-01), then recommendations for the next well in this compartment.
End with the updated Invented values register.
```

### PROMPT 12 — appendices
```
Write Appendices A–G, about 10 pages total:
A) daily drilling report table for each of the 8 shifts; B) bit & BHA records; C) daily mud reports;
D) deviation survey every 30 m from 3,850 to 4,450 m (inclination below 1.5°); E) casing & cement summary;
F) offset well comparison table (MN-DW-01, MN-DW-02, MN-DW-03, MH-112) using A2 values;
G) references (SOP IDs, offset WCR IDs, incident report IDs INC-MN-DW-02-KICK-4195, INC-MN-DW-03-LOSS-4222).
End with the FINAL Invented values register.
```

### PROMPT 13 — consistency audit
```
Audit everything you wrote in this chat against Part A2 of the guide.
List every mismatch as a table: chapter | text you wrote | correct value from A2 | fix.
Then list any invented value that is used inconsistently between chapters.
Then confirm: no personal names other than R. Sharma and K. Das, no real company or rig names, no currency.
Do not rewrite the chapters; only give the fix list.
```

---

## Part D — After generation (engineering side)
1. Apply Prompt 13 fixes → save `docs/wcr/WCR-MN-SM-DW-01_v1.md`.
2. Convert to Google Doc in the `admin@amandeepsinghs.altostrat.com` Drive, title *"Well Completion Report — MN-SM-DW-01 (Illustrative Draft v1.0)"*.
3. Replace the placeholder link in `backend/app/agent/tools.py` with the real Doc URL and enable the "Open in Google Docs" button; redeploy.
4. Keep the fact gate at 0/0 (numbers in the app must still come from YAML).
