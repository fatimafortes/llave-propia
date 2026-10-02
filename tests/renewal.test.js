import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contadorMessage, getRoute, needsFollowUp, ROUTES, WITH_CONTADOR } from '../src/lib/renewal.js'

const allYes = { hasCer: true, hasKey: true, knowsPassword: true, withinYear: true }

test('T1: all yes and still valid -> CertiSAT Web', () => {
  assert.equal(getRoute({ ...allYes, stillValid: true }), ROUTES.CERTISAT)
})

test('T1b: all yes but expired < 1 year -> SAT ID, then CertiSAT Web', () => {
  assert.equal(getRoute({ ...allYes, stillValid: false }), ROUTES.SAT_ID)
})

test('all yes asks the follow-up before routing', () => {
  assert.equal(needsFollowUp(allYes), true)
  assert.equal(getRoute(allYes), null)
})

test('T2: lost .key -> SAT appointment', () => {
  assert.equal(getRoute({ ...allYes, hasKey: false }), ROUTES.APPOINTMENT)
})

test('T2: any single "no" -> SAT appointment, even with others unanswered', () => {
  for (const id of ['hasCer', 'hasKey', 'knowsPassword', 'withinYear']) {
    assert.equal(getRoute({ [id]: false }), ROUTES.APPOINTMENT, id)
  }
})

test('a "no" wins over a stale follow-up answer', () => {
  assert.equal(getRoute({ ...allYes, withinYear: false, stillValid: true }), ROUTES.APPOINTMENT)
})

test('nothing answered -> no route yet', () => {
  assert.equal(getRoute({}), null)
})

test('persona check: No, No, No, Sí -> appointment, never "renueva hoy"', () => {
  assert.equal(getRoute({ hasCer: false, hasKey: false, knowsPassword: false, withinYear: true }), ROUTES.APPOINTMENT)
  assert.equal(needsFollowUp({ hasCer: false, hasKey: false, knowsPassword: false, withinYear: true }), false)
})

test('"Lo tiene mi contador / No sé" on any file or the password -> ask the contador', () => {
  for (const id of ['hasCer', 'hasKey', 'knowsPassword']) {
    assert.equal(getRoute({ [id]: WITH_CONTADOR }), ROUTES.ASK_CONTADOR, id)
    assert.equal(getRoute({ ...allYes, [id]: WITH_CONTADOR, stillValid: true }), ROUTES.ASK_CONTADOR, id)
  }
})

test('a "No" still wins over "lo tiene mi contador"', () => {
  assert.equal(getRoute({ hasCer: WITH_CONTADOR, hasKey: WITH_CONTADOR, knowsPassword: false }), ROUTES.APPOINTMENT)
  assert.equal(getRoute({ hasCer: WITH_CONTADOR, withinYear: false }), ROUTES.APPOINTMENT)
})

test('no follow-up question while something is with the contador', () => {
  assert.equal(needsFollowUp({ ...allYes, hasKey: WITH_CONTADOR }), false)
})

test('WhatsApp message is friendly and asks for the password only when the contador has it', () => {
  assert.equal(contadorMessage({ hasKey: WITH_CONTADOR }), 'Hola, ¿me puedes mandar mis archivos de la e.firma (.cer y .key)? Los quiero tener yo también. ¡Gracias!')
  assert.match(contadorMessage({ knowsPassword: WITH_CONTADOR }), /\(\.cer y \.key\) y la contraseña\?/)
  assert.doesNotMatch(contadorMessage({ knowsPassword: WITH_CONTADOR }), /confí|desconf|robo|fraude/i)
})
