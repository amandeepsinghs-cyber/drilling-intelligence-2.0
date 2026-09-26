"""pipelines.synth.generate_knowledge_corpus — generate authentic synthetic knowledge corpus.

Produces Markdown documents with YAML front-matter conforming to
data/contracts/knowledge_doc.schema.json, strictly adhering to scenario facts.
All numbers are dynamically read from data/scenario/mn_sm_dw_01.yaml and data/scenario/offsets.yaml.
"""
from __future__ import annotations

import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "knowledge" / "source"
FACTS_PATH = ROOT / "data" / "scenario" / "mn_sm_dw_01.yaml"
OFFSETS_PATH = ROOT / "data" / "scenario" / "offsets.yaml"


def load_yaml(p: Path) -> dict:
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def build_documents() -> list[dict]:
    facts = load_yaml(FACTS_PATH)
    offsets_data = load_yaml(OFFSETS_PATH)
    offsets = offsets_data["offsets"]
    sop_params = offsets_data.get("sop_parameters", {})

    # Shortcuts
    well_id = facts["well"]["id"]
    water_depth = facts["well"]["water_depth_m"]
    shoe = facts["casing"]["last_shoe"]
    shoe_md = shoe["md_m"]
    shoe_fit = shoe["fit_ppg"]
    shoe_fit_sg = round(shoe_fit / 8.345, 2)

    strat = facts["stratigraphy"]
    u2 = next(u for u in strat if u["id"] == "U2")
    u3 = next(u for u in strat if u["id"] == "U3")
    u2_top, u2_base = u2["top_m"], u2["base_m"]
    u3_top, u3_base = u3["top_m"], u3["base_m"]

    sand_top_m = facts["reservoir"]["sand_top_m"]
    sand_pp = facts["pressure"]["pp_sand_top_ppg"]
    sand_pp_sg = round(sand_pp / 8.345, 2)

    init_mw = facts["mud"]["initial"]["mw_ppg"]
    init_sg = round(init_mw / 8.345, 2)
    weighted_mw = facts["mud"]["weighted"]["mw_ppg"]
    weighted_sg = round(weighted_mw / 8.345, 2)
    active_bbl = facts["mud"]["active_system_bbl"]
    riser_bbl = facts["mud"]["riser_volume_bbl"]
    wt_up_loc_m = facts["mud"]["weight_up_location_m"]

    barite = facts["barite"]
    barite_lb = barite["total_lb"]
    barite_mt = barite["total_mt"]
    barite_bags = barite["bags_50kg"]
    barite_gain = barite["volume_gain_bbl"]
    barite_lb_bbl = barite["lb_per_bbl"]

    rop_initial = facts["drilling"]["rop_initial_m_hr"]
    rop_break = facts["drilling"]["rop_drilling_break_m_hr"]
    rop_cap = facts["drilling"]["rop_cap_m_hr"]
    flow_gpm = facts["drilling"]["flow_gpm"]

    dw01 = next(o for o in offsets if o["id"] == "MN-DW-01")
    dw01_wcr = dw01["wcr"]

    dw02 = next(o for o in offsets if o["id"] == "MN-DW-02")
    dw02_inc = dw02["incident"]
    dw02_wcr = dw02["wcr"]

    dw03 = next(o for o in offsets if o["id"] == "MN-DW-03")
    dw03_inc = dw03["incident"]

    mh = next(o for o in offsets if o["id"] == "MH-112")
    mh_inc = mh.get("incident", {})

    sop_sm04 = sop_params.get("ONGC-SM-SOP-04", {})
    sop_mc02 = sop_params.get("ONGC-MC-SOP-02", {})
    sop_hc05 = sop_params.get("ONGC-HC-SOP-05", {})

    dt_excursion = sop_sm04.get("dt_excursion_trigger_us_ft", 8)
    min_ob_psi = sop_sm04.get("min_overbalance_at_sand_psi", 100)
    wt_up_dist_above_sand = sop_sm04.get("weight_up_min_distance_above_sand_m", 20)

    mc02_dur = sop_mc02.get("addition_duration_h", [2.5, 3.0])

    apl_max = sop_hc05.get("apl_max_ppg", 0.35)
    sweep_bbl = sop_hc05.get("sweep_volume_bbl", 20)
    sweep_m = sop_hc05.get("sweep_interval_m", 100)

    docs = [
        # ── SOPS ──
        {
            "folder": "sops",
            "filename": "ONGC-SM-SOP-04.md",
            "front_matter": {
                "doc_id": "ONGC-SM-SOP-04",
                "doc_type": "SOP",
                "title": "Deepwater Narrow-Window Drilling Protocol (illustrative)",
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "2.1",
                "date": "2026-08-15",
                "tags": ["narrow-window", "pore-pressure", "transition-zone", "rop-cap"],
            },
            "content": f"""# ONGC-SM-SOP-04: Deepwater Narrow-Window Drilling Protocol (illustrative)

## 1. Purpose & Scope
This Standard Operating Procedure establishes operational protocols for safely traversing narrow drilling margins in deepwater Mahanadi offshore prospects (including {well_id}, water depth {water_depth:,} m). It specifies mandatory triggers for pre-emptive mud weight increases, drilling break management, and flow checks.

## 2. Responsibilities
- **Company Man / OIM**: Ultimate rig authority; enforces hold points and approves MOC submissions.
- **Drilling Superintendent (RTOC)**: Real-time surveillance lead; monitors LWD sonic/resistivity trends and authorizes weight-up.
- **Mud Engineer**: Formulates SOBM weighting schedule, supervises barite addition, and verifies mud density parity (in/out).
- **Driller**: Immediately executes ROP restriction upon encountering lithological breaks.

<!-- page: 1 -->

## 3. Definitions & Narrow Margin Context
- **Narrow Margin Drilling**: Intervals where the pore pressure (PP) and fracture gradient / casing shoe FIT margin is $\\le 0.65\\text{{ ppg}}$.
- **13-3/8 in Casing Shoe**: Set at {shoe_md:,} m MD with Formation Integrity Test (FIT) established at {shoe_fit:.2f} ppg ({shoe_fit_sg:.2f} SG).
- **Safe Drilling Envelope**: Maximum permissible Equivalent Circulating Density (ECD) must remain below 12.00 ppg to protect the 13-3/8 in shoe.

## 4. Operational Hold Points & Mandatory Triggers
1. **Transition Zone Identification ({u2_top:,} m to {u2_base:,} m MD)**:
   - When compressional slowness ($DT$) increases above the Normal Compaction Trend (NCT) by $> {dt_excursion}\\ \\mu\\text{{s/ft}}$, or resistivity ($R_{{\\text{{deep}}}}$) departs below NCT, enter **High Alert Status**.
   - Background gas trending upward from baseline requires continuous chromatograph inspection ($C_1$ through $C_5$).
2. **Pre-emptive Weight-Up Trigger ({wt_up_loc_m:,} m MD)**:
   - In accordance with offset incident `INC-MN-DW-02-KICK-4195`, mud weight must NOT be kept at {init_mw:.2f} ppg ({init_sg:.2f} SG) entering the pay sand.
   - Mud weight must be raised pre-emptively from {init_mw:.2f} ppg ({init_sg:.2f} SG) to **{weighted_mw:.2f} ppg ({weighted_sg:.2f} SG)** prior to crossing {sand_top_m:,} m MD.
   - This provides a minimum +0.17 ppg (+{min_ob_psi} psi) overbalance against the projected sand pore pressure of {sand_pp:.2f} ppg ({sand_pp_sg:.2f} SG).

<!-- page: 2 -->

## 5. Drilling Break Protocol & ROP Cap
- **Sand Entry at {sand_top_m:,} m MD**:
   - Main reservoir pay (Miocene slope-channel turbidite sandstone) exhibits instantaneous ROP acceleration up to {rop_break} m/hr.
   - **Mandatory Action**: The driller must immediately throttle WOB/RPM to cap ROP at **$\\le {rop_cap}\\text{{ m/hr}}$**.
   - **Flow Check**: Perform a mandatory 15-minute static flow check immediately on penetrating the U3 sand top ({sand_top_m:,} m MD) (pumps off, trip tank monitoring).
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
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "1.4",
                "date": "2026-08-10",
                "tags": ["mud-chemistry", "barite", "rheology", "sobm"],
            },
            "content": f"""# ONGC-MC-SOP-02: Barite Weight-Up & Rheology Sign-Off Procedure (illustrative)

## 1. Purpose & Application
Establishes standardized procedures for synthetic oil-based mud (SOBM) density adjustments using API high-grade barite ($4.20\\text{{ g/cm}}^3$) in deepwater drilling systems. Specifically governs the {init_mw:.2f} ppg to {weighted_mw:.2f} ppg weight-up at {wt_up_loc_m:,} m MD.

## 2. Theoretical Formula & Volume Calculations
Mud weight increase formula:
$$\\text{{Barite (lb/bbl)}} = 1470 \\times \\frac{{W_2 - W_1}}{{35 - W_2}}$$
Where:
- $W_1 = {init_mw:.2f}\\text{{ ppg}}$ (current density)
- $W_2 = {weighted_mw:.2f}\\text{{ ppg}}$ (target density)
- Barite requirement $= {barite_lb_bbl:.1f}\\text{{ lb/bbl}}$ of active system.

For {well_id} active pit volume of {active_bbl:,} bbl:
- Total Barite Required: **{barite_lb:,} lb ({barite_mt:.1f} metric tons / {barite_bags:,} bags of 50 kg)**.
- Expected Pit Volume Gain: **{barite_gain} bbl**.

<!-- page: 1 -->

## 3. Operational Mixing Execution
1. **Addition Rate Limit**:
   - Barite addition rate via mixing hopper must not exceed 15 MT/hr to prevent sagging and polymer shock.
   - Recommended addition duration: {mc02_dur[0]:.1f} to {mc02_dur[1]:.1f} hours across ~1.5 full circulations.
2. **Rheology Control Targets**:
   - Plastic Viscosity ($PV$): target 28 cP.
   - Yield Point ($YP$): maintain target 18 lb/100 ft$^2$.
   - Gel Strengths ($10\\text{{s}} / 10\\text{{m}}$): 12 / 22 lb/100 ft$^2$.
   - Viscosifier / organophilic clay additions to be balanced simultaneously with barite.

## 4. Verification & Sign-Off Criteria
- Mud balance density readings taken every 15 minutes at suction and flowline.
- Drilling SHALL NOT resume until suction and flowline density show parity at ${weighted_mw:.2f} \\pm 0.05\\text{{ ppg}}$ for one complete bottoms-up cycle.
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
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "3.0",
                "date": "2026-08-01",
                "tags": ["moc", "management-of-change", "approvals", "governance"],
            },
            "content": f"""# ONGC-MOC-SOP-07: Mud Program Deviation: Management of Change & Approval Authority (illustrative)

## 1. Objective
Defines formal governance and digital audit trail protocols when operational conditions dictate alteration of approved Well Operations Programs in deepwater blocks.

## 2. Thresholds Requiring Level 2 MOC
Any of the following conditions triggers mandatory Level 2 MOC approval:
- Mud density increase $> 0.2\\text{{ ppg}}$ above approved program.
- Planned entry into overpressured sands with narrow margin $< 1.0\\text{{ ppg}}$.
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
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "1.2",
                "date": "2026-07-20",
                "tags": ["wcr", "reporting", "post-well-analysis", "compliance"],
            },
            "content": f"""# ONGC-WCR-SOP-09: End-of-Well Completion Report Compilation Standard (illustrative)

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
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "2.0",
                "date": "2026-06-12",
                "tags": ["well-control", "flow-check", "shut-in", "bop"],
            },
            "content": f"""# ONGC-WC-SOP-01: Deepwater Well Control: Flow Check & Shut-In Procedure (illustrative)

## 1. Principles of Deepwater Well Control
In deepwater operations from floating vessels, gas influxes dissolve readily in synthetic oil-based mud (SOBM) until reaching shallow depth or riser entry, making early detection at the mudline essential.

## 2. Warning Signs of Influx
- Sudden drilling break (ROP increase $> 50\\%$).
- Increase in flowline return rate.
- Pit gain on active system ($> 5\\text{{ bbl}}$).
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
                "well_id": well_id,
                "authoring": "synthetic",
                "version": "1.8",
                "date": "2026-06-25",
                "tags": ["hole-cleaning", "ecd", "hydraulics", "losses"],
            },
            "content": f"""# ONGC-HC-SOP-05: Hole Cleaning & ECD Management in Deepwater (illustrative)

