# Template — Incident Report

Write `{{doc_id}}` ({{incident_type}}) for `{{well_id}}` at {{md_m}} m.
Sections: 1 Summary, 2 Sequence of Events (timestamped), 3 Immediate Actions, 4 Root Cause (5-Why), 5 Contributing Factors, 6 Corrective & Preventive Actions, 7 Lessons, 8 Sign-off (roles).

## Hard constraints (all synthetic docs)
- Use **only** numbers, depths, IDs and names present in the injected FACTS block. If a value is needed but absent, write it qualitatively (no new numbers).
- Mud weight in **ppg and SG**. Depth in **m MD**.
- Label the document **(illustrative)** in the title. No real person names — use role titles (Company Man, Drilling Superintendent, Mud Engineer, OIM).
- Output Markdown with YAML front-matter matching `data/contracts/knowledge_doc.schema.json`, and insert `<!-- page: N -->` markers every ~400 words.
- Tone: authentic Indian offshore operator documentation (formal, concise, numbered sections).

FACTS:
{{facts_yaml}}
