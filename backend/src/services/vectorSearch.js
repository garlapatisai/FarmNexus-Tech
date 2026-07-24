/**
 * FarmNexus — Server-side Vector Search & RAG Knowledge Retrieval Service
 * Queries Supabase `match_knowledge_chunks` RPC or falls back to local TF-IDF matcher.
 */

import 'dotenv/config'
import { KNOWLEDGE_BASE } from './knowledgeBase.js'
import { embedContent } from './geminiService.js'

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 2 &&
        !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'what', 'how', 'which', 'is', 'best', 'in', 'of', 'on', 'to', 'can', 'do'].includes(w),
    )
}

function searchLocalKnowledge(query, topK = 3) {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) {
    return KNOWLEDGE_BASE.slice(0, topK).map((chunk) => ({ chunk, similarity: 0.5 }))
  }

  const scored = KNOWLEDGE_BASE.map((chunk) => {
    const titleTokens = tokenize(chunk.title)
    const contentTokens = tokenize(`${chunk.content} ${chunk.topic}`)

    let score = 0
    qTokens.forEach((word) => {
      if (titleTokens.includes(word)) score += 5
      if (chunk.topic.toLowerCase().includes(word)) score += 3
      if (contentTokens.includes(word)) score += 1
    })

    const maxPossible = qTokens.length * 5
    const similarity = Math.min(
      0.95,
      Math.max(0.15, Number((score / (maxPossible || 1)).toFixed(2))),
    )
    return { chunk, score, similarity }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

/**
 * Perform vector similarity search for agricultural knowledge chunks.
 */
export async function performVectorSearch(query, topK = 3) {
  // Check if Supabase client configured
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
    try {
      const { values: embedding } = await embedContent({ text: query })
      if (embedding && embedding.length > 0) {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_chunks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            query_embedding: embedding,
            match_threshold: 0.15,
            match_count: topK,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            return data.map((item) => ({
              chunk: {
                id: item.id,
                topic: item.topic,
                title: item.title,
                content: item.content,
                source: item.source,
              },
              similarity: Number(Number(item.similarity).toFixed(2)),
            }))
          }
        }
      }
    } catch (e) {
      console.warn('Supabase pgvector search fallback to local search engine:', e.message)
    }
  }

  // Local TF-IDF Fallback
  return searchLocalKnowledge(query, topK)
}
