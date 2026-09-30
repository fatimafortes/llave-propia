// Monthly witness (F5): file checks, invoice validation, flag rules and summary.
// Everything runs in the browser; the file never leaves the device.
import { parseCsv } from './csv.js'
import { DEMO_RFC, RFC_RE } from './sat69b.js'

export const MAX_BYTES = 200 * 1024
export const MAX_ROWS = 500
export const MAX_NAME = 120
export const MAX_FOLIO = 40
export const REQUIRED_COLUMNS = ['fecha', 'hora', 'folio', 'rfc_receptor', 'nombre_receptor', 'total', 'concepto']
const MAX_ROW_ERRORS = 5

// Flag types. The same codes are the only values /api/explain will accept in F6.
export const FLAGS = {
  MATCH_69B: '69B_MATCH',
  AMOUNT_OUTLIER: 'AMOUNT_OUTLIER',
  ODD_HOUR: 'ODD_HOUR',
  UNKNOWN_RECIPIENT: 'UNKNOWN_RECIPIENT',
}

export const MARKS = {
  RECOGNIZED: 'reconocida',
  NOT_RECOGNIZED: 'no_reconocida',
  COULD_NOT_CHECK: 'no_se_pudo_revisar',
}

export const ODD_HOUR_END = 5 // issued 00:00–04:59
export const OUTLIER_FACTOR = 3

const fail = (error) => ({ ok: false, error })

// Checks name/size/type before reading a single byte.
export function checkFileMeta({ name = '', size = 0, type = '' }) {
  if (!/\.csv$/i.test(name) || /^(image|video|audio)\//.test(type) || type === 'application/pdf') {
    return fail('Ese archivo no es un CSV. Pide a tu contador la lista de facturas en formato .csv.')
  }
  if (size === 0) return fail('El archivo está vacío.')
  if (size > MAX_BYTES) return fail('El archivo pesa más de 200 KB. Revisa que sea solo la lista de facturas de un mes.')
  return { ok: true }
}

// UTF-8 first; Excel on Windows often saves CSV as Windows-1252.
export function decodeBytes(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.includes(0)) return fail('Ese archivo no es un CSV de texto.')
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  return { ok: true, text: text.replace(/^﻿/, '') }
}

const validDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}
const validTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
// Accepts 1450, 1450.5, 1450.00, 1,450.00 and $1,450.00. Returns a number or null.
const parseAmount = (s) => {
  const t = s.replace(/^\$\s?/, '')
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t.replace(/,/g, ''))
  return n > 0 && Number.isFinite(n) ? n : null
}

// Parses and validates the whole file. All-or-nothing: any error -> nothing is processed.
export function parseInvoices(text) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''))
  if (rows.length === 0) return fail('El archivo está vacío.')

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c))
  if (missing.length) return fail(`Al archivo le faltan columnas: ${missing.join(', ')}.`)
  const data = rows.slice(1)
  if (data.length === 0) return fail('El archivo tiene encabezados pero ninguna factura.')
  if (data.length > MAX_ROWS) return fail(`El archivo tiene más de ${MAX_ROWS} facturas. Revisa que sea solo un mes.`)

  const col = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)]))
  const errors = []
  const invoices = []
  data.forEach((r, i) => {
    const line = i + 2 // 1-based, counting the header
    const get = (c) => String(r[col[c]] ?? '').trim()
    const rowErrors = []
    const fecha = get('fecha')
    const hora = get('hora')
    const folio = get('folio')
    const rfc = get('rfc_receptor').toUpperCase()
    const nombre = get('nombre_receptor').replace(/\s+/g, ' ')
    const concepto = get('concepto').replace(/\s+/g, ' ')
    const total = parseAmount(get('total'))

    if (!validDate(fecha)) rowErrors.push('la fecha debe ser AAAA-MM-DD')
    if (!validTime(hora)) rowErrors.push('la hora debe ser HH:MM')
    if (!RFC_RE.test(rfc)) rowErrors.push('el RFC no tiene el formato correcto')
    if (total === null) rowErrors.push('el total no es un número')
    if (!nombre) rowErrors.push('falta el nombre del receptor')
    if (nombre.length > MAX_NAME || concepto.length > MAX_NAME) rowErrors.push(`un texto pasa de ${MAX_NAME} caracteres`)
    if (folio.length > MAX_FOLIO) rowErrors.push(`el folio pasa de ${MAX_FOLIO} caracteres`)

    if (rowErrors.length) errors.push(`Fila ${line}: ${rowErrors.join(', ')}.`)
    else invoices.push({ fecha, hora, folio, rfc, nombre, concepto, total })
  })

  if (errors.length) {
    const more = errors.length > MAX_ROW_ERRORS ? ` Y ${errors.length - MAX_ROW_ERRORS} filas más.` : ''
    return fail(`Hay ${errors.length === 1 ? 'un error' : `${errors.length} errores`}; no revisamos nada. ${errors.slice(0, MAX_ROW_ERRORS).join(' ')}${more}`)
  }
  return { ok: true, invoices }
}

// The fictional sample, whether loaded by button or uploaded: it contains the planted RFC and
// only fictional (X-prefixed) RFCs. It gets the demo banner, the demo RFC and the demo client list.
export function isSampleData(invoices) {
  return invoices.some((i) => i.rfc === DEMO_RFC) && invoices.every((i) => i.rfc.startsWith('X'))
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// list: a 69-B lookup, or null when the list could not be loaded.
// known: a Set of prior-month RFCs, or null when we don't have one (uploads).
export function analyze(invoices, { list, known }) {
  const med = median(invoices.map((i) => i.total))
  return invoices.map((inv) => {
    const flags = []
    const hit = list ? list.find(inv.rfc) : null
    if (hit) flags.push({ type: FLAGS.MATCH_69B, status: hit.status, demo: hit.demo })
    if (inv.total > OUTLIER_FACTOR * med) flags.push({ type: FLAGS.AMOUNT_OUTLIER })
    if (Number(inv.hora.slice(0, 2)) < ODD_HOUR_END) flags.push({ type: FLAGS.ODD_HOUR })
    if (known && !known.has(inv.rfc)) flags.push({ type: FLAGS.UNKNOWN_RECIPIENT })
    return { ...inv, flags, checked69b: Boolean(list) }
  })
}

// marks: { [rowIndex]: MARKS.* }. "Sin revisar" = not marked yet + "no se pudo revisar".
export function summarize(count, marks) {
  const values = Object.values(marks)
  const recognized = values.filter((m) => m === MARKS.RECOGNIZED).length
  const notRecognized = values.filter((m) => m === MARKS.NOT_RECOGNIZED).length
  return { total: count, recognized, notRecognized, unreviewed: count - recognized - notRecognized }
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// "Septiembre 2026", or "Agosto–Septiembre 2026" style range when the file spans months.
export function periodLabel(invoices) {
  const months = [...new Set(invoices.map((i) => i.fecha.slice(0, 7)))].sort()
  const label = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
  return months.length === 1 ? label(months[0]) : `${label(months[0])} – ${label(months[months.length - 1])}`
}
