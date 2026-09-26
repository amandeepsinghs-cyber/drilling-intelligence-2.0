"""pipelines.synth.fact_gate — O3 / P0-4: every number+unit shown or spoken must come from the scenario YAMLs.

Scans
  * corpus      data/knowledge/source/**/*.md           — number+unit must be canonical (YAML) or allow-listed
  * prompts     config/prompts/*.md                      — same; canonical literals → WARN (should use {{interpolation}})
  * code        frontend/src/**/*.ts(x), backend/app/agent/*.py
                  - number+unit inside string literals (after removing ${...}/{...} holes)
                  - fallbacks `?? N`, `.get("k", N)`, default args `name: float = N`
                  canonical literal → WARN (hardcoded fact, read it from YAML); unknown → ERROR
  * frames      frontend/public/mocks/frames.json        — each checkpoint's MW/ECD/PP/ROP equals the curve at its depth

Suppress a single line with a trailing comment containing `facts-ok` (give a reason).
Allow-list: pipelines/synth/facts_allowlist.yaml (value → reason), for derived / display / physics constants.

Exit code: 1 if any ERROR (or any WARN with --strict). Report: data/processed/fact_gate_report.md
"""
from __future__ import annotations

import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SCEN = ROOT / "data" / "scenario"
YAMLS = ["mn_sm_dw_01.yaml", "offsets.yaml", "turns.yaml", "shift_notes.yaml", "profiles.yaml"]
ALLOW = Path(__file__).with_name("facts_allowlist.yaml")
REPORT = ROOT / "data" / "processed" / "fact_gate_report.md"

UNITS = [
    "bbl/hr", "lb/bbl", "m/hr", "µs/ft", "us/ft", "ppg", "psi", "bbl", "MT", "ppb", "SG", "km", "hrs", "hr",
    "hours", "mD", "API", "gpm", "bags", "minutes", "min", "klb", "rpm", "m MD", "m TVD", "m", "%",
]
UNIT_RE = "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True))
_N = r"-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?"
# optional range "A–B unit" / "A-B unit" / "A to B unit": both ends are checked
NUM_UNIT = re.compile(rf"(?<![\w.$/,–-])({_N})(?:\s?(?:–|-|to)\s?({_N}))?\s?({UNIT_RE})(?![A-Za-z/])")


@dataclass
class Finding:
    level: str  # ERROR | WARN
    where: str
    line: int
    value: float
    unit: str
    text: str
    why: str


# ───────────────────────── canonical set ─────────────────────────
def _walk(x, out: list[float]):
    if isinstance(x, bool):
        return
    if isinstance(x, (int, float)):
        out.append(float(x))
    elif isinstance(x, dict):
        for v in x.values():
            _walk(v, out)
    elif isinstance(x, list):
        for v in x:
            _walk(v, out)


def canonical_values() -> set[float]:
    vals: list[float] = []
    for name in YAMLS:
        p = SCEN / name
        if p.exists():
            _walk(yaml.safe_load(p.read_text(encoding="utf-8")), vals)
    vals += derived_values()
    out: set[float] = set()
    for v in vals:
        for w in (v, abs(v)):
            out.add(round(w, 4))
            for d in (0, 1, 2):
                out.add(round(w, d))
            if 0 < w <= 1:  # fractions shown as percent (0.71 → 71 %)
                out.add(round(w * 100, 1))
                out.add(round(w * 100))
    return out


PPG_PER_SG = 8.345  # must equal backend/app/physics/units.py


def derived_values() -> list[float]:
    """Numbers generators legitimately compute from YAML: SG of every ppg, FIT−ECD margins, shift progress."""
    f = yaml.safe_load((SCEN / "mn_sm_dw_01.yaml").read_text(encoding="utf-8"))
    sn = yaml.safe_load((SCEN / "shift_notes.yaml").read_text(encoding="utf-8")) if (SCEN / "shift_notes.yaml").exists() else {}
    fit = float(f["casing"]["last_shoe"]["fit_ppg"])
    out: list[float] = []
    ppgs: list[float] = []
    for s in (sn or {}).get("shifts", []):
        out.append(float(s["md_end_m"]) - float(s["md_start_m"]))
        if "ecd_ppg" in s:
            out.append(round(fit - float(s["ecd_ppg"]), 2))
        ppgs += [float(s[k]) for k in ("mw_in_ppg", "mw_out_ppg", "ecd_ppg") if k in s]
        for v in s.values():  # ops free text in the canonical shift log (DDRs render it verbatim)
            if isinstance(v, str):
                for m in NUM_UNIT.finditer(v):
                    out += [_num(g) for g in (m.group(1), m.group(2)) if g]
    for cp in f.get("checkpoints", []):
        if "ecd_ppg" in cp:
            out.append(round(fit - float(cp["ecd_ppg"]), 2))
        ppgs += [float(cp[k]) for k in ("mw_ppg", "ecd_ppg", "pp_ppg", "pp_forecast_ppg") if k in cp]
    out += [round(p / PPG_PER_SG, 2) for p in ppgs]
    return out


