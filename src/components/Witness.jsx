import { useEffect, useMemo, useRef, useState } from 'react'
import { load69b, withDemoRfc } from '../lib/sat69b.js'
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
} from '../lib/witness.js'
import { SOURCES } from '../data/sources.js'
import SourceLine from './SourceLine.jsx'

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const shortDate = (iso) => `${iso.slice(8, 10)} ${SHORT_MONTHS[Number(iso.slice(5, 7)) - 1]}`
const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

const MARK_BUTTONS = [
  [MARKS.RECOGNIZED, 'La reconozco'],
  [MARKS.NOT_RECOGNIZED, 'No la reconozco'],
  [MARKS.COULD_NOT_CHECK, 'No pude revisar'],
]

const FLAG_LABELS = {
  [FLAGS.AMOUNT_OUTLIER]: 'Monto fuera de lo normal',
  [FLAGS.ODD_HOUR]: 'Emitida de madrugada',
  [FLAGS.UNKNOWN_RECIPIENT]: 'Receptor nuevo',
}

function Flags({ row, snapshotDate }) {
  const hit = row.flags.find((f) => f.type === FLAGS.MATCH_69B)
  const others = row.flags.filter((f) => f.type !== FLAGS.MATCH_69B)
  // No flags and the list was checked: show nothing. Never an "OK" (Condition 2).
  if (row.checked69b && !hit && others.length === 0) return null
  return (
    <>
      <div className="flags">
        {!row.checked69b && <span className="tag grey">No se pudo revisar la lista 69-B</span>}
        {hit && <span className="tag red">En lista 69-B del SAT · {hit.status}</span>}
        {others.map((f) => (
          <span key={f.type} className="tag orange">
            {FLAG_LABELS[f.type]}
          </span>
        ))}
      </div>
      {hit && (
        <p className="flag-note">
          {hit.demo && 'RFC ficticio agregado para la demo. '}
          Lista del SAT al {dmy(snapshotDate)}: no incluye RFCs agregados después.
        </p>
      )}
    </>
  )
}

function InvoiceRow({ row, index, mark, onMark, snapshotDate }) {
  const alert = row.flags.some((f) => f.type === FLAGS.MATCH_69B) || mark === MARKS.NOT_RECOGNIZED
  return (
    <li className={alert ? 'inv alert' : 'inv'}>
      <div className="inv-top">
        <span className="who">{row.nombre}</span>
        <span className="amt">{money.format(row.total)}</span>
      </div>
      <p className="meta">
        {shortDate(row.fecha)} · {row.hora} · {row.concepto}
      </p>
      <p className="meta rfc">RFC {row.rfc}</p>
      <Flags row={row} snapshotDate={snapshotDate} />
      <div className="marks" role="group" aria-label={`Factura ${index + 1}: ${row.nombre}`}>
        {MARK_BUTTONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mark === value ? `mark selected ${value}` : 'mark'}
            aria-pressed={mark === value}
            onClick={() => onMark(index, mark === value ? null : value)}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  )
}

