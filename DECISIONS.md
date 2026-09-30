# DECISIONS — Llave Propia

## 2026-09-30 · F1 skeleton
- **Vite + React, no router.** Screen changes live in React state only, so nothing ends up in the URL or browser storage.
- **System fonts, no Google Fonts or analytics.** Zero third-party requests from the page (Condition 1: nothing leaves the device).
- **`docs/mockup.html` ignored.** It's the "Piso" mockup from another project. `docs/mockup.png` is the design reference.
- **Tomorrow's first move:** check the deploy #1 URL on a phone, then F2 (renewal check), after confirming the CertiSAT renewal rules on sat.gob.mx.
