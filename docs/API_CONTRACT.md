# API Contract — Drilling Intelligence 2.0

> **Status:** skeleton written with WP-01. **WP-05 fills it in** and adds a contract test for every row (`backend/tests/api/test_contract_*.py`).
> Base URL (dev): `http://localhost:8765`. All numbers in responses come from the scenario YAMLs and the live frame. Nothing is hard-coded.

## 1. Existing (working today)

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/api/wells` | basin map wells | |
| GET | `/api/scenario` | facts (YAML merged), turns, acts | |
| GET | `/api/scenario/{well_id}/frames` | full depth-indexed frame table (3,681 rows, ~80 columns) | WP-05 adds GZip (~2 MB → ~0.4 MB) |
| GET | `/api/scenario/{well_id}/frame?md=` | one row at a depth | WP-05 adds the alias `md_m` |
| GET | `/api/scenario/{well_id}/meta` | grid, provenance, footer | |
| POST | `/api/scenario/reload` | reloads the YAMLs | |
| POST | `/api/physics/whatif` | ECD / window for MW, ROP, GPM | |
| WS | `/ws/live` | Gemini Live audio, text and tool events | see `backend/app/agent/live_session.py` |
| WS | `/ws/events` | **today: dumb relay** | WP-05 → show state |

## 2. Planned (WP-05)

### 2.1 Tools over REST (same functions as the Live tools in `agent/tools.py`)
`POST /api/tools/{name}`, body `{"args": {...}}`, returns `{"name", "result", "ms"}`.
Names: `get_well_status, get_lithology, forecast_pore_pressure, compute_ecd, compute_barite, search_knowledge, lookup_offset_events, create_moc_memo, request_approval, dispatch_fanout, set_rop_cap, generate_wcr, writeback_lessons`. An unknown name returns 404.

### 2.2 Knowledge
`GET /api/rag/search?q=&k=5` returns `{"hits":[{"doc_id","title","page","snippet","score","source_path"}]}`.

### 2.3 Actions (Act 3)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/actions/memo` | `{"recommendation"?}` | `{"memo_id","title","body_md","numbers":{...},"status":"DRAFT"}` |
| POST | `/api/actions/approve` | `{"memo_id","approver"}` | `{"memo_id","status":"APPROVED","approved_at"}` |
| POST | `/api/actions/dispatch` | `{"memo_id","channels"?}` | `{"results":[{"channel","status","detail","at"}]}` |
| GET | `/api/ledger` | — | `{"entries":[{"at","actor","action","ref","status"}]}` |
| POST | `/api/wcr` | — | `{"wcr_id","sections":[...],"sources":[...]}` |

**Channel status is honest:** `DELIVERED` (real API call succeeded), `SIMULATED` (no credentials, so it was shown only), `FAILED` (error text in `detail`). Channels: `mud_chemist`, `email`, `rtoc_chat`, `phone_push`.

### 2.4 Show state on `/ws/events`
The server sends `{"type":"state","state":ShowState}` on every change and on connect. The client sends `{"type":"cmd","cmd":"next_turn"|"goto_act"|"set_md"|"approve"|"reset","arg"?}`.
```ts
interface ShowState {
  mode: 'LIVE' | 'SCRIPTED';
  act: 1 | 2 | 3 | 4;
  turn_id: string | null;
  bit_md_m: number;
  memo: { id: string; status: 'NONE'|'DRAFT'|'APPROVED'|'DISPATCHED' };
  channels: { channel: string; status: 'PENDING'|'DELIVERED'|'SIMULATED'|'FAILED' }[];
  ledger_len: number;
  rev: number;   // increases on every change; the client ignores older revs
}
```
