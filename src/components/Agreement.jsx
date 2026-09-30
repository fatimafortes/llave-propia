import { useRef, useState } from 'react'
import {
  ACCOUNTS,
  MAX_PARTNERS,
  MAX_ROTATION_DAYS,
  MAX_TEXT,
  MIN_ROTATION_DAYS,
  RECORDS_OPTIONS,
  buildAgreement,
  emptyForm,
  validate,
} from '../lib/agreement.js'

function FieldError({ id, errors }) {
  if (!errors[id]) return null
  return (
    <p className="field-error" id={`${id}-error`}>
      {errors[id]}
    </p>
  )
}

const errorProps = (id, errors) =>
  errors[id] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}

// options: [{ id, name }] — the value stored is the partner id, so renames never break a choice.
function PartnerSelect({ id, label, value, options, errors, onChange }) {
  return (
    <label className="select-label">
      {label}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} {...errorProps(id, errors)}>
        <option value="">Elige…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <FieldError id={id} errors={errors} />
    </label>
  )
}

function AgreementForm({ form, setForm, errors, onSubmit }) {
  const named = form.partners
    .map((p) => ({ id: p.id, name: p.name.trim().replace(/\s+/g, ' ') }))
    .filter((p) => p.name)
  const solo = form.partners.length === 1

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const renamePartner = (i, name) =>
    setForm((f) => ({ ...f, partners: f.partners.map((p, j) => (j === i ? { ...p, name } : p)) }))

  const addPartner = () =>
    setForm((f) => ({
      ...f,
      partners: [...f.partners, { id: `p${f.nextPartnerId}`, name: '' }],
      nextPartnerId: f.nextPartnerId + 1,
    }))

  // Removing a partner clears any account role that pointed to them.
  const removePartner = (i) =>
    setForm((f) => {
      const gone = f.partners[i].id
      const clear = (v) => (v === gone ? '' : v)
      const accounts = Object.fromEntries(
        Object.entries(f.accounts).map(([id, a]) => [id, { custodian: clear(a.custodian), backup: clear(a.backup) }]),
      )
      return { ...f, partners: f.partners.filter((_, j) => j !== i), accounts }
    })

  const toggleAccount = (id) =>
    setForm((f) => {
      const accounts = { ...f.accounts }
      if (accounts[id]) delete accounts[id]
      else accounts[id] = { custodian: '', backup: '' }
      return { ...f, accounts }
    })

  const setRole = (id, role, value) =>
    setForm((f) => ({ ...f, accounts: { ...f.accounts, [id]: { ...f.accounts[id], [role]: value } } }))

  const errorCount = Object.keys(errors).length

  return (
    <form
      className="agreement-form"
      autoComplete="off"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {errorCount > 0 && (
        <p className="error-summary" role="alert">
          Revisa {errorCount === 1 ? '1 campo marcado' : `${errorCount} campos marcados`} en rojo.
        </p>
      )}

      <fieldset className="question">
        <legend>¿Cómo le dicen al consultorio?</legend>
        <p className="hint">Un nombre corto, no la razón social.</p>
        <input
          id="nickname"
          type="text"
          value={form.nickname}
          maxLength={MAX_TEXT}
          placeholder="Ej. Consultorio Roma"
          onChange={(e) => update({ nickname: e.target.value })}
          {...errorProps('nickname', errors)}
        />
        <FieldError id="nickname" errors={errors} />
      </fieldset>

      <fieldset className="question">
        <legend>Socios</legend>
        <p className="hint">Solo el nombre, sin apellidos. De 1 a {MAX_PARTNERS}.</p>
        <div className="partner-list">
          {form.partners.map((p, i) => (
            <div key={p.id} className="partner-row">
              <div className="grow">
                <input
                  id={`partner-${i}`}
                  type="text"
                  value={p.name}
                  maxLength={MAX_TEXT}
                  aria-label={`Socio ${i + 1}`}
                  placeholder={`Socio ${i + 1}`}
                  onChange={(e) => renamePartner(i, e.target.value)}
                  {...errorProps(`partner-${i}`, errors)}
                />
                <FieldError id={`partner-${i}`} errors={errors} />
              </div>
              {form.partners.length > 1 && (
                <button type="button" className="secondary small" onClick={() => removePartner(i)}>
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
        {form.partners.length < MAX_PARTNERS && (
          <button type="button" className="secondary" onClick={addPartner}>
            + Agregar socio
          </button>
        )}
        <FieldError id="partners" errors={errors} />
      </fieldset>

      <fieldset className="question">
        <legend>Cuentas que comparten</legend>
        <p className="hint">
          Para cada una: quién la cuida y quién es su respaldo. Siempre un socio, nunca la recepción.
        </p>
        <FieldError id="accounts" errors={errors} />
        <div className="account-list">
          {ACCOUNTS.map((a) => {
            const selected = Boolean(form.accounts[a.id])
            return (
              <div key={a.id} className={selected ? 'account selected' : 'account'}>
                <label className="check">
                  <input type="checkbox" checked={selected} onChange={() => toggleAccount(a.id)} />
                  {a.label}
                </label>
                {selected && (
                  <div className="account-roles">
                    {a.id === 'other' && (
                      <label className="select-label">
                        ¿Cuál?
                        <input
                          id="otherName"
                          type="text"
                          value={form.otherName}
                          maxLength={MAX_TEXT}
                          placeholder="Ej. Portal del laboratorio"
                          onChange={(e) => update({ otherName: e.target.value })}
                          {...errorProps('otherName', errors)}
                        />
                        <FieldError id="otherName" errors={errors} />
                      </label>
                    )}
                    <PartnerSelect
                      id={`custodian-${a.id}`}
                      label="La cuida"
                      value={form.accounts[a.id].custodian}
                      options={named}
                      errors={errors}
                      onChange={(v) => setRole(a.id, 'custodian', v)}
                    />
                    {solo ? (
                      <p className="hint">Con un solo socio no hay respaldo.</p>
                    ) : (
                      <PartnerSelect
                        id={`backup-${a.id}`}
                        label="Respaldo"
                        value={form.accounts[a.id].backup}
                        options={named.filter((p) => p.id !== form.accounts[a.id].custodian)}
                        errors={errors}
                        onChange={(v) => setRole(a.id, 'backup', v)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="question">
        <legend>Si un socio deja el consultorio, ¿en cuántos días se cambian las contraseñas?</legend>
        <p className="hint">
          De {MIN_ROTATION_DAYS} a {MAX_ROTATION_DAYS} días.
        </p>
        <input
          id="rotationDays"
          className="days"
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={form.rotationDays}
          onChange={(e) => update({ rotationDays: e.target.value })}
          {...errorProps('rotationDays', errors)}
        />
        <FieldError id="rotationDays" errors={errors} />
      </fieldset>

      <fieldset className="question">
        <legend>Si un dentista se va, sus expedientes de pacientes…</legend>
        <div className="radio-list" id="records" {...errorProps('records', errors)}>
          {RECORDS_OPTIONS.map((o) => (
            <label key={o.id} className="check">
              <input
                type="radio"
                name="records"
                value={o.id}
                checked={form.records === o.id}
                onChange={() => update({ records: o.id })}
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="records" errors={errors} />
      </fieldset>

      <button type="submit" className="primary">
        Ver acuerdo
      </button>
    </form>
  )
}

function AgreementDocument({ doc }) {
  return (
    <article className="agreement-doc">
      <header>
        <h3>Acuerdo de credenciales</h3>
        <p>
          {doc.nickname} · {doc.date}
        </p>
        <p>Socios: {doc.partners.join(', ')}</p>
      </header>

      <ol className="clauses">
        <li>
          <strong>Cada quien guarda su propia e.firma.</strong> Cada socio guarda su .cer, su .key y su
          contraseña. No se comparten con nadie: ni entre socios, ni con el contador, ni con la recepción.
        </li>
        <li>
          <strong>Cuentas compartidas.</strong> Quien la cuida cambia la contraseña y decide quién la usa. El
          respaldo sabe cómo entrar si quien la cuida no está.
          <table>
            <thead>
              <tr>
                <th scope="col">Cuenta</th>
                <th scope="col">La cuida</th>
                <th scope="col">Respaldo</th>
              </tr>
            </thead>
            <tbody>
              {doc.rows.map((r) => (
                <tr key={r.account}>
                  <td>{r.account}</td>
                  <td>{r.custodian}</td>
                  <td>{r.backup}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {doc.solo && <p className="doc-note">Revisen este acuerdo cuando entre otro socio.</p>}
        </li>
        <li>
          <strong>La recepción no es dueña del riesgo.</strong> El personal de recepción puede usar estas
          cuentas, pero la responsabilidad es de los socios.
        </li>
        <li>
          <strong>Cuando alguien sale del consultorio,</strong> quien cuida cada cuenta cambia su contraseña en
          un máximo de {doc.rotationDays} {doc.rotationDays === 1 ? 'día' : 'días'}.
        </li>
        <li>
          <strong>Expedientes de pacientes.</strong> Si un dentista deja el consultorio: {doc.records.toLowerCase()}.
          <p className="doc-note">
            Este acuerdo no sustituye lo que pide la NOM-004 sobre el expediente clínico.
          </p>
        </li>
        <li>
          <strong>Revisión mensual.</strong> Cada mes, al cierre del contador, cada socio revisa las facturas
          emitidas con su RFC.
        </li>
      </ol>

      <div className="signatures">
        {doc.partners.map((name) => (
          <div key={name} className="signature">
            <div className="sign-line" />
            <p>{name}</p>
            <p className="doc-note">Fecha: ____________</p>
          </div>
        ))}
      </div>

      <p className="doc-footer">
        Acuerdo interno entre socios; no es asesoría legal. Hecho con Llave Propia: no guardamos una copia.
      </p>
    </article>
  )
}

export default function Agreement({ onBack }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [doc, setDoc] = useState(null)
  const topRef = useRef(null)

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    setDoc(buildAgreement(form))
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <section className="panel" ref={topRef}>
      <button type="button" className="back no-print" onClick={doc ? () => setDoc(null) : onBack}>
        ← {doc ? 'Editar' : 'Volver'}
      </button>
      <h2 className="no-print">2. Acuerdo de credenciales</h2>

      {doc ? (
        <>
          <p className="muted no-print">Revísenlo, imprímanlo y fírmenlo entre socios.</p>
          <div className="actions no-print">
            <button type="button" className="primary" onClick={() => window.print()}>
              Imprimir / Guardar PDF
            </button>
            <button type="button" className="secondary" onClick={() => setDoc(null)}>
              Editar
            </button>
          </div>
          <AgreementDocument doc={doc} />
        </>
      ) : (
        <>
          <p className="muted">Decidan quién cuida cada cuenta. No se guarda nada: al cerrar, se borra.</p>
          <AgreementForm form={form} setForm={setForm} errors={errors} onSubmit={submit} />
        </>
      )}
    </section>
  )
}
