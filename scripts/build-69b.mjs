// Downloads SAT's public 69-B "Listado completo" and writes public/data/69b.json.
// Run by hand (`npm run update-69b`), then commit the result. Not part of the Vercel build,
// so a slow or blocked SAT server can never break a deploy.
//
// If the download or the sanity checks fail, the committed snapshot is kept and the reason is logged.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { DEMO_RFC, FLAGGED_STATUSES, parse69bCsv } from '../src/lib/sat69b.js'

// Verified 2026-09-30. SAT serves this file over HTTP only (HTTPS refuses the connection).
export const SOURCE_URL = 'http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv'
// Optional override, used to test the fallback: `node scripts/build-69b.mjs <url>`.
const url = process.argv[2] || SOURCE_URL
const OUT = fileURLToPath(new URL('../public/data/69b.json', import.meta.url))
const MIN_FLAGGED = 500 // the real list has thousands; far fewer means a broken or partial file

async function keepCommitted(reason) {
  console.warn(`[69-B] Download not used: ${reason}`)
  try {
    const current = JSON.parse(await readFile(OUT, 'utf8'))
    console.warn(`[69-B] Keeping committed snapshot from ${current.snapshot_date} (${current.count} RFCs).`)
  } catch {
    console.error('[69-B] No committed snapshot either. The app will show "No se pudo revisar".')
    process.exitCode = 1
  }
}

async function main() {
  let text
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'llave-propia-build (public open data)' },
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) return keepCommitted(`HTTP ${res.status}`)
    // SAT publishes the file in Windows-1252, not UTF-8.
    text = new TextDecoder('windows-1252').decode(await res.arrayBuffer())
  } catch (error) {
    return keepCommitted(error.message)
  }

  let parsed
  try {
    parsed = parse69bCsv(text)
  } catch (error) {
    return keepCommitted(`file format changed? ${error.message}`)
  }

  const count = Object.keys(parsed.rfcs).length
  if (count < MIN_FLAGGED) return keepCommitted(`only ${count} flagged RFCs (expected ${MIN_FLAGGED}+)`)
  if (DEMO_RFC in parsed.rfcs) return keepCommitted(`demo RFC ${DEMO_RFC} appears in the real list`)

  const out = {
    source: 'SAT · Listado completo de contribuyentes (Artículo 69-B del CFF)',
    source_url: url,
    snapshot_date: parsed.snapshotDate, // SAT's own "Información actualizada al …" date
    downloaded_at: new Date().toISOString().slice(0, 10),
    statuses_included: FLAGGED_STATUSES,
    count,
    rfcs: parsed.rfcs,
  }
  await writeFile(OUT, JSON.stringify(out) + '\n')
  console.log(
    `[69-B] Wrote ${count} RFCs (SAT date ${parsed.snapshotDate}). Rows by status: ${JSON.stringify(parsed.counts)}. ` +
      `Skipped ${parsed.skipped} rows with an invalid RFC; dropped ${parsed.droppedAsCleared} RFCs also listed as cleared.`,
  )
}

main()
