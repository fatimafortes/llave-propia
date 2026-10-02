import { useEffect, useRef, useState } from 'react'
import { FOLLOW_UP, QUESTIONS, ROUTES, WITH_CONTADOR, contadorMessage, getRoute, needsFollowUp } from '../lib/renewal.js'
import { LINKS, SOURCES } from '../data/sources.js'
import SourceLine from './SourceLine.jsx'

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function YesNo({ question, value, onChange }) {
  const options = [
    [true, 'Sí'],
    [false, 'No'],
  ]
  if (question.contadorOption) options.push([WITH_CONTADOR, 'Lo tiene mi contador / No sé'])
  return (
    <fieldset className="question">
      <legend>{question.text}</legend>
      <div className="yesno">
        {options.map(([answer, label]) => (
          <button
            key={label}
            type="button"
            className={['choice', answer === WITH_CONTADOR && 'wide', value === answer && 'selected'].filter(Boolean).join(' ')}
            aria-pressed={value === answer}
            onClick={() => onChange(answer)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function CertisatResult() {
  return (
    <>
      <h3>Renueva hoy en CertiSAT Web, tú misma, desde tu propio dispositivo</h3>
      <p className="muted">Así la nueva llave y su contraseña quedan contigo.</p>
      <ol className="steps">
        <li>
          Descarga <ExternalLink href={LINKS.certifica}>Certifica</ExternalLink> y genera tu archivo de
          renovación con tu .cer y tu .key. Elige una contraseña nueva que solo tú sepas.
        </li>
        <li>
          Entra a <ExternalLink href={LINKS.certisat}>CertiSAT Web</ExternalLink> con tu e.firma vigente y
          envía ese archivo.
        </li>
        <li>Descarga tu nuevo certificado y guárdalo junto a tu nueva .key, en tu dispositivo.</li>
      </ol>
      <SourceLine source={SOURCES.renewal} limit="Hazlo antes de las últimas 24 horas de vigencia. Esta guía no hace el trámite por ti." />
    </>
  )
}

function SatIdResult() {
  return (
    <>
      <h3>Tu e.firma ya venció: pide hoy autorización en SAT ID</h3>
      <p className="muted">Como venció hace menos de un año, todavía puedes renovarla en línea.</p>
      <ol className="steps">
        <li>
          Entra a <ExternalLink href={LINKS.satId}>SAT ID</ExternalLink> desde tu celular. Necesitas tu
          identificación oficial vigente y grabar un video corto.
        </li>
        <li>
          Cuando el SAT te autorice, genera tu archivo de renovación en{' '}
          <ExternalLink href={LINKS.certifica}>Certifica</ExternalLink>, con una contraseña nueva que solo tú
          sepas.
        </li>
        <li>
          Entra a <ExternalLink href={LINKS.certisat}>CertiSAT Web</ExternalLink> con tu e.firma vencida,
          envía el archivo y guarda tu nuevo certificado en tu dispositivo.
        </li>
      </ol>
      <SourceLine source={SOURCES.satId} limit="Solo para personas mayores de edad. Espera la respuesta del SAT antes del paso 2." />
    </>
  )
}

function AskContadorResult({ answers }) {
  const message = contadorMessage(answers)
  const [copied, setCopied] = useState('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied('Mensaje copiado. Pégalo en WhatsApp.')
    } catch {
      setCopied('Mantén presionado el mensaje para copiarlo.')
    }
  }
  return (
    <>
      <h3>Pídele a tu contador que te devuelva tus archivos</h3>
      <p className="muted">
        Es muy común que el contador los guarde. Él puede seguir llevando tu contabilidad; la e.firma es tu firma
        legal y conviene que también la tengas tú.
      </p>
      <ol className="steps">
        <li>
          Escríbele a tu contador. Puedes copiar este mensaje:
          <p className="wa-message">{message}</p>
          <button type="button" className="secondary copy" onClick={copy}>
            Copiar mensaje
          </button>
          {copied && (
            <p className="hint" role="status">
              {copied}
            </p>
          )}
        </li>
        <li>Guarda los archivos en tu propio dispositivo, en una carpeta solo tuya.</li>
        <li>
          Después renueva tú misma: vuelve aquí, contesta «Sí» y te mostramos tu ruta. Al renovar eliges una
          contraseña nueva que solo tú sabes.
        </li>
      </ol>
      <SourceLine source={SOURCES.renewal} limit="Si tu contador ya no los tiene o ninguno recuerda la contraseña, necesitas cita en el SAT." />
    </>
  )
}

function AppointmentResult({ answers }) {
  const expiredLong = answers.withinYear === false
  const missingFiles = ['hasCer', 'hasKey', 'knowsPassword'].some((id) => answers[id] === false)

  return (
    <>
      <h3>Necesitas cita en el SAT</h3>
      <p className="muted">
        {missingFiles
          ? 'Sin tu .cer, tu .key o tu contraseña no se puede renovar en línea.'
          : 'Si venció hace más de un año, el SAT solo la renueva en oficina.'}
      </p>
      <p className="steps-title">
        Agenda en <ExternalLink href={LINKS.citas}>citas.sat.gob.mx</ExternalLink> y lleva:
      </p>
      <ul className="steps">
        <li>Tu cita confirmada.</li>
        <li>Identificación oficial vigente (INE, pasaporte o cédula profesional con foto).</li>
        <li>Una memoria USB, de preferencia nueva.</li>
        <li>Un correo electrónico que sí revises.</li>
        {expiredLong && <li>Comprobante de domicilio (porque venció hace más de un año).</li>}
      </ul>
      <SourceLine source={SOURCES.renewal} limit="Revisa también tu comprobante de cita: el SAT puede pedir algo más." />
    </>
  )
}

export default function Renewal({ onBack }) {
  const [answers, setAnswers] = useState({})
  const resultRef = useRef(null)
  const route = getRoute(answers)
  const showFollowUp = needsFollowUp(answers)

  useEffect(() => {
    if (route) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [route])

  const answer = (id) => (value) => setAnswers((prev) => ({ ...prev, [id]: value }))

  return (
    <section className="panel">
      <button type="button" className="back" onClick={onBack}>
        ← Volver
      </button>
      <h2>1. ¿Puedes renovar hoy?</h2>
      <p className="muted">Contesta lo que sepas. No te pedimos ningún archivo ni contraseña.</p>

      <div className="questions">
        {QUESTIONS.map((q) => (
          <YesNo key={q.id} question={q} value={answers[q.id]} onChange={answer(q.id)} />
        ))}
        {showFollowUp && (
          <YesNo question={FOLLOW_UP} value={answers[FOLLOW_UP.id]} onChange={answer(FOLLOW_UP.id)} />
        )}
      </div>

      {route && (
        <div className="result" ref={resultRef} aria-live="polite">
          {route === ROUTES.CERTISAT && <CertisatResult />}
          {route === ROUTES.SAT_ID && <SatIdResult />}
          {route === ROUTES.APPOINTMENT && <AppointmentResult answers={answers} />}
          {route === ROUTES.ASK_CONTADOR && <AskContadorResult answers={answers} />}
          <button type="button" className="secondary" onClick={() => setAnswers({})}>
            Empezar de nuevo
          </button>
        </div>
      )}
    </section>
  )
}
