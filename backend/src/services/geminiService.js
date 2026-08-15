/**
 * FarmNexus — Secure Backend Gemini AI Service
 * Executes Gemini REST API calls on the Node.js server using process.env.GEMINI_API_KEY
 */

import 'dotenv/config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || 'AIzaSyDZbJCn4JDZngMdbX2WXz3-_hztLDai1QE'
const DEFAULT_MODEL = 'gemini-2.5-flash'
const EMBEDDING_MODEL = 'text-embedding-004'

/**
 * Generate content using Gemini REST API on backend.
 */
export async function generateContent({ contents, systemInstruction, model }) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.')
  }

  const selectedModel = model || DEFAULT_MODEL
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`

  const body = { contents }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(`${baseUrl}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `Gemini API HTTP ${res.status}`
    const error = new Error(msg)
    error.status = res.status
    throw error
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return { text: text.trim() }
}

/**
 * Generate text embedding vector using Gemini text-embedding-004 on backend.
 */
export async function embedContent({ text, model }) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.')
  }

  const selectedModel = model || EMBEDDING_MODEL
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:embedContent`

  const res = await fetch(`${baseUrl}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${selectedModel}`,
      content: { parts: [{ text }] },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `Gemini Embedding API HTTP ${res.status}`
    const error = new Error(msg)
    error.status = res.status
    throw error
  }

  const data = await res.json()
  const values = data?.embedding?.values
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Empty embedding returned from Gemini API')
  }

  return { values }
}
