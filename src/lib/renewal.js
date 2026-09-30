// Pure routing logic for the e.firma renewal check (F2).
// Rules verified on sat.gob.mx on 2026-09-30 (see src/data/sources.js):
// - valid certificate + .cer/.key/password -> Certifica + CertiSAT Web
// - expired <= 1 year -> SAT ID authorization first, then CertiSAT Web
// - expired > 1 year, or missing files/password -> appointment at a SAT office

export const QUESTIONS = [
  { id: 'hasCer', text: '¿Tienes tu archivo .cer?' },
  { id: 'hasKey', text: '¿Tienes tu archivo .key?' },
  { id: 'knowsPassword', text: '¿Recuerdas la contraseña de tu e.firma?' },
  { id: 'withinYear', text: '¿Tu e.firma está vigente o venció hace menos de un año?' },
]

// Asked only when the four answers above are all "yes".
export const FOLLOW_UP = { id: 'stillValid', text: '¿Tu e.firma sigue vigente hoy?' }

export const ROUTES = {
  CERTISAT: 'CERTISAT',
  SAT_ID: 'SAT_ID',
  APPOINTMENT: 'APPOINTMENT',
}

// answers: { [id]: true | false | undefined }. Returns a route, or null while unanswered.
export function getRoute(answers) {
  const main = QUESTIONS.map((q) => answers[q.id])
  if (main.some((a) => a === false)) return ROUTES.APPOINTMENT
  if (main.some((a) => a === undefined)) return null

  const stillValid = answers[FOLLOW_UP.id]
  if (stillValid === undefined) return null
  return stillValid ? ROUTES.CERTISAT : ROUTES.SAT_ID
}

export function needsFollowUp(answers) {
  return QUESTIONS.every((q) => answers[q.id] === true)
}
