# Sagar Drishti AI Agent — End-to-End Practice Flow

**Goal:** one full run, start to finish, the way you will do it for the Board: about **25 minutes**, **LIVE** voice, **both approvals clicked**.
The questions come from [DEMO_QUESTIONS.md](DEMO_QUESTIONS.md) (Q#); this sheet adds the **order, the clicks and what to check**.

---

## 0 · Setup (10 min before) — do this every time

| ✅ | Step |
|---|---|
| ☐ | **Logins** (local only; Cloud Run needs neither): `gcloud auth login` and `gcloud auth application-default login` |
| ☐ | Open **Cloud Run**: https://sagar-drishti-248430093579.us-central1.run.app/well/MN-SM-DW-01 (sign in `admin@amandeepsinghs.altostrat.com`) — backup: http://localhost:5173/well/MN-SM-DW-01 |
| ☐ | Fresh start: **Shift+R** (resets the show). Full screen: **F11** (hides the URL). |
| ☐ | Agent badge says **LIVE** (press **V** to toggle). Speed **×60**. |
| ☐ | **Clicker / pointer:** press **Shift+K**, then press the button you'll use to talk → toast *"Talk key set"*. (Skip if your clicker has a **PageUp** / back button — that already works.) |
| ☐ | Mic test: press the **talk button** once → agent button shows **Listening…** → say *"Good morning"* → press again. Answer should start in ≈ 2–4 s. |

**Keys you need:** `Space` play/pause drilling · **talk button** (PageUp / `.` / your learned key) = press to listen, press again to send · on-screen **Tap to talk** = backup · `N` next scripted turn (rescue) · `Esc` close any window · `Shift+1…4` jump to an act (rehearsal only — pre-approves both approvals) · `V` LIVE ⇄ SCRIPTED

> [!TIP]
> **Noise:** the mic is only open while the agent button shows "Listening…" (max 30 s, then it sends by itself). Wear a clip-on / wireless USB mic on the laptop; never feed the hall PA mic into the laptop.

> [!IMPORTANT]
> For the real run, **do not use Shift+1…4** — it pre-approves the memo and the ROP cap. Play straight through with `Space`.

---

## Act 1 — Meet the well · English · 📍 4,120 m · ~4 min

| Step | You do / say | Check on screen |
|---|---|---|
| 1 | Q1 *"Good morning. Give me a twenty-second status of MN-SM-DW-01."* | Bit 4,120 m · MW 11.20 · ECD 11.42 · ROP 22 · P(kick) 4 % |
| 2 | Q2 *"What rock is at the bit right now — and how old is what we see at the shakers?"* | U1 shale · 45 min cuttings lag explained |
| 3 | Q3 *"How far to the next zone, and when do we get there?"* | Agent **asks which zone first** (by design) → answer *"U2"* / *"the sand"* → distance + time |
| 4 | Q4 *"Keep an eye on the well and warn me the moment anything changes."* | Confirms it is watching |
| 5 | Press **Space** — drilling starts | Depth counter moves |

## Act 1→2 — Switch to Hinglish · 📍 4,130–4,160 m · ~3 min

| Step | You say | Check |
|---|---|---|
| 6 | Q5 *"Achha, ab Hindi mein baat karte hain. Neeche wali sand mein kya milne wala hai — gas ya paani?"* | Replies in Hinglish · dry gas · 4,195 m sand · GWC 4,270 m |
| 7 | Q6 *"Agle 50 meter ka pore pressure forecast batao."* | Ramp to 11.48 ppg at 4,195 m |
| 8 | Q7 *"Hamara mud weight abhi kitna hai, aur sand top pe kitna chahiye?"* | 11.20 now → ≈ 11.65 needed |

## Act 2 — The window closes · 📍 4,172 m · ~4 min

| Step | You do / say | Check |
|---|---|---|
| 9 | **Wait.** Drilling stops at 4,172 m, chime, agent speaks first (*"Sir, ek minute —"*). Let it finish. | Pressure-ramp warning, 23 m to the sand |
| 10 | Q8 *"Kya hua? Itna urgent kyun hai?"* | −200 psi if unchanged · P(kick) 71 % |
| 11 | Q9 *"Aas-paas ke wells mein is depth pe kya hua tha?"* | MN-DW-02 kick 4,195 m · MN-DW-03 losses 4,222 m · doc IDs cited |
| 12 | Q10 *"Hamara SOP is situation ke baare mein kya kehta hai?"* | **ONGC-SM-SOP-04**: weight up ≥ 20 m above the sand, ≥ 100 psi overbalance |

## Act 3 — Human decides · 📍 4,172 m · ~5 min · 🔐 Approval 1

| Step | You do / say | Check |
|---|---|---|
| 13 | Q12 *"Recommendation do — kitna weight up, kitna barite, kitna time lagega?"* | 11.20 → 11.65 ppg · 39.8 MT · 796 bags |
| 14 | Q13 *"ECD kitna jayega? Shoe toot to nahi jayega?"* | ECD ≈ 11.84 vs FIT 12.10 → safe |
| 15 | Q14 *"Theek hai, MOC memo draft karo."* | Memo MEMO-SM-2026-09 opens on screen with evidence |
| 16 | 🔐 Say *"Theek hai, approve karta hoon."* | Agent **refuses**: *"Sir, kripya screen pe Approve button dabaiye."* ← **the moment to pause for the room** |
| 17 | **Click Approve** on the memo | Approval stamped (role + time) · agent acknowledges · fan-out to 4 teams · *MOC ACTIVE* in the header |
| 18 | (optional) Q16 *"Mud chemist, RTOC aur Drilling Manager ko bata do."* | Channel statuses (RTOC / email / phone = simulated) |
| 19 | Press **Space** if drilling has not resumed | Depth moves toward 4,195 m |

## Act 4 — The other side of the window · 📍 4,195 → 4,205 m · ~5 min · 🔐 Approval 2

| Step | You do / say | Check |
|---|---|---|
| 20 | At **4,195 m** agent speaks (reassurance). Q17 *"Sand top pe hum kaise hain?"* | +120 psi overbalance · zero pit gain |
| 21 | At **4,205 m** drilling stops, agent warns (*drilling break*). Q18 *"Ye ROP achanak kyun badh gaya?"* | ROP 34 · ECD 12.02 · only 0.08 below FIT · proposes ROP cap 12 m/hr |
| 22 | 🔐 Say *"Haan kar do."* | Agent asks you to click · **Approval 2 card** is on screen (bottom centre) |
| 23 | **Click "Approve ROP cap"** | Card disappears · agent confirms ECD 11.86, margin 0.24 · drilling resumes by itself |
| 24 | Q20 *"MN-DW-03 pe yahi situation mein kya galti hui thi?"* | No ROP cap → 310 bbl lost |
| 25 | (optional) *"SOP influx ke baare mein kya bolta hai?"* | **Shut-in steps in order** (pick up, stop pumps, flow check, close annular, notify, record SIDPP/SICP) · ONGC-WC-SOP-01 |

## Wrap-up · 📍 4,300 → 4,450 m · ~4 min

| Step | You do / say | Check |
|---|---|---|
| 26 | Q21 *"Agli shift ke liye shift log bana do."* | Handover lines with sources (Act 4 panel) |
| 27 | Q23 *"WCR report taiyaar karo."* | **"WCR draft for review is ready"** card → click **📄 Open WCR report ↗** (opens from the data lake) → come back, **Esc** |
| 28 | Point at the header: **📄 WCR draft ↗** stays there for the rest of the demo | — |
| 29 | (optional) *"WCR ka link bhejo."* | Agent: *"link screen pe hai"* + button under its reply |
| 30 | Q24 *"Is well se hum kya seekhe? Teen lessons batao."* | 3 lessons, written back to the knowledge base |
| 31 | Q25 *"Board ko ek line mein batao — aaj aapne kya kiya?"* | Your closing line, spoken by the agent |

---

## If something goes wrong (rescue moves)

| Problem | Do this |
|---|---|
| Agent silent > 8 s | Press **N** (runs the scripted turn) — the show continues |
| Badge flips to SCRIPTED on its own | Keep going with **N**; press **V** to retry LIVE between acts |
| A window is in the way | **Esc** |
| Drilling not moving | **Space** · check for a pending approval card (memo or ROP cap) |
| Agent answers in the wrong language | Just repeat the question in the language you want |
| Local Live fails | Use the Cloud Run tab (or run `gcloud auth application-default login`) |
| Talk button does nothing | Click the browser page once (focus), then retry · or **Shift+K** and re-learn the button · or use the on-screen button |
| Stuck on "Listening…" | Press the talk button again (it also auto-sends after 30 s) |

## After each practice run — note 3 things

1. Which answers felt slow (> 5 s)? ______
2. Which answers you would **drop** for the Board? ______
3. Anything the agent said that was wrong or odd (copy the text)? ______
