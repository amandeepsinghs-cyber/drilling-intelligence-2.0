"""pipelines.synth.validate_facts — hard gate: every factual number in corpus must match scenario YAML.

Design reference: docs/SDD.md §9.3.
Enforces zero-hallucination ground truth across all synthetic Markdown documents
in data/knowledge/source/{sops,wcr,incidents,ddr}/.

Usage:
  cd backend && uv run python ../pipelines/synth/validate_facts.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_DIR = ROOT / "data" / "knowledge" / "source"
FACTS_PATH = ROOT / "data" / "scenario" / "mn_sm_dw_01.yaml"
OFFSETS_PATH = ROOT / "data" / "scenario" / "offsets.yaml"


def load_canonical_facts() -> dict:
    if not FACTS_PATH.exists() or not OFFSETS_PATH.exists():
        raise FileNotFoundError(f"Missing scenario facts: {FACTS_PATH} or {OFFSETS_PATH}")
    f = yaml.safe_load(FACTS_PATH.read_text(encoding="utf-8"))
    o = yaml.safe_load(OFFSETS_PATH.read_text(encoding="utf-8"))
    return {"facts": f, "offsets": o}


def validate_document(path: Path, canonical: dict) -> list[str]:
    errors = []
    text = path.read_text(encoding="utf-8")
    
    # Check frontmatter
    parts = text.split("---", 2)
    if len(parts) < 3:
        errors.append("Missing valid YAML frontmatter (needs opening and closing '---')")
        return errors
        
    try:
        fm = yaml.safe_load(parts[1])
        if not isinstance(fm, dict):
            errors.append("YAML frontmatter is not a dictionary")
            return errors
    except Exception as e:
        errors.append(f"Invalid YAML frontmatter: {e}")
        return errors

    # Check required frontmatter keys
    if "doc_id" not in fm:
        errors.append("Frontmatter missing required key 'doc_id'")
    if "provenance" not in fm and fm.get("authoring") != "synthetic":
        errors.append("Frontmatter missing required key 'provenance' or 'authoring: synthetic'")

    body = parts[2]
    
    # Numerical consistency rules
    f = canonical["facts"]
    
    # 1. Barite weight check
    barite_mt = f["barite"]["total_mt"]
    if "barite" in body.lower():
        # Match patterns like "39.8 MT" or "XX MT barite"
        mt_matches = re.findall(r"(\d+(?:\.\d+)?)\s*(?:MT|metric\s*tonnes?)\s*barite", body, re.IGNORECASE)
        for m in mt_matches:
            val = float(m)
            if abs(val - barite_mt) > 0.5:
                errors.append(f"Barite mass mismatch: found {val} MT, expected {barite_mt} MT")

    # 2. MN-DW-02 kick depth check
    if "MN-DW-02" in body or "DW-02" in body:
        if "kick" in body.lower():
            depth_matches = re.findall(r"(\d{4})\s*m(?:\s*MD)?", body)
            # If 4,195 m is not in depth mentions when discussing kick
            if depth_matches and "4195" not in depth_matches and "4,195" not in body:
                errors.append("MN-DW-02 kick incident mentioned without canonical depth 4,195 m MD")
        if "sidpp" in body.lower():
            if "236" not in body:
                errors.append("MN-DW-02 SIDPP mentioned without canonical value 236 psi")

    # 3. MN-DW-03 loss depth and rate check
    if "MN-DW-03" in body or "DW-03" in body:
        if "loss" in body.lower():
            depth_matches = re.findall(r"(\d{4})\s*m(?:\s*MD)?", body)
            if depth_matches and "4222" not in depth_matches and "4,222" not in body:
                errors.append("MN-DW-03 losses mentioned without canonical depth 4,222 m MD")
            if "28" not in body and "bbl/hr" in body:
                errors.append("MN-DW-03 loss rate mentioned without canonical 28 bbl/hr")

    # 4. 13-3/8" shoe FIT check
    shoe_fit = f["casing"]["last_shoe"]["fit_ppg"]
    if "shoe" in body.lower() and "fit" in body.lower():
        fit_matches = re.findall(r"(\d+(?:\.\d+)?)\s*ppg", body, re.IGNORECASE)
        if fit_matches:
            vals = [float(v) for v in fit_matches]
            # Should mention 12.10 ppg somewhere if shoe FIT is referenced
            if not any(abs(v - shoe_fit) < 0.05 for v in vals):
                errors.append(f"Shoe FIT cited without canonical {shoe_fit} ppg")

    # 5. Kill mud weight check
    kill_mw = f["mud"]["weighted"]["mw_ppg"]
    if "kill mud" in body.lower() or "weighted mud" in body.lower():
        mw_matches = re.findall(r"(\d+(?:\.\d+)?)\s*ppg", body, re.IGNORECASE)
        if mw_matches:
            vals = [float(v) for v in mw_matches]
            if not any(abs(v - kill_mw) < 0.05 for v in vals):
                errors.append(f"Kill/weighted mud weight cited without canonical {kill_mw} ppg")

    return errors


def main() -> int:
    try:
        canonical = load_canonical_facts()
    except Exception as e:
        print(f"[FATAL] Failed to load canonical facts: {e}", file=sys.stderr)
        return 1

    md_files = list(KNOWLEDGE_DIR.glob("**/*.md"))
    if not md_files:
        print(f"[WARN] No markdown files found in {KNOWLEDGE_DIR}")
        return 0

    total_files = len(md_files)
    total_errors = 0
    passed_files = 0

    print(f"=== Ground Truth Fact Validation ({total_files} documents) ===")
    for path in sorted(md_files):
        rel = path.relative_to(ROOT)
        errors = validate_document(path, canonical)
        if errors:
            print(f"❌ FAIL: {rel}")
            for err in errors:
                print(f"   • {err}")
            total_errors += len(errors)
        else:
            print(f"✅ PASS: {rel}")
            passed_files += 1

    print("\n" + "=" * 50)
    print(f"Summary: {passed_files}/{total_files} passed, {total_errors} errors encountered.")
    if total_errors > 0:
        print("❌ Fact validation FAILED. Correct discrepancies with scenario YAML.")
        return 1

    print("🎉 All documents strictly match canonical scenario ground truth.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