## 1. Scope
Applies to large-diameter deepwater hole sections (12-1/4 in and 17-1/2 in) where annular fluid velocities must balance hole cleaning against excessive Equivalent Circulating Density (ECD).

## 2. Hydraulic Limits for 12-1/4 in Section across the U3 sand ({u3_top:,}–{u3_base:,} m MD)
- Nominal flow rate: {flow_gpm} gpm.
- Maximum allowable ECD: 12.00 ppg (shoe FIT: {shoe_fit:.2f} ppg).
- Dynamic annular pressure loss must not exceed {apl_max:.2f} ppg equivalent over static mud weight.

<!-- page: 1 -->

## 3. High-ROP Cuttings Management
- When ROP exceeds 25 m/hr, cuttings concentration in the annulus escalates rapidly, elevating ECD by up to 0.40 ppg.
- High-viscosity low-shear sweeps ({sweep_bbl} bbl tandem pills) must be pumped every {sweep_m} m drilled.
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
                "md_range": [0, dw01_wcr["td_md_m"]],
                "authoring": "synthetic",
                "version": "1.0",
                "date": "2024-04-12",
                "tags": ["offset", "wcr", "reference-well", "mahanadi"],
            },
            "content": f"""# WCR-MN-DW-01: Well Completion Report: Offset Reference Well MN-DW-01 (illustrative)

## 1. Well Summary
- **Operator**: ONGC Deepwater Operations.
- **Location**: 19.47°N, 87.32°E ({dw01['distance_km']} km NW of {well_id}).
- **Water Depth**: {dw01_wcr['water_depth_m']:,} m.
- **Total Depth**: {dw01_wcr['td_md_m']:,} m MD.
- **Status**: Safely drilled to TD without significant well-control incidents; plugged and abandoned as an exploration discovery.

## 2. Geological & Stratigraphic Evaluation
- Encountered Upper Miocene compact marine shale from {dw01_wcr['u1_shale_m'][0]:,} m to {dw01_wcr['u1_shale_m'][1]:,} m MD.
- Transition zone observed at {dw01_wcr['u1_shale_m'][1]:,} m with slight dxc reversal.
- Miocene channel sand entered at {dw01_wcr['sand_top_m']:,} m MD; sand thickness {dw01_wcr['net_pay_m']} m net pay with high porosity ({dw01_wcr['phie_pct_range'][0]}-{dw01_wcr['phie_pct_range'][1]}%).

<!-- page: 1 -->

## 3. Drilling Fluid Performance
- 13-3/8 in casing set at {dw01_wcr['shoe_13_375_md_m']:,} m MD (FIT {dw01_wcr['shoe_fit_ppg']:.2f} ppg).
- 12-1/4 in section drilled with {dw01_wcr['mw_ppg']:.2f} ppg SOBM.
- Pore pressure in channel sand measured via wireline formation tester at 11.42 ppg.
- Minor connection gas noted (up to {dw01_wcr['max_conn_gas_pct']}%), no kick sustained.
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
            "content": f"""# WCR-MN-DW-02: Well Completion Report: Offset Incident Well MN-DW-02 (illustrative)

