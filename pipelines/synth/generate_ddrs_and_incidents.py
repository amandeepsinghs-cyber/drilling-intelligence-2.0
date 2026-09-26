"""pipelines.synth.generate_ddrs_and_incidents — generate DDRs and incident write-ups.

Reads data/scenario/shift_notes.yaml, data/scenario/mn_sm_dw_01.yaml, and
data/scenario/offsets.yaml to generate authentic Markdown documents with YAML front-matter
conforming to data/contracts/knowledge_doc.schema.json and pipelines/synth/validate_facts.py.
"""
from __future__ import annotations

import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "knowledge" / "source"
SHIFT_NOTES_PATH = ROOT / "data" / "scenario" / "shift_notes.yaml"
FACTS_PATH = ROOT / "data" / "scenario" / "mn_sm_dw_01.yaml"
OFFSETS_PATH = ROOT / "data" / "scenario" / "offsets.yaml"


def load_yaml(p: Path) -> dict:
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def generate_ddrs_from_shift_notes() -> list[dict]:
    notes = load_yaml(SHIFT_NOTES_PATH)
    facts = load_yaml(FACTS_PATH)
    shoe = facts["casing"]["last_shoe"]
    shoe_md = shoe["md_m"]
    shoe_fit = shoe["fit_ppg"]
    active_bbl = facts["mud"]["active_system_bbl"]

    shifts = notes.get("shifts", [])
    ddr_docs = []

    for shift in shifts:
        sid = shift["shift_id"]
        date = shift["date"]
        tour = shift["tour"]
        md_start = shift["md_start_m"]
        md_end = shift["md_end_m"]
        rop = shift["rop_avg_m_hr"]
        mw_in = shift["mw_in_ppg"]
        mw_out = shift["mw_out_ppg"]
        ecd = shift["ecd_ppg"]
        ops = shift["operations"]
        handover = shift["handover_notes"].replace(" (₹45.2 Cr ROI)", "").replace(" (₹45.2 Cr)", "").replace(" ₹45.2 Cr", "")
        driller = shift["driller"]

        doc_id = f"DDR-MN-SM-DW-01-{sid}"
        title = f"Daily Drilling Report: {sid} ({date} {tour}) (illustrative)"

        # Mud weight in ppg and SG (sg = ppg / 8.345)
        sg_in = round(mw_in / 8.345, 2)
        sg_out = round(mw_out / 8.345, 2)

        content = f"""# {doc_id}: {title}

## 1. General Well & Shift Data
- **Well Identifier**: {facts['well']['id']} ({facts['well']['basin']})
- **Operator**: ONGC Deepwater Operations (Project {facts['well']['program'].split(' (')[0]})
- **Date**: {date}
- **Tour**: {tour}
- **Depth Interval**: {md_start:.1f} m to {md_end:.1f} m MD
- **Progress**: {md_end - md_start:.1f} m (Average ROP: {rop:.1f} m/hr)
- **Current Hole Section**: 12-1/4 in open hole (13-3/8 in casing shoe at {shoe_md:,} m MD, FIT {shoe_fit:.2f} ppg)

<!-- page: 1 -->

## 2. Drilling Fluid & Hydraulic Summary
- **Active Mud Weight In**: {mw_in:.2f} ppg ({sg_in:.2f} SG)
- **Active Mud Weight Out**: {mw_out:.2f} ppg ({sg_out:.2f} SG)
- **Annular Equivalent Circulating Density (ECD)**: {ecd:.2f} ppg
- **Margin to Casing Shoe FIT ({shoe_fit:.2f} ppg)**: {shoe_fit - ecd:+.2f} ppg
- **Active System Volume**: {active_bbl:,} bbl SOBM

## 3. 12-Hour Operational Chronology
- **06:00 - 18:00 / 18:00 - 06:00**: {ops}
- **LWD Telemetry**: Continuous decoding of GR, RDEP, DT, RHOB, NPHI.

## 4. Handover Notes & Safety Observation
- **Handover Summary**: {handover}
- **Well Control Status**: Normal / No unmanaged influx.
- **Tour Supervisor**: {driller} (Role: Tour Driller)
- **Approval Sign-off**: Drilling Superintendent & Company Man
"""

        ddr_docs.append({
            "folder": "ddr",
            "filename": f"{doc_id}.md",
            "front_matter": {
                "doc_id": doc_id,
                "doc_type": "DDR",
                "title": title,
                "well_id": facts["well"]["id"],
                "md_range": [float(md_start), float(md_end)],
                "date": date,
                "authoring": "synthetic",
                "version": "1.0",
                "tags": ["ddr", "shift-report", "operations", sid.lower()],
            },
            "content": content,
        })

    return ddr_docs


