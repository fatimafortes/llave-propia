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
- **Deploy #2 = first automatic deploy from GitHub.** Push of `aa4268a` (16:30:46) produced production deployment `dpl_BrvbCwPDBxwdT8sGkzxfeZq2Q5wo` at 16:30:53 with the `llave-propia-git-main-…` alias, which only git-triggered deploys get. No CLI deploy was run. From here on, every push to `main` deploys.
- **Fifth question confirmed by Fátima:** a wrong route is worse than one extra click.

## 2026-09-30 · F3 credentials agreement
- **Every role is a partner, never the receptionist** (Condition 4). Custodian and backup are chosen only from the partners; clause 3 of the agreement says reception can use accounts but doesn't own the risk.
- **Backup must be a different partner.** With a single partner there is no backup; the document says "Sin respaldo (solo hay un socio)" and asks to revisit it when a partner joins.
- **Roles point to a stable partner id, not the name.** Bug found in testing: clearing a name to retype it silently dropped that partner's account roles. Ids fix it for good.
- **Validation (rule 7):** nickname and "Otra" ≤ 80 chars; partner = first name(s) only, max two words, letters only, no duplicates; 1–6 partners; ≥ 1 account; rotation days whole number 1–30; records option required. Errors are shown in Spanish next to the field and focus jumps to the first one.
- **`autoComplete="off"` on the form**, so the browser doesn't keep partner names in its autofill history.
- **Clause 1 keeps each e.firma personal**, including from the contador: the contador works with the CIEC, never the .key (PACKET §5b).
- **NOM-004 is only flagged**, under the patient-records clause, as out of scope.
- **Print:** `window.print()`; print CSS hides the back link, title, buttons and footer. Signatures are kept together so no name ends up alone on a page. 1, 4 and 6 partners each print on one Letter page.
- **Tomorrow's first move:** check F3 on a phone (fill + print to PDF), then F4 (fictional invoices + 69-B snapshot script), starting by verifying the 69-B download link on sat.gob.mx.
