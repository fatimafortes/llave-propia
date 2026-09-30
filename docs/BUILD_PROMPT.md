# BUILD PROMPT — Llave Propia (for Claude Code)

You are building **Llave Propia**, a small web app for a Mexican shared dental practice. Read `docs/PACKET.md` first; it is the source of truth for the problem, user, flow and Blueprint conditions. Build in small, testable features, one commit per feature. Do not start a feature until the previous one's acceptance criteria pass. Ask me before any step that needs my accounts (GitHub, Vercel, Gemini) and tell me exactly what to click. All user-facing text is in **Spanish (Mexico)**, plain and short. Code and comments in English.

## Stack (free)
- Vite + React (JavaScript), deployed on **Vercel**, repo on **GitHub** (`llave-propia`).
- **Gemini API** (free tier) called only from one Vercel serverless function `/api/explain.js`. Check Google AI Studio's docs for the current free-tier model name; do not guess it.
- **No database and no login — by design.** The app stores nothing, so there is nothing to protect or leak (Blueprint Condition 1). If storage is ever added later, it must use my Supabase project "semestre" with Google sign-in and Row Level Security first.

## Hard rules (Blueprint conditions + course security floor)
1. **Nothing is stored.** No database, no localStorage/sessionStorage/IndexedDB, no cookies, no analytics. All invoice processing happens in the browser and disappears when the tab closes.
2. **Never ask for credentials.** No inputs for .cer, .key, passwords, CIEC, CURP or bank data.
3. **Only three states per invoice:** `reconocida` / `no reconocida` / `no se pudo revisar`. No green "safe" badge, no score.
4. **Demo data is fictional and labeled:** a fixed orange banner "DATOS FICTICIOS · DEMO" whenever sample data is loaded.
5. **Gemini receives only a flag type** (`69B_MATCH`, `AMOUNT_OUTLIER`, `ODD_HOUR`, `UNKNOWN_RECIPIENT`, `NOT_RECOGNIZED`) — never RFCs, names, amounts or file content. Output is shown under "Explicación generada por IA."
6. **Secrets:** `GEMINI_API_KEY` only in Vercel env vars (server-side). `.env*` in `.gitignore`. Never print the key; it must not appear in the client bundle.
7. **Validate every input:** CSV only, ≤ 200 KB, ≤ 500 rows, required columns present, RFC matches `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$`; agreement text fields ≤ 80 chars; numbers are numbers. Invalid → clear Spanish error, nothing processed. Server-side, `/api/explain` accepts only the allowed flag values.
8. Every route shown (CertiSAT Web, SAT appointments, 69-B list) displays **source + review date + one-line limit**.

## Features (in order)

**F1 — Skeleton + deploy #1.** Home with three cards: "1. ¿Puedes renovar hoy?", "2. Acuerdo de credenciales", "3. Testigo mensual". Footer: "No guardamos nada. Al cerrar esta pestaña, todo se borra."
- AC: live on Vercel; works at 375 px and desktop; no console errors.

**F2 — Renewal check.** Four yes/no questions: tengo mi .cer · tengo mi .key · recuerdo la contraseña · mi e.firma está vigente o venció hace menos de un año.
- All yes → "Renueva hoy en CertiSAT Web, desde tu propio dispositivo, sin avisar a nadie antes" + steps + official link + source/date.
- Any no → "Necesitas cita en el SAT" + what to bring + link to citas.sat.gob.mx + source/date.
- AC: T1, T2 pass; no file input on this screen.

**F3 — Credentials agreement.** Form: practice nickname (not legal name), partners (1–6, first names only), shared accounts (WhatsApp Business, software del consultorio, Wi-Fi, correo, otra), custodian + backup per account (chosen from partners), rotation days after someone leaves (1–30), patient-records clause (se quedan en el consultorio / se van con el dentista / decidir caso por caso). Generates a printable agreement page with signature lines; "Imprimir / Guardar PDF" uses `window.print()`.
- AC: T3 passes; print view hides the app chrome; nothing saved anywhere.

**F4 — Fictional data + 69-B list.**
- `public/demo/facturas_ficticias.csv` with `fecha,hora,folio,rfc_receptor,nombre_receptor,total,concepto` — 12 invented invoices for one month: one amount > 3× median, one at 03:12, one never-seen recipient, and RFC `XFIC800101AB1` planted for the demo.
- `scripts/build-69b.mjs`: download SAT's public 69-B "listado completo" CSV (datos abiertos), extract RFCs to `public/data/69b.json` as `{ "snapshot_date": "...", "rfcs": [...] }`. If download fails, keep the committed snapshot and log it. In demo mode add `XFIC800101AB1` in memory only, labeled "RFC ficticio agregado para la demo."
- AC: `69b.json` has a real snapshot date; the demo RFC never enters the real file.

**F5 — Monthly witness.** Upload CSV or "Cargar ejemplo ficticio." Validate (rule 7). Rows show date, recipient, amount and flags: `En lista 69-B del SAT`, `Monto fuera de lo normal`, `Emitida de madrugada`, `Receptor nuevo`. If `69b.json` fails → every row "No se pudo revisar la lista 69-B," never OK. Dentist marks each row with the three states. Summary: "Facturas en tu RFC este mes: N · Reconocidas · No reconocidas · Sin revisar".
- AC: T4, T5, T6 pass.

**F6 — Next-action cards + Gemini + deploy #2.** For "no reconocida" or flagged rows, show a hard-coded, sourced, dated card: what it may mean, 3 steps (habla hoy con tu contador · revisa tus facturas emitidas en el portal del SAT · si no la emitiste, acude al SAT / presenta aclaración), limits ("Esto no confirma un fraude; es una alerta para revisar"). Button "Explícamelo simple" → POST `/api/explain` with `{ flag }` only; fixed system prompt + approved card text; ≤ 80 words in Spanish. Error → "No se pudo generar la explicación," card still shown.
- AC: T7, T8 pass (check the network payload); key absent from the client bundle.

**F7 — Hardening + deploy #3.** Run T1–T11; fix at least one bug found; redeploy. Update `DECISIONS.md` and `README.md` (what it is, fictional-data notice, "nothing is stored" and why, how to run, what is NOT built).

## Commit plan (≥ 5 commits, ≥ 2 deploys)
1. `feat: skeleton + home cards` → **deploy #1**
2. `feat: e.firma renewal check`
3. `feat: credentials agreement + print`
4. `feat: fictional invoices + 69-B snapshot script`
5. `feat: monthly witness with three honest states`
6. `feat: next-action cards + /api/explain (Gemini)` → **deploy #2**
7. `fix: <bug found in test pass>` → **deploy #3**
8. `docs: README + DECISIONS`

## Session close (every session)
Update `DECISIONS.md` (what I decided and why), write tomorrow's first move, commit, push.