## 1. Executive Summary
Drilled in Mahanadi deepwater block {dw02['distance_km']} km east of {well_id}. At depth {dw02_inc['md_m']:,} m MD, while drilling ahead with {dw02_inc['mw_ppg']:.2f} ppg SOBM, the well encountered an underbalanced Miocene turbidite channel sand resulting in a **{dw02_inc['gain_bbl']} bbl gas influx** with {dw02_inc['sidpp_psi']} psi SIDPP.

## 2. Influx Event Analysis
- **Casing Shoe**: 13-3/8 in shoe at {dw02_wcr['shoe_13_375_md_m']:,} m MD (FIT {dw02_wcr['shoe_fit_ppg']:.2f} ppg).
- **Encountered Condition**: Normal compaction trend baseline departed at {dw02_wcr['nct_departure_md_m']:,} m MD. Resistivity declined from 2.8 ohm-m to 1.4 ohm-m; compressional sonic increased from {dw02_wcr['dt_us_ft']['from']} us/ft to {dw02_wcr['dt_us_ft']['to']} us/ft.
- **Kick Mechanism**: Mud weight was kept at initial {dw02_inc['mw_ppg']:.2f} ppg. Top Miocene sand (U3) pressure was {dw02_inc['formation_pressure_ppg']:.2f} ppg, creating a {dw02_inc['underbalance_ppg']:.2f} ppg ({dw02_inc['sidpp_psi']} psi) underbalance.
- **Well Kill Execution**: The well was shut in with the subsea annular preventer. Wait & Weight kill method executed using **{dw02_inc['kill_mw_ppg']:.2f} ppg ({dw02_inc['kill_mw_sg']:.2f} SG)** kill mud. {dw02_inc['npt_h']:.1f} hours of NPT incurred.

