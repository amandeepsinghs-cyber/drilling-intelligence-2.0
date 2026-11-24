# fix.md — Sagar Drishti voice lag / "doesn't respond" fix (v0-4-14)

**Status legend:** `[ ]` to do · `[x]` done · `[!]` needs the presenter

## 1. What was wrong (diagnosis)

Reproduced end to end in a real Chrome (headless, fake microphone playing a spoken question) against the
local stack: page mic capture → `/ws/live` → FastAPI → Gemini Live (`gemini-3.8-live`, us-central1) → audio back.

| # | Symptom | Root cause | Evidence |
|---|---|---|---|
| 1 | ~40 s lag, "as if it can't hear" (rev 00015) | Server VAD had been **disabled**; the turn only ended on a 2nd tap or the 30 s mic timeout | Cloud Run log: heard "Drishti Drishti", reply ~40 s after connect |
| 2 | Second question never answered (rev 00016) | Mic auto-closed on **any** incoming agent audio. Tapping while the agent was still talking closed the mic instantly → **0 bytes of the question sent** | Browser test: tap #2 sent no mic chunks |
| 3 | Answers queued behind silence | Gemini Live can stream near-silent audio for minutes with no `turn_complete` (documented in Urvi, same model) | Cloud Run log: `Runaway silence cut after 4.0 s` |
| 4 | Next answer swallowed after a silence cut | The cut flag was only cleared by an input transcript, which can arrive after the reply audio | Code review vs Urvi `session.py` |
| 5 | Audio loop could freeze | Tools ran inline on the event loop (no timeout) | Code review vs Urvi `_run_tool` |
| 6 | German/Spanish replies, American accent | No language lock; aliased mic resampling | Probe: `speech_lang=None`; nearest-sample decimation |
| 7 | Lag / no reply **only on the Cloudtop** | Chrome on the Cloudtop is used over Chrome Remote Desktop — its mic is remote/unreliable, so Gemini hears little or nothing. Works on the Chromebook (real mic) and on `localhost` via SSH tunnel | Presenter confirmed 2026-11-24; the final ONGC demo also ran on localhost |

> **Demo rule:** run voice from the presenter's own laptop (Chromebook), never inside Chrome Remote Desktop. Primary: `ssh -L 5173:localhost:5173 -L 8765:localhost:8765 amandeepsinghs.c.googlers.com` → `http://localhost:5173/well/MN-SM-DW-01`. Backup: the Cloud Run URL (https). Plain `http://<cloudtop-host>:5173` blocks the mic (not a secure origin).

## 2. Fix steps

### Backend — `backend/app/agent/live_session.py`
- [x] 2.1 Re-enable server VAD (tuned: `END_SENSITIVITY_HIGH`, 200 ms prefix, 700 ms silence; `DI_VAD_SILENCE_MS` env). Second tap sends `audio_stream_end`.
- [x] 2.2 Speech locale `en-IN` (Indian English accent, as in Urvi) + `temperature=0.2`.
- [x] 2.3 Runaway-silence cut (ported from Urvi): end the turn after 4 s trailing / 12 s leading silent audio.
- [x] 2.4 Clear the cut on a **new utterance**, a typed prompt, or Gemini `interrupted` (barge-in) — never swallow a new answer.
- [x] 2.5 Tools run in a worker thread with a 10 s timeout (`_exec_tool`).
- [x] 2.6 Timeline logs (`TL …`): mic start, `audio_end`, first words heard, tool ms, first reply audio, heard/said.

### Backend — `backend/app/main.py`
- [x] 2.7 `logging.basicConfig(INFO)` so `di2.*` logs reach Cloud Run.

### Prompt — `config/prompts/agent_system_prompt.md`
- [x] 2.8 Opening: first reply always English, one line — "Good morning Sir, I'm Sagar Drishti AI Agent, monitoring well MN-SM-DW-01. How can I help you?" Status only when asked.
- [x] 2.9 Language: English / Hindi / Hinglish only, mirror the presenter; Indian English accent; "Sorry Sir, dobara boliye?" if unclear.

### Frontend
- [x] 2.10 `live/micCapture.ts`: box-filter downsampling to 16 kHz (no aliasing).
- [x] 2.11 `live/liveClient.ts`: auto-close the mic only on **real speech** (RMS > 300) from the agent.
- [x] 2.12 `live/liveClient.ts`: **barge-in** — tapping while the agent talks drops the rest of the old answer (`dropOldAnswer`) until `interrupted` / `turn_complete`; the new question's mic stays open.
- [x] 2.13 `state/talk.ts`: reset the talk button when the client closes the mic itself.
- [x] 2.14 `mocks/agentScript.ts` + demo-flow docs: same one-line English opening.

## 3. Verify locally
- [x] 3.1 Frontend: `npx tsc --noEmit -p .` · `npm test` (21/21) · `npm run build`
- [x] 3.2 Backend: `pytest backend/tests -q` (65/65) · `pipelines/synth/fact_gate.py` (0 errors)
- [x] 3.3 Browser E2E, two questions, 2nd asked while the agent is still talking:
  - Q1 status → first reply audio ~1.6 s after end of speech (includes `get_well_status`)
  - Q2 (barge-in) → heard and answered ~0.85 s after end of speech

## 4. Deploy
- [x] 4.1 Build image: `gcloud builds submit --config infra/cloudbuild.image.yaml --region us-central1 --project drilling-intelligence-2-509714 --substitutions=_TAG=v0-4-14 .`
- [x] 4.2 Deploy: `gcloud run deploy sagar-drishti --project drilling-intelligence-2-509714 --region us-central1 --image us-central1-docker.pkg.dev/drilling-intelligence-2-509714/sagar-drishti/sagar-drishti:v0-4-14`
- [x] 4.3 Revision `sagar-drishti-00017-jrr` (image `v0-4-14`) Ready, serving 100 %, no WARNING/ERROR at startup.

## 5. Verify on Cloud Run
- [!] 5.1 Presenter: open https://sagar-drishti-248430093579.us-central1.run.app/well/MN-SM-DW-01, `Shift+R`, tap once, say "Hello Drishti", wait (no second tap).
- [!] 5.2 Tap once, ask "Can you please tell me the current status of the well?" — then tap again **while it is still answering** and ask a new question.
- [ ] 5.3 Read the `TL` lines in Cloud Run logs: `mic first chunk` → `audio_end`/VAD → `heard` → `first reply audio … ms` for each turn.

## 6. Rollback
`gcloud run services update-traffic sagar-drishti --project drilling-intelligence-2-509714 --region us-central1 --to-revisions=sagar-drishti-00016-pjf=100   # previous revision`

## Notes
- IAM (approved 2026-11-24): `248430093579-compute@developer.gserviceaccount.com` has `roles/cloudbuild.builds.builder` (Cloud Build now runs as this account).
- Nothing committed or pushed yet.
