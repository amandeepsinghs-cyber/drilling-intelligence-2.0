# Template — Standard Operating Procedure

Write SOP `{{doc_id}}`: **{{title}}**.
Sections: 1 Purpose, 2 Scope, 3 Responsibilities, 4 Definitions, 5 Procedure (numbered steps with hold points), 6 Triggers & Thresholds, 7 Records, 8 References.

## Hard constraints (all synthetic docs)
- Use **only** numbers, depths, IDs and names present in the injected FACTS block. If a value is needed but absent, write it qualitatively (no new numbers).
- Mud weight in **ppg and SG**. Depth in **m MD**.
- Label the document **(illustrative)** in the title. No real person names — use role titles (Company Man, Drilling Superintendent, Mud Engineer, OIM).
- Output Markdown with YAML front-matter matching `data/contracts/knowledge_doc.schema.json`, and insert `<!-- page: N -->` markers every ~400 words.
- Tone: authentic Indian offshore operator documentation (formal, concise, numbered sections).

FACTS:
{{facts_yaml}}
