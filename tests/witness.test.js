import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEMO_RFC, toLookup, withDemoRfc } from '../src/lib/sat69b.js'
import {
  FLAGS,
  MARKS,
  analyze,
  checkFileMeta,
  decodeBytes,
  isSampleData,
  parseInvoices,
  periodLabel,
  summarize,
} from '../src/lib/witness.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const demoCsv = read('public/demo/facturas_ficticias.csv')
const known = new Set(JSON.parse(read('public/demo/clientes_meses_anteriores.json')).rfcs)
const realList = toLookup(JSON.parse(read('public/data/69b.json')))
const HEADER = 'fecha,hora,folio,rfc_receptor,nombre_receptor,total,concepto'
const row = (over = {}) => {
  const r = { fecha: '2026-09-01', hora: '10:00', folio: 'A1', rfc: 'XFAR850312KA1', nombre: 'Ana', total: '100.00', concepto: 'Consulta', ...over }
  return [r.fecha, r.hora, r.folio, r.rfc, r.nombre, r.total, r.concepto].join(',')
}

const flagTypes = (r) => r.flags.map((f) => f.type)

test('T4: demo file -> all 12 invoices, planted RFC flagged 69-B (presunto, demo)', () => {
  const parsed = parseInvoices(demoCsv)
  assert.equal(parsed.ok, true)
  const rows = analyze(parsed.invoices, { list: withDemoRfc(realList), known })
  assert.equal(rows.length, 12)
  const delta = rows.find((r) => r.rfc === DEMO_RFC)
  assert.deepEqual(delta.flags, [{ type: FLAGS.MATCH_69B, status: 'presunto', demo: true }])
})

test('T4: one flag of each kind, each on its own row', () => {
  const rows = analyze(parseInvoices(demoCsv).invoices, { list: withDemoRfc(realList), known })
  const byName = Object.fromEntries(rows.map((r) => [r.nombre, flagTypes(r)]))
  assert.deepEqual(byName['Aseguradora Fic.'], [FLAGS.AMOUNT_OUTLIER])
  assert.deepEqual(byName['Paciente Marta L.'], [FLAGS.ODD_HOUR])
  assert.deepEqual(byName['Clínica Sonrisa Fic.'], [FLAGS.UNKNOWN_RECIPIENT])
  assert.equal(rows.filter((r) => r.flags.length > 0).length, 4)
})

test('T5: list unavailable -> no row checked against 69-B, demo RFC not flagged either', () => {
  const rows = analyze(parseInvoices(demoCsv).invoices, { list: null, known })
  assert.ok(rows.every((r) => r.checked69b === false))
  assert.ok(rows.every((r) => !flagTypes(r).includes(FLAGS.MATCH_69B)))
})

test('uploads without a known list never flag "Receptor nuevo"', () => {
  const rows = analyze(parseInvoices(demoCsv).invoices, { list: realList, known: null })
  assert.ok(rows.every((r) => !flagTypes(r).includes(FLAGS.UNKNOWN_RECIPIENT)))
})

test('odd hour is 00:00–04:59; 05:00 is not flagged', () => {
  const csv = [HEADER, row({ hora: '00:00' }), row({ hora: '04:59' }), row({ hora: '05:00' }), row({ hora: '23:59' })].join('\n')
  const rows = analyze(parseInvoices(csv).invoices, { list: null, known: null })
  assert.deepEqual(rows.map((r) => flagTypes(r).includes(FLAGS.ODD_HOUR)), [true, true, false, false])
})

test('T6: file checks before reading — image, PDF, wrong extension, empty, 2 MB', () => {
  assert.equal(checkFileMeta({ name: 'foto.png', size: 1000, type: 'image/png' }).ok, false)
  assert.equal(checkFileMeta({ name: 'foto.csv', size: 1000, type: 'image/png' }).ok, false)
  assert.equal(checkFileMeta({ name: 'facturas.pdf', size: 1000, type: 'application/pdf' }).ok, false)
  assert.equal(checkFileMeta({ name: 'facturas.xlsx', size: 1000, type: '' }).ok, false)
  assert.equal(checkFileMeta({ name: 'vacio.csv', size: 0, type: 'text/csv' }).ok, false)
  assert.match(checkFileMeta({ name: 'grande.csv', size: 2 * 1024 * 1024, type: 'text/csv' }).error, /200 KB/)
  assert.equal(checkFileMeta({ name: 'facturas.CSV', size: 1000, type: '' }).ok, true)
})

