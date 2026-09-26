# Run-of-Show — Sagar Drishti AI Agent (15 minutes)

> **Master copy is now [`../README.md`](../README.md) §2** (updated 26 Sep with the latest UI changes). This file is kept for reference.
> Stage script for the ONGC Board demo on well **MN-SM-DW-01** (illustrative Mahanadi deepwater scenario).
> Old version kept at [`archive/run_of_show_v0.md`](archive/run_of_show_v0.md).
> Numbers below come from `data/scenario/mn_sm_dw_01.yaml` / `offsets.yaml` — the agent reads the same source, so what you hear should match.

**The one message:** *a connected worker — one engineer, talking in their own language, gets the rock, the pressure, the history and the paperwork in seconds, and stays the one who decides.*

---

## At a glance

| Clock | Beat | Depth | Speed chip | What the room should feel |
|---|---|---|---|---|
| 0:00 – 1:30 | Opening · basin map → live well | 4,120 m | `1× real` | "This is live, not a video." |
| 1:30 – 4:30 | **Act 1** · Rock at the bit | 4,120 m | `1× real` | "It sees the rock 45 min before the mudlog." |
| 4:30 – 8:00 | **Act 2** · The window closes | 4,145 → 4,172 m | `×60` | "It interrupted *me* — before the kick." |
| 8:00 – 11:00 | **Act 3** · Human decides, agent acts | 4,172 m (paused) | — | "I said yes; the whole rig knew in seconds." |
| 11:00 – 13:30 | **Act 4** · Other side + the report | 4,172 → 4,205 → TD | `×60` then `×1200` | "Paperwork done. Lessons saved." |
| 13:30 – 15:00 | Close + ask | — | — | "We should pilot this." |

Legend below: 🎤 = you say (hold **Hold to talk** in the agent panel, speak, release) · 🤖 = expected agent reply (gist) · 👉 = point on screen · ⌨️ = key/click.

---

## 0:00 – 1:30 · Opening (basin map)

⌨️ Start on `/` (basin map). Speed chip at **1× real**.

🎤 (to the room)
> "What you're about to see is not a recording. This is a deepwater well in the Mahanadi — illustrative data, but running live. Everything on this screen updates the way a real rig feed would."

👉 The pulsing well = the one live well among the offsets.
⌨️ Click the live well → cockpit opens at **Act 1**.

🎤
> "At 1× the bit moves at real speed — about a third of a metre a minute. That's the reality our engineers live with: long, quiet hours, and then ten minutes that decide the well."

---

## 1:30 – 4:30 · Act 1 — Rock at the bit (4,120 m, 1× real)

**Turn 0 — typed opener** (type in the agent box, press Enter)
> "Hey, I hope everything is going okay."

🤖 Drilling 12¼-in hole at **4,120 m** in the Upper Miocene seal. Mud **11.20 ppg (1.34 SG)**, ECD **11.42 ppg** against shoe FIT **12.10 ppg** at **3,850 m**. Overbalance clean.

**Turn 1 — arm the watchdog** 🎤
> "Mujhe bata dena jab kuch bhi gadbad ho, theek hai?"

🤖 Watchdog armed — tracking d-exponent, sonic vs. normal trend, connection gas, and 30 m kick probability. "Kuch bhi gadbad hui to main turant beech mein bolunga."

🎤 (to the room) *"I just switched to Hindi mid-conversation. No setting, no button."*

**Turn 2 — status** 🎤
> "Thoda batayenge abhi well ke andar kya chal raha hai?"

🤖 Bit depth, compact claystone, MW 11.20 ppg, ECD, steady ROP, normal torque — in Hindi.

**Turn 3 — rock before the mudlog** 🎤
> "Abhi kaun si formation mein hain? Mudlog to baad mein aayega."

🤖 Real-time ML reads gamma ray + shale volume **at the bit**; cuttings lag **45 minutes** behind. Still safely in the seal. Cites WCR-MN-DW-01.

👉 The **ML lithology column** (shale/sand %) and the LWD tracks. Citation chip under the reply.
🎤 (to the room)
> "Today the geologist waits 45 minutes for cuttings to come up. A model trained on our own historical logs tells us now."

