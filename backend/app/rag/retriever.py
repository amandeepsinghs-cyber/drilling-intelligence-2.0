"""rag.retriever — metadata filter -> lexical BM25 top-k over the synthetic corpus chunks.

Design reference: docs/SDD.md §9.6 (metadata filter -> dense top-20 -> rerank top-5).
Current implementation (O2-lite): BM25 over data/knowledge/chunks/corpus_chunks.json, no network,
deterministic, so search_knowledge returns the *actual* corpus text with doc_id/section/page
citations instead of hand-typed snippets. Dense + rerank can replace `_score` later without
changing the return contract.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from functools import lru_cache
from typing import Any

from app.core.config import REPO_ROOT

CHUNKS = REPO_ROOT / "data" / "knowledge" / "chunks" / "corpus_chunks.json"
_TOK = re.compile(r"[a-z0-9]+(?:[.,][0-9]+)?")
_K1, _B = 1.4, 0.75


def _tokens(text: str) -> list[str]:
    return [t.replace(",", "") for t in _TOK.findall(text.lower())]


@lru_cache
def _index() -> tuple[list[dict[str, Any]], list[Counter], dict[str, float], float]:
    chunks = [c for c in json.loads(CHUNKS.read_text(encoding="utf-8")) if c.get("tokens", 0) > 12]
    tfs = [Counter(_tokens(c["section_path"] + " " + c["text"] + " " + " ".join(c.get("tags", [])))) for c in chunks]
    n = len(chunks)
    df: Counter = Counter()
    for tf in tfs:
        df.update(tf.keys())
    idf = {t: math.log(1 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}
    avgdl = sum(sum(tf.values()) for tf in tfs) / max(n, 1)
    return chunks, tfs, idf, avgdl


def _score(q: list[str], tf: Counter, idf: dict[str, float], avgdl: float) -> float:
    dl = sum(tf.values())
    s = 0.0
    for t in q:
        f = tf.get(t, 0)
        if f:
            s += idf.get(t, 0.0) * f * (_K1 + 1) / (f + _K1 * (1 - _B + _B * dl / avgdl))
    return s


def search(query: str, filters: dict[str, Any] | None = None, k: int = 3) -> list[dict[str, Any]]:
    """Top-k chunks for `query`. filters: {doc_type: "SOP"|..., doc_id: "...", doc_id_prefix: "INC-"}."""
    chunks, tfs, idf, avgdl = _index()
    filters = filters or {}
    q = _tokens(query)
    scored = []
    for c, tf in zip(chunks, tfs):
        if "doc_type" in filters and c.get("doc_type") != filters["doc_type"]:
            continue
        if "doc_id" in filters and c.get("doc_id") != filters["doc_id"]:
            continue
        if "doc_id_prefix" in filters and not str(c.get("doc_id", "")).startswith(filters["doc_id_prefix"]):
            continue
        s = _score(q, tf, idf, avgdl)
        if s > 0:
            scored.append((s, c))
    scored.sort(key=lambda x: -x[0])
    out, seen = [], set()
    for s, c in scored:
        if c["doc_id"] in seen:  # one chunk per document → diverse citations
            continue
        seen.add(c["doc_id"])
        out.append({
            "doc_id": c["doc_id"],
            "doc_type": c.get("doc_type"),
            "section": c["section_path"],
            "page": c.get("page"),
            "provenance": str(c.get("authoring", "synthetic")).upper(),
            "snippet": c["text"],
            "score": round(s, 2),
        })
        if len(out) >= k:
            break
    return out
