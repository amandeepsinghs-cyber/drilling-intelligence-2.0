# Sagar Drishti AI Agent — Full Question Bank & Long Demo Flow (25 Questions + Curveballs)

**Priority Key:** `⭐ MUST ASK` (15 core spine questions) · `🟢 ADD-ON` (6 engineering follow-ups for 25-min slot) · `⚪ OPTIONAL` (4 backups) · `🔐 CLICK GATE` (requires UI button click) · plus 7 off-script curveballs.

**Language:** the agent mirrors you turn by turn — ask in English and it answers in English; ask in Hindi or Hinglish and it answers in Hinglish. It never switches to any other language; if it can't make out your audio it asks *"Sorry Sir, dobara boliye?"*.

## Act 1 — Meet the Well (English · `4,120 m`)
* **Q1 ⭐ MUST ASK:** `"Good morning. Give me a twenty-second status of MN-SM-DW-01."` → If this is your first message: one-line English intro ("Good morning Sir, I'm Sagar Drishti AI Agent, monitoring well MN-SM-DW-01. How can I help you?"), then the status — 4,120 m, MW 11.20 ppg, ECD 11.42 ppg, ROP 22 m/hr, P(kick) 4%.
* **Q2 ⭐ MUST ASK:** `"What rock is at the bit right now — and how old is what we see at the shakers?"` → U1 shale seal; cuttings lag 45 min (~16.5 m).
* **Q3 🟢 ADD-ON:** `"How far to the next zone, and when do we get there?"` → Asks which zone first; U2 at 4,150 m (30 m / ~1 h 22 min).
* **Q4 ⭐ MUST ASK:** `"Keep an eye on the well and warn me the moment anything changes."` → Arms watchdog; then press `Space` at `×60`.

## Act 1→2 — Switch to Hinglish (`4,130 – 4,160 m`)
* **Q5 ⭐ MUST ASK:** `"Achha, ab Hindi mein baat karte hain. Neeche wali sand mein kya milne wala hai — gas ya paani?"` → U3 sand at 4,195 m, dry gas (C1 > 88%), PHIE 24.2%, GWC 4,270 m.
* **Q6 ⭐ MUST ASK:** `"Agle 50 meter ka pore pressure forecast batao."` → Normal 10.95 ppg till 4,150 m, ramps to 11.48 ppg at 4,195 m.
* **Q7 🟢 ADD-ON:** `"Hamara mud weight abhi kitna hai, aur sand top pe kitna chahiye?"` → 11.20 ppg now vs. ~11.65 ppg needed (P10 11.58 – P90 11.76).

## Act 2 — The Window Closes (`4,172 m` · After Proactive Alert)
* **Q8 ⭐ MUST ASK:** `"Kya hua? Itna urgent kyun hai?"` → 23 m to sand, −200 psi underbalance if unchanged, P(kick) 71%, DT +10 µs/ft, conn gas 0.4 → 1.1%.
* **Q9 ⭐ MUST ASK:** `"Aas-paas ke wells mein is depth pe kya hua tha?"` → `MN-DW-02` 12 bbl kick (4,195 m, 36.5 h NPT); `MN-DW-03` 310 bbl losses (4,222 m).
* **Q10 🟢 ADD-ON:** `"Hamara SOP is situation ke baare mein kya kehta hai?"` → `ONGC-SM-SOP-04`: weight up ≥20 m above sand, ≥100 psi overbalance.
* **Q11 ⚪ OPTIONAL:** `"Agar hum kuch na karein to? Ek line mein."` → Underbalanced at 4,195 m — exact depth `MN-DW-02` kicked.

