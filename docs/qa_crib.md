# Q&A Crib Sheet

| Likely question | Answer (short) |
|---|---|
| Is this real data? | Petrophysical curves are real public logs (IODP, CC0); offset reports are illustrative. On your NDR/RTOC data this is a 90-day pilot. |
| Where does data live? | Vertex AI in asia-south1 (Mumbai); customer data not used to train foundation models; air-gapped option via Google Distributed Cloud. |
| What if the AI is wrong? | Numbers come from physics/ML tools, not the LLM; safety-critical actions need named human approval; everything is ledgered. |
| Why Eaton/Matthews-Kelly? | Industry-standard, explainable; calibrated to the shoe FIT; ML adds early warning inside the physics window. |
| Does it work in other Indian languages? | Gemini Live supports many Indian languages with auto-detection; demo can take a question in the expert's language. |
| What's the pilot? | 1 RTOC, 3–5 offset wells, KPI = early-warning lead time vs historical events (backtest), plus WCR drafting time. |
