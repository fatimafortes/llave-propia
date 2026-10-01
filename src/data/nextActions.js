// Approved next-action card text (F6). Shared by the card in the browser and by /api/explain,
// which may only rewrite this text in simpler words — never add facts.
// SAT pages checked 30/09/2026 (see src/data/sources.js).

export const EXPLAIN_FLAGS = ['69B_MATCH', 'AMOUNT_OUTLIER', 'ODD_HOUR', 'UNKNOWN_RECIPIENT', 'NOT_RECOGNIZED']

// Highest first: the card's AI explanation covers the most serious reason on the row.
export const PRIORITY = ['69B_MATCH', 'NOT_RECOGNIZED', 'UNKNOWN_RECIPIENT', 'AMOUNT_OUTLIER', 'ODD_HOUR']

export const MEANINGS = {
  '69B_MATCH':
    'El receptor está en la lista 69-B del SAT: empresas que, según el SAT, facturan operaciones que no existen. Si tú no le facturaste, alguien pudo usar tu RFC para hacerlo.',
  NOT_RECOGNIZED:
    'No reconoces esta factura. Puede ser un error de captura del contador, o alguien facturó con tu RFC sin que lo sepas.',
  UNKNOWN_RECIPIENT:
    'Es la primera vez que facturas a este receptor. Puede ser un cliente nuevo, o una factura que no hiciste tú.',
  AMOUNT_OUTLIER:
    'El monto es más de 3 veces lo normal en tus facturas de este mes. Puede ser un tratamiento grande, o una factura que no hiciste tú.',
  ODD_HOUR:
    'Se emitió entre las 00:00 y las 05:00. Puede ser una factura programada, o alguien usando tu RFC cuando nadie revisa.',
}

// Status-specific wording for the card only (the API never receives the status).
export const STATUS_69B = {
  presunto: 'El SAT presume (todavía no confirma) que esta empresa factura operaciones inexistentes.',
  definitivo: 'El SAT ya determinó que esta empresa factura operaciones inexistentes.',
}

export const STEPS = [
  'Habla hoy con tu contador: pregúntale si él emitió esta factura y por qué.',
  'Revisa tus facturas emitidas en el portal de factura electrónica del SAT.',
  'Si no la emitiste, avisa al SAT: presenta tu queja o denuncia en línea o llama a MarcaSAT 55 627 22 728. Si crees que alguien tiene tu e.firma, agenda cita en el SAT.',
]

export const CARD_LIMIT =
  'Esto no confirma un fraude; es una alerta para revisar. Llave Propia no cancela facturas ni hace trámites por ti.'

// Reasons that apply to a row: its flags plus "no reconocida" if she marked it so. Sorted by PRIORITY.
export function reasonsFor(row, mark) {
  const reasons = row.flags.map((f) => f.type)
  if (mark === 'no_reconocida') reasons.push('NOT_RECOGNIZED')
  return PRIORITY.filter((p) => reasons.includes(p))
}

// When the card shows: always for "no reconocida"; on request for flagged rows she hasn't recognized.
export function cardMode(row, mark) {
  if (mark === 'no_reconocida') return 'open'
  if (row.flags.length > 0 && mark !== 'reconocida') return 'collapsed'
  return 'hidden'
}
