// Pure logic for the credentials agreement (F3): options, validation, document model.
// Nothing here touches storage; the form lives in React state only.

export const MAX_TEXT = 80
export const MIN_PARTNERS = 1
export const MAX_PARTNERS = 6
export const MIN_ROTATION_DAYS = 1
export const MAX_ROTATION_DAYS = 30

export const ACCOUNTS = [
  { id: 'whatsapp', label: 'WhatsApp Business' },
  { id: 'software', label: 'Software del consultorio' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'email', label: 'Correo' },
  { id: 'other', label: 'Otra' },
]

export const RECORDS_OPTIONS = [
  { id: 'stay', label: 'Se quedan en el consultorio' },
  { id: 'leave', label: 'Se van con el dentista' },
  { id: 'case', label: 'Decidir caso por caso' },
]

// First names: letters (incl. accents/ñ), spaces, hyphen, apostrophe, period. At most two words.
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.-]*( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.-]*)?$/

// Partners carry a stable id so account roles survive renames (roles store the id, not the name).
export function emptyForm() {
  return {
    nickname: '',
    partners: [{ id: 'p1', name: '' }],
    nextPartnerId: 2,
    accounts: {}, // { [accountId]: { custodian: partnerId, backup: partnerId } } — present = selected
    otherName: '',
    rotationDays: '7',
    records: '',
  }
}

const clean = (s) => String(s ?? '').trim().replace(/\s+/g, ' ')

export function partnerNames(form) {
  return form.partners.map((p) => clean(p.name))
}

// Returns { [field]: message }. Empty object = valid.
export function validate(form) {
  const errors = {}
  const nickname = clean(form.nickname)
  if (!nickname) errors.nickname = 'Escribe un nombre corto para el consultorio.'
  else if (nickname.length > MAX_TEXT) errors.nickname = `Máximo ${MAX_TEXT} caracteres.`

  const names = partnerNames(form)
  if (names.length < MIN_PARTNERS || names.length > MAX_PARTNERS) {
    errors.partners = `Entre ${MIN_PARTNERS} y ${MAX_PARTNERS} socios.`
  }
  names.forEach((name, i) => {
    if (!name) errors[`partner-${i}`] = 'Escribe el nombre.'
    else if (name.length > MAX_TEXT) errors[`partner-${i}`] = `Máximo ${MAX_TEXT} caracteres.`
    else if (!NAME_RE.test(name)) errors[`partner-${i}`] = 'Solo el nombre, sin apellidos, números ni símbolos.'
  })
  const lower = names.map((n) => n.toLowerCase())
  lower.forEach((n, i) => {
    if (n && lower.indexOf(n) !== i && !errors[`partner-${i}`]) {
      errors[`partner-${i}`] = 'Ese nombre ya está. Agrega una inicial para distinguirlos.'
    }
  })

  const selected = Object.keys(form.accounts)
  if (selected.length === 0) errors.accounts = 'Elige al menos una cuenta compartida.'
  if (form.accounts.other) {
    const other = clean(form.otherName)
    if (!other) errors.otherName = 'Escribe qué otra cuenta es.'
    else if (other.length > MAX_TEXT) errors.otherName = `Máximo ${MAX_TEXT} caracteres.`
  }
  const namedIds = new Set(form.partners.filter((p) => clean(p.name)).map((p) => p.id))
  for (const id of selected) {
    const { custodian, backup } = form.accounts[id]
    if (!namedIds.has(custodian)) errors[`custodian-${id}`] = 'Elige quién la cuida.'
    if (names.length > 1) {
      if (!namedIds.has(backup)) errors[`backup-${id}`] = 'Elige quién es el respaldo.'
      else if (backup === custodian) errors[`backup-${id}`] = 'El respaldo debe ser otra persona.'
    }
  }

  const days = form.rotationDays
  if (!/^\d+$/.test(String(days).trim()) || Number(days) < MIN_ROTATION_DAYS || Number(days) > MAX_ROTATION_DAYS) {
    errors.rotationDays = `Escribe un número de ${MIN_ROTATION_DAYS} a ${MAX_ROTATION_DAYS}.`
  }

  if (!RECORDS_OPTIONS.some((o) => o.id === form.records)) errors.records = 'Elige una opción.'
  return errors
}

// Builds the document model from a valid form.
export function buildAgreement(form, today = new Date()) {
  const names = partnerNames(form)
  const solo = names.length === 1
  const nameOf = (partnerId) => clean(form.partners.find((p) => p.id === partnerId)?.name)
  const rows = ACCOUNTS.filter((a) => form.accounts[a.id]).map((a) => ({
    account: a.id === 'other' ? clean(form.otherName) : a.label,
    custodian: nameOf(form.accounts[a.id].custodian),
    backup: solo ? 'Sin respaldo (solo hay un socio)' : nameOf(form.accounts[a.id].backup),
  }))
  return {
    nickname: clean(form.nickname),
    partners: names,
    rows,
    rotationDays: Number(form.rotationDays),
    records: RECORDS_OPTIONS.find((o) => o.id === form.records).label,
    date: today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
    solo,
  }
}
