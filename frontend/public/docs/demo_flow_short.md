# Sagar Drishti AI Agent — Short Demo Flow (15 Minutes)

**Format:** 12 presenter prompts (1 typed + 11 voice) · 3 automatic agent interruptions · 2 mandatory UI button clicks  
**Alignment:** Maps **1-to-1** to `data/scenario/turns.yaml` (`T0`–`T13`) and `README.md` §2. Pressing `N` rescues any turn seamlessly.  
**Language:** the agent mirrors you turn by turn (English → English, Hindi/Hinglish → Hinglish) and never uses any other language.

> [!IMPORTANT]
> 1. **Both approvals require an on-screen click** (`Approve` at `4,172 m` and `Approve ROP cap` at `4,205 m`). Voice "approve" is intentionally refused.
> 2. **Never press `Shift+1…4` during the live show** — those rehearsal shortcuts pre-approve both gates.

---

## Cue-by-Cue Script

### Act 1 — Rock at the Bit (`1:30 – 4:30` · `4,120 m` · `1× real`)
1. **T0 (Type or say any greeting):** `"Hey, I hope everything is going okay."` → **Always English, one line:** *"Good morning Sir, I'm Sagar Drishti AI Agent, monitoring well MN-SM-DW-01. How can I help you?"* (status comes when you ask for it, next turn)
2. **T1 (Voice — switch to Hindi):** `"Mujhe bata dena jab kuch bhi gadbad ho, theek hai?"` → Watchdog armed (`dxc`, DT, conn gas, 30 m kick risk).
3. **T2 (Voice):** `"Thoda batayenge abhi well ke andar kya chal raha hai?"` → Live status in Hindi.
4. **T3 (Voice):** `"Abhi kaun si formation mein hain? Mudlog to baad mein aayega."` → ML lithology at bit (U1 seal) vs. 20-min shaker cuttings lag; cites `WCR-MN-DW-01`.

### Act 2 — The Window Closes (`4:30 – 8:00` · `4,145 → 4,172 m`)
5. **T4a (Voice):** `"Agle zone tak kitna time lagega?"` → Clarifies first (*"Kaun sa zone? U3 pay sand at 4,195 m?"*).
6. **T4b (Voice):** `"Haan, pay sand."` → ~50 m (~2 hrs); PP ramps to 11.48 ppg (~200 psi underbalance at 11.20 ppg). **Action:** Speed `×60` + `Space`.
* ⚡ **T5 AUTO (`4,172 m`):** Drilling pauses; agent warns *"Sir, ek minute..."* (71% kick risk, 23 m to hazard).
7. **T6 (Voice):** `"Paas wale rig pe kya complication aayi thi, aur kaise mitigate kiya?"` → `MN-DW-02` (12 bbl kick) & `MN-DW-03` (28 bbl/hr losses + 12 m/hr ROP cap).

### Act 3 — Human Decides, Agent Acts (`8:00 – 11:00` · `4,172 m`, Paused)
8. **T7 (Voice):** `"Mud weight kaafi kam lag raha hai, thoda badha sakte hain?"` → 11.65 ppg (1.40 SG), 39.8 MT / 796 bags barite, ECD 11.84 ppg, drafts `MEMO-SM-2026-09`.
9. 🔐 **T8 GATE 1 (Voice + Click):** `"Theek hai, kar do."` → Agent refuses voice shortcut → **Click `Approve`** on screen.
10. **T9 (Voice):** `"Mud chemist ko message, manager ko email, base ko bhi bata do."` → 4-lane fan-out (Mud console live; Chat/Email/Push simulated).

### Act 4 — Other Side of the Window & Report (`11:00 – 15:00` · `4,195 → 4,450 m`)
* ⚡ **T10 AUTO (`4,195 m`):** Calm reassurance at sand top (+120 psi overbalance, 6% kick risk).
* ⚡ 🔐 **T11 GATE 2 (`4,205 m`):** Drilling break (ROP 34 m/hr, ECD 12.02 ppg vs 12.10 FIT) → **Click `Approve ROP cap`**, then set speed `×1200`.
11. **T12 (Voice):** `"Is shift ka handover note bana do."` → Drafts DDR shift handover note.
12. **T13 (Voice, at TD `4,450 m` or `-`):** `"Well complete ho gaya, completion report ka pehla draft bana do."` → Compiles `WCR-MN-SM-DW-01 Draft v1.0` + writes 2 lessons back to KB.