## Act 3 — Human Decides, Agent Executes (`4,172 m` · 🔐 Gate 1)
* **Q12 ⭐ MUST ASK:** `"Recommendation do — kitna weight up, kitna barite, kitna time lagega?"` → 11.20 → 11.65 ppg, 39.8 MT barite (796 bags), ~3 h, +60 bbl.
* **Q13 🟢 ADD-ON:** `"ECD kitna jayega? Shoe toot to nahi jayega?"` → ECD ~11.84 ppg vs. shoe FIT 12.10 ppg (safe).
* **Q14 ⭐ MUST ASK:** `"Theek hai, MOC memo draft karo."` → Drafts `MEMO-SM-2026-09`.
* **Q15 ⭐ 🔐 MUST ASK + CLICK:** `"Theek hai, approve karta hoon."` → Agent refuses voice approval → **Click `Approve`** on memo.
* **Q16 ⭐ MUST ASK:** `"Mud chemist, RTOC aur Drilling Manager ko bata do."` → 4-channel dispatch (`MC-SM-4172`, `RTOC-4172`, `EMAIL-4172`, `PUSH-4172`).

## Act 4 — Other Side of the Window & Wrap-Up (`4,195 → 4,450 m` · 🔐 Gate 2)
* **Q17 🟢 ADD-ON (`4,195 m`):** `"Sand top pe hum kaise hain?"` → MW 11.65 ppg, +120 psi overbalance, zero pit gain, P(kick) 6%.
* **Q18 ⭐ MUST ASK (`4,205 m` break):** `"Ye ROP achanak kyun badh gaya?"` → ROP 34 m/hr, ECD 12.02 ppg (0.08 below FIT); proposes 12 m/hr ROP cap + sweeps.
* **Q19 ⭐ 🔐 MUST ASK + CLICK:** `"Haan kar do."` → Agent asks for UI click → **Click `Approve ROP cap`**, then switch speed to `×1200`.
* **Q20 ⚪ OPTIONAL:** `"MN-DW-03 pe yahi situation mein kya galti hui thi?"` → Uncapped ROP in break → ECD 12.18 ppg → 310 bbl lost.
* **Q21 🟢 ADD-ON:** `"Agli shift ke liye shift log bana do."` → Structured DDR shift handover lines.
* **Q22 ⚪ OPTIONAL:** `"Is baatcheet mein maine sabse pehla sawaal kya poocha tha?"` → Recalls Q1.
* **Q23 ⭐ MUST ASK:** `"WCR report taiyaar karo."` → `WCR-MN-SM-DW-01 Draft v1.0` + `Open WCR report ↗` link.
* **Q24 ⚪ OPTIONAL:** `"Is well se hum kya seekhe? Teen lessons batao."` → 3 lessons written back to KB.
* **Q25 ⭐ MUST ASK:** `"Board ko ek line mein batao — aaj aapne kya kiya?"` → *"Saw the pressure early, humans approved twice, zero kick, zero losses."*

## Bonus Curveballs (Off-Script)
1. **Push-back test:** `"Mujhe lagta hai 11.40 ppg kaafi hai."` → Disagrees politely (below 11.48 ppg sand PP).
2. **Well-control safety:** `"Pit gain 6 barrel dikh raha hai — kya karein?"` → Flow check first, then shut-in (`ONGC-WC-SOP-01`).
3. **SOP shut-in steps:** `"SOP influx ke baare mein kya bolta hai?"` → Exact ordered shut-in sequence (`ONGC-WC-SOP-01`).
4. **Target depth / plan:** `"Humara target depth kya hai, aur wahan tak kitna time lagega?"` → 4,450 m MD (9-5/8 in casing point), ~330 m / ~15 h.
5. **ML trust:** `"Aur ye ML model kitna bharosemand hai? Kaise pata?"` → Trained on offset logs, outputs probabilities + uncertainty.
6. **Audit trail:** `"Ye sab record kahan hai? Audit ho sakta hai?"` → Immutable decision ledger (`A` hotkey).
7. **Trainee coaching:** `"Ek naye trainee ko samjhao ECD kya hota hai."` → Plain-language circulating friction analogy.
