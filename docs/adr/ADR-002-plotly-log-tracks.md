# ADR-002: Plotly.js for log tracks

- **Status:** Accepted (2026-09-25)
- **Context:** Drilling Intelligence 2.0 board demo (see SDD).
- **Decision:** Owner decision. Use Plotly scattergl (WebGL) with a custom dark template, shared depth axis, shapes/annotations for FIT line, ghost band and hazard ruler. Keeps build fast and interactive.
- **Consequences:** Documented in SDD; revisit only via change control (SDD §19).
