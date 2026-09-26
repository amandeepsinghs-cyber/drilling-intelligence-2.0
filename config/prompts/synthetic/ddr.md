# Template — Daily Drilling Report

Write DDR day {{day}} for `{{well_id}}` covering {{md_from}}–{{md_to}} m.
Sections: Header (date, depth, section, MW in/out ppg+SG), 24-h Operations Summary (time log table), Mud Properties, Gas Readings, Incidents/NPT, Plan Next 24 h.

## Hard constraints (all synthetic docs)
- Use **only** numbers, depths, IDs and names present in the injected FACTS block. If a value is needed but absent, write it qualitatively (no new numbers).
- Mud weight in **ppg and SG**. Depth in **m MD**.
- Label the document **(illustrative)** in the title. No real person names — use role titles (Company Man, Drilling Superintendent, Mud Engineer, OIM).
- Output Markdown with YAML front-matter matching `data/contracts/knowledge_doc.schema.json`, and insert `<!-- page: N -->` markers every ~400 words.
- Tone: authentic Indian offshore operator documentation (formal, concise, numbered sections).

FACTS:
{{facts_yaml}}
