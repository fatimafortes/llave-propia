// POST /api/explain — plain-Spanish explanation of ONE flag type, written by Gemini from approved text.
// Accepts exactly { "flag": "<one of EXPLAIN_FLAGS>" }. Any other key or value is rejected, so no RFC,
// name, amount or file content can ever reach Gemini (Blueprint Condition 1, hard rule 5).
// GEMINI_API_KEY lives only in Vercel env vars and is never logged or returned.
import { CARD_LIMIT, EXPLAIN_FLAGS, MEANINGS, STEPS } from '../src/data/nextActions.js'

// Verified 2026-09-30 on ai.google.dev (pricing + models pages, updated 2026-09-24):
// current stable Flash model with a free tier.
export const MODEL = 'gemini-3.8-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const MAX_WORDS = 80
const MAX_BODY_BYTES = 200
const CACHE_MS = 6 * 60 * 60 * 1000
const RETRY_MS = 1200
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const SYSTEM_PROMPT = [
  'Explicas avisos de una herramienta fiscal a una dentista en México que no es experta.',
  'Explica con palabras sencillas qué puede significar el aviso, en español de México, hablándole de tú.',
  `Máximo 60 palabras, 2 o 3 frases, sin listas, sin títulos y sin formato.`,
  'No repitas los pasos: ya aparecen en la tarjeta. Usa solo el texto aprobado como fuente.',
  'No agregues datos, cifras, nombres, plazos, leyes, teléfonos ni promesas que no estén en el texto aprobado.',
  'No afirmes que hay fraude ni que está a salvo. Termina diciendo que es una alerta para revisar.',
].join(' ')

// Steps are context only, so the explanation stays consistent with the card without repeating it.
const promptFor = (flag) =>
  [
    `Aviso: ${flag}`,
    `Qué puede significar (texto aprobado): ${MEANINGS[flag]}`,
    `Contexto, no lo repitas: la tarjeta ya da estos pasos: ${STEPS.join(' ')}`,
    `Límite: ${CARD_LIMIT}`,
  ].join('\n')

// Keeps whole sentences up to the word limit; hard-cuts only if the first sentence is already too long.
export function clampWords(text, max = MAX_WORDS) {
  const clean = text.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ')
  if (words.length <= max) return clean
  // A sentence ends at . ! ? followed by a capital letter, so "e.firma" or "S.A." never split one.
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
  let out = ''
  for (const s of sentences) {
    const next = (out + ' ' + s.trim()).trim()
    if (next.split(' ').length > max) break
    out = next
  }
  return out || words.slice(0, max).join(' ') + '…'
}

function readBody(req) {
  const raw = req.body
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw ?? '')
  if (text.length > MAX_BODY_BYTES) throw new Error('too large')
  return JSON.parse(text)
}

// Pure validation, exported for tests. Returns the flag or null.
export function validFlag(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const keys = Object.keys(body)
  if (keys.length !== 1 || keys[0] !== 'flag') return null
  return EXPLAIN_FLAGS.includes(body.flag) ? body.flag : null
}

export function createHandler({ fetchImpl = fetch, getKey = () => process.env.GEMINI_API_KEY, now = Date.now } = {}) {
  const cache = new Map() // flag -> { text, at }; per warm instance only

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Método no permitido.' })
    }
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Solicitud demasiado grande.' })
    }
    let body
    try {
      body = readBody(req)
    } catch {
      return res.status(400).json({ error: 'Solicitud inválida.' })
    }
    const flag = validFlag(body)
    if (!flag) return res.status(400).json({ error: 'Solo se acepta un tipo de aviso.' })

    const hit = cache.get(flag)
    if (hit && now() - hit.at < CACHE_MS) return res.status(200).json({ flag, text: hit.text })

    const key = getKey()
    if (!key) {
      console.error('[explain] GEMINI_API_KEY is not set')
      return res.status(503).json({ error: 'No se pudo generar la explicación.' })
    }

    try {
      const request = () =>
        fetchImpl(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: promptFor(flag) }] }],
            // Thinking tokens count against maxOutputTokens, so leave room; the reply itself is short.
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: 'low' } },
          }),
          signal: AbortSignal.timeout(12_000),
        })
      let r = await request()
      // Gemini sometimes answers 503 (overloaded) for a moment: retry once. A 429 (quota) is not retried.
      if (r.status >= 500) {
        console.error(`[explain] Gemini HTTP ${r.status}, retrying once`)
        await sleep(RETRY_MS)
        r = await request()
      }
      if (!r.ok) {
        console.error(`[explain] Gemini HTTP ${r.status}`)
        return res.status(502).json({ error: 'No se pudo generar la explicación.' })
      }
      const data = await r.json()
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const text = clampWords(parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join(' '))
      if (!text) {
        console.error(`[explain] Empty reply (finishReason ${data?.candidates?.[0]?.finishReason ?? 'n/a'})`)
        return res.status(502).json({ error: 'No se pudo generar la explicación.' })
      }
      cache.set(flag, { text, at: now() })
      return res.status(200).json({ flag, text })
    } catch (error) {
      console.error(`[explain] ${error?.name ?? 'Error'} calling Gemini`)
      return res.status(502).json({ error: 'No se pudo generar la explicación.' })
    }
  }
}

export default createHandler()