⌨️ `Enter` shows the Act 1 takeaway card → `Esc`.

---

## 4:30 – 8:00 · Act 2 — The window closes (4,145 → 4,172 m)

**Turn 4a — the follow-up question** 🎤
> "Agle zone tak kitna time lagega?"

🤖 *Asks back:* "Kaun sa zone — the U3 main pay sand at **4,195 m**?"

🎤 (to the room) *"It asked me a clarifying question — like a colleague would."*

**Turn 4b** 🎤
> "Haan, pay sand."

🤖 ~**50 m** to go at current ROP (≈ a couple of hours). Offset **MN-DW-02** proves the sand — but pore pressure ramps to **11.48 ppg**, so at 11.20 ppg we'd be about **200 psi underbalanced**. Cites WCR-MN-DW-02 + SOP-04.

⌨️ Click speed chip **×60**, press `Space` to drill. (~1½ min to 4,172 m.)
👉 While it drills: the **pressure-window panel** — mud weight line vs. pore pressure (rising) vs. fracture/FIT limit. The window at the sand is only **0.62 ppg** wide.

🎤 (to the room, while drilling)
> "This is the narrow window. Too light and gas comes in — a kick. Too heavy and we fracture the rock and lose mud. Deepwater Mahanadi punishes both."

**Turn 5 — PROACTIVE ALERT (fires by itself at 4,172 m; drilling pauses)**
🤖 "**Sir, ek minute** — pressure alert at 4,172 m." d-exponent reversed since 4,160 m, sonic **+10 µs/ft** above trend, connection gas **0.4 → 1.1 %**. Forecast PP at 4,195 m **11.48 ppg** → **200 psi underbalanced**, kick probability **71 %**.

👉 Red alert, ghost curve, "distance to hazard: 23 m".
🎤 (to the room — pause, let it land)
> "I didn't ask. It interrupted me — 23 metres before the hazard."

**Turn 6 — institutional memory** 🎤
> "Paas wale rig pe kya complication aayi thi, aur kaise mitigate kiya?"

🤖 **MN-DW-02** (1.8 km): **12 bbl** gas kick in this sand, killed with heavier mud. **MN-DW-03** (2.4 km): **28 bbl/hr** losses in a drilling break, fixed with LCM + **12 m/hr** ROP cap. With citations.

🎤 (to the room)
> "That knowledge used to live in a PDF in someone's cupboard. Now it answers in five seconds."

---

## 8:00 – 11:00 · Act 3 — Human decides, agent acts (4,172 m)

**Turn 7 — recommendation + memo** 🎤
> "Mud weight kaafi kam lag raha hai, thoda badha sakte hain?"

🤖 Weight up to **11.65 ppg (1.40 SG)**: **28.3 lb/bbl** barite = **39.8 MT / 796 bags** for the **3,100 bbl** system. ECD at the sand **11.84 ppg**, still under FIT, **+120 psi** overbalance. MOC memo **MEMO-SM-2026-09** drafted.

⌨️ `M` opens the memo → show the frozen basis + citations → `Esc`.
🎤 (to the room) *"Physics does the numbers, the model gives the range, the memo cites the SOP. It recommends — it does not decide."*

**Turn 8 — approval** 🎤 (or click **Approve** on the Act 3 panel)
> "Theek hai, kar do."

🤖 Approved by you; basis frozen in the decision ledger. "Kisko dispatch karun?"

**Turn 9 — fan-out** 🎤
> "Mud chemist ko message, manager ko email, base ko bhi bata do."

🤖 Instructions sent.
👉 Four lanes light up: **Mud chemist · rig console** (delivered in-app), **RTOC · Google Chat**, **Drilling manager · email**, **Superintendent · phone push** — the last three are marked *simulated for the demo*.

🎤 (to the room — say this honestly)
> "In the demo three of these are simulated. In a pilot they're your real Chat, email and phone — same code path."

Drilling resumes automatically after the Act 3 card.

---

## 11:00 – 13:30 · Act 4 — Other side of the window + the report