function Summary({ counts }) {
  return (
    <div className="summary" aria-live="polite">
      <p className="sr-summary">
        Facturas en tu RFC este mes: {counts.total} · Reconocidas: {counts.recognized} · No reconocidas:{' '}
        {counts.notRecognized} · Sin revisar: {counts.unreviewed}
      </p>
      <div className="pills" aria-hidden="true">
        {[
          [counts.total, 'facturas'],
          [counts.recognized, 'reconocidas'],
          [counts.notRecognized, 'no reconocidas'],
          [counts.unreviewed, 'sin revisar'],
        ].map(([n, label]) => (
          <div key={label} className="pill">
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Witness({ onBack }) {
  const listPromise = useRef(null)
  const fileInput = useRef(null)
  const [data, setData] = useState(null) // { invoices, source: 'demo' | 'upload', known, list69b }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [marks, setMarks] = useState({})

  // Start loading the 69-B list as soon as the screen opens; reuse the same promise.
  useEffect(() => {
    listPromise.current = load69b()
  }, [])

  const start = async (loader) => {
    setBusy(true)
    setError('')
    setData(null)
    setMarks({})
    try {
      const result = await loader()
      if (result.error) setError(result.error)
      else setData(result)
    } catch {
      setError('No pudimos leer el archivo. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  // Demo mode = the fictional sample: planted demo RFC in memory + fictional known-client list.
  const withDemoContext = async (invoices, list69b) => {
    let known = null
    let knownLabel = ''
    const res = await fetch('/demo/clientes_meses_anteriores.json').catch(() => null)
    if (res?.ok) {
      const json = await res.json()
      known = new Set(json.rfcs)
      knownLabel = json.label
    }
    const list = list69b.available ? { ...list69b, list: withDemoRfc(list69b.list) } : list69b
    return { invoices, source: 'demo', known, knownLabel, list69b: list }
  }

  const loadDemo = () =>
    start(async () => {
      const [csvRes, list69b] = await Promise.all([fetch('/demo/facturas_ficticias.csv'), listPromise.current ?? load69b()])
      if (!csvRes.ok) return { error: 'No se pudo cargar el ejemplo. Revisa tu conexión.' }
      const parsed = parseInvoices(await csvRes.text())
      if (!parsed.ok) return { error: parsed.error }
      return withDemoContext(parsed.invoices, list69b)
    })

  const loadFile = (file) =>
    start(async () => {
      const meta = checkFileMeta(file)
      if (!meta.ok) return { error: meta.error }
      const decoded = decodeBytes(await file.arrayBuffer())
      if (!decoded.ok) return { error: decoded.error }
      const parsed = parseInvoices(decoded.text)
      if (!parsed.ok) return { error: parsed.error }
      const list69b = await (listPromise.current ?? load69b())
      if (isSampleData(parsed.invoices)) return withDemoContext(parsed.invoices, list69b)
      return { invoices: parsed.invoices, source: 'upload', known: null, knownLabel: '', list69b }
    })

  const rows = useMemo(
    () => (data ? analyze(data.invoices, { list: data.list69b.available ? data.list69b.list : null, known: data.known }) : []),
    [data],
  )
  const counts = summarize(rows.length, marks)
  const onMark = (i, value) =>
    setMarks((m) => {
      const next = { ...m }
      if (value) next[i] = value
      else delete next[i]
      return next
    })
  const reset = () => {
    setData(null)
    setMarks({})
    setError('')
  }

  const isDemo = data?.source === 'demo'
  const listOk = data?.list69b.available
  const snapshotDate = listOk ? data.list69b.list.snapshotDate : null

  return (
    <section className="panel">
      {isDemo && (
        <>
          <div className="demo-banner" role="note">
            DATOS FICTICIOS · DEMO
          </div>
          <div className="demo-spacer" aria-hidden="true" />
        </>
      )}
      <button type="button" className="back" onClick={onBack}>
        ← Volver
      </button>
      <h2>3. Testigo mensual{data ? ` · ${periodLabel(data.invoices)}` : ''}</h2>

      {!data && (
        <>
          <p className="muted">
            Tu contador te pasa la lista de facturas emitidas con tu RFC. Revísala aquí: el archivo no sale de tu
            teléfono ni se guarda.
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={loadDemo} disabled={busy}>
              Cargar ejemplo ficticio
            </button>
            <button type="button" className="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
              Subir archivo CSV
            </button>
            <input
              ref={fileInput}
              id="invoice-file"
              className="visually-hidden"
              type="file"
              accept=".csv,text/csv"
              tabIndex={-1}
              aria-label="Archivo CSV de facturas"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) loadFile(file)
              }}
            />
          </div>
          {busy && <p className="muted">Revisando…</p>}
          {error && (
            <p className="error-summary" role="alert">
              {error}
            </p>
          )}
          <details className="help">
            <summary>¿Qué columnas necesita el archivo?</summary>
            <p>
              fecha (AAAA-MM-DD), hora (HH:MM), folio, rfc_receptor, nombre_receptor, total, concepto. Solo .csv,
              hasta 200 KB y 500 facturas.
            </p>
          </details>
        </>
      )}

      {data && (
        <>
          <p className="muted">
            {isDemo ? 'Ejemplo: tu contador subió' : 'Tu contador subió'} {rows.length}{' '}
            {rows.length === 1 ? 'factura emitida' : 'facturas emitidas'} con tu RFC. ¿Las reconoces todas?
          </p>

          <div className="context">
            {listOk ? (
              <SourceLine
                source={SOURCES.list69b}
                limit={`usamos la lista del SAT al ${dmy(snapshotDate)}, la más reciente publicada; un RFC agregado después no aparece.`}
              />
            ) : (
              <p className="error-summary" role="alert">
                No se pudo cargar la lista 69-B del SAT. Ninguna factura se revisó contra ella.
              </p>
            )}
            <p className="source">
              {data.known
                ? `"Receptor nuevo" compara con: ${data.knownLabel || 'clientes de meses anteriores'}.`
                : 'Para detectar receptores nuevos necesitamos tus clientes de meses anteriores; por ahora solo funciona con el ejemplo.'}
            </p>
          </div>

          <Summary counts={counts} />
          {counts.unreviewed === 0 && counts.notRecognized === 0 && (
            <p className="muted">Revisaste las {counts.total} facturas.</p>
          )}

          <ul className="invoices">
            {rows.map((row, i) => (
              <InvoiceRow key={`${row.folio}-${i}`} row={row} index={i} mark={marks[i]} onMark={onMark} snapshotDate={snapshotDate} />
            ))}
          </ul>

          <button type="button" className="secondary" onClick={reset}>
            Revisar otro archivo
          </button>
        </>
      )}
    </section>
  )
}
