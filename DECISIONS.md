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
- **F3 checked by Fátima on her phone** (form, agreement, print view).

## 2026-09-30 · F4 fictional invoices + 69-B snapshot
- **69-B source verified 30/09/2026:** `http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv` (SAT's own domain, "Listado completo de contribuyentes (Artículo 69-B del CFF)"). SAT serves it **over HTTP only**; HTTPS refuses the connection. The script's sanity checks (header, SAT date line, 500+ RFCs, valid RFC format) are the guard against a broken or tampered download.
- **Not used:** SAT's open-data page `datos_abiertos_articulo69b.htm` says "actualizada al 23 de agosto de 2018" and its links point to *artículo 69* files, not 69-B. The newer consultation pages ("Iniciar") redirect to a JavaScript-only portal with no direct file link.
- **Snapshot date = SAT's own date inside the file:** "Información actualizada al 31 de diciembre de 2025" → `snapshot_date: 2025-12-31`. Server last-modified: 22/01/2026. Downloaded 30/09/2026. **The list is 9 months old**, so F5 must show that date next to every 69-B result, with the limit "an RFC added after that date won't appear".
- **What's kept:** 11,270 definitivo + 986 presunto rows → 12,097 RFCs (959 presunto, 11,138 definitivo). Dropped: 340 desvirtuado, 1,638 sentencia favorable, 91 rows SAT redacted as `XXXXXXXXXXXX`, and 49 RFCs listed as presunto/definitivo **and** as cleared (never flagged if SAT cleared them in any row). If an RFC is both presunto and definitivo, definitivo wins.
- **`69b.json` shape:** `rfcs` is an object `{ RFC: "presunto" | "definitivo" }` instead of the spec's plain array, because the status has to be shown on the flag. Also stores `source_url`, `downloaded_at`, `statuses_included`, `count`. 340 KB raw.
- **Script runs by hand (`npm run update-69b`), not on every Vercel build.** A slow or blocked SAT server must never break a deploy. On any failure it keeps the committed snapshot and logs why (tested: unreachable host, 404, wrong file).
- **Demo RFC `XFIC800101AB1`** is added in memory only (`withDemoRfc`), as `presunto`, and marked `demo: true` so F5 can label it "RFC ficticio agregado para la demo". A test checks it never appears in `69b.json`. If the list fails to load, the demo RFC is not flagged either: every row says "No se pudo revisar" (T5).
- **Demo data (`public/demo/`):** 12 invented invoices for September 2026. Every RFC starts with `X` (not a real person's pattern) and a test checks none is on the real 69-B list. Planted cases, one each: amount outlier (Aseguradora Fic., $38,500 vs. median $1,950), 03:12 (Paciente Marta L.), new recipient (Clínica Sonrisa Fic.), 69-B demo RFC (Comercializadora Delta Fic.). Each case is on a different row so each rule can be tested alone.
- **"Receptor nuevo" list:** `clientes_meses_anteriores.json`, labeled "Clientes de meses anteriores (ficticios)". Delta Fic. is on it (it bought services for its employees before), so its row only shows the 69-B flag. For a real upload, where this list comes from is an open question for F5.

## 2026-09-30 · F5 monthly witness
- **"Receptor nuevo" only for the fictional sample** (Fátima's call, option 1). For any other upload the flag is hidden and one line says: "Para detectar receptores nuevos necesitamos tus clientes de meses anteriores; por ahora solo funciona con el ejemplo." Future improvement (option 2): let the contador also upload last month's file to build the list.
- **The uploaded sample counts as demo data.** T4 says *uploading* the sample must flag the planted RFC, so a file that contains `XFIC800101AB1` and only `X`-prefixed (fictional) RFCs gets demo treatment: orange banner, demo RFC and the fictional client list. A real file never contains the planted RFC.
- **69-B date and limit on every result** (Condition 2): each 69-B flag says "Lista del SAT al 31/12/2025: no incluye RFCs agregados después", and the source line above the list repeats it with the review date.
- **If the list fails** (network, 404, broken JSON): a red notice, and every row shows "No se pudo revisar la lista 69-B". Not even the demo RFC is flagged. The other rules still run, because they don't depend on the list.
- **Rows with no flag show nothing.** No "OK", no green, no "seguro". When every invoice is marked "La reconozco", one neutral line says "Revisaste las N facturas."
- **Summary "Sin revisar" = not marked yet + "No pude revisar".** Both mean nobody vouched for that invoice. Tapping a selected mark again clears it.
- **Validation is all-or-nothing.** Name, type and size are checked before reading; binary content (e.g. a renamed image) is rejected; any bad row stops everything, with up to 5 row errors listed by number. Accepts UTF-8 or Windows-1252 (Excel), columns in any order, amounts like `1450`, `1,450.00` or `$1,450.00`. Rejects `1.450,00` because it's ambiguous.
- **Odd hour = 00:00–04:59.** Outlier = more than 3 × the file's median.
- **The file never leaves the browser.** Checked in the end-to-end test: the only requests are same-origin GETs for the app, `69b.json` and the demo files. No POST, no upload.
- **Sticky summary (Fátima's phone test):** while marking invoices further down, the summary scrolled out of view. It now sticks to the top (under the demo banner) instead of being duplicated at the bottom: one summary, always visible, about 80 px tall at 375 px.

## 2026-09-30 · F6 next-action cards + /api/explain (Gemini)
- **Model `gemini-3.8-flash`, via `models.generateContent`.** Checked on ai.google.dev on 30/09/2026 (pricing and models pages, both updated 24/09/2026): the current stable Flash model, with a free tier. Its free-tier content is "used to improve our products", which is acceptable only because it receives a flag type (see F1). Google's docs now also show a newer `interactions` endpoint; `generateContent` is still documented with no deprecation, so we use that.
- **`/api/explain` accepts exactly `{ "flag": "<code>" }`.** The 5 codes are `69B_MATCH`, `NOT_RECOGNIZED`, `UNKNOWN_RECIPIENT`, `AMOUNT_OUTLIER`, `ODD_HOUR`. Any extra key, other value, bad JSON, body > 200 bytes or non-POST is rejected **before** calling Gemini. Even the 69-B status (presunto/definitivo) is not sent; the card shows it from the browser.
- **Gemini only rewrites approved text.** `src/data/nextActions.js` holds the card text and is imported by both the card and the function. Prompt: meaning only, 2–3 sentences, ≤ 60 words asked, ≤ 80 enforced by cutting whole sentences, no new facts, end with "alerta para revisar". Bug found on the real call: "e.firma" was read as a sentence end. Sentences now split only before a capital letter.
- **Retry once on a Gemini 5xx, never on 429.** On the preview, Gemini answered 503 ("overloaded") to about half the first calls, and 429 when I sent ~15 calls in a few minutes. With one retry, spaced calls all succeeded. Answers are cached per flag in the warm function for 6 h and in the tab for the session, to protect the free quota.
- **If Gemini fails:** "No se pudo generar la explicación." in the card; the hard-coded card stays.
- **When the card shows:** open as soon as she marks "No la reconozco"; on flagged rows not yet recognized, behind a "¿Qué hago ahora?" button (four always-open cards in the demo would be noise); hidden once she marks "La reconozco", because she vouched for it. The AI explains the most serious reason on the row (69-B > not recognized > new recipient > amount > hour).
- **Card steps, all SAT links checked 30/09/2026:** (1) talk to the contador today; (2) review issued invoices in SAT's CFDI portal `portalcfdi.facturaelectronica.sat.gob.mx`; (3) if she didn't issue it, file a complaint ("Presenta tu queja o denuncia", no login) or call MarcaSAT 55 627 22 728 (tap-to-call), and book a SAT appointment if someone may have her e.firma. Condition 3: a human route is named. The spec said "presenta aclaración"; "Presenta tu aclaración" needs a login and is about one's own tax situation, so the complaint route was the better fit. The SAT info pages for invoice lookup and e.firma revocation returned 404, so they're not linked.
- **Key:** `GEMINI_API_KEY` is a Vercel Secret env var (Production + Preview). It's sent only as the `x-goog-api-key` header from the function; it's never logged (errors log only the status code) and never returned. The client bundle contains no key, no `generativelanguage` URL and no env var name (checked in `dist/` and in the repo).
- **Tested on a Vercel preview before production**, to check the real call without touching the live site.
- **F6 checked by Fátima on her phone.** She agreed with the complaint route, leaving out the broken SAT links, and caching per flag.

## 2026-09-30 · F7 hardening, deploy #3, docs
- **Full T1–T11 pass on the live URL**, 375 px and desktop, real Gemini for T7/T8: all pass. The browser scripts live outside the repo (headless Chrome via `puppeteer-core`); `npm test` has 50 unit tests in the repo. T9 also checks IndexedDB, Cache Storage, service workers and `Set-Cookie` headers. T10 searches every commit for key-shaped strings, confirms no `.env` file is tracked and checks the live bundle.
- **Bug found and fixed (`e489055`, deploy #3):** if `69b.json` failed to load once (e.g. a brief connection drop), the witness screen kept that failure for the whole session, so every later check said "No se pudo revisar la lista 69-B" until a reload. It was honest but useless. A failed load is now forgotten and the next check tries again; a successful load is still reused.
- **No new features in F7** (as agreed).

## Bugs found this week (and fixed)
| Where | Bug | How it was found | Fix |
|---|---|---|---|
| F3 agreement | Clearing a partner's name to retype it silently dropped their account roles | Automated test | Roles point to a stable partner id |
| F3 print | With 4 partners, one signature landed alone on page 2 | Looking at the printed PDF | Tighter print layout; signatures kept together |
| F5 witness | Summary scrolled out of view while marking invoices further down | **Fátima on her phone** | Sticky summary under the banner |
| F6 AI | The 80-word cut treated "e.firma" as a sentence end ("…tienen tu e.") | First real Gemini call | Split sentences only before a capital letter |
| F6 AI | Gemini repeated the card's steps and ran past 80 words | First real Gemini call | Prompt asks for the meaning only |
| F6 AI | Gemini 503 "overloaded" on about half the first calls | Preview function logs | One retry on 5xx; per-flag cache |
| F7 witness | A single failed 69-B load stuck for the whole session | F7 test pass | Retry on next check |
| F6 AI (live) | "Explícamelo simple" always failed: Gemini free-tier **daily** quota used up by our own testing (~30 calls) | **Fátima on her phone** + Vercel logs (`Gemini HTTP 429`, still failing 17 min later) | Log the quota name; clear "límite de hoy" message; tests fake Gemini |

Problems in my own test scripts (not the app) are not listed. They were fixed in the scripts.

## Deploys
1. **#1** F1, by Vercel CLI (`llave-propia.vercel.app`), then GitHub connected.
2. **#2** F2 `aa4268a`, the first automatic deploy from a GitHub push. Every push since deploys the same way (F3–F6 and the summary fix).
3. **#3** `e489055`, the F7 bug fix.
4. `92132bf`, the Gemini quota fix (after the session-close review).

## Open questions / next steps
- **Real "Receptor nuevo":** let the contador also upload last month's file to build the known-clients list (option 2).
- **Fresher 69-B data:** SAT's file is dated 31/12/2025. Re-run `npm run update-69b` monthly, and look for a newer official source.
- **Persona test** with "Dra. Lupita" (separate fresh chat, as the packet plans) has not been run yet.

## 2026-09-30 · Gemini daily quota (found after F7)
- **Symptom:** on Fátima's phone, "Explícamelo simple" showed "No se pudo generar la explicación" every time.
- **Cause, from the Vercel logs:** every `/api/explain` call on the current deployments, from 18:35 to 18:53, got `Gemini HTTP 429`. They kept failing 17 minutes apart, so it was not the per-minute limit; it was the free tier's **requests-per-day** limit. Not a key problem (that would be 400/403) and not a 503. Our own testing burned it: preview tests, retries, the live T7/T8 runs and the F7 pass, about 30 requests.
- **Google's rules** (ai.google.dev rate-limits page, 30/09/2026): daily quotas reset at **midnight Pacific time (01:00 in Mexico City)**, and limits are **per project, not per key**, so a new key wouldn't help. Usage can be seen on AI Studio's rate-limit page.
- **Fix (`92132bf`, no new features):**
  - `/api/explain` logs Google's error type, quota name and retry delay, never the key or the message. Example: `Gemini HTTP 429 RESOURCE_EXHAUSTED quota=GenerateRequestsPerDay… retry=…`.
  - It answers 429 `{ "error": "quota" }`, so the card says "La explicación con IA llegó a su límite de hoy. La tarjeta de arriba tiene los pasos." Other errors still say "No se pudo generar la explicación."
  - The browser test scripts fake `/api/explain` by default; a real call needs `ALLOW_LIVE_GEMINI=1`.
- **Not done (Fátima's call):** falling back to `gemini-3.5-flash` when the quota runs out.
- **Testing rule from now on:** at most one deliberate real Gemini call per check, by hand, from the phone. Everything else uses a fake reply.

## Session close · 2026-09-30
- **Done today:** F1–F7, 13 commits, every push auto-deployed to https://llave-propia.vercel.app. T1–T11 pass on the live site; 52 unit tests pass. README and DECISIONS written. The quota fix is deployed and verified with **zero** real Gemini calls (log count after the push: 0).
- **State tonight:** the Gemini daily quota is used up until 01:00 Mexico City time. Until then the card shows the "límite de hoy" message; everything else works.
- **Tomorrow's first move:** test "Explícamelo simple" once on my phone, then the persona test and the demo video.