<!-- page: 1 -->

## 3. Key Operational Recommendations
- **Mandatory Pre-emptive Weight-Up**: For future deepwater wells in this fault compartment, mud weight must be raised to {dw02_inc['kill_mw_ppg']:.2f} ppg *before* penetrating {dw02_inc['md_m']:,} m MD.
- **ROP Restriction**: Impose {dw02_inc['rop_restriction_m_hr'][0]}–{dw02_inc['rop_restriction_m_hr'][1]} m/hr ROP restriction across the sand boundary.
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
            "content": f"""# WCR-MN-DW-03: Well Completion Report: Offset Loss Incident Well MN-DW-03 (illustrative)

## 1. Executive Summary
Drilled {dw03['distance_km']} km south-southeast of {well_id}. At depth {dw03_inc['md_m']:,} m MD, well experienced severe mud losses ({dw03_inc['loss_rate_bbl_hr']} bbl/hr) following an unmanaged drilling break (ROP {dw03_inc['rop_m_hr']} m/hr), where annular ECD reached **{dw03_inc['ecd_ppg']:.2f} ppg**, exceeding the shoe fracture integrity limit ({shoe_fit:.2f} ppg).

## 2. Sequence of Events
- Mud weight was elevated to {dw03_inc['mw_ppg']:.2f} ppg to protect against sand overpressure.
- At {dw03_inc['md_m']:,} m MD, the bit entered a highly porous sand streak; ROP doubled from {dw03_inc['rop_before_m_hr']} m/hr to {dw03_inc['rop_m_hr']} m/hr without driller intervention.
- Cuttings loading in the 12-1/4 in annulus caused downhole ECD to spike to {dw03_inc['ecd_ppg']:.2f} ppg.
- The 13-3/8 in casing shoe at {dw03_inc['shoe_13_375_md_m']:,} m broke down, sustaining {dw03_inc['loss_rate_bbl_hr']} bbl/hr continuous loss.
- Total mud lost to formation: {dw03_inc['total_loss_bbl']} bbl before LCM pill (calcium carbonate blend {dw03_inc['lcm_ppb']} ppb) restored partial integrity.

<!-- page: 1 -->

## 3. Crucial Lessons
- In ultra-narrow operating margins (${weighted_mw:.2f}\\text{{ ppg PP}}$ vs ${shoe_fit:.2f}\\text{{ ppg FIT}}$), drilling breaks must be immediately choked by imposing an ROP limit of $\\le {rop_cap}\\text{{ m/hr}}$.
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
                "md_range": [0, mh_inc.get("md_m", 2850)],
                "authoring": "synthetic",
                "version": "1.0",
                "date": "2021-09-14",
                "tags": ["precedent", "mumbai-high", "carbonate", "differential-sticking"],
            },
            "content": f"""# WCR-MH-112: Well Completion Report: Mumbai High Precedent Well MH-112 (illustrative)

