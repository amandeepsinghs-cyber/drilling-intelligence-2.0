# ADR-001: Local-first adapters with GCP promotion

- **Status:** Accepted (2026-09-25)
- **Context:** Drilling Intelligence 2.0 board demo (see SDD).
- **Decision:** Build and rehearse offline; promote to GCS/BigQuery/RAG Engine/Firestore by switching DI_ENV. Every I/O via adapter interfaces (SDD §4.2).
- **Consequences:** Documented in SDD; revisit only via change control (SDD §19).
