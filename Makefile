.PHONY: dev backend frontend stub corpus embed test download deploy reload
# 8080/8090 are often held by other tools on Cloudtop; the Vite proxy reads DI2_API_PORT (default 8765).
API_PORT ?= 8765
UV ?= uv
dev: ; $(MAKE) -j2 backend frontend
backend: ; cd backend && $(UV) run uvicorn app.main:app --reload --port $(API_PORT)
frontend: ; cd frontend && DI2_API_PORT=$(API_PORT) npm run dev
stub: ; cd backend && $(UV) run python ../pipelines/synth/generate_stub_frames.py
reload: ; curl -s -X POST localhost:$(API_PORT)/api/scenario/reload
corpus: ; cd backend && $(UV) run python ../pipelines/synth/generate_knowledge_corpus.py && $(UV) run python ../pipelines/synth/validate_facts.py
embed: ; cd backend && $(UV) run python ../pipelines/embeddings/chunk_corpus.py && $(UV) run python ../pipelines/embeddings/build_embeddings.py && $(UV) run python ../pipelines/embeddings/eval_rag.py
test: ; cd backend && $(UV) run pytest -q
download: ; bash pipelines/download/download_public_data.sh
deploy: ; gcloud builds submit --config infra/cloudbuild.yaml
