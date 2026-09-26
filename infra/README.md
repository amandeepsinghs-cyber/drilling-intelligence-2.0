# Infra

- `terraform/`: GCP resources in `asia-south1` (Artifact Registry, Cloud Run ×2, GCS, BigQuery `drilling_intel`, Firestore, Secret Manager, service accounts). RAG Engine corpus is created by `pipelines/embeddings/push_to_rag_engine.py`.
- `docker/`: backend + frontend images.
- `cloudbuild.yaml`: build → push → deploy.

See build.md Phase 7.