test('T6: binary disguised as .csv is rejected; Windows-1252 text is decoded', () => {
  assert.equal(decodeBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]).buffer).ok, false)
  const latin = new Uint8Array([...Buffer.from('Cl'), 0xed, ...Buffer.from('nica')]) // "Clínica" in Windows-1252
  assert.equal(decodeBytes(latin.buffer).text, 'Clínica')
  assert.equal(decodeBytes(new TextEncoder().encode('﻿hola').buffer).text, 'hola')
})

test('T6: empty CSV, header only, missing column, too many rows', () => {
  assert.match(parseInvoices('').error, /vacío/)
  assert.match(parseInvoices('\n\n').error, /vacío/)
  assert.match(parseInvoices(HEADER).error, /ninguna factura/)
  assert.match(parseInvoices('fecha,hora,folio,nombre_receptor,total,concepto\n2026-09-01,10:00,A,Ana,1,x').error, /faltan columnas: rfc_receptor/)
  const many = [HEADER, ...Array.from({ length: 501 }, () => row())].join('\n')
  assert.match(parseInvoices(many).error, /más de 500/)
})

test('T6: bad values -> errors with row numbers, nothing processed', () => {
  const csv = [HEADER, row(), row({ rfc: 'NOESUNRFC' }), row({ total: 'mil' }), row({ fecha: '2026-02-30' }), row({ hora: '25:00' })].join('\n')
  const res = parseInvoices(csv)
  assert.equal(res.ok, false)
  assert.equal(res.invoices, undefined)
  assert.match(res.error, /4 errores; no revisamos nada/)
  assert.match(res.error, /Fila 3: el RFC/)
  assert.match(res.error, /Fila 4: el total/)
  assert.match(res.error, /Fila 5: la fecha/)
  assert.match(res.error, /Fila 6: la hora/)
})

test('amount formats: 1450, 1,450.00 and $1,450.00 are numbers; 1.450,00 is not', () => {
  for (const t of ['1450', '1450.5', '"1,450.00"', '"$1,450.00"']) assert.equal(parseInvoices([HEADER, row({ total: t })].join('\n')).ok, true, t)
  for (const t of ['"1.450,00"', '-5', '0', 'abc']) assert.equal(parseInvoices([HEADER, row({ total: t })].join('\n')).ok, false, t)
})

test('RFC is uppercased and columns can come in any order', () => {
  const csv = 'total,concepto,nombre_receptor,rfc_receptor,folio,hora,fecha\n100,Consulta,Ana,xfar850312ka1,A1,10:00,2026-09-01'
  const res = parseInvoices(csv)
  assert.equal(res.ok, true)
  assert.equal(res.invoices[0].rfc, 'XFAR850312KA1')
})

test('summary counts the three honest states; unmarked counts as "sin revisar"', () => {
  const marks = { 0: MARKS.RECOGNIZED, 1: MARKS.RECOGNIZED, 2: MARKS.NOT_RECOGNIZED, 3: MARKS.COULD_NOT_CHECK }
  assert.deepEqual(summarize(12, marks), { total: 12, recognized: 2, notRecognized: 1, unreviewed: 9 })
})

test('period label', () => {
  assert.equal(periodLabel(parseInvoices(demoCsv).invoices), 'Septiembre 2026')
})

test('the uploaded sample is recognized as demo data; a file without the planted RFC is not', () => {
  const demo = parseInvoices(demoCsv).invoices
  assert.equal(isSampleData(demo), true)
  assert.equal(isSampleData(demo.filter((i) => i.rfc !== DEMO_RFC)), false)
  assert.equal(isSampleData([...demo, { ...demo[0], rfc: 'GODE561231GR8' }]), false)
})
