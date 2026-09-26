# Rehearsal Playbook

1. Reset to Turn 0 (`R`). 2. Enable rehearsal numeric checker. 3. Run all turns by voice. 4. Log latency per turn. 5. Record offline cache on a clean run. 6. Repeat until 5 consecutive clean runs (SDD SC-4).

## Failure drills
- Mic dies → switch to typed input.
- Network drops → `DI_OFFLINE=1` hot switch.
- Agent says a wrong number → hotkey to re-issue turn; log for prompt fix.
- Total failure → fallback video (`F`).
