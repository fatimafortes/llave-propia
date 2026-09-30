// SAT 69-B list: parsing the official CSV (build time) and looking up RFCs (browser).
// Only "presunto" and "definitivo" are ever flagged. "Desvirtuado" and "sentencia favorable"
// mean SAT cleared the taxpayer, so they are dropped, and an RFC with any cleared row is never flagged.
import { parseCsv } from './csv.js'

export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
export const FLAGGED_STATUSES = ['presunto', 'definitivo']
const CLEARED_STATUSES = ['desvirtuado', 'sentencia favorable']

// Planted for the demo only. Added in memory at runtime, never written to public/data/69b.json.
export const DEMO_RFC = 'XFIC800101AB1'
export const DEMO_STATUS = 'presunto'

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

// "Información actualizada al 31 de diciembre de 2025" -> "2025-12-31"
export function parseSnapshotDate(text) {
  const m = normalize(text).match(/actualizada al (\d{1,2}) de ([a-z]+) de (\d{4})/)
  if (!m || !MONTHS[m[2]]) return null
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// Parses SAT's "Listado completo" CSV text. Throws if the file doesn't look like the real list.
export function parse69bCsv(text) {
  const rows = parseCsv(text)
  const headerIndex = rows.findIndex((r) => normalize(r[1]) === 'rfc')
  if (headerIndex === -1) throw new Error('No header row with an RFC column')
  const header = rows[headerIndex].map(normalize)
  const rfcCol = header.indexOf('rfc')
  const statusCol = header.findIndex((h) => h.startsWith('situacion'))
  if (statusCol === -1) throw new Error('No "Situación del contribuyente" column')

  const snapshotDate = rows
    .slice(0, headerIndex)
    .map((r) => parseSnapshotDate(r[0]))
    .find(Boolean)
  if (!snapshotDate) throw new Error('No "Información actualizada al …" date in the file')

  const flagged = new Map()
  const cleared = new Set()
  const counts = {}
  let skipped = 0
  for (const r of rows.slice(headerIndex + 1)) {
    const rfc = String(r[rfcCol] ?? '').trim().toUpperCase()
    const status = normalize(r[statusCol])
    if (!rfc && !status) continue
    counts[status] = (counts[status] || 0) + 1
    if (!RFC_RE.test(rfc)) {
      skipped++
      continue
    }
    if (CLEARED_STATUSES.includes(status)) cleared.add(rfc)
    else if (FLAGGED_STATUSES.includes(status)) {
      // "definitivo" outranks "presunto" if an RFC appears twice.
      if (flagged.get(rfc) !== 'definitivo') flagged.set(rfc, status)
    }
  }
  let droppedAsCleared = 0
  for (const rfc of cleared) if (flagged.delete(rfc)) droppedAsCleared++

  const rfcs = Object.fromEntries([...flagged].sort(([a], [b]) => a.localeCompare(b)))
  return { snapshotDate, rfcs, counts, skipped, droppedAsCleared }
}

// Validates the shape of public/data/69b.json and returns a lookup, or throws.
export function toLookup(json) {
  if (!json || typeof json !== 'object') throw new Error('69-B list is not an object')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(json.snapshot_date ?? '')) throw new Error('69-B list has no snapshot date')
  if (!json.rfcs || typeof json.rfcs !== 'object') throw new Error('69-B list has no RFCs')
  const rfcs = json.rfcs
  return {
    snapshotDate: json.snapshot_date,
    count: Object.keys(rfcs).length,
    demo: false,
    // Returns { status, demo } or null.
    find(rfc) {
      const status = Object.prototype.hasOwnProperty.call(rfcs, rfc) ? rfcs[rfc] : null
      return FLAGGED_STATUSES.includes(status) ? { status, demo: false } : null
    },
  }
}

// Returns a new lookup that also knows the demo RFC. The original list is not modified.
export function withDemoRfc(lookup) {
  return {
    ...lookup,
    demo: true,
    find(rfc) {
      if (rfc === DEMO_RFC) return { status: DEMO_STATUS, demo: true }
      return lookup.find(rfc)
    },
  }
}

// Browser loader. Any failure -> { available: false } so the UI shows "No se pudo revisar", never OK.
export async function load69b(fetchFn = fetch, url = '/data/69b.json') {
  try {
    const res = await fetchFn(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { available: true, list: toLookup(await res.json()) }
  } catch (error) {
    return { available: false, reason: String(error?.message ?? error) }
  }
}