(Speed still **×60**: ~2 min to 4,195 m. Switch to **×300** if you're running late.)

**Turn 10 — PROACTIVE reassurance (auto at 4,195 m)**
🤖 "We are at 4,195 m — the depth where **MN-DW-02** kicked." +**120 psi** overbalanced, kick probability down to **6 %**, flow and pits stable.
👉 Ghost replay of the offset kick vs. our flat line.

**Turn 11 — PROACTIVE drilling break (auto at 4,205 m)**
🤖 ROP jumped to **34 m/hr**, ECD **12.02 ppg** — only **0.08 ppg** under FIT. To avoid a repeat of the MN-DW-03 losses, ROP capped at **12 m/hr** with sweeps; ECD back to **11.86 ppg**.
🎤 (to the room) *"Now it's protecting the other side of the window — the losses."*

⌨️ Speed chip **×1200** and `Space` (≈1 min of rig time-lapse toward TD while you talk).

**Turn 12 — shift handover** 🎤
> "Is shift ka handover note bana do."

🤖 Handover drafted: MW 11.65 ppg, memo executed with 39.8 MT barite, break managed by ROP cap, zero kicks or losses. Indexed to DDR.

**Turn 13 — completion report** 🎤 (at TD; or press `-` to jump there)
> "Well complete ho gaya, completion report ka pehla draft bana do."

🤖 **WCR-MN-SM-DW-01 Draft v1.0** drafted — pressure narrative, the memo decision with its frozen basis, the ROP-cap event, and **two lessons learned written back** to the knowledge base.
⌨️ `A` opens the audit drawer — every number, tool call and approval, time-stamped.

🎤 (to the room)
> "Two weeks of paperwork, first draft in seconds. And the lessons go back in — so the next well starts smarter."

---

## 13:30 – 15:00 · Close

⌨️ The closing card appears after Act 4 (or `Enter`).

🎤
> "Four things you saw: it **sees** the rock before the mudlog; it **warns** before the kick; it **acts** — but only after a human says yes; and it **remembers**, so every well makes the next one safer. In Hindi, on a rig, with a full audit trail. All of it built on Google Cloud's Gemini Enterprise Agent Platform, with your own data."

**The ask** *(confirm with the owner — placeholder)*:
> "We'd like to run a 90-day pilot on one live well with your RTOC team."

---

## Controls cheat-sheet

| Key | Does |
|---|---|
| `Space` | Play / pause drilling |
| Speed chips | `1× real` · `×60` · `×300` · `×1200` (rig time) |
| `N` / `PageDown` | Next scripted turn (clicker) |
| `0`–`9` | Jump to turn 0–9 · `-` jump to WCR turn |
| `Shift+1…4` | Stage Act 1–4 (no turn runs) |
| `Enter` / `Esc` | Show/hide act takeaway · close overlays |
| `M` / `W` / `A` | Memo · What-if · Audit drawer |
| `V` | Agent **LIVE ↔ SCRIPTED** |
| `T` / `L` | Theme · caption language |
| `Shift+R` | Reset the show |
| `/presenter` | Second-screen remote (open in another window) |

## If something breaks (say nothing, just do it)

| Symptom | Do this |
|---|---|
| Agent silent > 5 s or mic fails | Type the same line in the agent box, press Enter. |
| Live session keeps dropping | Press `V` → SCRIPTED. Then `N` for each turn; every reply, memo, lane and card still plays. |
| Wrong depth / lost place | `Shift+1…4` to the act, then `N`. |
| Proactive alert didn't fire | Press `6` (alert) / `N`. |
| Total failure | `Shift+R` reset, go SCRIPTED, run `N` from turn 0 — the scripted show runs end-to-end without the network to Gemini. |

## Timing notes

- At **×60**: 4,120 → 4,172 m ≈ 2.3 min · 4,172 → 4,195 m ≈ 1.9 min · 4,195 → 4,205 m ≈ 0.8 min. After 4,205 m use **×1200** (~25 rig-hours remain to TD).
- Drilling **auto-pauses** at the 4,172 m alert and stays held until the memo is approved.
- Live replies take ~1–3 s to start. Don't talk over the agent; let it finish.
