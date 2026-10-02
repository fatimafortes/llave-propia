# Llave Propia

**Live:** https://llave-propia.vercel.app · Week 8 Business Bending · Team 6 · SME Shield (fiscal identity)

A small web app, in Spanish, for the dentists of a shared dental practice in Mexico City. Each dentist's
e.firma (.cer + .key + password) is legally *her* signature, but it often sits with the contador or in
an old email thread, and nobody checks what gets signed with it. Llave Propia doesn't ask anyone to "do
security". It attaches a check to something that already happens every month, the contador's monthly
close:

1. **¿Puedes renovar hoy?** 4 short questions (plus one follow-up) tell her whether she can renew her
   e.firma online today (CertiSAT Web, or SAT ID first if it expired less than a year ago) or needs a
   SAT appointment, and what to bring. If her contador holds the files (or she doesn't know), it gives
   her a friendly message to ask for them back, then the same routes. No file is ever uploaded.
2. **Acuerdo de credenciales.** The partners decide who looks after each shared account (WhatsApp
   Business, practice software, Wi-Fi, email…) and who backs them up, always a partner and never the
   receptionist. It produces a printable agreement with signature lines.
3. **Testigo mensual.** She reviews the month's invoices issued with her RFC. Each one is checked
   against SAT's public 69-B list and three simple rules, and she marks it *La reconozco / No la
   reconozco / No pude revisar*. Anything she doesn't recognize gets a sourced, dated "¿Qué hago ahora?"
   card, and an optional plain-Spanish explanation labeled **"Explicación generada por IA"**.

## Fictional data notice

All invoice data in this repo and in the demo is **invented**: `public/demo/facturas_ficticias.csv`
(12 invoices, September 2026) and `public/demo/clientes_meses_anteriores.json`. Every fictional RFC
starts with `X`, and a test checks that none of them is on the real 69-B list. A fixed orange banner
**"DATOS FICTICIOS · DEMO"** is shown whenever sample data is on screen. The demo RFC `XFIC800101AB1`
is added to the 69-B check **in memory only** and labeled "RFC ficticio agregado para la demo"; it never
enters `public/data/69b.json`.

The 69-B list itself is **real public data** from SAT (see below).

## Nothing is stored, and why

There is no database, no login, no localStorage, sessionStorage, IndexedDB, cookies, analytics or
third-party fonts. Uploaded invoice files are read **in the browser** and never sent anywhere. Closing
or reloading the tab erases everything. This is deliberate (Blueprint Condition 1): if the app holds no
credentials and no invoices, there is nothing to protect and nothing to leak, and it can never become
the single place an attacker goes to find every dentist's data.

The only thing that leaves the browser is one word: when she taps "Explícamelo simple", the page sends
`{"flag": "69B_MATCH"}` (or another of five flag codes) to `/api/explain`. The function rejects anything
else, so no RFC, name, amount or file content reaches Gemini.

If storage is ever added, it must use Supabase Auth (Google) with Row Level Security first.

## How to run

Requires Node 20+.

```bash
npm install
npm run dev          # app at http://localhost:5173 (without /api/explain)
npm test             # 50 unit tests (node:test, no extra dependencies)
npm run build        # static build in dist/
npm run update-69b   # re-download SAT's 69-B list into public/data/69b.json, then commit it
```

`/api/explain` is a Vercel serverless function. To run it locally, use `vercel dev` with
`GEMINI_API_KEY` set in your own environment. The key lives **only** in Vercel environment variables
(Secret, Production + Preview); `.env*` is git-ignored and the key never appears in the client bundle.

## How it works

| Part | Where | Notes |
|---|---|---|
| UI | `src/components/` | Vite + React, no router; screens live in React state |
| Renewal routes | `src/lib/renewal.js` | Rules checked on sat.gob.mx 30/09/2026 |
| Agreement | `src/lib/agreement.js` | Validation + document model; printed with `window.print()` |
| Invoice checks | `src/lib/witness.js` | Validation (CSV only, ≤ 200 KB, ≤ 500 rows, columns, RFC, numbers) and rules: 69-B match, amount > 3 × median, issued 00:00–04:59, new recipient (sample only) |
| 69-B list | `scripts/build-69b.mjs` → `public/data/69b.json` | SAT "Listado completo", **presunto and definitivo only**; SAT's own date 31/12/2025 shown next to every result |
| Card text | `src/data/nextActions.js` | Approved text shared by the card and the AI prompt |
| AI | `api/explain.js` | `gemini-3.8-flash` (free tier), accepts only `{flag}`, ≤ 80 words, one retry on a Gemini 5xx |
| Sources | `src/data/sources.js` | Every route shows source + review date + a one-line limit |

## Tests (T1–T11 from the packet)

All run on the live URL at 375 px and desktop on 30/09/2026 with headless Chrome scripts, plus
`npm test`.

| # | What | Result |
|---|---|---|
| T1 | Renewal, all "sí" | CertiSAT Web route with source and date ✔ |
| T2 | Renewal, lost .key | SAT appointment and what to bring ✔ |
| T3 | Agreement with 1 and 4 partners | Every account with custodian and backup; print hides app chrome ✔ |
| T4 | Fictional sample (button and upload) | 12 invoices; planted RFC flagged 69-B ✔ |
| T5 | 69-B list fails (abort / 404 / broken JSON) | Every row "No se pudo revisar la lista 69-B", never OK ✔ |
| T6 | Wrong files (image, renamed image, empty, header only, missing column, 2 MB, bad rows, 501 rows) | Clear Spanish error, nothing processed ✔ |
| T7 | Mark "No la reconozco" | Card with steps, source, date and limits ✔ |
| T8 | AI explanation | Labeled; network payload is exactly `{"flag":"…"}` with no RFC, name or amount ✔ |
| T9 | Reload / close tab | Nothing remains; no storage, cookies, cache or service worker ✔ |
| T10 | Secrets | No key in repo history or bundle; key only in Vercel ✔ |
| T11 | 375 px | No sideways scroll; buttons ≥ 44 px ✔ |

## What is NOT built

- No connection to SAT systems, no scraping, no login to anything of SAT's.
- No upload of .cer/.key files, passwords, CIEC, CURP, biometrics or bank data, ever.
- No real invoices; the demo is fictional and labeled.
- No accounts, no database, no stored agreements.
- No clinical records (NOM-004); only flagged in the agreement clause.
- No "you are safe" badge, no score, no promise of recovery.
- No contador-side dashboard.
- "Receptor nuevo" only works with the fictional sample (a real upload has no list of previous
  clients yet).

## Known limits

- The 69-B list is SAT's latest published file, **dated 31/12/2025**; an RFC added after that date
  won't appear. SAT serves the file over HTTP only.
- Gemini's free tier is sometimes overloaded (503) or rate-limited (429). The card always works without
  it.
- Gemini's free tier may use inputs to improve Google's products. It only ever receives a flag code.

See [`DECISIONS.md`](DECISIONS.md) for every decision and why, and [`docs/PACKET.md`](docs/PACKET.md) for
the problem, user and Blueprint conditions.
