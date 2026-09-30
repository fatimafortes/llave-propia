import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../src/lib/csv.js'
import {
  DEMO_RFC,
  RFC_RE,
  load69b,
  parse69bCsv,
  parseSnapshotDate,
  toLookup,
  withDemoRfc,
} from '../src/lib/sat69b.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// Same layout as SAT's file: a long quoted notice with the date, a title row, then the header.
const FIXTURE = [
  '"Información actualizada al 31 de diciembre de 2025; los listados …",,,',
  'Listado completo de contribuyentes (Artículo 69-B del CFF),,,',
  'No,RFC,Nombre del Contribuyente,Situación del contribuyente',
  '1,AAA010101AA1,"EMPRESA UNO, S.A. DE C.V.",Presunto',
  '2,BBB020202BB2,"EMPRESA ""DOS"", S.C.",Definitivo',
  '3,CCC030303CC3,EMPRESA TRES,Desvirtuado',
  '4,DDD040404DD4,EMPRESA CUATRO,Sentencia Favorable',
  '5,EEE050505EE5,EMPRESA CINCO,Presunto',
  '6,EEE050505EE5,EMPRESA CINCO,Desvirtuado',
  '7,FFF060606FF6,EMPRESA SEIS,Presunto',
  '8,FFF060606FF6,EMPRESA SEIS,Definitivo',
  '9,XXXXXXXXXXXX,REDACTADO,Definitivo',
].join('\r\n')

test('CSV parser: quoted commas, escaped quotes, newlines inside quotes, CRLF', () => {
  assert.deepEqual(parseCsv('a,"b, c","d ""e"""\r\n1,"x\ny",3'), [
    ['a', 'b, c', 'd "e"'],
    ['1', 'x\ny', '3'],
  ])
})

test('snapshot date comes from SAT\'s own "actualizada al" line', () => {
  assert.equal(parseSnapshotDate('Información actualizada al 31 de diciembre de 2025; …'), '2025-12-31')
  assert.equal(parseSnapshotDate('INFORMACION ACTUALIZADA AL 5 DE MARZO DE 2026'), '2026-03-05')
  assert.equal(parseSnapshotDate('sin fecha'), null)
})

test('keeps only presunto + definitivo; never flags an RFC SAT also cleared', () => {
  const { snapshotDate, rfcs, skipped, droppedAsCleared } = parse69bCsv(FIXTURE)
  assert.equal(snapshotDate, '2025-12-31')
  assert.deepEqual(rfcs, {
    AAA010101AA1: 'presunto',
    BBB020202BB2: 'definitivo',
    FFF060606FF6: 'definitivo', // definitivo outranks presunto
  })
  assert.equal(skipped, 1) // SAT's redacted XXXXXXXXXXXX row
  assert.equal(droppedAsCleared, 1) // EEE… is presunto and desvirtuado -> not flagged
})

test('rejects a file without the date or without the RFC header', () => {
  assert.throws(() => parse69bCsv(FIXTURE.replace('actualizada al 31 de diciembre de 2025', 'sin fecha')))
  assert.throws(() => parse69bCsv('hola,mundo\n1,2'))
})

test('lookup finds flagged RFCs with their status; demo RFC only via withDemoRfc', () => {
  const list = toLookup({ snapshot_date: '2025-12-31', rfcs: { AAA010101AA1: 'presunto', CCC030303CC3: 'desvirtuado' } })
  assert.deepEqual(list.find('AAA010101AA1'), { status: 'presunto', demo: false })
  assert.equal(list.find('CCC030303CC3'), null) // a cleared status is never returned, even if present
  assert.equal(list.find('toString'), null)
  assert.equal(list.find(DEMO_RFC), null)
  const demo = withDemoRfc(list)
  assert.deepEqual(demo.find(DEMO_RFC), { status: 'presunto', demo: true })
  assert.deepEqual(demo.find('AAA010101AA1'), { status: 'presunto', demo: false })
  assert.equal(list.find(DEMO_RFC), null) // original untouched
})