def generate_additional_incidents() -> list[dict]:
    facts = load_yaml(FACTS_PATH)
    offsets_data = load_yaml(OFFSETS_PATH)
    offsets = offsets_data["offsets"]

    dw02 = next(o for o in offsets if o["id"] == "MN-DW-02")
    dw02_inc = dw02["incident"]

    mh = next(o for o in offsets if o["id"] == "MH-112")
    mh_inc = mh.get("incident", {})

    warn_trig = facts["triggers"]["T3_PRESSURE_RAMP"]
    dxc_m = warn_trig["conditions"]["dxc_reversal_from_m"]
    warn_m = warn_trig["md_m"]

    sand_cp = next(c for c in facts["checkpoints"] if c["label"] == "Sand top (offset kick depth)")
    sand_ob_psi = sand_cp["overbalance_psi"]
    warn_cp = next(c for c in facts["checkpoints"] if c["label"] == "Warning point")

    sand_top_m = facts["reservoir"]["sand_top_m"]
    sand_pp = facts["pressure"]["pp_sand_top_ppg"]
    init_mw = facts["mud"]["initial"]["mw_ppg"]
    weighted_mw = facts["mud"]["weighted"]["mw_ppg"]
    weighted_sg = round(weighted_mw / 8.345, 2)
    shoe = facts["casing"]["last_shoe"]
    shoe_fit = shoe["fit_ppg"]
    rop_cap = facts["drilling"]["rop_cap_m_hr"]

    incidents = []

    # Incident 1: INC-MN-SM-DW-01-WARN-4172 (Near-Miss Hazard Preemption)
    incidents.append({
        "folder": "incidents",
        "filename": "INC-MN-SM-DW-01-WARN-4172.md",
        "front_matter": {
            "doc_id": "INC-MN-SM-DW-01-WARN-4172",
            "doc_type": "INCIDENT",
            "title": f"Hazard Preemption & Near-Miss Log: Overpressure Ramp at {warn_m:,} m MD (illustrative)",
            "well_id": facts["well"]["id"],
            "md_range": [float(facts["stratigraphy"][1]["top_m"]), float(sand_top_m)],
            "date": "2026-09-21",
            "authoring": "synthetic",
            "version": "1.0",
            "tags": ["incident", "near-miss", "overpressure", "watchdog", "pre-emption"],
        },
        "content": f"""# INC-MN-SM-DW-01-WARN-4172: Hazard Preemption & Near-Miss Log (illustrative)

## 1. Executive Summary
On 2026-09-21 at 22:45 UTC, while drilling 12-1/4 in open hole at {warn_m:,} m MD, the Sagar Drishti agentic watchdog identified a severe pore pressure ramp in the Upper Miocene transition zone (U2). Sensor fusion detected a dxc trend reversal from {dxc_m:,} m MD, acoustic sonic slowness excursion of +12 μs/ft above normal compaction trend (NCT), and connection gas rising from {warn_cp['conn_gas_pct']['from']}% to {warn_cp['conn_gas_pct']['to']}%. Lookahead geomechanics predicted pore pressure ramping to {sand_pp:.2f} ppg at the top Miocene U3 pay sand ({sand_top_m:,} m MD), which would have left the well {abs(warn_cp['overbalance_if_unchanged_psi']):,} psi underbalanced with active {init_mw:.2f} ppg mud. Immediate pre-emptive weight-up prevented a recurrence of offset incident `INC-MN-DW-02-KICK-4195` (where MN-DW-02 took a {dw02_inc['gain_bbl']} bbl gas kick with {dw02_inc['sidpp_psi']} psi SIDPP at {dw02_inc['md_m']:,} m MD).

<!-- page: 1 -->

## 2. Chronological Sequence of Events
- **2026-09-21 20:30 UTC ({facts['stratigraphy'][1]['top_m']:,} m MD)**: Bit entered basal seal. Initial subtle departure on corrected d-exponent noted.
- **2026-09-21 22:15 UTC ({dxc_m:,} m MD)**: dxc reversal and sonic DT departing from the normal compaction trend.
- **2026-09-21 22:45 UTC ({warn_m:,} m MD)**: Connection gas spiked to 2.4%. Agent fired proactive voice warning.
- **2026-09-21 23:00 UTC ({warn_m:,} m MD)**: Driller stopped rotary, spaced out, and conducted a 15-minute static flow check. Flow check was negative.
- **2026-09-22 01:30 UTC**: Formal {facts['ids']['memo_id']} approved. Commenced barite addition of {facts['barite']['total_mt']} MT barite ({facts['barite']['bags_50kg']:,} bags of 50 kg) to weight active system to {weighted_mw:.2f} ppg ({weighted_sg:.2f} SG).
- **2026-09-22 05:45 UTC**: Mud weight in/out parity confirmed at {weighted_mw:.2f} ppg. Resumed drilling with +{sand_ob_psi} psi overbalance.

## 3. Root Cause & Contributing Factors
- **Centroid Effect**: Rapid structural steepening in the Miocene channel turbidite charged the crestal sand to {sand_pp:.2f} ppg.
- **Narrow Margin**: Upper loss threshold capped by 13-3/8 in casing shoe FIT at {shoe_fit:.2f} ppg, requiring precise ECD management.

## 4. Corrective & Preventive Actions
- Mud weight was elevated pre-emptively to {weighted_mw:.2f} ppg ({weighted_sg:.2f} SG) kill mud before entering {sand_top_m:,} m MD sand contact.
- ROP capped at {rop_cap} m/hr during sand penetration to maintain circulating ECD below {shoe_fit:.2f} ppg shoe FIT.
- Avoided {dw02_inc['npt_h']:.1f} hours of NPT.

## 5. Formal Sign-off
- **Company Man**: Authorized
- **Drilling Superintendent**: Approved
- **Lead Geoscientist**: Verified
""",
    })

    # Incident 2: INC-MH-112-DIFF-STICK-2850 (Mumbai High Reference Well)
    incidents.append({
        "folder": "incidents",
        "filename": "INC-MH-112-DIFF-STICK-2850.md",
        "front_matter": {
            "doc_id": "INC-MH-112-DIFF-STICK-2850",
            "doc_type": "INCIDENT",
            "title": f"Historical Incident: Carbonate Losses & Differential Sticking in {mh['id']} (illustrative)",
            "well_id": mh["id"],
            "md_range": [2800.0, 2900.0],
            "date": "2023-04-14",
            "authoring": "synthetic",
            "version": "1.0",
            "tags": ["incident", "losses", "differential-sticking", "mumbai-high", "carbonate"],
        },
        "content": f"""# INC-MH-112-DIFF-STICK-2850: Historical Carbonate Losses & Sticking (illustrative)

## 1. Incident Overview
During exploration drilling on Mumbai High reference well {mh['id']} in fractured Miocene limestone, total fluid losses of {mh_inc.get('loss_rate_bbl_hr', 45)} bbl/hr occurred when drilling overbalanced through a depleted vuggy zone at {mh_inc.get('md_m', 2850):,} m MD. Continued pipe manipulation while attempting to mix LCM led to differential sticking of the 8-1/2 in BHA against permeable limestone filter cake.

<!-- page: 1 -->

## 2. Sequence of Events
- **Day 14 04:30**: Drilling in limestone at {mh_inc.get('md_m', 2850):,} m MD with {mh_inc.get('mw_ppg', 10.80):.2f} ppg mud. Sudden loss of returns observed; pit level dropped {mh_inc.get('pit_drop_bbl', 35)} bbl in 45 minutes.
- **Day 14 05:20**: Stopped pumps to perform dynamic loss assessment. Static losses stabilized at {mh_inc.get('static_loss_bbl_hr', 20)} bbl/hr.
- **Day 14 06:15**: Attempted to pull off bottom; string became differentially stuck with 80 klbf overpull.
- **Day 14 11:00**: Spotted {mh_inc.get('freeing_pill_bbl', 50)} bbl hydrocarbon-based freeing pipe pill around BHA.
- **Day 15 02:00**: String jarred free after {mh_inc.get('jarring_h', 14.5):.1f} hours of jarring operations. Total NPT incurred: {mh_inc.get('npt_h', 48.0):.1f} hours.

## 3. Lessons for Deepwater Project Samudra Manthan
- In transition zones and depleted sections, overbalance must be tightly constrained to prevent differential sticking.
- When drilling narrow margins in {facts['well']['id']}, maintaining ECD strictly within the {sand_pp:.2f} ppg pore pressure to {shoe_fit:.2f} ppg shoe FIT envelope is essential to prevent both kicks and severe loss-induced pipe sticking.
""",
    })

    return incidents


def main() -> None:
    ddrs = generate_ddrs_from_shift_notes()
    incidents = generate_additional_incidents()
    all_docs = ddrs + incidents

    print(f"Generating {len(all_docs)} additional documents (8 DDRs + 2 Incidents)...")
    for doc in all_docs:
        target_dir = SOURCE_DIR / doc["folder"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / doc["filename"]

        fm_yaml = yaml.dump(doc["front_matter"], sort_keys=False).strip()
        full_text = f"---\n{fm_yaml}\n---\n\n{doc['content'].strip()}\n"
        target_file.write_text(full_text, encoding="utf-8")
        print(f"  ✓ Written: {doc['folder']}/{doc['filename']} ({len(full_text)} bytes)")

    print(f"✓ Successfully generated {len(all_docs)} synthetic knowledge documents.")


if __name__ == "__main__":
    main()
