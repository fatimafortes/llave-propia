import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampWords, createHandler, validFlag } from '../api/explain.js'
import { EXPLAIN_FLAGS, MEANINGS, cardMode, reasonsFor } from '../src/data/nextActions.js'

// Minimal stand-ins for Vercel's req/res.
function call(handler, { method = 'POST', body, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(k, v) { this.headers[k] = v },
      status(code) { this.statusCode = code; return this },
      json(payload) { resolve({ status: this.statusCode, body: payload, headers: this.headers }) },
    }
    handler({ method, body, headers }, res)
  })
}

const geminiReply = (text) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) })

test('only { flag } with an allowed value is accepted', () => {
  for (const f of EXPLAIN_FLAGS) assert.equal(validFlag({ flag: f }), f)
  assert.equal(validFlag({ flag: 'OTRA_COSA' }), null)
  assert.equal(validFlag({ flag: '69B_MATCH', rfc: 'XFIC800101AB1' }), null)
  assert.equal(validFlag({ flag: '69B_MATCH', status: 'presunto' }), null)
  assert.equal(validFlag(['69B_MATCH']), null)
  assert.equal(validFlag(null), null)
})

test('T8 server side: what Gemini receives contains only the flag + approved text', async () => {
  let sent
  const handler = createHandler({
    getKey: () => 'test-key',
    fetchImpl: async (url, init) => { sent = { url, init }; return geminiReply('Explicación sencilla. Es una alerta para revisar.')() },
  })
  const r = await call(handler, { body: { flag: '69B_MATCH' } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { flag: '69B_MATCH', text: 'Explicación sencilla. Es una alerta para revisar.' })
  assert.match(sent.url, /models\/gemini-3\.8-flash:generateContent$/)
  assert.equal(sent.init.headers['x-goog-api-key'], 'test-key')
  const payload = JSON.parse(sent.init.body)
  const prompt = payload.contents[0].parts[0].text
  assert.ok(prompt.includes(MEANINGS['69B_MATCH']))
  assert.doesNotMatch(sent.init.body, /[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/, 'no RFC-shaped text')
  assert.doesNotMatch(sent.init.body, /\$\s?\d|\d{1,3},\d{3}/, 'no amounts')
  assert.equal(JSON.stringify(r.body).includes('test-key'), false, 'key never returned')
})

test('rejects: GET, extra keys, unknown flag, bad JSON, big body — without calling Gemini', async () => {
  let calls = 0
  const handler = createHandler({ getKey: () => 'k', fetchImpl: async () => { calls++; return geminiReply('x')() } })
  assert.equal((await call(handler, { method: 'GET' })).status, 405)
  assert.equal((await call(handler, { body: { flag: '69B_MATCH', nombre: 'Ana' } })).status, 400)
  assert.equal((await call(handler, { body: { flag: 'SAFE' } })).status, 400)
  assert.equal((await call(handler, { body: '{"flag":' })).status, 400)
  assert.equal((await call(handler, { body: { flag: 'ODD_HOUR' }, headers: { 'content-length': '5000' } })).status, 413)
  assert.equal(calls, 0)
})

test('errors -> Spanish message, never a stack or the key', async () => {
  const cases = [
    createHandler({ getKey: () => '' }),
    createHandler({ getKey: () => 'secret-key', fetchImpl: async () => ({ ok: false, status: 429 }) }),
    createHandler({ getKey: () => 'secret-key', fetchImpl: async () => { throw new Error('secret-key timeout') } }),
    createHandler({ getKey: () => 'secret-key', fetchImpl: geminiReply('   ') }),
  ]
  for (const h of cases) {
    const r = await call(h, { body: { flag: 'ODD_HOUR' } })
    assert.ok(r.status >= 500)
    assert.deepEqual(r.body, { error: 'No se pudo generar la explicación.' })
  }
})

test('same flag is served from cache (protects the free quota)', async () => {
  let calls = 0
  const handler = createHandler({ getKey: () => 'k', fetchImpl: async () => { calls++; return geminiReply('Texto. Alerta para revisar.')() } })
  await call(handler, { body: { flag: 'ODD_HOUR' } })
  await call(handler, { body: { flag: 'ODD_HOUR' } })
  assert.equal(calls, 1)
})

test('thought parts are dropped; output clamped to 80 words by whole sentences', async () => {
  const handler = createHandler({
    getKey: () => 'k',
    fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text: '**Hola.** Es una alerta.' }] } }] }) }),
  })
  assert.equal((await call(handler, { body: { flag: 'AMOUNT_OUTLIER' } })).body.text, 'Hola. Es una alerta.')
  const long = Array.from({ length: 30 }, (_, i) => `Frase número ${i} con cinco palabras.`).join(' ')
  const out = clampWords(long)
  assert.ok(out.split(' ').length <= 80)
  assert.ok(out.endsWith('.'))
})

test('card rules: open for "no reconocida", on request for flagged, hidden once recognized', () => {
  const flagged = { flags: [{ type: 'ODD_HOUR' }] }
  const clean = { flags: [] }
  assert.equal(cardMode(clean, 'no_reconocida'), 'open')
  assert.equal(cardMode(flagged, undefined), 'collapsed')
  assert.equal(cardMode(flagged, 'no_se_pudo_revisar'), 'collapsed')
  assert.equal(cardMode(flagged, 'reconocida'), 'hidden')
  assert.equal(cardMode(clean, undefined), 'hidden')
  assert.deepEqual(reasonsFor({ flags: [{ type: 'ODD_HOUR' }, { type: '69B_MATCH' }] }, 'no_reconocida'), ['69B_MATCH', 'NOT_RECOGNIZED', 'ODD_HOUR'])
})

test('"e.firma" and "S.A." never end a sentence when clamping', () => {
  const first = 'Si crees que alguien tiene tu e.firma o la de Comercial S.A. de C.V., revísalo con calma hoy mismo.'
  const text = `${first} ${'Otra frase de relleno con varias palabras aquí. '.repeat(20)}`
  const out = clampWords(text)
  assert.ok(out.startsWith(first))
  assert.ok(out.split(' ').length <= 80)
  assert.ok(!out.endsWith('e.'))
})

test('one retry on a Gemini 5xx; no retry on 429', async () => {
  let calls = 0
  const flaky = createHandler({
    getKey: () => 'k',
    fetchImpl: async () => (++calls === 1 ? { ok: false, status: 503 } : geminiReply('Ahora sí. Es una alerta para revisar.')()),
  })
  const r = await call(flaky, { body: { flag: 'ODD_HOUR' } })
  assert.equal(r.status, 200)
  assert.equal(calls, 2)

  let quotaCalls = 0
  const quota = createHandler({ getKey: () => 'k', fetchImpl: async () => { quotaCalls++; return { ok: false, status: 429 } } })
  assert.equal((await call(quota, { body: { flag: 'ODD_HOUR' } })).status, 502)
  assert.equal(quotaCalls, 1)
})
