import { useState } from 'react'
import { CARD_LIMIT, MEANINGS, STATUS_69B, STEPS, cardMode, reasonsFor } from '../data/nextActions.js'
import { LINKS, SOURCES } from '../data/sources.js'

// Session-only memory of explanations per flag (cleared when the tab closes).
const explained = new Map()

async function fetchExplanation(flag) {
  if (explained.has(flag)) return explained.get(flag)
  // Only the flag type leaves the browser: no RFC, name, amount or file content.
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flag }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('empty')
  explained.set(flag, data.text)
  return data.text
}

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)

function Card({ row, reasons }) {
  const [ai, setAi] = useState({ state: 'idle', text: '' })
  const primary = reasons[0]
  const hit = row.flags.find((f) => f.type === '69B_MATCH')

  const explain = async () => {
    setAi({ state: 'loading', text: '' })
    try {
      setAi({ state: 'done', text: await fetchExplanation(primary) })
    } catch {
      setAi({ state: 'error', text: '' })
    }
  }

  return (
    <div className="next-card">
      <h3>¿Qué hago ahora?</h3>
      <p className="steps-title">Qué puede significar:</p>
      <ul className="meanings">
        {reasons.map((r) => (
          <li key={r}>
            {MEANINGS[r]}
            {r === '69B_MATCH' && hit && ` ${STATUS_69B[hit.status]}`}
          </li>
        ))}
      </ul>
      <ol className="steps">
        <li>{STEPS[0]}</li>
        <li>
          Revisa tus facturas emitidas en el{' '}
          <ExternalLink href={LINKS.facturas}>portal de factura electrónica del SAT</ExternalLink>.
        </li>
        <li>
          Si no la emitiste, avisa al SAT: presenta tu{' '}
          <ExternalLink href={LINKS.denuncia}>queja o denuncia en línea</ExternalLink> o llama a MarcaSAT{' '}
          <a href="tel:+525562722728">55 627 22 728</a>. Si crees que alguien tiene tu e.firma, agenda cita en{' '}
          <ExternalLink href={LINKS.citas}>citas.sat.gob.mx</ExternalLink>.
        </li>
      </ol>
      <p className="source">
        Fuente: <ExternalLink href={SOURCES.denuncia.url}>{SOURCES.denuncia.label}</ExternalLink> ·{' '}
        <ExternalLink href={LINKS.facturas}>SAT · Factura electrónica</ExternalLink> · revisado{' '}
        {SOURCES.denuncia.reviewed} · Límite: {CARD_LIMIT}
      </p>

      {ai.state !== 'done' && (
        <button type="button" className="secondary explain" onClick={explain} disabled={ai.state === 'loading'}>
          {ai.state === 'loading' ? 'Generando…' : 'Explícamelo simple'}
        </button>
      )}
      {ai.state === 'error' && (
        <p className="field-error" role="alert">
          No se pudo generar la explicación.
        </p>
      )}
      {ai.state === 'done' && (
        <div className="ai" aria-live="polite">
          <span className="ai-label">Explicación generada por IA</span>
          <p>{ai.text}</p>
        </div>
      )}
    </div>
  )
}

export default function NextAction({ row, mark }) {
  const mode = cardMode(row, mark)
  const [open, setOpen] = useState(false)
  if (mode === 'hidden') return null
  const reasons = reasonsFor(row, mark)
  if (mode === 'open') return <Card row={row} reasons={reasons} />
  return (
    <>
      <button type="button" className="link-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Ocultar qué hacer' : '¿Qué hago ahora?'}
      </button>
      {open && <Card row={row} reasons={reasons} />}
    </>
  )
}
