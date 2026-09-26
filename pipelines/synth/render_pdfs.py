"""pipelines.synth.render_pdfs — render authentic PDF renditions of knowledge docs.

Uses reportlab to generate clean, professional operator PDF documents.
Outputs to data/knowledge/rendered/<folder>/<doc_id>.pdf.
"""
from __future__ import annotations

import re
from pathlib import Path
import yaml
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "knowledge" / "source"
RENDERED_DIR = ROOT / "data" / "knowledge" / "rendered"


def render_pdf(md_path: Path) -> Path:
    raw = md_path.read_text(encoding="utf-8")
    parts = raw.split("---", 2)
    fm = yaml.safe_load(parts[1]) if len(parts) >= 3 else {}
    body = parts[2].strip() if len(parts) >= 3 else raw

    rel = md_path.relative_to(SOURCE_DIR)
    out_dir = RENDERED_DIR / rel.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{md_path.stem}.pdf"

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f2d4a"),
        spaceAfter=10,
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12,
    )
    h2_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1b4d79"),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#222222"),
        spaceAfter=6,
    )

    story = []
    # Title
    title = fm.get("title", md_path.stem)
    story.append(Paragraph(title, title_style))

    # Metadata block
    meta_info = f"Document ID: <b>{fm.get('doc_id', md_path.stem)}</b> | Type: <b>{fm.get('doc_type', '')}</b> | Well: <b>{fm.get('well_id', '')}</b> | Date: <b>{fm.get('date', '2026')}</b>"
    story.append(Paragraph(meta_info, meta_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1b4d79"), spaceAfter=14))

    # Content paragraphs
    lines = body.split("\n")
    for line in lines:
        line = line.strip()
        if not line or line.startswith("<!--"):
            continue
        if line.startswith("# "):
            continue  # Already in header
        elif line.startswith("## "):
            story.append(Paragraph(line[3:], h2_style))
        elif line.startswith("### "):
            story.append(Paragraph(f"<b>{line[4:]}</b>", body_style))
        elif line.startswith("- ") or line.startswith("* "):
            story.append(Paragraph(f"• {line[2:]}", body_style))
        else:
            clean_line = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", line)
            story.append(Paragraph(clean_line, body_style))

    doc.build(story)
    return out_path


def main() -> None:
    print(f"Rendering PDFs from {SOURCE_DIR} to {RENDERED_DIR}...")
    rendered_count = 0
    for md_file in SOURCE_DIR.rglob("*.md"):
        if md_file.name == "README.md":
            continue
        out_p = render_pdf(md_file)
        rendered_count += 1
        print(f"  ✓ Rendered: {out_p.relative_to(ROOT)}")

    print(f"\n✓ Rendered {rendered_count} PDF documents.")


if __name__ == "__main__":
    main()
