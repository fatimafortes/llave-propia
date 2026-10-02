// Pure routing logic for the e.firma renewal check (F2).
// Rules verified on sat.gob.mx on 2026-09-30 (see src/data/sources.js):
// - valid certificate + .cer/.key/password -> Certifica + CertiSAT Web
// - expired <= 1 year -> SAT ID authorization first, then CertiSAT Web
// - expired > 1 year, or missing files/password -> appointment at a SAT office
// - files or password with the contador, or "no sé" -> ask the contador for them, then renew herself

// Answer for the most common real case (persona test, 01/10/2026): the contador holds the files.
export const WITH_CONTADOR = 'contador'

// `contadorOption`: the question also offers "Lo tiene mi contador / No sé".
export const QUESTIONS = [
  { id: 'hasCer', text: '¿Tienes tu archivo .cer?', contadorOption: true },
  { id: 'hasKey', text: '¿Tienes tu archivo .key?', contadorOption: true },
  { id: 'knowsPassword', text: '¿Recuerdas la contraseña de tu e.firma?', contadorOption: true },
  { id: 'withinYear', text: '¿Tu e.firma está vigente o venció hace menos de un año?' },
]

// Asked only when the four answers above are all "yes".
export const FOLLOW_UP = { id: 'stillValid', text: '¿Tu e.firma sigue vigente hoy?' }

export const ROUTES = {
  CERTISAT: 'CERTISAT',
  SAT_ID: 'SAT_ID',
  APPOINTMENT: 'APPOINTMENT',
  ASK_CONTADOR: 'ASK_CONTADOR',
}

// answers: { [id]: true | false | 'contador' | undefined }. Returns a route, or null while unanswered.
// A "No" wins: without that file or password she can't renew online even once the contador replies.
export function getRoute(answers) {
  const main = QUESTIONS.map((q) => answers[q.id])
  if (main.some((a) => a === false)) return ROUTES.APPOINTMENT
  if (main.some((a) => a === WITH_CONTADOR)) return ROUTES.ASK_CONTADOR
  if (main.some((a) => a === undefined)) return null

  const stillValid = answers[FOLLOW_UP.id]
  if (stillValid === undefined) return null
  return stillValid ? ROUTES.CERTISAT : ROUTES.SAT_ID
}

export function needsFollowUp(answers) {
  return QUESTIONS.every((q) => answers[q.id] === true)
}

// Friendly message, ready to paste in WhatsApp: asks for the files without implying distrust.
export function contadorMessage(answers) {
  const what =
    answers.knowsPassword === WITH_CONTADOR
      ? 'mis archivos de la e.firma (.cer y .key) y la contraseña'
      : 'mis archivos de la e.firma (.cer y .key)'
  return `Hola, ¿me puedes mandar ${what}? Los quiero tener yo también. ¡Gracias!`
}
