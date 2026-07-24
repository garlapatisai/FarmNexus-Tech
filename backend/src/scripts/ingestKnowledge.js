/**
 * FarmNexus — Knowledge Ingestion & Vector Embedding Generator Script
 * Reads knowledge chunks, generates 768-dim embeddings, and outputs `supabase/seed-knowledge.sql`.
 * Usage: node backend/src/scripts/ingestKnowledge.js
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { KNOWLEDGE_BASE } from '../services/knowledgeBase.js'
import { embedContent } from '../services/geminiService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function escapeSqlString(str) {
  return String(str || '').replace(/'/g, "''")
}

async function runIngestion() {
  console.log(`🌾 FarmNexus Ingestion Tool: Processing ${KNOWLEDGE_BASE.length} knowledge base chunks...`)

  const sqlStatements = [
    `-- FarmNexus Knowledge Base Vector Seed Data`,
    `-- Generated automatically by backend/src/scripts/ingestKnowledge.js`,
    `-- Dimensions: 768 (text-embedding-004)\n`,
    `TRUNCATE TABLE public.knowledge_chunks;\n`
  ]

  let processedCount = 0
  let embeddedCount = 0

  for (const chunk of KNOWLEDGE_BASE) {
    processedCount++
    const textToEmbed = `${chunk.title}: ${chunk.topic}. ${chunk.content}`
    let vectorLiteral = 'NULL'

    try {
      if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
        const { values } = await embedContent({ text: textToEmbed })
        if (values && values.length > 0) {
          vectorLiteral = `'[${values.join(',')}]'::vector`
          embeddedCount++
        }
      }
    } catch (e) {
      console.warn(`⚠️ Vector embedding failed for chunk "${chunk.id}": ${e.message}`)
    }

    const sql = `INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  '${chunk.id}',
  '${escapeSqlString(chunk.topic)}',
  '${escapeSqlString(chunk.title)}',
  '${escapeSqlString(chunk.content)}',
  '${escapeSqlString(chunk.source)}',
  ${vectorLiteral}
);`

    sqlStatements.push(sql)
  }

  const outputPath = path.resolve(__dirname, '../../../supabase/seed-knowledge.sql')
  fs.writeFileSync(outputPath, sqlStatements.join('\n\n'), 'utf-8')

  console.log(`✅ Ingestion complete!`)
  console.log(`📊 Chunks Processed: ${processedCount}`)
  console.log(`⚡ Embeddings Generated: ${embeddedCount}`)
  console.log(`📁 Seed SQL written to: ${outputPath}`)
}

runIngestion().catch((err) => {
  console.error('❌ Ingestion failed:', err)
  process.exit(1)
})
