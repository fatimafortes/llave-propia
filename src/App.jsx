import { useState } from 'react'
import Renewal from './components/Renewal.jsx'
import Agreement from './components/Agreement.jsx'

// Navigation lives in memory only (no router, no URL state, no storage).
const STEPS = [
  {
    id: 'renewal',
    number: 1,
    title: '¿Puedes renovar hoy?',
    blurb: '4 preguntas de sí o no. Te decimos si renuevas tu e.firma en línea o si necesitas cita en el SAT.',
  },
  {
    id: 'agreement',
    number: 2,
    title: 'Acuerdo de credenciales',
    blurb: 'Decidan entre socios quién cuida cada cuenta del consultorio. Sale listo para imprimir y firmar.',
  },
  {
    id: 'witness',
    number: 3,
    title: 'Testigo mensual',
    blurb: 'Revisa las facturas emitidas con tu RFC este mes y marca cuáles reconoces.',
  },
]

function Home({ onOpen }) {
  return (
    <>
      <header className="hero">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden="true">🔑</span>
          Llave Propia
        </h1>
        <p className="lede">
          Tu e.firma es tuya. Aquí revisas, en 5 minutos, que nadie la esté usando por ti.
        </p>
      </header>

      <ul className="cards">
        {STEPS.map((step) => (
          <li key={step.id}>
            <button type="button" className="card" onClick={() => onOpen(step.id)}>
              <span className="card-number" aria-hidden="true">{step.number}</span>
              <span className="card-body">
                <span className="card-title">
                  {step.number}. {step.title}
                </span>
                <span className="card-blurb">{step.blurb}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

// Placeholder until F5 replaces the monthly witness step.
function ComingSoon({ step, onBack }) {
  return (
    <section className="panel">
      <button type="button" className="back" onClick={onBack}>
        ← Volver
      </button>
      <h2>
        {step.number}. {step.title}
      </h2>
      <p className="muted">Esta sección está en construcción.</p>
    </section>
  )
}

export default function App() {
  const [current, setCurrent] = useState(null)
  const step = STEPS.find((s) => s.id === current)

  return (
    <div className="app">
      <main>
        {step?.id === 'renewal' ? (
          <Renewal onBack={() => setCurrent(null)} />
        ) : step?.id === 'agreement' ? (
          <Agreement onBack={() => setCurrent(null)} />
        ) : step ? (
          <ComingSoon step={step} onBack={() => setCurrent(null)} />
        ) : (
          <Home onOpen={setCurrent} />
        )}
      </main>
      <footer className="footer no-print">No guardamos nada. Al cerrar esta pestaña, todo se borra.</footer>
    </div>
  )
}