## 1. Overview
Historic reference well from Mumbai High Basin documenting severe differential sticking and vuggy carbonate losses under excessive overbalance conditions ($> 400\\text{{ psi}}$).

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
            "content": f"""# INC-MN-DW-02-KICK-4195: Influx Incident Report (illustrative)

## 1. Event Identification
- **Well**: MN-DW-02
- **Date & Time**: 14-Oct-2024, 03:42 IST
- **Depth**: {dw02_inc['md_m']:,} m MD
- **Event Type**: Hydrocarbon Influx / Well Control Event

## 2. Description of Influx
While drilling 12-1/4 in section with {dw02_inc['mw_ppg']:.2f} ppg ({dw02_inc['mw_sg']:.2f} SG) SOBM, the bit penetrated top Miocene turbidite channel sand at {dw02_inc['md_m']:,} m MD. Mud log recorded instantaneous gas peak of {dw02_inc['gas_peak_pct']}% (methane 88%, ethane 7%, propane 5%).
A {dw02_inc['gain_bbl']} bbl pit gain was confirmed on the active PVT system.
Well was shut in via soft shut-in protocol:
- SIDPP: {dw02_inc['sidpp_psi']} psi
- SICP: {dw02_inc['sicp_psi']} psi
Calculated formation pore pressure: **{dw02_inc['formation_pressure_ppg']:.2f} ppg ({round(dw02_inc['formation_pressure_ppg'] / 8.345, 2):.2f} SG)**.

<!-- page: 1 -->

## 3. Root Cause Analysis
1. Failure to recognize transition zone geophysical indicators (sonic slowness excursion $> 12\\ \\mu\\text{{s/ft}}$).
2. Delayed mud weight adjustment due to missing pre-emptive weight-up protocol.
3. Influx killed successfully with {dw02_inc['kill_mw_ppg']:.2f} ppg ({dw02_inc['kill_mw_sg']:.2f} SG) mud. Total NPT: {dw02_inc['npt_h']:.1f} hours.
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
            "content": f"""# INC-MN-DW-03-LOSS-4222: Lost Circulation Incident Report (illustrative)

