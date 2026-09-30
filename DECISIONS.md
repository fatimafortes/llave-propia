# DECISIONS — Llave Propia

## 2026-09-30 · F1 skeleton
- **Vite + React, no router.** Screen changes live in React state only, so nothing ends up in the URL or browser storage.
- **System fonts, no Google Fonts or analytics.** Zero third-party requests from the page (Condition 1: nothing leaves the device).
- **`docs/mockup.html` replaced.** The old file was the "Piso" mockup from another week; the new one is the Llave Propia HTML mockup (matches `mockup.png`) and is the design reference; `diagram1.png` (flowchart) and `diagram2.png` (swimlane) checked and match PACKET §5.
- **"Receptor nuevo" = not on a known-recipients list.** A single month has no history, so the demo ships a short fictional list labeled "clientes de meses anteriores"; any recipient not on it is flagged.
- **69-B: flag only `presunto` and `definitivo`, and show the status on the flag.** Never flag `desvirtuado` or `sentencia favorable`, since SAT has cleared those taxpayers.
- **SAT facts verified by hand, not copied.** CertiSAT renewal rules and the 69-B download link get checked on sat.gob.mx before F2/F4; the "revisado" date shown is the date actually checked.
- **Gemini free tier may use inputs to improve Google's models.** Acceptable only because `/api/explain` sends a fixed flag type (e.g. `69B_MATCH`) and nothing else: no RFCs, names, amounts or file content. If that ever changes, move to the paid tier or drop the AI step.

## 2026-09-30 · F2 renewal check
- **Renewal rule verified on sat.gob.mx (30/09/2026), and it has three routes, not two:**
  - *Valid e.firma* + .cer + .key + password → Certifica + CertiSAT Web, any time up to 24 h before expiry. Source: [Renueva el certificado de tu e.firma](https://wwwmat.sat.gob.mx/tramites/63992/renueva-el-certificado-de-tu-e.firma-(antes-firma-electronica)).
  - *Expired ≤ 1 year* → first request authorization in SAT ID (ID + short video), then CertiSAT Web with the expired e.firma. Adults only. Source: [Renovar e.firma a través de SAT ID](https://wwwmat.sat.gob.mx/tramites/90298/solicitud-de-autorizacion-para-renovar-el-certificado-de-e.firma-a-traves-de-la-aplicacion-sat-id).
  - *Expired > 1 year, or missing .cer/.key/password* → appointment at a SAT office (citas.sat.gob.mx).
  - The El Universal (March 2026) line "valid or expired < 1 year → online" is right about the one-year window but skips the SAT ID step for expired certificates.
- **One follow-up yes/no question.** The four spec questions stay as written. Only when all four are "sí" do we ask "¿Tu e.firma sigue vigente hoy?" to separate CertiSAT-direct from SAT ID-first. Any "no" routes to the appointment immediately.
- **What to bring to the appointment:** confirmed appointment, valid official ID, USB (preferably new), a working email; plus proof of address only when expired > 1 year. Limit line tells her to check the appointment receipt, since SAT may ask for more.
- **Links point to `wwwmat.sat.gob.mx`.** `www.sat.gob.mx/tramites/...` timed out from here on 30/09/2026 while `wwwmat` (SAT's own trámites host) answered 200.
- **Routing is a pure function** (`src/lib/renewal.js`) with `node:test` tests (`npm test`), no test framework added.
- **Tomorrow's first move:** check the F2 auto-deploy on a phone, then F3 (credentials agreement + print).
