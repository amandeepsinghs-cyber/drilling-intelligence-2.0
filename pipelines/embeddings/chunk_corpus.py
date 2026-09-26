"""pipelines.embeddings.chunk_corpus — chunk knowledge Markdown documents into JSON chunks.

Conforms to data/contracts/chunk.schema.json.
Splits documents on Markdown sections (##) and page markers (<!-- page: N -->).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "knowledge" / "source"
CHUNKS_DIR = ROOT / "data" / "knowledge" / "chunks"


def parse_front_matter(content: str) -> tuple[dict, str]:
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm = yaml.safe_load(parts[1]) or {}
            body = parts[2].strip()
            return fm, body
    return {}, content


def chunk_document(doc_path: Path) -> list[dict]:
    raw_text = doc_path.read_text(encoding="utf-8")
    fm, body = parse_front_matter(raw_text)

    doc_id = fm.get("doc_id", doc_path.stem)
    doc_type = fm.get("doc_type", "SOP")
    well_id = fm.get("well_id", "MN-SM-DW-01")
    tags = fm.get("tags", [])
    authoring = fm.get("authoring", "synthetic")
    md_range = fm.get("md_range")

    # Split into sections based on ## or ### headers
    section_splits = re.split(r"(?m)^(?=#{1,3}\s+)", body)
    chunks = []
    chunk_idx = 0
    current_page = 1

    for sec in section_splits:
        sec = sec.strip()
        if not sec:
            continue

        # Check for page markers
        page_match = re.search(r"<!--\s*page:\s*(\d+)\s*-->", sec)
        if page_match:
            current_page = int(page_match.group(1))

        # Extract section header
        header_match = re.match(r"^(#{1,3})\s+(.*)$", sec, re.MULTILINE)
        section_path = header_match.group(2).strip() if header_match else "General"

        # Clean text
        clean_text = re.sub(r"<!--\s*page:\s*\d+\s*-->", "", sec).strip()
        tokens = len(clean_text.split())

        chunk_id = f"{doc_id}-C{chunk_idx:02d}"
        chunk = {
            "chunk_id": chunk_id,
            "doc_id": doc_id,
            "doc_type": doc_type,
            "section_path": section_path,
            "page": current_page,
            "text": clean_text,
            "tokens": tokens,
            "well_id": well_id,
            "tags": tags,
            "authoring": authoring,
        }
        if md_range:
            chunk["md_range"] = md_range

        chunks.append(chunk)
        chunk_idx += 1

    return chunks


def main() -> None:
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    all_chunks = []
    doc_count = 0

    print(f"Chunking corpus from {SOURCE_DIR}...")
    for md_file in SOURCE_DIR.rglob("*.md"):
        if md_file.name == "README.md":
            continue
        chunks = chunk_document(md_file)
        all_chunks.extend(chunks)
        doc_count += 1
        print(f"  ✓ {md_file.relative_to(SOURCE_DIR)} -> {len(chunks)} chunks")

    # Write individual chunks and combined chunks index
    out_file = CHUNKS_DIR / "corpus_chunks.json"
    out_file.write_text(json.dumps(all_chunks, indent=2), encoding="utf-8")
    print(f"\n✓ Processed {doc_count} documents into {len(all_chunks)} chunks.")
    print(f"✓ Saved to {out_file.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