## 1. Event Identification
- **Well**: MN-DW-03
- **Date & Time**: 11-Feb-2025, 21:15 IST
- **Depth**: {dw03_inc['md_m']:,} m MD
- **Event Type**: Annular Overpressure & Formation Breakdown

## 2. Description of Losses
Drilling ahead at {dw03_inc['md_m']:,} m MD with {dw03_inc['mw_ppg']:.2f} ppg mud. Bit entered porous channel facies and ROP spiked to {dw03_inc['rop_m_hr']} m/hr. Annular cuttings loading increased dynamic ECD from {dw03_inc['ecd_before_ppg']:.2f} ppg to **{dw03_inc['ecd_ppg']:.2f} ppg**, exceeding the 13-3/8 in shoe FIT of {shoe_fit:.2f} ppg.
Returns dropped by {dw03_inc['loss_rate_bbl_hr']} bbl/hr. PWD tool confirmed shoe breakdown.

<!-- page: 1 -->

## 3. Corrective Actions & Recommendations
- Enforce rigid ROP restriction of {rop_cap} m/hr during all drilling breaks in 12-1/4 in hole.
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
                "title": f"Drilling Fluid Program: 12-1/4 in Hole Section ({facts['well']['live_interval_m']['start']}–{facts['well']['live_interval_m']['td']} m MD) (illustrative)",
                "well_id": well_id,
                "md_range": [facts["well"]["live_interval_m"]["start"], facts["well"]["live_interval_m"]["td"]],
                "authoring": "synthetic",
                "version": "1.0",
                "date": "2026-08-01",
                "tags": ["mud-program", "sobm", "rheology", "barite"],
            },
            "content": f"""# MP-MN-SM-DW-01-SEC4: Drilling Fluid Program: 12-1/4 in Hole Section (illustrative)

## 1. Section Details & Mud Specifications
- **Hole Size**: 12-1/4 in
- **Interval**: {shoe_md:,} m to {facts['well']['live_interval_m']['td']:,} m MD (Section TD)
- **Base Mud**: Low-toxicity Synthetic Oil-Based Mud (SOBM, 80/20 Oil/Water ratio).
- **Initial Mud Density**: {init_mw:.2f} ppg ({init_sg:.2f} SG).
- **Contingency Weighted Density**: {weighted_mw:.2f} ppg ({weighted_sg:.2f} SG).
- **Target Plastic Viscosity**: 26–30 cP.
- **Target Yield Point**: 16–20 lb/100 ft$^2$.

<!-- page: 1 -->

## 2. Barite Weighting Protocol
- At {wt_up_loc_m:,} m MD, raise active system density to {weighted_mw:.2f} ppg using {barite_lb:,} lb API barite.
- Active system volume: {active_bbl:,} bbl; Riser volume: {riser_bbl:,} bbl.
- Verify zero sag and mud weight parity before entering sand at {sand_top_m:,} m MD.
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
            "content": f"""# LL-MN-DW-02-OVERBALANCE: Lesson Learned (illustrative)

