# Template — Well Completion Report (offset)

Write `{{doc_id}}` for offset well `{{well_id}}`.
Sections: 1 Well Data Summary, 2 Stratigraphy & Formation Tops, 3 Casing & Cementing, 4 Mud Program vs Actual, 5 Drilling Performance, 6 Well-Control / Loss Events, 7 Formation Evaluation, 8 Lessons Learned, 9 Attachments list.

## Hard constraints (all synthetic docs)
- Use **only** numbers, depths, IDs and names present in the injected FACTS block. If a value is needed but absent, write it qualitatively (no new numbers).
- Mud weight in **ppg and SG**. Depth in **m MD**.
- Label the document **(illustrative)** in the title. No real person names — use role titles (Company Man, Drilling Superintendent, Mud Engineer, OIM).
- Output Markdown with YAML front-matter matching `data/contracts/knowledge_doc.schema.json`, and insert `<!-- page: N -->` markers every ~400 words.
- Tone: authentic Indian offshore operator documentation (formal, concise, numbered sections).

FACTS:
{{facts_yaml}}
