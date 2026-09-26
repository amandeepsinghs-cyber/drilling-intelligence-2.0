# Template — Mud Program

Write `{{doc_id}}` (planned vs actual) for `{{well_id}}`.
Sections: 1 Section Summary Table (hole size, MW ppg+SG, PV/YP), 2 Pressure Window Basis, 3 Contingencies (kick / losses), 4 Barite Stock Policy, 5 Deviations & MOC references.

## Hard constraints (all synthetic docs)
- Use **only** numbers, depths, IDs and names present in the injected FACTS block. If a value is needed but absent, write it qualitatively (no new numbers).
- Mud weight in **ppg and SG**. Depth in **m MD**.
- Label the document **(illustrative)** in the title. No real person names — use role titles (Company Man, Drilling Superintendent, Mud Engineer, OIM).
- Output Markdown with YAML front-matter matching `data/contracts/knowledge_doc.schema.json`, and insert `<!-- page: N -->` markers every ~400 words.
- Tone: authentic Indian offshore operator documentation (formal, concise, numbered sections).

FACTS:
{{facts_yaml}}