def allowlist() -> dict[tuple[float, str], str]:
    """facts_allowlist.yaml: `values: {"30 m": reason, "50 %": reason}` — value + unit, so '30 m' does not allow '30 bbl'."""
    if not ALLOW.exists():
        return {}
    raw = yaml.safe_load(ALLOW.read_text(encoding="utf-8")) or {}
    out: dict[tuple[float, str], str] = {}
    for k, v in (raw.get("values") or {}).items():
        m = re.fullmatch(rf"\s*({_N})\s*(.*?)\s*", str(k))
        if m:
            out[(round(_num(m.group(1)), 4), m.group(2))] = str(v)
    return out


def _num(s: str) -> float:
    return float(s.replace(",", ""))


def _known(v: float, canon: set[float], allow: dict[tuple[float, str], str], unit: str = "") -> str | None:
    for w in (round(v, 4), round(abs(v), 4)):
        if w in canon:
            return "canonical"
        if (w, unit) in allow:
            return "allow"
    return None


# ───────────────────────── scanners ─────────────────────────
STRING_RE = re.compile(r"`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"")
HOLE_RE = re.compile(r"\$\{[^}]*\}|\{\{[^}]*\}\}")
FALLBACK_RES = [
    re.compile(r"\?\?\s*(-?\d+(?:\.\d+)?)\b"),                               # TS: x ?? 11.2
    re.compile(r"\.get\(\s*[\"'][^\"']+[\"']\s*,\s*(-?\d+(?:\.\d+)?)\s*\)"),  # py: d.get("k", 11.2)
    re.compile(r"\b\w+\s*:\s*float\s*=\s*(-?\d+(?:\.\d+)?)"),                 # py: mw: float = 11.2
]
TRIVIAL = {0.0, 1.0, 2.0, 100.0}


PY_HOLE_RE = re.compile(r"\{[^{}\n]*\}")


def multiline_string_lines(text: str) -> set[int]:
    """1-based line numbers that sit inside a multi-line string (''' / \"\"\" / JS template literal)."""
    inside: set[int] = set()
    delim: str | None = None
    for ln, line in enumerate(text.splitlines(), 1):
        i = 0
        started_inside = delim is not None
        while i < len(line):
            if delim is None:
                if line.startswith(('"""', "'''"), i):
                    delim, i = line[i:i + 3], i + 3
                    continue
                if line[i] == "`":
                    delim, i = "`", i + 1
                    continue
                if line[i] in "\"'":  # skip ordinary one-line strings
                    q = line[i]
                    j = i + 1
                    while j < len(line) and line[j] != q:
                        j += 2 if line[j] == "\\" else 1
                    i = j + 1
                    continue
                if line[i] == "#" or line.startswith("//", i):
                    break
                i += 1
            else:
                if line.startswith(delim, i):
                    delim, i = None, i + len(delim)
                    continue
                i += 2 if line[i] == "\\" else 1
        if started_inside or delim is not None:
            inside.add(ln)
    return inside


def scan_text(where: str, text: str, canon, allow, *, code: bool, prose_warn: bool) -> list[Finding]:
    out: list[Finding] = []
    ml = multiline_string_lines(text) if code else set()
    for ln, line in enumerate(text.splitlines(), 1):
        if "facts-ok" in line:
            continue
        if code and ln not in ml and line.lstrip().startswith(("//", "#", "*", "/*")):
            continue
        if code and ln in ml:
            segments = [PY_HOLE_RE.sub(" ", HOLE_RE.sub(" ", line))]
        else:
            segments = [HOLE_RE.sub(" ", m.group(0)) for m in STRING_RE.finditer(line)] if code else [HOLE_RE.sub(" ", line)]
        for seg in segments:
            for m in NUM_UNIT.finditer(seg):
                unit = m.group(3)
                for g in (m.group(1), m.group(2)):
                    if g is None:
                        continue
                    v = _num(g)
                    k = _known(v, canon, allow, unit)
                    if k is None:
                        out.append(Finding("ERROR", where, ln, v, unit, line.strip()[:140], "number not in scenario YAML / allow-list"))
                    elif k == "canonical" and prose_warn and v not in TRIVIAL:
                        out.append(Finding("WARN", where, ln, v, unit, line.strip()[:140], "hardcoded fact — read/interpolate from YAML"))
        if code:
            for rx in FALLBACK_RES:
                for m in rx.finditer(line):
                    v = float(m.group(1))
                    if v in TRIVIAL:
                        continue
                    k = _known(v, canon, allow)
                    if k == "canonical":
                        out.append(Finding("WARN", where, ln, v, "", line.strip()[:140], "fallback/default duplicates a YAML fact — read it (or fail loudly)"))
                    elif k is None:
                        out.append(Finding("ERROR", where, ln, v, "", line.strip()[:140], "fallback/default is an unknown number"))
    return out


def scan_frames(canon_yaml: dict) -> list[Finding]:
    p = ROOT / "frontend" / "public" / "mocks" / "frames.json"
    if not p.exists():
        return []
    d = json.loads(p.read_text())
    md, cols = d["md_m"], d["columns"]
    idx = lambda depth: min(range(len(md)), key=lambda i: abs(md[i] - depth))  # noqa: E731
    checks = {"mw_ppg": ("mud.MW_IN_PPG", 0.02), "ecd_ppg": ("derived.ECD", 0.02),
              "pp_ppg": ("derived.PP", 0.02), "rop_m_hr": ("drilling.ROP", 1.0)}
    out: list[Finding] = []
    for cp in canon_yaml.get("checkpoints", []):
        i = idx(cp.get("frame_md_m", cp["md_m"]))
        for key, (col, tol) in checks.items():
            if key in cp and col in cols and cols[col][i] is not None:
                got = float(cols[col][i])
                if abs(got - float(cp[key])) > tol:
                    out.append(Finding("ERROR", "frames.json", 0, got, key, f"checkpoint '{cp['label']}' @ {cp['md_m']} m",
                                       f"curve {col}={got:.2f} ≠ YAML {key}={cp[key]}"))
    return out


# ───────────────────────── main ─────────────────────────
def run(strict: bool = False) -> int:
    canon, allow = canonical_values(), allowlist()
    facts_yaml = yaml.safe_load((SCEN / "mn_sm_dw_01.yaml").read_text(encoding="utf-8"))
    findings: list[Finding] = []

    for p in sorted((ROOT / "data" / "knowledge" / "source").glob("**/*.md")):
        if "public_reference" in p.parts or "legacy_scans" in p.parts:
            continue
        findings += scan_text(str(p.relative_to(ROOT)), p.read_text(encoding="utf-8"), canon, allow, code=False, prose_warn=False)
    for p in sorted((ROOT / "config" / "prompts").glob("*.md")):
        text = p.read_text(encoding="utf-8")
        findings += scan_text(str(p.relative_to(ROOT)), text, canon, allow, code=False, prose_warn=True)
        for ln, line in enumerate(text.splitlines(), 1):
            for m in re.finditer(r"\{\{\s*([A-Za-z0-9_.]+)\s*\}\}", line):
                cur: object = facts_yaml
                for part in m.group(1).split("."):
                    if isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
                        cur = cur[int(part)]
                    elif isinstance(cur, dict) and part in cur:
                        cur = cur[part]
                    else:
                        findings.append(Finding("ERROR", str(p.relative_to(ROOT)), ln, math.nan, "", line.strip()[:140],
                                                f"placeholder {{{{{m.group(1)}}}}} does not resolve in mn_sm_dw_01.yaml"))
                        break
    code_files = [*sorted((ROOT / "frontend" / "src").glob("**/*.ts")), *sorted((ROOT / "frontend" / "src").glob("**/*.tsx")),
                  *sorted((ROOT / "backend" / "app").glob("**/*.py"))]
    skip = ("design/", "lib/physics", "lib/units", ".test.", "vite-env", "app/physics/", "__pycache__")
    for p in code_files:
        rel = str(p.relative_to(ROOT))
        if any(s in rel for s in skip):
            continue
        findings += scan_text(rel, p.read_text(encoding="utf-8"), canon, allow, code=True, prose_warn=True)
    findings += scan_frames(facts_yaml)

    errs = [f for f in findings if f.level == "ERROR"]
    warns = [f for f in findings if f.level == "WARN"]
    by_file: dict[str, list[Finding]] = {}
    for f in findings:
        by_file.setdefault(f.where, []).append(f)

    lines = ["# Fact gate report", "", f"**{len(errs)} errors · {len(warns)} warnings** across {len(by_file)} files.", "",
             "ERROR = number not in scenario YAML / allow-list. WARN = YAML fact typed as a literal (read / interpolate it).", ""]
    for where in sorted(by_file, key=lambda w: (-sum(f.level == 'ERROR' for f in by_file[w]), w)):
        fs = by_file[where]
        lines.append(f"## {where} — {sum(f.level=='ERROR' for f in fs)} E / {sum(f.level=='WARN' for f in fs)} W")
        for f in fs:
            u = f" {f.unit}" if f.unit else ""
            lines.append(f"- **{f.level}** L{f.line}: `{f.value:g}{u}` — {f.why} · `{f.text}`")
        lines.append("")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print(f"=== Fact gate (O3): {len(errs)} errors, {len(warns)} warnings · report → {REPORT.relative_to(ROOT)}")
    for where in sorted(by_file):
        fs = by_file[where]
        print(f"  {where}: {sum(f.level=='ERROR' for f in fs)} E / {sum(f.level=='WARN' for f in fs)} W")
    return 1 if errs or (strict and warns) else 0


if __name__ == "__main__":
    sys.exit(run(strict="--strict" in sys.argv))
