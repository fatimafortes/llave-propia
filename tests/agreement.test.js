import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAgreement, emptyForm, validate } from '../src/lib/agreement.js'

// Partner ids are p1, p2… in the order given.
const people = (...names) => names.map((name, i) => ({ id: `p${i + 1}`, name }))
const base = (overrides) => ({ ...emptyForm(), nickname: 'Consultorio Roma', rotationDays: '7', records: 'stay', ...overrides })

test('T3: one partner — every account listed, custodian set, backup explained', () => {
  const form = base({
    partners: people('Lupita'),
    accounts: {
      whatsapp: { custodian: 'p1', backup: '' },
      wifi: { custodian: 'p1', backup: '' },
    },
  })
  assert.deepEqual(validate(form), {})
  const doc = buildAgreement(form)
  assert.equal(doc.rows.length, 2)
  for (const row of doc.rows) {
    assert.equal(row.custodian, 'Lupita')
    assert.equal(row.backup, 'Sin respaldo (solo hay un socio)')
  }
})

test('T3: four partners — every account listed with custodian + different backup', () => {
  const form = base({
    partners: people('Lupita', 'Carlos', 'Ana', 'Beto'),
    accounts: {
      whatsapp: { custodian: 'p1', backup: 'p2' }, // Lupita / Carlos
      software: { custodian: 'p2', backup: 'p3' }, // Carlos / Ana
      wifi: { custodian: 'p3', backup: 'p4' }, // Ana / Beto
      email: { custodian: 'p4', backup: 'p1' }, // Beto / Lupita
      other: { custodian: 'p1', backup: 'p3' }, // Lupita / Ana
    },
    otherName: 'Banco del consultorio',
  })
  assert.deepEqual(validate(form), {})
  const doc = buildAgreement(form)
  assert.deepEqual(
    doc.rows.map((r) => [r.account, r.custodian, r.backup]),
    [
      ['WhatsApp Business', 'Lupita', 'Carlos'],
      ['Software del consultorio', 'Carlos', 'Ana'],
      ['Wi-Fi', 'Ana', 'Beto'],
      ['Correo', 'Beto', 'Lupita'],
      ['Banco del consultorio', 'Lupita', 'Ana'],
    ],
  )
  assert.equal(doc.partners.length, 4)
})

test('backup must differ from custodian when there are 2+ partners', () => {
  const errors = validate(base({ partners: people('Lupita', 'Carlos'), accounts: { wifi: { custodian: 'p1', backup: 'p1' } } }))
  assert.ok(errors['backup-wifi'])
})

test('rejects: no accounts, bad days, too-long nickname, surnames/digits, duplicates, >6 partners', () => {
  assert.ok(validate(base({ accounts: {} })).accounts)
  for (const d of ['0', '31', 'abc', '7.5', '']) assert.ok(validate(base({ rotationDays: d })).rotationDays, d)
  assert.ok(validate(base({ nickname: 'x'.repeat(81) })).nickname)
  assert.ok(validate(base({ partners: people('Lupita López Pérez') }))['partner-0'])
  assert.ok(validate(base({ partners: people('Ana2') }))['partner-0'])
  assert.ok(validate(base({ partners: people('Ana', 'ana') }))['partner-1'])
  assert.ok(validate(base({ partners: people('A', 'B', 'C', 'D', 'E', 'F', 'G') })).partners)
})

test('accepts two-word first names with accents', () => {
  const errors = validate(base({ partners: people('María José'), accounts: { wifi: { custodian: 'p1', backup: '' } } }))
  assert.deepEqual(errors, {})
})

test('"Otra" needs a name', () => {
  assert.ok(validate(base({ partners: people('Ana'), accounts: { other: { custodian: 'p1', backup: '' } } })).otherName)
})

test('custodian must be a current partner with a name', () => {
  assert.ok(validate(base({ partners: people('Ana'), accounts: { wifi: { custodian: 'p9', backup: '' } } }))['custodian-wifi'])
  assert.ok(validate(base({ partners: people(''), accounts: { wifi: { custodian: 'p1', backup: '' } } }))['custodian-wifi'])
})

test('renaming a partner keeps their accounts (roles point to the id)', () => {
  const form = base({ partners: people('Lupe', 'Carlos'), accounts: { wifi: { custodian: 'p1', backup: 'p2' } } })
  const renamed = { ...form, partners: [{ id: 'p1', name: 'Lupita' }, form.partners[1]] }
  assert.deepEqual(validate(renamed), {})
  assert.deepEqual(buildAgreement(renamed).rows[0], { account: 'Wi-Fi', custodian: 'Lupita', backup: 'Carlos' })
})
