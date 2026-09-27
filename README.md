# Sagar Drishti AI Agent — Demo Day Script & Runbook

**Drilling Intelligence 2.0** · live, voice-driven drilling co-pilot for the ONGC Board · built on Google Cloud
Well **MN-SM-DW-01** · illustrative Mahanadi deepwater scenario · 15 minutes

> **The one message:** *a connected worker — one engineer, talking in their own language, gets the rock, the pressure, the history and the paperwork in seconds, and stays the one who decides.*

Contents: [1 · Try it now](#1--try-it-now-10-minutes) · [2 · The script](#2--the-script-15-minutes) · [3 · Controls](#3--controls) · [4 · If something breaks](#4--if-something-breaks) · [5 · Day-of checklist](#5--day-of-checklist) · [6 · Rehearsal notes](#6--rehearsal-notes) · [7 · Setup & reference](#7--setup--reference)

> Illustrative scenario: well logs are synthetic (physics-based); offset reports and SOPs are simulated; Chat, email and phone lanes are **simulated** in the demo.

> 🎯 **Practice questions:** [docs/CONVERSATION_PRACTICE.md](docs/CONVERSATION_PRACTICE.md) — 24 questions as one conversation per act (start here) · [docs/DEMO_QUESTIONS.md](docs/DEMO_QUESTIONS.md) — 25 questions (English → Hinglish) with the two approval gates, to pick your favourites.

---

## 1 · Try it now (10 minutes)

Both services are normally already running on the Cloudtop. Just open:

**http://amandeepsinghs.c.googlers.com:5173/** → click the pulsing well.

(If they're not running, see [§7 Setup](#7--setup--reference).)

**Rehearsal A: SCRIPTED walk-through (no mic, no network).** Learn the flow first.
1. Press `Shift+R` (reset), then `V` until the agent badge (top-right of the agent panel) reads **SCRIPTED**.
2. Press `N` once per turn. Read each 🎤 line aloud as if you were saying it, and watch what the agent and screen do.
3. At the 4,172 m alert, drilling pauses by itself. Press `N` to continue. The Act 3 **Approve** button also works.

**Rehearsal B: LIVE with your voice (~15 min).** The real thing.
1. `Shift+R`, then `V` until the badge reads **LIVE** (green).
2. Hold **Hold to talk** (bottom of the agent panel), speak the 🎤 line, then release. Or type it in the box and press Enter.
3. Follow the script below: use the speed chips (bottom-right) and `Space` to drill.

---

## 2 · The script (15 minutes)

### At a glance

| Clock | Beat | Depth | Speed chip | What the room should feel |
|---|---|---|---|---|
| 0:00 – 1:30 | Opening · basin map → live well | 4,120 m | `1× real` | "This is live, not a video." |
| 1:30 – 4:30 | **Act 1** · Rock at the bit | 4,120 m | `1× real` | "It sees the rock 45 min before the mudlog." |
| 4:30 – 8:00 | **Act 2** · The window closes | 4,145 → 4,172 m | `×60` | "It interrupted *me*, before the kick." |
| 8:00 – 11:00 | **Act 3** · Human decides, agent acts | 4,172 m (paused) | n/a | "I said yes; the whole rig knew in seconds." |
| 11:00 – 13:30 | **Act 4** · Other side + the report | 4,172 → 4,205 m → TD | `×60`, then `×1200` | "Paperwork done. Lessons saved." |
| 13:30 – 15:00 | Close + ask | n/a | n/a | "We should pilot this." |

Legend: 🎤 = you say to the agent · 🗣️ = you say to the room · 🤖 = what the agent should reply (gist) · 👉 = point at · ⌨️ = key or click.
Numbers come from the scenario file the agent reads, so what you hear should match what's on screen.

---

### 0:00 – 1:30 · Opening (basin map)

⌨️ Start on the basin map (`/`). Make sure the speed chip is **1× real**.

🗣️
> "What you're about to see is not a recording. This is a deepwater well in the Mahanadi. The data is illustrative, but it's running live. Everything on this screen updates the way a real rig feed would."

👉 The pulsing well is the one live well among its offsets.
⌨️ Click it. The cockpit opens on **Act 1 · Rock at the bit**.

🗣️
> "At 1× the bit moves at real speed, about a third of a metre a minute. That's the reality our engineers live with: long, quiet hours, and then ten minutes that decide the well."

---

### 1:30 – 4:30 · Act 1 — Rock at the bit (4,120 m · 1× real)

**Turn 0 · typed opener.** Type it in the agent box and press Enter:
> "Hey, I hope everything is going okay."

🤖 12¼-in hole at **4,120 m** in the Upper Miocene seal. Mud **11.20 ppg (1.34 SG)**, ECD **11.42 ppg** against a shoe FIT of **12.10 ppg** at **3,850 m**. Overbalance is clean.

**Turn 1 · arm the watchdog** 🎤
> "Mujhe bata dena jab kuch bhi gadbad ho, theek hai?"

🤖 Watchdog armed: it's tracking d-exponent, sonic vs. normal trend, connection gas, and kick probability over the next 30 m. "Kuch bhi gadbad hui to main turant beech mein bolunga."

🗣️ *"I just switched to Hindi mid-conversation. No setting, no button."*

**Turn 2 · status** 🎤
> "Thoda batayenge abhi well ke andar kya chal raha hai?"

🤖 In Hindi: bit depth, compact claystone, MW 11.20 ppg, ECD, steady ROP, normal torque.

**Turn 3 · rock before the mudlog** 🎤
> "Abhi kaun si formation mein hain? Mudlog to baad mein aayega."

🤖 The real-time ML reads gamma ray and shale volume **at the bit**. Cuttings lag **45 minutes** behind. We're still safely in the seal. It cites WCR-MN-DW-01.

👉 The **ML lithology** track (purple, "ML · at the bit") and the **Cuttings** track, with its hatched "in transit" band showing what the mudlog hasn't seen yet. Point out the citation chip under the reply.
🗣️
> "Today the geologist waits 45 minutes for cuttings to come up. A model trained on our own historical logs tells us now."

⌨️ `Enter` shows the Act 1 takeaway card; `Esc` closes it.

---

### 4:30 – 8:00 · Act 2 — The window closes (4,145 → 4,172 m)

**Turn 4a · the follow-up question** 🎤
> "Agle zone tak kitna time lagega?"

🤖 *It asks back:* "Kaun sa zone? The U3 main pay sand at **4,195 m**?"

🗣️ *"It asked me a clarifying question, like a colleague would."*

**Turn 4b** 🎤
> "Haan, pay sand."

🤖 About **50 m** to go at the current ROP, a couple of hours. Offset well **MN-DW-02** proves the sand, but pore pressure ramps to **11.48 ppg**. At 11.20 ppg we'd be about **200 psi underbalanced**. It cites WCR-MN-DW-02 and SOP-04.

⌨️ Click speed chip **×60**, then press `Space` to drill. It takes about 1½ min to reach 4,172 m.
👉 While it drills, point at the **Pressure** column: kick side on the left, loss side on the right. Pore pressure (red) creeps toward mud weight (cyan). At the sand the window is only **0.62 ppg** wide.

🗣️ (while drilling)
> "This is the narrow window. Too light and gas comes in: a kick. Too heavy and we fracture the rock and lose mud. Deepwater Mahanadi punishes both."

**Turn 5 · PROACTIVE ALERT.** It fires by itself at 4,172 m, and drilling pauses.
🤖 "**Sir, ek minute.** Pressure alert at 4,172 m." The d-exponent has reversed since 4,160 m, sonic is **+10 µs/ft** above trend, and connection gas went from **0.4 to 1.1 %**. Forecast pore pressure at 4,195 m is **11.48 ppg**, so we'd be **200 psi underbalanced** with a **71 %** kick probability.

👉 The red alert, the ghost curve, and "distance to hazard: 23 m".
🗣️ (pause and let it land)
> "I didn't ask. It interrupted me, 23 metres before the hazard."

**Turn 6 · institutional memory** 🎤
> "Paas wale rig pe kya complication aayi thi, aur kaise mitigate kiya?"

🤖 **MN-DW-02** (1.8 km away) took a **12 bbl** gas kick in this sand and killed it with heavier mud. **MN-DW-03** (2.4 km away) had **28 bbl/hr** losses in a drilling break, fixed with LCM and a **12 m/hr** ROP cap. With citations.

🗣️
> "That knowledge used to live in a PDF in someone's cupboard. Now it answers in five seconds."

---

### 8:00 – 11:00 · Act 3 — Human decides, agent acts (4,172 m)

**Turn 7 · recommendation and memo** 🎤
> "Mud weight kaafi kam lag raha hai, thoda badha sakte hain?"

🤖 Weight up to **11.65 ppg (1.40 SG)**. That's **28.3 lb/bbl** of barite, **39.8 MT / 796 bags**, for the **3,100 bbl** system. ECD at the sand is **11.84 ppg**, still under the FIT, with **+120 psi** overbalance. MOC memo **MEMO-SM-2026-09** is drafted.

⌨️ `M` opens the memo. Show the frozen basis and citations, then `Esc`.
🗣️ *"Physics does the numbers, the model gives the range, the memo cites the SOP. It recommends; it does not decide."*

**Turn 8 · approval (Approval 1)** 🎤 then ⌨️ click
> "Theek hai, kar do."

🤖 It does **not** take the spoken shortcut: "Sir, kripya screen pe **Approve** button dabaiye."
⌨️ Click **Approve** (memo footer or the Act 3 panel). Only now is it approved: stamped with your role and time, basis frozen in the decision ledger, and the agent acknowledges in one line.

🗣️ *"Notice it refused my voice. A decision like this needs a signature on record, so it needs my click."*

**Turn 9 · fan-out** 🎤
> "Mud chemist ko message, manager ko email, base ko bhi bata do."

🤖 Instructions sent.
👉 Four lanes light up:
- **Mud chemist · rig console**: delivered in-app.
- **RTOC · Google Chat**, **Drilling manager · email** and **Superintendent · phone push**: all marked *simulated for the demo*.

🗣️ (say this honestly)
> "In the demo three of these are simulated. In a pilot they're your real Chat, email and phone, on the same code path."

Drilling resumes automatically after the Act 3 card.

---

### 11:00 – 13:30 · Act 4 — Other side of the window + the report

Speed stays at **×60**: about 2 min to 4,195 m. Switch to **×300** if you're running late.

**Turn 10 · PROACTIVE reassurance** (automatic at 4,195 m)
🤖 "We are at 4,195 m, the depth where **MN-DW-02** kicked." We're **+120 psi** overbalanced, kick probability is down to **6 %**, and flow and pits are stable.
👉 The offset kick replays as a ghost next to our flat line.

**Turn 11 · PROACTIVE drilling break → Approval 2** (automatic at 4,205 m; drilling holds)
🤖 "Sir, ek minute." ROP jumped to **34 m/hr** and ECD reached **12.02 ppg**, only **0.08 ppg** under the FIT. To avoid a repeat of the MN-DW-03 losses it **recommends** an ROP cap of **12 m/hr** with sweeps (ECD would come back to **11.86 ppg**) and asks you to approve.
👉 The **Approval 2 · ROP cap instruction** card in the Act 4 panel.
⌨️ Click **Approve ROP cap**. Only then is the cap applied; the agent confirms ECD back to 11.86 ppg and drilling resumes.
🗣️ *"Second decision, second human click. Now it's protecting the other side of the window: the losses."*

⌨️ Drilling resumes by itself after the click. Click speed chip **×1200** for about a minute of rig time-lapse toward TD while you talk.

**Turn 12 · shift handover** 🎤
> "Is shift ka handover note bana do."

🤖 Handover drafted: MW 11.65 ppg, memo executed with 39.8 MT of barite, the break managed by the ROP cap, zero kicks or losses. Indexed to the DDR.

**Turn 13 · completion report** 🎤 (at TD; or press `-` to jump there)
> "Well complete ho gaya, completion report ka pehla draft bana do."

🤖 **WCR-MN-SM-DW-01 Draft v1.0** is drafted: the pressure narrative, the memo decision with its frozen basis, the ROP-cap event, and **two lessons learned written back** to the knowledge base.
⌨️ `A` opens the audit drawer, where every number, tool call and approval is time-stamped. `Esc` closes it.

🗣️
> "Two weeks of paperwork, first draft in seconds. And the lessons go back in, so the next well starts smarter."

---

### 13:30 – 15:00 · Close

⌨️ The closing card appears **by itself** about a second after the completion report is drafted.

🗣️
> "Four things you saw. It **sees** the rock before the mudlog. It **warns** before the kick. It **acts**, but only after a human says yes. And it **remembers**, so every well makes the next one safer. In Hindi, on a rig, with a full audit trail. All of it built on Google Cloud's Gemini Enterprise Agent Platform, with your own data."

**The ask** *(placeholder, to confirm)*:
> "We'd like to run a 90-day pilot on one live well with your RTOC team."

---

## 3 · Controls

| Key / click | Does |
|---|---|
| `Space` | Play / pause drilling |
| Speed chips (bottom-right) | `1× real` · `×60` · `×300` · `×1200` (rig time) |
| **Hold to talk** (agent panel) | Speak while held, release to send. Or type in the box and press Enter |
| Agent badge / `V` | Switch agent **LIVE ↔ SCRIPTED** |
| `N` / `PageDown` | Next scripted turn (clicker-friendly) |
| `0`–`9` · `-` | Jump to turn 0–9 · jump to the WCR turn |
| `Shift+1…4` | Stage Act 1–4 without running a turn |
| `Enter` / `Esc` | Show/hide the act takeaway · close overlays |
| `M` / `W` / `A` | MOC memo · What-if · Audit drawer |
| `T` / `L` / `B` | Theme · caption language · Board/Engineer view |
| `Shift+R` | Reset the show |
| `?` | Hotkey help |
| `/presenter` | Optional second-screen remote (open in another window) |

## 4 · If something breaks

Say nothing about it; just do the fix.

| Symptom | Do this |
|---|---|
| Agent silent for more than 5 s, or the mic fails | Type the same line in the agent box and press Enter. |
| Live session keeps dropping | Press `V` to go SCRIPTED, then `N` for each turn. Every reply, memo, lane and card still plays. |
| Wrong depth, or you've lost your place | `Shift+1…4` to the act, then `N`. |
| The proactive alert didn't fire | Press `6` (the alert turn), or `N`. |
| Total failure | `Shift+R`, go SCRIPTED, and run `N` from turn 0. SCRIPTED doesn't need Gemini or the network. |

**Timing notes**
- At **×60**: 4,120 → 4,172 m takes about 2.3 min, 4,172 → 4,195 m about 1.9 min, and 4,195 → 4,205 m about 0.8 min.
- After 4,205 m use **×1200**; about 25 rig-hours remain to TD.
- Drilling **auto-pauses** at the 4,172 m alert and stays held until the memo is approved.
- Live replies take 1–3 s to start. Don't talk over the agent.

## 5 · Day-of checklist

**T-30 min**
- [ ] `gcloud auth application-default login` is fresh (tokens expire).
- [ ] Both services are up (see §7), and the page loads at `:5173`.
- [ ] Chrome is full screen (`F11`) at 100 % zoom, dark theme (`T` toggles).
- [ ] Mic permission is granted in Chrome; the venue audio output is selected.
- [ ] One test phrase in LIVE: the badge stays green and you hear the reply.
- [ ] `Shift+R` reset, speed chip back to **1× real**, basin map on screen.

**T-5 min**
- [ ] Badge reads **LIVE**. If it won't connect, press `V` → SCRIPTED and run the show with `N`.
- [ ] Nothing is open except the demo tab.

## 6 · Rehearsal notes

Fill this in as you try it; we'll refine from here.

| # | Beat / turn | What happened | Change wanted |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

Open decisions:
- [ ] Closing ask wording (90-day pilot?)
- [ ] Keep the basin-map opening, or start in the cockpit?
- [ ] Any Hinglish lines to reword in your own voice?
- [ ] Presenting on the venue display only, or also from a laptop screen (1536 px)?

---

## 7 · Setup & reference

### Start the services

**Prerequisites:** Node 20+, [`uv`](https://docs.astral.sh/uv/) (Python 3.12), and Google Chrome. You need `gcloud` access to the demo project for LIVE mode; SCRIPTED works without it.

```bash
# one-time: credentials for the live agent (Gemini Enterprise Agent Platform)
gcloud auth application-default login
cp .env.example .env            # GOOGLE_CLOUD_PROJECT / LOCATION already set
```

**Backend** (FastAPI + live agent), port **8765**:
```bash
cd backend
~/.local/bin/uv run --no-project --python 3.12 \
  --with fastapi,uvicorn,pyyaml,numpy,pandas,pyarrow,pydantic,google-genai,websockets,joblib,scikit-learn \
  uvicorn app.main:app --port 8765 --reload
```
You need `joblib` and `scikit-learn` so the trained lithology model loads. The footer then shows `ml: trained_rf_lithology`.

**Frontend** (React + Vite), port **5173**. It proxies `/api` and `/ws` to 8765.
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

URLs:
- `/` for the basin map.
- `/well/MN-SM-DW-01?act=1` for the cockpit directly.
- `/presenter` for the second-screen remote.

### Troubleshooting

| Problem | Fix |
|---|---|
| Agent stuck on "Connecting" | Check ADC (`gcloud auth application-default print-access-token`) and the backend log. Press `V` for SCRIPTED meanwhile. |
| Live session drops mid-demo | It reconnects and recaps the conversation automatically. If it keeps dropping, go SCRIPTED. |
| Header shows the text "Google Cloud" instead of the logo | The logo files are missing from `frontend/public/brand/`. See `README.txt` there. |
| Footer doesn't say `trained_rf_lithology` | Restart the backend with `joblib,scikit-learn` in `--with`. |
| Port in use | `lsof -i :8765` / `lsof -i :5173` and stop the old process. |

### Tests and checks

```bash
cd frontend && npx tsc --noEmit -p . && npm test && npm run build          # frontend
~/.local/bin/uv run --no-project --python 3.12 \
  --with pytest,fastapi,httpx,pyyaml,numpy,pandas,pyarrow,pydantic,google-genai,websockets,joblib,scikit-learn \
  pytest backend/tests -q                                                  # backend
~/.local/bin/uv run --no-project --python 3.12 --with pyyaml python pipelines/synth/fact_gate.py   # numbers vs YAML
```

### Where things live

| Path | What |
|---|---|
| `data/scenario/mn_sm_dw_01.yaml` | **Single source of truth** for every number in the demo |
| `data/scenario/turns.yaml` | The turns across the 4 acts |
| `data/knowledge/` | RAG corpus: offset WCRs, SOPs, DDRs, incidents |
| `backend/app/agent/` | Live agent session, tools, system prompt |
| `backend/app/physics/`, `backend/app/ml/` | Eaton / ECD / barite physics, lithology model |
| `frontend/src/screens/` | Basin map, cockpit (`CommandCenter`), WCR viewer, presenter remote |
| `frontend/src/state/turnMachine.ts` | Run-of-show orchestration (LIVE + SCRIPTED) |
| `frontend/src/mocks/agentScript.ts` | SCRIPTED replies, built from the YAML |

### Project docs

| Doc | Purpose |
|---|---|
| [`docs/run_of_show.md`](docs/run_of_show.md) | Earlier copy of the script (this README is now the master) |
| [`brief.md`](brief.md) | Narrative and numbers |
| [`docs/SDD.md`](docs/SDD.md) | Software design document |
| [`build.md`](build.md) · [`checklist.md`](checklist.md) | Build guide · progress tracker |
| [`FEATURE_LIST.md`](FEATURE_LIST.md) · [`ACTIVE_DEBUGGING_AND_EXECUTION.md`](ACTIVE_DEBUGGING_AND_EXECUTION.md) | Feature status · live work log |
| [`docs/FLASH_PLAYBOOK.md`](docs/FLASH_PLAYBOOK.md) · [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | Hand-off playbook · API contract |
| [`verbatim.md`](verbatim.md) | Original intent (owner's audio transcripts) |
| [`docs/archive/`](docs/archive/) | Previous README and run-of-show |
