/**
 * FarmNexus — RAG (Retrieval-Augmented Generation) Engine
 * 
 * Pipeline:
 *   Farmer Question → Embedding → Vector Similarity Search → Knowledge Base
 *   → Relevant Chunks → Prompt + Context → Gemini (or Grounded Extractor) → Grounded Answer + Sources
 *
 * Supports both:
 * 1. Online Mode: Gemini Embedding API (text-embedding-004) + Gemini 2.5 Flash
 * 2. Local Fallback Mode: TF-IDF Vector Search + Direct Knowledge Extractor
 *    (Ensures 100% functionality even when offline or if API key is invalid/missing).
 */

import { KNOWLEDGE_BASE, type KnowledgeChunk } from './knowledgeBase'
import { getTextEmbedding, batchGetTextEmbeddings, callGemini, type GeminiMessage } from './gemini'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RetrievedChunk = {
  chunk: KnowledgeChunk
  similarity: number
}

export type RAGResponse = {
  answer: string
  sources: { title: string; topic: string; source: string; similarity: number }[]
  retrievalTimeMs: number
}

type CachedEmbeddings = {
  version: number
  chunkCount: number
  embeddings: Record<string, number[]>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_KEY = 'farmnexus_rag_embeddings_v4'
const CACHE_VERSION = 4
const TOP_K = 5
const SIMILARITY_THRESHOLD = 0.15

// ── Local TF-IDF Vectorizer (for offline/fallback mode) ──────────────────────

let vocabulary: string[] = []
const wordIDFMap: Map<string, number> = new Map()

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'what', 'how'].includes(w))
}

function buildVocabularyAndIDF(): void {
  if (vocabulary.length > 0) return
  const docCount = KNOWLEDGE_BASE.length
  const docFreqMap: Map<string, number> = new Map()

  KNOWLEDGE_BASE.forEach((chunk) => {
    // Title words get 3x representation for title-matching boost
    const titleTokens = tokenize(chunk.title)
    const bodyTokens = tokenize(`${chunk.content} ${chunk.topic}`)
    const tokens = new Set([...titleTokens, ...bodyTokens])
    tokens.forEach((word) => {
      docFreqMap.set(word, (docFreqMap.get(word) || 0) + 1)
    })
  })

  vocabulary = Array.from(docFreqMap.keys())

  vocabulary.forEach((word) => {
    const df = docFreqMap.get(word) || 1
    const idf = Math.log((docCount + 1) / (df + 0.5)) + 1
    wordIDFMap.set(word, idf)
  })
}

function computeLocalVector(text: string, isTitleBoost = false): number[] {
  buildVocabularyAndIDF()
  const tokens = tokenize(text)
  const tfMap: Map<string, number> = new Map()
  tokens.forEach((word) => {
    tfMap.set(word, (tfMap.get(word) || 0) + (isTitleBoost ? 3 : 1))
  })

  const vector = vocabulary.map((word) => {
    const tf = tfMap.get(word) || 0
    const idf = wordIDFMap.get(word) || 0
    return tf * idf
  })

  let norm = 0
  for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i]
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm
  }

  return vector
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// ── Knowledge Base Index ──────────────────────────────────────────────────────

let chunkEmbeddings: Map<string, number[]> = new Map()
let isInitialized = false
let isInitializing = false
let isLocalFallbackMode = false
let initPromise: Promise<void> | null = null

function loadCachedEmbeddings(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return false
    const cached: CachedEmbeddings = JSON.parse(raw)
    if (
      cached.version !== CACHE_VERSION ||
      cached.chunkCount !== KNOWLEDGE_BASE.length
    ) {
      localStorage.removeItem(CACHE_KEY)
      return false
    }
    chunkEmbeddings = new Map(Object.entries(cached.embeddings))
    for (const chunk of KNOWLEDGE_BASE) {
      if (!chunkEmbeddings.has(chunk.id)) {
        chunkEmbeddings.clear()
        localStorage.removeItem(CACHE_KEY)
        return false
      }
    }
    return true
  } catch {
    localStorage.removeItem(CACHE_KEY)
    return false
  }
}

function saveCachedEmbeddings(): void {
  try {
    const cached: CachedEmbeddings = {
      version: CACHE_VERSION,
      chunkCount: KNOWLEDGE_BASE.length,
      embeddings: Object.fromEntries(chunkEmbeddings),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch (e) {
    console.warn('RAG: Failed to cache embeddings:', e)
  }
}

export type InitProgressCallback = (current: number, total: number) => void

/**
 * Initialize knowledge base.
 * Tries Gemini Embedding API first; if unavailable or failed, uses local vectorizer.
 */
export async function initializeKnowledgeBase(
  onProgress?: InitProgressCallback,
): Promise<void> {
  if (isInitialized) return
  if (isInitializing && initPromise) return initPromise

  isInitializing = true
  initPromise = (async () => {
    try {
      // 1. Check cache
      if (loadCachedEmbeddings()) {
        console.log(`RAG: Loaded ${chunkEmbeddings.size} cached embeddings`)
        isInitialized = true
        onProgress?.(KNOWLEDGE_BASE.length, KNOWLEDGE_BASE.length)
        return
      }

      console.log(`RAG: Initializing knowledge base (${KNOWLEDGE_BASE.length} chunks)...`)

      // 2. Try online embedding API
      try {
        const texts = KNOWLEDGE_BASE.map(
          (chunk) => `${chunk.title}\n${chunk.content}`,
        )
        const BATCH_SIZE = 5
        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
          const batch = texts.slice(i, i + BATCH_SIZE)
          const batchEmbeddings = await batchGetTextEmbeddings(batch, 30)
          for (let j = 0; j < batch.length; j++) {
            chunkEmbeddings.set(KNOWLEDGE_BASE[i + j].id, batchEmbeddings[j])
          }
          onProgress?.(Math.min(i + BATCH_SIZE, texts.length), texts.length)
        }
        saveCachedEmbeddings()
        console.log(`RAG: Online embedding successful (${chunkEmbeddings.size} chunks)`)
      } catch (apiErr) {
        console.warn('RAG: Online embedding API failed/unavailable. Switching to Local TF-IDF Vectorizer:', apiErr)
        isLocalFallbackMode = true
        // Local embedding calculation
        for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
          const chunk = KNOWLEDGE_BASE[i]
          const vec = computeLocalVector(`${chunk.title}\n${chunk.content}`)
          chunkEmbeddings.set(chunk.id, vec)
          onProgress?.(i + 1, KNOWLEDGE_BASE.length)
        }
        console.log(`RAG: Local TF-IDF vectorization complete (${chunkEmbeddings.size} chunks)`)
      }

      isInitialized = true
    } catch (e) {
      console.error('RAG: Failed to initialize:', e)
      isInitializing = false
      initPromise = null
      throw e
    }
  })()

  return initPromise
}

