# `data/` — Local Data Lake (promotable to GCP)

Local-first layout. It mirrors the GCP layout (GCS / BigQuery / RAG Engine / Firestore) described in [SDD §4.2 & §5](../docs/SDD.md).

| Folder | Layer | Git? | GCP equivalent | Contents |
| :--- | :--- | :--- | :--- | :--- |
| `contracts/` | Schema | ✅ | — | JSON Schemas (`DepthFrame`, `Chunk`, `KnowledgeDoc`, `Event`, `Action`, `Provenance`, `CurveManifest`) + `manifests/` (per-dataset curve mappings) |
| `scenario/` | **Source of truth** | ✅ | Firestore `scenario/` (read-only copy) | `mn_sm_dw_01.yaml`, `offsets.yaml`, `turns.yaml`, `snapshots/turn_XX.json` |
| `sources.yaml` | Registry | ✅ | — | All public data sources, licences, target dirs |
| `raw/` | Immutable | ❌ (large) | `gs://di2-raw-*/` | Downloads: `logs/<dataset>/`, `documents/`, `basemap/`, `DOWNLOAD_LOG.md` |
| `interim/` | Normalised | ❌ | `gs://di2-interim-*/` | `las_normalized/`, `curve_inventory/` |
| `processed/` | Serving | ❌ (regenerable) | BigQuery `drilling_intel.*` | `depth_frames/`, `lwd/`, `mudlog/`, `mud_chemistry/` (Parquet) |
| `knowledge/` | RAG | ✅ source, ✅ chunks, ✅ embeddings (synthetic only) | RAG Engine corpus `di2-knowledge` + BigQuery `rag_chunks` | `source/<type>/*.md`, `rendered/`, `chunks/`, `embeddings/`, `eval/` |
| `geo/` | Map | ✅ | GCS `geo/` | `wells.geojson`, `basins.geojson` |
| `models/` | ML artefacts | ❌ | GCS `models/` | `lithology/<ver>/`, `kick_risk/<ver>/` + model cards |
| `state/` | Runtime | ❌ | Firestore | `di2.sqlite` (live state, Decision Ledger) |
| `cache/` | Runtime | ❌ | GCS `cache/` | `offline_agent/` per-turn audio + text for `DI_OFFLINE=1` |
| `exports/` | Artefacts | ❌ | GCS `exports/` | `memos/`, `wcr/`, `ledger/`, `outbox/` (.eml) |

## Rules
1. **Numbers live in `scenario/*.yaml`.** Nothing else may introduce a new number.
2. **`raw/` is immutable.** Loaders write to `interim/` and `processed/` only.
3. **Every field carries provenance** (`MEASURED, DERIVED, SIMULATED, ASSUMED, PUBLIC, SYNTHETIC, MODEL_INFERENCE, NOT_RECORDED`).
4. **Public curves are never edited.** Scenario overlays are separate fields labelled `SIMULATED`.
5. Update [`DATA_PROVENANCE.md`](DATA_PROVENANCE.md) whenever a dataset is added.
