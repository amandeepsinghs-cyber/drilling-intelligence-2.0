"""pipelines.synth.generate_knowledge_corpus — generate authentic synthetic knowledge corpus.

Produces Markdown documents with YAML front-matter conforming to
data/contracts/knowledge_doc.schema.json, strictly adhering to scenario facts.
"""
from __future__ import annotations

import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "knowledge" / "source"

DOCUMENTS = [
    # ── SOPS ──
    {
        "folder": "sops",
        "filename": "ONGC-SM-SOP-04.md",
        "front_matter": {
            "doc_id": "ONGC-SM-SOP-04",
            "doc_type": "SOP",
            "title": "Deepwater Narrow-Window Drilling Protocol (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "2.1",
            "date": "2026-08-15",
            "tags": ["narrow-window", "pore-pressure", "transition-zone", "rop-cap"],
        },
        "content": """# ONGC-SM-SOP-04: Deepwater Narrow-Window Drilling Protocol (illustrative)

## 1. Purpose & Scope
This Standard Operating Procedure establishes operational protocols for safely traversing narrow drilling margins in deepwater Mahanadi offshore prospects (including MN-SM-DW-01, water depth 1,620 m). It specifies mandatory triggers for pre-emptive mud weight increases, drilling break management, and flow checks.

## 2. Responsibilities
- **Company Man / OIM**: Ultimate rig authority; enforces hold points and approves MOC submissions.
- **Drilling Superintendent (RTOC)**: Real-time surveillance lead; monitors LWD sonic/resistivity trends and authorizes weight-up.
- **Mud Engineer**: Formulates SOBM weighting schedule, supervises barite addition, and verifies mud density parity (in/out).
- **Driller**: Immediately executes ROP restriction upon encountering lithological breaks.

<!-- page: 1 -->

## 3. Definitions & Narrow Margin Context
- **Narrow Margin Drilling**: Intervals where the pore pressure (PP) and fracture gradient / casing shoe FIT margin is $\\le 0.65\\text{ ppg}$.
- **13-3/8 in Casing Shoe**: Set at 3,850 m MD with Formation Integrity Test (FIT) established at 12.10 ppg (1.45 SG).
- **Safe Drilling Envelope**: Maximum permissible Equivalent Circulating Density (ECD) must remain below 12.00 ppg to protect the 13-3/8 in shoe.

## 4. Operational Hold Points & Mandatory Triggers
1. **Transition Zone Identification (4,150 m to 4,195 m MD)**:
   - When compressional slowness ($DT$) increases above the Normal Compaction Trend (NCT) by $> 8\\ \\mu\\text{s/ft}$, or resistivity ($R_{\\text{deep}}$) departs below NCT, enter **High Alert Status**.
   - Background gas trending upward from baseline requires continuous chromatograph inspection ($C_1$ through $C_5$).
2. **Pre-emptive Weight-Up Trigger (4,172 m MD)**:
   - In accordance with offset incident `INC-MN-DW-02-KICK-4195`, mud weight must NOT be kept at 11.20 ppg (1.34 SG) entering the pay sand.
   - Mud weight must be raised pre-emptively from 11.20 ppg (1.34 SG) to **11.65 ppg (1.40 SG)** prior to crossing 4,195 m MD.
   - This provides a minimum +0.17 ppg (+100 psi) overbalance against the projected sand pore pressure of 11.48 ppg (1.38 SG).

<!-- page: 2 -->

## 5. Drilling Break Protocol & ROP Cap
- **Sand Entry at 4,195 m MD**:
  - Main reservoir pay (Miocene slope-channel turbidite sandstone) exhibits instantaneous ROP acceleration up to 34 m/hr.
  - **Mandatory Action**: The driller must immediately throttle WOB/RPM to cap ROP at **$\\le 12\\text{ m/hr}$**.
  - **Flow Check**: Perform a mandatory 15-minute static flow check at 4,196 m MD (pumps off, trip tank monitoring).
  - Uncapped ROP in narrow windows generates heavy cuttings loading and annular friction surges that cause catastrophic losses (reference: `INC-MN-DW-03-LOSS-4222`).

## 6. Records & Regulatory References
- MOC records must be logged into RTOC digital ledger.
- References: ONGC Deepwater Drilling Manual §14; API RP 13B-1; IWCF Deepwater Well Control Compendium §4.
""",
    },
    {
        "folder": "sops",
        "filename": "ONGC-MC-SOP-02.md",
        "front_matter": {
            "doc_id": "ONGC-MC-SOP-02",
            "doc_type": "SOP",
            "title": "Barite Weight-Up & Rheology Sign-Off Procedure (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "1.4",
            "date": "2026-08-10",
            "tags": ["mud-chemistry", "barite", "rheology", "sobm"],
        },
        "content": """# ONGC-MC-SOP-02: Barite Weight-Up & Rheology Sign-Off Procedure (illustrative)

## 1. Purpose & Application
Establishes standardized procedures for synthetic oil-based mud (SOBM) density adjustments using API high-grade barite ($4.20\\text{ g/cm}^3$) in deepwater drilling systems. Specifically governs the 11.20 ppg to 11.65 ppg weight-up at 4,172 m MD.

## 2. Theoretical Formula & Volume Calculations
Mud weight increase formula:
$$\\text{Barite (lb/bbl)} = 1470 \\times \\frac{W_2 - W_1}{35 - W_2}$$
Where:
- $W_1 = 11.20\\text{ ppg}$ (current density)
- $W_2 = 11.65\\text{ ppg}$ (target density)
- Barite requirement $= 28.3\\text{ lb/bbl}$ of active system.

For MN-SM-DW-01 active pit volume of 3,100 bbl:
- Total Barite Required: **87,700 lb (39.8 metric tons / 796 bags of 50 kg)**.
- Expected Pit Volume Gain: **60 bbl**.

<!-- page: 1 -->

## 3. Operational Mixing Execution
1. **Addition Rate Limit**:
   - Barite addition rate via mixing hopper must not exceed 15 MT/hr to prevent sagging and polymer shock.
   - Recommended addition duration: 2.5 to 3.0 hours across ~1.5 full circulations.
2. **Rheology Control Targets**:
   - Plastic Viscosity ($PV$): target 28 cP.
   - Yield Point ($YP$): maintain target 18 lb/100 ft$^2$.
   - Gel Strengths ($10\\text{s} / 10\\text{m}$): 12 / 22 lb/100 ft$^2$.
   - Viscosifier / organophilic clay additions to be balanced simultaneously with barite.

## 4. Verification & Sign-Off Criteria
- Mud balance density readings taken every 15 minutes at suction and flowline.
- Drilling SHALL NOT resume until suction and flowline density show parity at $11.65 \\pm 0.05\\text{ ppg}$ for one complete bottoms-up cycle.
- Mud Chemist and Drilling Superintendent sign-off required on MOC Checklist.
""",
    },
    {
        "folder": "sops",
        "filename": "ONGC-MOC-SOP-07.md",
        "front_matter": {
            "doc_id": "ONGC-MOC-SOP-07",
            "doc_type": "SOP",
            "title": "Mud Program Deviation: Management of Change & Approval Authority (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "3.0",
            "date": "2026-08-01",
            "tags": ["moc", "management-of-change", "approvals", "governance"],
        },
        "content": """# ONGC-MOC-SOP-07: Mud Program Deviation: Management of Change & Approval Authority (illustrative)

## 1. Objective
Defines formal governance and digital audit trail protocols when operational conditions dictate alteration of approved Well Operations Programs in deepwater blocks.

## 2. Thresholds Requiring Level 2 MOC
Any of the following conditions triggers mandatory Level 2 MOC approval:
- Mud density increase $> 0.2\\text{ ppg}$ above approved program.
- Planned entry into overpressured sands with narrow margin $< 1.0\\text{ ppg}$.
- Implementation of mechanical ROP caps during drilling breaks.

<!-- page: 1 -->

## 3. Required Approval Chain
1. **Initiator**: Drilling Superintendent / RTOC AI Co-pilot generates MOC memo with technical justification.
2. **Technical Endorsement**: Mud Chemist confirms barite inventory, hopper throughput, and rheological stability.
3. **Operational Endorsement**: Offshore Rig Company Man verifies surface pit room, trip tank integrity, and well-control readiness.
4. **Final Approval Authority**: Asset Lead / General Manager (Drilling), ONGC RTOC.

## 4. Digital Ledger & Compliance
All MOC requests, automated risk assessments, and signature hashes are recorded in the immutable RTOC ledger to satisfy Directorate General of Hydrocarbons (DGH) regulatory standards.
""",
    },
    {
        "folder": "sops",
        "filename": "ONGC-WCR-SOP-09.md",
        "front_matter": {
            "doc_id": "ONGC-WCR-SOP-09",
            "doc_type": "SOP",
            "title": "End-of-Well Completion Report Compilation Standard (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "1.2",
            "date": "2026-07-20",
            "tags": ["wcr", "reporting", "post-well-analysis", "compliance"],
        },
        "content": """# ONGC-WCR-SOP-09: End-of-Well Completion Report Compilation Standard (illustrative)

## 1. Overview
Prescribes the structure, minimum engineering content, and analytical deliverables required for the Well Completion Report (WCR) upon reaching section Total Depth (TD) or final well TD.

## 2. Standard Document Structure
- **Section 1**: Well Summary Data (coordinates, water depth, spud date, rig specs, casing points).
- **Section 2**: Stratigraphic & Geological Summary (formation tops, lithology descriptions, reservoir evaluation).
- **Section 3**: Drilling Operations Diary (interval-by-interval progress, bit performance, BHA records).
- **Section 4**: Pore Pressure & Geomechanics Review (NCT baselines, Eaton calculations, kick/loss analysis).
- **Section 5**: Mud Performance & Consumption (fluid properties, barite consumption, disposal records).
- **Section 6**: Wellbore Integrity & Safety Events (casing tests, FIT results, MOC logs).
- **Section 7**: Lessons Learned & Best Practices.

<!-- page: 1 -->

## 3. Data Integrity & Automated Compilation
- Real-time logging data (DLIS/LAS) must be cross-verified against depth frame repositories.
- All non-standard events (e.g. pre-emptive weight-up, ROP capping) must link directly to the corresponding MOC incident memos.
""",
    },
    {
        "folder": "sops",
        "filename": "ONGC-WC-SOP-01.md",
        "front_matter": {
            "doc_id": "ONGC-WC-SOP-01",
            "doc_type": "SOP",
            "title": "Deepwater Well Control: Flow Check & Shut-In Procedure (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "2.0",
            "date": "2026-06-12",
            "tags": ["well-control", "flow-check", "shut-in", "bop"],
        },
        "content": """# ONGC-WC-SOP-01: Deepwater Well Control: Flow Check & Shut-In Procedure (illustrative)

## 1. Principles of Deepwater Well Control
In deepwater operations from floating vessels, gas influxes dissolve readily in synthetic oil-based mud (SOBM) until reaching shallow depth or riser entry, making early detection at the mudline essential.

## 2. Warning Signs of Influx
- Sudden drilling break (ROP increase $> 50\\%$).
- Increase in flowline return rate.
- Pit gain on active system ($> 5\\text{ bbl}$).
- Decrease in pump pressure at constant strokes.

<!-- page: 1 -->

## 3. Soft Shut-In Procedure (Drilling Ahead)
1. Pick up off bottom to space out tool joint across the subsea BOP stack.
2. Stop rotary and shut down mud pumps.
3. Check for flow on trip tank. If flow detected:
   a. Open remote choke line HCR valve.
   b. Close upper annular preventer.
   c. Close remote choke valve.
   d. Notify Company Man and RTOC immediately.
4. Record Shut-In Drill Pipe Pressure (SIDPP), Shut-In Casing Pressure (SICP), and pit gain.
""",
    },
    {
        "folder": "sops",
        "filename": "ONGC-HC-SOP-05.md",
        "front_matter": {
            "doc_id": "ONGC-HC-SOP-05",
            "doc_type": "SOP",
            "title": "Hole Cleaning & ECD Management in Deepwater (illustrative)",
            "well_id": "MN-SM-DW-01",
            "authoring": "synthetic",
            "version": "1.8",
            "date": "2026-06-25",
            "tags": ["hole-cleaning", "ecd", "hydraulics", "losses"],
        },
        "content": """# ONGC-HC-SOP-05: Hole Cleaning & ECD Management in Deepwater (illustrative)

## 1. Scope
Applies to large-diameter deepwater hole sections (12-1/4 in and 17-1/2 in) where annular fluid velocities must balance hole cleaning against excessive Equivalent Circulating Density (ECD).

## 2. Hydraulic Limits for 12-1/4 in Section at 4,200 m MD
- Nominal flow rate: 850 gpm.
- Maximum allowable ECD: 12.00 ppg (shoe FIT: 12.10 ppg).
- Dynamic annular pressure loss must not exceed 0.35 ppg equivalent over static mud weight.

<!-- page: 1 -->

## 3. High-ROP Cuttings Management
- When ROP exceeds 25 m/hr, cuttings concentration in the annulus escalates rapidly, elevating ECD by up to 0.40 ppg.
- High-viscosity low-shear sweeps (20 bbl tandem pills) must be pumped every 100 m drilled.
- If ECD approaches within 0.10 ppg of fracture limit (12.00 ppg), immediately reduce flow rate or cap ROP.
""",
    },

    # ── WCRS ──
    {
        "folder": "wcr",
        "filename": "WCR-MN-DW-01.md",
        "front_matter": {
            "doc_id": "WCR-MN-DW-01",
            "doc_type": "WCR",
            "title": "Well Completion Report: Offset Reference Well MN-DW-01 (illustrative)",
            "well_id": "MN-DW-01",
            "md_range": [0, 4650],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2024-04-12",
            "tags": ["offset", "wcr", "reference-well", "mahanadi"],
        },
        "content": """# WCR-MN-DW-01: Well Completion Report: Offset Reference Well MN-DW-01 (illustrative)

## 1. Well Summary
- **Operator**: ONGC Deepwater Operations.
- **Location**: 19.47°N, 87.32°E (3.2 km NW of MN-SM-DW-01).
- **Water Depth**: 1,595 m.
- **Total Depth**: 4,650 m MD.
- **Status**: Safely drilled to TD without significant well-control incidents; plugged and abandoned as an exploration discovery.

## 2. Geological & Stratigraphic Evaluation
- Encountered Upper Miocene compact marine shale from 3,980 m to 4,145 m MD.
- Transition zone observed at 4,145 m with slight dxc reversal.
- Miocene channel sand entered at 4,188 m MD; sand thickness 75 m net pay with high porosity (22-26%).

<!-- page: 1 -->

## 3. Drilling Fluid Performance
- 13-3/8 in casing set at 3,820 m MD (FIT 12.15 ppg).
- 12-1/4 in section drilled with 11.30 ppg SOBM.
- Pore pressure in channel sand measured via wireline formation tester at 11.42 ppg.
- Minor connection gas noted (up to 4.2%), no kick sustained.
""",
    },
    {
        "folder": "wcr",
        "filename": "WCR-MN-DW-02.md",
        "front_matter": {
            "doc_id": "WCR-MN-DW-02",
            "doc_type": "WCR",
            "title": "Well Completion Report: Offset Incident Well MN-DW-02 (illustrative)",
            "well_id": "MN-DW-02",
            "md_range": [0, 4520],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2024-11-20",
            "tags": ["offset", "wcr", "kick", "gas-influx"],
        },
        "content": """# WCR-MN-DW-02: Well Completion Report: Offset Incident Well MN-DW-02 (illustrative)

## 1. Executive Summary
Drilled in Mahanadi deepwater block 1.8 km east of MN-SM-DW-01. At depth 4,195 m MD, while drilling ahead with 11.15 ppg SOBM, the well encountered an underbalanced Miocene turbidite channel sand resulting in a **12 bbl gas influx** with 236 psi SIDPP.

## 2. Influx Event Analysis
- **Casing Shoe**: 13-3/8 in shoe at 3,840 m MD (FIT 12.05 ppg).
- **Encountered Condition**: Normal compaction trend baseline departed at 4,152 m MD. Resistivity declined from 2.8 ohm-m to 1.4 ohm-m; compressional sonic increased from 86 us/ft to 104 us/ft.
- **Kick Mechanism**: Mud weight was kept at initial 11.15 ppg. Top Miocene sand (U3) pressure was 11.48 ppg, creating a 0.33 ppg (150 psi) underbalance.
- **Well Kill Execution**: The well was shut in with the subsea annular preventer. Wait & Weight kill method executed using **11.65 ppg (1.40 SG)** kill mud. 36 hours of NPT incurred.

<!-- page: 1 -->

## 3. Key Operational Recommendations
- **Mandatory Pre-emptive Weight-Up**: For future deepwater wells in this fault compartment, mud weight must be raised to 11.65 ppg *before* penetrating 4,195 m MD.
- **ROP Restriction**: Impose 11–12 m/hr ROP restriction across the sand boundary.
""",
    },
    {
        "folder": "wcr",
        "filename": "WCR-MN-DW-03.md",
        "front_matter": {
            "doc_id": "WCR-MN-DW-03",
            "doc_type": "WCR",
            "title": "Well Completion Report: Offset Loss Incident Well MN-DW-03 (illustrative)",
            "well_id": "MN-DW-03",
            "md_range": [0, 4480],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2025-03-05",
            "tags": ["offset", "wcr", "lost-circulation", "fracture"],
        },
        "content": """# WCR-MN-DW-03: Well Completion Report: Offset Loss Incident Well MN-DW-03 (illustrative)

## 1. Executive Summary
Drilled 2.4 km south-southeast of MN-SM-DW-01. At depth 4,222 m MD, well experienced severe mud losses (28 bbl/hr) following an unmanaged drilling break (ROP 26 m/hr), where annular ECD reached **12.18 ppg**, exceeding the shoe fracture integrity limit (12.10 ppg).

## 2. Sequence of Events
- Mud weight was elevated to 11.70 ppg to protect against sand overpressure.
- At 4,220 m MD, the bit entered a highly porous sand streak; ROP doubled from 13 m/hr to 26 m/hr without driller intervention.
- Cuttings loading in the 12-1/4 in annulus caused downhole ECD to spike to 12.18 ppg.
- The 13-3/8 in casing shoe at 3,860 m broke down, sustaining 28 bbl/hr continuous loss.
- Total mud lost to formation: 310 bbl before LCM pill (calcium carbonate blend 40 ppb) restored partial integrity.

<!-- page: 1 -->

## 3. Crucial Lessons
- In ultra-narrow operating margins ($11.65\\text{ ppg PP}$ vs $12.10\\text{ ppg FIT}$), drilling breaks must be immediately choked by imposing an ROP limit of $\\le 12\\text{ m/hr}$.
""",
    },
    {
        "folder": "wcr",
        "filename": "WCR-MH-112.md",
        "front_matter": {
            "doc_id": "WCR-MH-112",
            "doc_type": "WCR",
            "title": "Well Completion Report: Mumbai High Precedent Well MH-112 (illustrative)",
            "well_id": "MH-112",
            "md_range": [0, 2850],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2021-09-14",
            "tags": ["precedent", "mumbai-high", "carbonate", "differential-sticking"],
        },
        "content": """# WCR-MH-112: Well Completion Report: Mumbai High Precedent Well MH-112 (illustrative)

## 1. Overview
Historic reference well from Mumbai High Basin documenting severe differential sticking and vuggy carbonate losses under excessive overbalance conditions ($> 400\\text{ psi}$).

## 2. Relevance to Deepwater Drilling
Serves as an operational reminder that excessive mud overbalance in permeable sands severely amplifies differential sticking risks and torque spikes.
""",
    },

    # ── INCIDENTS ──
    {
        "folder": "incidents",
        "filename": "INC-MN-DW-02-KICK-4195.md",
        "front_matter": {
            "doc_id": "INC-MN-DW-02-KICK-4195",
            "doc_type": "INCIDENT",
            "title": "Incident Investigation Report: MN-DW-02 Gas Influx at 4,195 m MD (illustrative)",
            "well_id": "MN-DW-02",
            "md_range": [4190, 4200],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2024-10-18",
            "tags": ["incident", "gas-kick", "influx", "underbalance"],
        },
        "content": """# INC-MN-DW-02-KICK-4195: Influx Incident Report (illustrative)

## 1. Event Identification
- **Well**: MN-DW-02
- **Date & Time**: 14-Oct-2024, 03:42 IST
- **Depth**: 4,195 m MD
- **Event Type**: Hydrocarbon Influx / Well Control Event

## 2. Description of Influx
While drilling 12-1/4 in section with 11.15 ppg (1.34 SG) SOBM, the bit penetrated top Miocene turbidite channel sand at 4,195 m MD. Mud log recorded instantaneous gas peak of 18.4% (methane 88%, ethane 7%, propane 5%).
A 12 bbl pit gain was confirmed on the active PVT system.
Well was shut in via soft shut-in protocol:
- SIDPP: 236 psi
- SICP: 310 psi
Calculated formation pore pressure: **11.48 ppg (1.38 SG)**.

<!-- page: 1 -->

## 3. Root Cause Analysis
1. Failure to recognize transition zone geophysical indicators (sonic slowness excursion $> 12\\ \\mu\\text{s/ft}$).
2. Delayed mud weight adjustment due to missing pre-emptive weight-up protocol.
3. Influx killed successfully with 11.65 ppg (1.40 SG) mud. Total NPT: 36.5 hours.
""",
    },
    {
        "folder": "incidents",
        "filename": "INC-MN-DW-03-LOSS-4222.md",
        "front_matter": {
            "doc_id": "INC-MN-DW-03-LOSS-4222",
            "doc_type": "INCIDENT",
            "title": "Incident Investigation Report: MN-DW-03 Mud Losses at 4,222 m MD (illustrative)",
            "well_id": "MN-DW-03",
            "md_range": [4215, 4230],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2025-02-14",
            "tags": ["incident", "losses", "fracture", "ecd-spike"],
        },
        "content": """# INC-MN-DW-03-LOSS-4222: Lost Circulation Incident Report (illustrative)

## 1. Event Identification
- **Well**: MN-DW-03
- **Date & Time**: 11-Feb-2025, 21:15 IST
- **Depth**: 4,222 m MD
- **Event Type**: Annular Overpressure & Formation Breakdown

## 2. Description of Losses
Drilling ahead at 4,222 m MD with 11.70 ppg mud. Bit entered porous channel facies and ROP spiked to 26 m/hr. Annular cuttings loading increased dynamic ECD from 11.88 ppg to **12.18 ppg**, exceeding the 13-3/8 in shoe FIT of 12.10 ppg.
Returns dropped by 28 bbl/hr. PWD tool confirmed shoe breakdown.

<!-- page: 1 -->

## 3. Corrective Actions & Recommendations
- Enforce rigid ROP restriction of 12 m/hr during all drilling breaks in 12-1/4 in hole.
- Implement real-time PWD ECD alarm thresholds set 0.10 ppg below shoe FIT.
""",
    },

    # ── MUD PROGRAMS ──
    {
        "folder": "mud_programs",
        "filename": "MP-MN-SM-DW-01-SEC4.md",
        "front_matter": {
            "doc_id": "MP-MN-SM-DW-01-SEC4",
            "doc_type": "MUD_PROGRAM",
            "title": "Drilling Fluid Program: 12-1/4 in Hole Section (4,120–4,450 m MD) (illustrative)",
            "well_id": "MN-SM-DW-01",
            "md_range": [4120, 4450],
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2026-08-01",
            "tags": ["mud-program", "sobm", "rheology", "barite"],
        },
        "content": """# MP-MN-SM-DW-01-SEC4: Drilling Fluid Program: 12-1/4 in Hole Section (illustrative)

## 1. Section Details & Mud Specifications
- **Hole Size**: 12-1/4 in
- **Interval**: 3,850 m to 4,450 m MD (Section TD)
- **Base Mud**: Low-toxicity Synthetic Oil-Based Mud (SOBM, 80/20 Oil/Water ratio).
- **Initial Mud Density**: 11.20 ppg (1.34 SG).
- **Contingency Weighted Density**: 11.65 ppg (1.40 SG).
- **Target Plastic Viscosity**: 26–30 cP.
- **Target Yield Point**: 16–20 lb/100 ft$^2$.

<!-- page: 1 -->

## 2. Barite Weighting Protocol
- At 4,172 m MD, raise active system density to 11.65 ppg using 87,700 lb API barite.
- Active system volume: 3,100 bbl; Riser volume: 1,950 bbl.
- Verify zero sag and mud weight parity before entering sand at 4,195 m MD.
""",
    },

    # ── LESSONS LEARNED ──
    {
        "folder": "lessons_learned",
        "filename": "LL-MN-DW-02-OVERBALANCE.md",
        "front_matter": {
            "doc_id": "LL-MN-DW-02-OVERBALANCE",
            "doc_type": "LESSON",
            "title": "Lesson Learned: Pre-emptive Weight-Up in Deepwater Transition Zones (illustrative)",
            "well_id": "MN-DW-02",
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2024-11-01",
            "tags": ["lesson", "overbalance", "transition-zone"],
        },
        "content": """# LL-MN-DW-02-OVERBALANCE: Lesson Learned (illustrative)

## Context & Finding
Relying on mud weight increases after penetrating overpressured deepwater sands guarantees a kick due to high transmissibility and fast drilling breaks. Transition zones must be identified early via sonic slowness excursions ($DT > 8\\ \\mu\\text{s/ft}$) and Eaton exponent reversals, triggering weight-up at least 20 m above sand contact.
""",
    },
    {
        "folder": "lessons_learned",
        "filename": "LL-MN-DW-03-ECD-MANAGEMENT.md",
        "front_matter": {
            "doc_id": "LL-MN-DW-03-ECD-MANAGEMENT",
            "doc_type": "LESSON",
            "title": "Lesson Learned: ROP Limiting at Fast Drilling Breaks (illustrative)",
            "well_id": "MN-DW-03",
            "authoring": "synthetic",
            "version": "1.0",
            "date": "2025-02-28",
            "tags": ["lesson", "rop-cap", "ecd", "cuttings-load"],
        },
        "content": """# LL-MN-DW-03-ECD-MANAGEMENT: Lesson Learned (illustrative)

## Context & Finding
Fast penetration in clean sands ($> 25\\text{ m/hr}$) generates dense annular cuttings packs that surge ECD beyond the shoe FIT. In narrow margin drilling, driller must proactively limit ROP to 12 m/hr regardless of drillability.
""",
    },
]


def generate_all() -> None:
    print(f"Generating synthetic knowledge corpus in {SOURCE_DIR}...")
    for doc in DOCUMENTS:
        target_dir = SOURCE_DIR / doc["folder"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / doc["filename"]

        front_matter_yaml = yaml.dump(doc["front_matter"], sort_keys=False).strip()
        full_text = f"---\n{front_matter_yaml}\n---\n\n{doc['content'].strip()}\n"

        target_file.write_text(full_text, encoding="utf-8")
        print(f"  ✓ Written: {doc['folder']}/{doc['filename']} ({len(full_text)} bytes)")

    print("✓ Knowledge corpus generated successfully.")


if __name__ == "__main__":
    generate_all()