## Context & Finding
Relying on mud weight increases after penetrating overpressured deepwater sands guarantees a kick due to high transmissibility and fast drilling breaks. Transition zones must be identified early via sonic slowness excursions ($DT > {dt_excursion}\\ \\mu\\text{{s/ft}}$) and Eaton exponent reversals, triggering weight-up at least {wt_up_dist_above_sand} m above sand contact.
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
            "content": f"""# LL-MN-DW-03-ECD-MANAGEMENT: Lesson Learned (illustrative)

## Context & Finding
Fast penetration in clean sands ($> 25\\text{{ m/hr}}$) generates dense annular cuttings packs that surge ECD beyond the shoe FIT. In narrow margin drilling, driller must proactively limit ROP to {rop_cap} m/hr regardless of drillability.
""",
        },
    ]
    return docs


def generate_all() -> None:
    docs = build_documents()
    print(f"Generating {len(docs)} synthetic knowledge corpus documents in {SOURCE_DIR}...")
    for doc in docs:
        target_dir = SOURCE_DIR / doc["folder"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / doc["filename"]

        front_matter_yaml = yaml.dump(doc["front_matter"], sort_keys=False).strip()
        full_text = f"---\n{front_matter_yaml}\n---\n\n{doc['content'].strip()}\n"

        target_file.write_text(full_text, encoding="utf-8")
        print(f"  ✓ Written: {doc['folder']}/{doc['filename']} ({len(full_text)} bytes)")

    print(f"✓ Knowledge corpus generated successfully ({len(docs)} documents).")


if __name__ == "__main__":
    generate_all()
