# Drilling Intelligence 2.0 — MN-SM-DW-01 (Samudra Manthan, illustrative)

This is a voice-driven, board-grade drilling co-pilot demo. It runs Gemini 3.8 Live (Hindi/English), physics and ML, RAG institutional memory, and closed-loop actions with human approval.

| Doc | Purpose |
| :--- | :--- |
| [`brief.md`](brief.md) | Narrative, numbers, run-of-show (v2.1) |
| [`docs/SDD.md`](docs/SDD.md) | **Software Design Document: follow this** |
| [`build.md`](build.md) | Living build guide, data sources, commands |
| [`checklist.md`](checklist.md) | Progress tracker + day-of-show checklist |
| [`verbatim.md`](verbatim.md) | Original intent (audio transcripts) |
| [`data/README.md`](data/README.md) | Local data lake → GCP mapping |
| [`data/knowledge/README.md`](data/knowledge/README.md) | RAG corpus, embeddings pipeline |

## Quick start (local)
```bash
cp .env.example .env
make stub        # Phase 1: stub DepthFrames from scenario YAML
make dev         # backend :8080 + frontend :5173
make test        # physics acceptance tests (16 passing)
```

## Repository layout
```
Drilling-Intelligence-2.0/
├── brief.md · verbatim.md · build.md · checklist.md · README.md
├── .env.example · .gitignore · Makefile · docker-compose.yml
├── config/
│   ├── settings.local.yaml · settings.gcp.yaml          # DI_ENV switch, model IDs, adapters
│   └── prompts/
│       ├── agent_system_prompt.md · memo_prompt.md · wcr_prompt.md
│       └── synthetic/ sop · wcr · incident · ddr · mud_program · lessons · legacy_scan
├── docs/
│   ├── SDD.md · run_of_show.md · rehearsal_playbook.md · qa_crib.md
│   ├── adr/ ADR-001 … ADR-007
│   ├── design/design_system.md
│   └── stage/ (fallback video, Phase 8)
├── data/                                                 # local-first data lake (→ GCS/BQ/RAG Engine/Firestore)
│   ├── README.md · DATA_PROVENANCE.md · sources.yaml
│   ├── contracts/ *.schema.json + manifests/            # DepthFrame, Chunk, KnowledgeDoc, Event, Action, Provenance, CurveManifest
│   ├── scenario/ mn_sm_dw_01.yaml · offsets.yaml · turns.yaml · snapshots/   # SINGLE SOURCE OF TRUTH
│   ├── raw/ logs/{iodp_348_c0002n, iodp_348_c0002p, iodp_353_u1445a, iodp_354_u1450b,
│   │          iodp_354_u1453a, iodp_358_c0024, force_2020, volve}/ · documents/ · basemap/
│   ├── interim/ las_normalized/ · curve_inventory/
│   ├── processed/ depth_frames/ · lwd/ · mudlog/ · mud_chemistry/
│   ├── knowledge/ source/{sops, wcr, incidents, ddr, mud_programs, lessons_learned,
│   │              legacy_scans, public_reference}/ · rendered/ · chunks/ · embeddings/ · eval/
│   ├── geo/ wells.geojson
│   ├── models/ lithology/ · kick_risk/
│   ├── state/ · cache/offline_agent/ · exports/{memos, wcr, ledger, outbox}/
├── backend/                                              # FastAPI + ADK (Python 3.12, uv)
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── core/ config · logging · provenance
│   │   ├── adapters/ base · local/{storage_fs, tabular_duckdb, vector_json, state_sqlite, messaging_local}
│   │   │                    · gcp/{storage_gcs, tabular_bigquery, vector_rag_engine, state_firestore, messaging_google}
│   │   ├── scenario/ engine · triggers · turns · facts
│   │   ├── physics/ units · overburden · eaton · fracture · ecd · barite · dxc      # implemented + tested
│   │   ├── ml/ features · lithology · kick_risk · rop_optimizer · explain
│   │   ├── rag/ ingest · chunker · embedder · retriever · citations · writeback
│   │   ├── agent/ live_session · tools · watchdog · prompts · captions · guardrails · offline_cache
│   │   ├── actions/ memo · approval · dispatch · email_gmail · chat_google · push_telegram · sms_dlt · docs_wcr · ledger
│   │   └── api/ schemas · routes_{scenario, physics, rag, actions} · ws_live · ws_events
│   └── tests/ physics · scenario · rag · contracts · api
├── pipelines/                                            # offline jobs
│   ├── download/ download_public_data.sh
│   ├── ingest/ inspect_logs · las_to_depth_frames
│   ├── synth/ generate_stub_frames · generate_mudlog · generate_mud_chemistry
│   │          · generate_knowledge_corpus · validate_facts · render_pdfs · generate_legacy_scan
│   ├── embeddings/ chunk_corpus · build_embeddings · eval_rag · push_to_rag_engine
│   ├── ml/ train_lithology · train_kick_risk
│   └── gcp/ sync_gcs · load_bigquery
├── frontend/                                             # React + Vite + TS + Tailwind + Plotly + Google Maps/deck.gl + R3F
│   ├── package.json · vite.config.ts · tsconfig.json · tailwind.config.ts · index.html
│   └── src/
│       ├── App.tsx · main.tsx
│       ├── design/ tokens.ts · theme.css · plotlyTemplate.ts
│       ├── screens/ BasinMap · CommandCenter · WcrViewer · PresenterConsole
│       ├── components/ wellpulse · logs · pressure · whatif · wellbore · well3d · agent · actions · audit · timeline · common
│       ├── live/ micCapture · liveClient · audioPlayer
│       ├── state/ scenarioStore · turnMachine · agentStore · ledgerStore · uiStore
│       ├── api/ client.ts · types.ts
│       └── lib/ · mocks/
└── infra/
    ├── terraform/ main.tf · variables.tf · outputs.tf · modules/{data, iam, cloud_run}
    ├── docker/ backend.Dockerfile · frontend.Dockerfile
    └── cloudbuild.yaml
```

## Status
- **Phase 0 (docs + scaffold) complete.**
- **Next: Phase 1** (front-end shell on stub data). See `build.md`.