test('T5 groundwork: any load failure -> unavailable, never an empty "all clear" list', async () => {
  const fail = (impl) => load69b(impl, '/data/69b.json')
  assert.equal((await fail(async () => { throw new Error('offline') })).available, false)
  assert.equal((await fail(async () => ({ ok: false, status: 404 }))).available, false)
  assert.equal((await fail(async () => ({ ok: true, json: async () => ({ rfcs: {} }) }))).available, false)
  assert.equal((await fail(async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json') } }))).available, false)
  const ok = await fail(async () => ({ ok: true, json: async () => ({ snapshot_date: '2025-12-31', rfcs: {} }) }))
  assert.equal(ok.available, true)
})

// ---- F4 acceptance criteria against the committed files ----

const real = JSON.parse(read('public/data/69b.json'))

test('AC: 69b.json has a real SAT snapshot date and a real-sized list', () => {
  assert.match(real.snapshot_date, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(real.snapshot_date <= real.downloaded_at, 'SAT date cannot be after the download')
  assert.ok(real.count > 500 && real.count === Object.keys(real.rfcs).length)
  assert.match(real.source_url, /^http:\/\/omawww\.sat\.gob\.mx\//)
})

test('AC: 69b.json only contains presunto/definitivo and valid RFCs', () => {
  for (const [rfc, status] of Object.entries(real.rfcs)) {
    assert.ok(RFC_RE.test(rfc), rfc)
    assert.ok(status === 'presunto' || status === 'definitivo', `${rfc}: ${status}`)
  }
})

test('AC: the demo RFC never enters the real file', () => {
  assert.equal(DEMO_RFC in real.rfcs, false)
  assert.equal(read('public/data/69b.json').includes(DEMO_RFC), false)
})

// ---- Fictional demo data ----

const [header, ...rows] = parseCsv(read('public/demo/facturas_ficticias.csv').trim())
const invoices = rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
const known = new Set(JSON.parse(read('public/demo/clientes_meses_anteriores.json')).rfcs)

test('demo CSV: 12 invoices, one month, required columns, valid RFCs', () => {
  assert.deepEqual(header, ['fecha', 'hora', 'folio', 'rfc_receptor', 'nombre_receptor', 'total', 'concepto'])
  assert.equal(invoices.length, 12)
  assert.equal(new Set(invoices.map((i) => i.fecha.slice(0, 7))).size, 1)
  for (const i of invoices) {
    assert.ok(RFC_RE.test(i.rfc_receptor), i.rfc_receptor)
    assert.ok(Number.isFinite(Number(i.total)) && Number(i.total) > 0)
    assert.match(i.hora, /^\d{2}:\d{2}$/)
  }
})

test('demo CSV: exactly one of each planted case', () => {
  const totals = invoices.map((i) => Number(i.total)).sort((a, b) => a - b)
  const median = (totals[5] + totals[6]) / 2
  assert.equal(invoices.filter((i) => Number(i.total) > 3 * median).length, 1, 'amount outlier')
  assert.equal(invoices.filter((i) => Number(i.hora.slice(0, 2)) < 5).length, 1, 'odd hour')
  assert.equal(invoices.filter((i) => i.hora === '03:12').length, 1)
  assert.equal(invoices.filter((i) => !known.has(i.rfc_receptor)).length, 1, 'new recipient')
  assert.equal(invoices.filter((i) => i.rfc_receptor === DEMO_RFC).length, 1, 'planted 69-B RFC')
})

test('demo RFCs are all fictional: none is on the real 69-B list', () => {
  for (const rfc of [...invoices.map((i) => i.rfc_receptor), ...known]) {
    assert.equal(rfc in real.rfcs, false, rfc)
    assert.ok(rfc.startsWith('X'), `${rfc} should use the fictional X prefix`)
  }
})
