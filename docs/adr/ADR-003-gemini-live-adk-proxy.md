# ADR-003: Gemini 3.8 Live via ADK with backend proxy

- **Status:** Accepted (2026-09-25)
- **Context:** Drilling Intelligence 2.0 board demo (see SDD).
- **Decision:** Native audio, barge-in, async function calling. Backend proxies audio so credentials never reach the browser; watchdog injects SYSTEM_EVENTs for proactive speech.
- **Consequences:** Documented in SDD; revisit only via change control (SDD §19).