export function isRAGReady(): boolean {
  return isInitialized
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

export async function retrieveRelevantChunks(
  query: string,
  topK: number = TOP_K,
): Promise<RetrievedChunk[]> {
  if (!isInitialized) {
    await initializeKnowledgeBase()
  }

  let queryVector: number[] = []

  if (!isLocalFallbackMode) {
    try {
      queryVector = await getTextEmbedding(query)
    } catch (e) {
      console.warn('RAG: Online query embedding failed, using local query vectorizer:', e)
      isLocalFallbackMode = true
      queryVector = computeLocalVector(query)
    }
  } else {
    queryVector = computeLocalVector(query)
  }

  const scored: RetrievedChunk[] = KNOWLEDGE_BASE.map((chunk) => {
    let chunkEmb = chunkEmbeddings.get(chunk.id)
    if (!chunkEmb || chunkEmb.length !== queryVector.length) {
      chunkEmb = computeLocalVector(`${chunk.title}\n${chunk.content}`)
      chunkEmbeddings.set(chunk.id, chunkEmb)
    }
    const similarity = cosineSimilarity(queryVector, chunkEmb)
    return { chunk, similarity }
  })

  return scored
    .filter((r) => r.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

// ── RAG Generation ────────────────────────────────────────────────────────────

const RAG_SYSTEM_PROMPT = `You are FarmNexus AI, an expert agricultural assistant for Indian farmers.
You are powered by a Retrieval-Augmented Generation (RAG) system with access to a curated agricultural knowledge base.

IMPORTANT INSTRUCTIONS:
1. Base your answers PRIMARILY on the provided knowledge context below.
2. Provide a practical, clear answer tailored to Indian farming.
3. Keep responses concise (3-5 sentences), practical, and friendly with relevant emojis.
4. Always cite source names.`

/**
 * Generate a grounded answer when LLM API is unavailable (Offline RAG Extractor)
 */
function generateLocalGroundedAnswer(query: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `🌾 FarmNexus AI Knowledge Base: I reviewed our agricultural repository, but couldn't find a direct match for "${query}". I recommend checking current mandi wholesale rates or consulting your local Krishi Vigyan Kendra (KVK).`
  }

  const top = chunks[0].chunk
  const related = chunks.slice(1, 3).map((c) => c.chunk.title).join(', ')

  return `🌾 **Grounded Knowledge Answer** (${top.topic}):

${top.content}

💡 *Official Source: ${top.source}*${related ? `\n📌 *Related Topics: ${related}*` : ''}`
}

export async function generateRAGResponse(
  query: string,
  chatHistory: GeminiMessage[] = [],
): Promise<RAGResponse> {
  const retrievalStart = performance.now()

  // 1. Retrieve
  const relevantChunks = await retrieveRelevantChunks(query)
  const retrievalTimeMs = Math.round(performance.now() - retrievalStart)

  // 2. Build Context
  let contextBlock = ''
  if (relevantChunks.length > 0) {
    contextBlock = relevantChunks
      .map(
        (r, i) =>
          `[Source ${i + 1}: "${r.chunk.title}" — ${r.chunk.source} (relevance: ${(r.similarity * 100).toFixed(0)}%)]\n${r.chunk.content}`,
      )
      .join('\n\n---\n\n')
  }

  const augmentedUserMessage = contextBlock
    ? `KNOWLEDGE CONTEXT:\n${contextBlock}\n\n---\n\nFARMER'S QUESTION: ${query}`
    : `No specific knowledge context was found for this query. Answer using general agricultural knowledge.\n\nFARMER'S QUESTION: ${query}`

  const messages: GeminiMessage[] = [
    ...chatHistory.slice(-6),
    { role: 'user', parts: [{ text: augmentedUserMessage }] },
  ]

  // 3. Generate (with offline fallback if Gemini API fails)
  let answer = ''
  try {
    answer = await callGemini(messages, RAG_SYSTEM_PROMPT)
  } catch (e) {
    console.warn('RAG: Gemini API call failed. Using local grounded answer extractor:', e)
    answer = generateLocalGroundedAnswer(query, relevantChunks)
  }

  // 4. Return
  return {
    answer,
    sources: relevantChunks.map((r) => ({
      title: r.chunk.title,
      topic: r.chunk.topic,
      source: r.chunk.source,
      similarity: Number(r.similarity.toFixed(2)),
    })),
    retrievalTimeMs,
  }
}
