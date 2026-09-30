# DECISIONS — Llave Propia

## 2026-09-30 · F1 skeleton
- **Vite + React, no router.** Screen changes live in React state only, so nothing ends up in the URL or browser storage.
- **System fonts, no Google Fonts or analytics.** Zero third-party requests from the page (Condition 1: nothing leaves the device).
- **`docs/mockup.html` deleted.** It was the "Piso" mockup from another week. `docs/mockup.png` is the design reference; `diagram1.png` (flowchart) and `diagram2.png` (swimlane) checked and match PACKET §5.
- **"Receptor nuevo" = not on a known-recipients list.** A single month has no history, so the demo ships a short fictional list labeled "clientes de meses anteriores"; any recipient not on it is flagged.
- **69-B: flag only `presunto` and `definitivo`, and show the status on the flag.** Never flag `desvirtuado` or `sentencia favorable`, since SAT has cleared those taxpayers.
- **SAT facts verified by hand, not copied.** CertiSAT renewal rules and the 69-B download link get checked on sat.gob.mx before F2/F4; the "revisado" date shown is the date actually checked.
- **Gemini free tier may use inputs to improve Google's models.** Acceptable only because `/api/explain` sends a fixed flag type (e.g. `69B_MATCH`) and nothing else: no RFCs, names, amounts or file content. If that ever changes, move to the paid tier or drop the AI step.
- **Tomorrow's first move:** check the deploy #1 URL on a phone, then F2 (renewal check), after confirming the CertiSAT renewal rules on sat.gob.mx.
