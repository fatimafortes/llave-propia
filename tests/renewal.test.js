import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRoute, needsFollowUp, ROUTES } from '../src/lib/renewal.js'

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
