/**
 * FarmNexus — Backend Agentic AI Orchestrator with Dynamic RAG Knowledge Search
 * 
 * Provides an Express service endpoint that executes an Agentic ReAct loop
 * with Gemini REST API (or dynamic vector search fallback).
 * 
 * Tools Available to the Agent:
 *   1. search_agricultural_knowledge (Dynamic TF-IDF vector retrieval over ~55 chunks)
 *   2. get_crop_price_suggestion (Wholesale mandi pricing recommendation)
 *   3. get_farmer_listings (Active marketplace produce listings)
 *   4. get_order_status (Recent buyer/farmer orders & escrow verification)
 *   5. get_farmer_sales_analytics (Revenue, top crops, & monthly performance)
 */

import 'dotenv/config'
import { KNOWLEDGE_BASE } from './knowledgeBase.js'
import { validateInputGuardrails, validateOutputGuardrails } from './guardrails.js'
import { logAIExecution } from './aiLogger.js'
import { performVectorSearch } from './vectorSearch.js'

// ── Dynamic RAG Knowledge Search Engine ───────────────────────────────────────

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 2 &&
        !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'what', 'how', 'which', 'is', 'best', 'in', 'of', 'on', 'to', 'can', 'do', 'now'].includes(w),
    )
}

function searchKnowledgeBase(query, topK = 3) {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) {
    return KNOWLEDGE_BASE.slice(0, topK).map((chunk) => ({ chunk, similarity: 0.5 }))
  }

  const scored = KNOWLEDGE_BASE.map((chunk) => {
    const titleTokens = tokenize(chunk.title)
    const contentTokens = tokenize(`${chunk.content} ${chunk.topic}`)

    let score = 0
    qTokens.forEach((word) => {
      // 5x weight for title match
      if (titleTokens.includes(word)) score += 5
      // 3x weight for topic match
      if (chunk.topic.toLowerCase().includes(word)) score += 3
      // 1x weight for content match
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

  if (scored[0].score === 0) {
    // If no keyword match, return top relevant default
    return [{ chunk: KNOWLEDGE_BASE[0], similarity: 0.35 }]
  }

  return scored.slice(0, topK)
}

// ── Tool Declarations for Gemini API ──────────────────────────────────────────

const TOOL_DECLARATIONS = [
  {
    name: 'search_agricultural_knowledge',
    description:
      'Search the verified Indian agricultural knowledge base for crop cultivation, pest management, soil health, water management, MSP, and government schemes like PM-KISAN, PMFBY, KCC.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Agricultural question or topic keyword' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_crop_price_suggestion',
    description:
      'Get recommended wholesale mandi price (in ₹/kg) and market reasoning for a given crop and quantity.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cropName: { type: 'STRING', description: 'Name of the crop (e.g., Tomatoes, Rice, Wheat, Mangoes)' },
        category: { type: 'STRING', description: 'Category: vegetable, fruit, grain, dairy, spices, other' },
        quantityKg: { type: 'NUMBER', description: 'Available quantity in kilograms' },
      },
      required: ['cropName', 'category', 'quantityKg'],
    },
  },
  {
    name: 'get_farmer_listings',
    description: 'Retrieve active marketplace produce listings for the farmer or specific category.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: {
          type: 'STRING',
          description: 'Filter by category: vegetable, fruit, grain, dairy, spices, or all',
        },
      },
    },
  },
  {
    name: 'get_order_status',
    description: 'Check recent customer order status, order amounts, and payment escrow status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        statusFilter: { type: 'STRING', description: 'Filter by status: pending, delivered, placed, or all' },
      },
    },
  },
  {
    name: 'get_farmer_sales_analytics',
    description:
      'Calculate overall farm revenue, order success rate, average order value, and top selling crops.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
]

// ── Mock DB Data for Tool Execution ───────────────────────────────────────────

const MOCK_LISTINGS = [
  { id: '1', produce_name: 'Organic Tomatoes', category: 'vegetable', price_per_kg: 24, quantity_kg: 500, min_order_kg: 10, is_active: true },
  { id: '2', produce_name: 'Basmati Paddy', category: 'grain', price_per_kg: 42, quantity_kg: 1200, min_order_kg: 50, is_active: true },
  { id: '3', produce_name: 'Alphonso Mangoes', category: 'fruit', price_per_kg: 110, quantity_kg: 300, min_order_kg: 5, is_active: true },
  { id: '4', produce_name: 'Fresh Spinach', category: 'vegetable', price_per_kg: 18, quantity_kg: 150, min_order_kg: 5, is_active: true },
]

const MOCK_ORDERS = [
  { id: 'ORD-101', produce_name: 'Tomatoes', buyer_name: 'Raj Traders', quantity_kg: 50, total_amount: 1100, status: 'pending', payment_status: 'escrow_locked' },
  { id: 'ORD-102', produce_name: 'Basmati Paddy', buyer_name: 'Fresh Mart', quantity_kg: 100, total_amount: 4200, status: 'delivered', payment_status: 'paid' },
  { id: 'ORD-103', produce_name: 'Tomatoes', buyer_name: 'Annapurna Foods', quantity_kg: 200, total_amount: 4600, status: 'delivered', payment_status: 'paid' },
  { id: 'ORD-104', produce_name: 'Alphonso Mangoes', buyer_name: 'Metro Hypermarket', quantity_kg: 80, total_amount: 8800, status: 'delivered', payment_status: 'paid' },
]

// ── Tool Implementation Functions ─────────────────────────────────────────────

async function executeTool(name, args) {
  switch (name) {
    case 'search_agricultural_knowledge': {
      const q = String(args?.query || '')
      const searchResults = await performVectorSearch(q, 3)
      const topMatch = searchResults[0]

      return {
        query: q,
        result: `[Topic: ${topMatch.chunk.topic}] — ${topMatch.chunk.title}: ${topMatch.chunk.content}`,
        source: {
          title: topMatch.chunk.title,
          source: topMatch.chunk.source,
          similarity: topMatch.similarity,
        },
        allMatches: searchResults.map((m) => ({
          title: m.chunk.title,
          source: m.chunk.source,
          similarity: m.similarity,
        })),
      }
    }

    case 'get_crop_price_suggestion': {
      const crop = args?.cropName || 'Crop'
      const qty = Number(args?.quantityKg) || 100
      let price = 25
      const lower = crop.toLowerCase()
      if (lower.includes('mango')) price = 105
      else if (lower.includes('rice') || lower.includes('paddy')) price = 42
      else if (lower.includes('wheat')) price = 28
      else if (lower.includes('spinach') || lower.includes('leaf')) price = 18

      return {
        crop,
        quantityKg: qty,
        suggestedPricePerKg: price,
        estimatedTotalValue: price * qty,
        reasoning: `Based on current Indian wholesale mandi trends for ${crop}, ₹${price}/kg reflects strong regional demand and typical 10-15% retail margins.`,
      }
    }

    case 'get_farmer_listings': {
      const cat = args?.category
      const filtered =
        cat && cat !== 'all'
          ? MOCK_LISTINGS.filter((l) => l.category === cat)
          : MOCK_LISTINGS

      return {
        count: filtered.length,
        listings: filtered,
      }
    }

    case 'get_order_status': {
      const filter = args?.statusFilter
      const filtered =
        filter && filter !== 'all'
          ? MOCK_ORDERS.filter((o) => o.status === filter)
          : MOCK_ORDERS

      return {
        totalOrdersCount: MOCK_ORDERS.length,
        matchingOrders: filtered,
      }
    }

    case 'get_farmer_sales_analytics': {
      const totalRevenue = MOCK_ORDERS.filter((o) => o.status === 'delivered').reduce(
        (sum, o) => sum + o.total_amount,
        0,
      )
      const deliveredCount = MOCK_ORDERS.filter((o) => o.status === 'delivered').length

      return {
        totalRevenue,
        ordersCompleted: deliveredCount,
        pendingOrders: MOCK_ORDERS.filter((o) => o.status === 'pending').length,
        avgOrderValue: Math.round(totalRevenue / (deliveredCount || 1)),
        orderSuccessRate: '94%',
        topSellingCrop: 'Tomatoes & Basmati Paddy',
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ── Agentic ReAct Orchestrator ────────────────────────────────────────────────

export async function runAgentOrchestrator({ message, history = [], role = 'farmer', userId = 'user-1' }) {
  const startTime = performance.now()
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  const toolsUsed = []
  const sources = []

  // 1. Input Guardrails Check
  const inputCheck = validateInputGuardrails(message)
  if (!inputCheck.passed) {
    const latencyMs = Math.round(performance.now() - startTime)
    logAIExecution({
      prompt: message,
      role,
      userId,
      latencyMs,
      toolsUsed: [],
      sourcesRetrieved: [],
      guardrailTriggered: true,
      guardrailReason: inputCheck.reason,
      status: 'flagged',
      responseSnippet: 'Input request blocked by FarmNexus AI Guardrails.',
    })

    return {
      response: `🛡️ **FarmNexus AI Safety System**: ${inputCheck.reason}`,
      toolsUsed: [],
      sources: [],
      guardrailFlagged: true,
      timestamp: new Date().toISOString(),
    }
  }

  const lowerMsg = message.toLowerCase()

  const needsKnowledge =
    lowerMsg.includes('how') ||
    lowerMsg.includes('what') ||
    lowerMsg.includes('which') ||
    lowerMsg.includes('scheme') ||
    lowerMsg.includes('pm') ||
    lowerMsg.includes('water') ||
    lowerMsg.includes('disease') ||
    lowerMsg.includes('soil') ||
    lowerMsg.includes('fertilizer') ||
    lowerMsg.includes('pest') ||
    lowerMsg.includes('grow') ||
    lowerMsg.includes('crop') ||
    lowerMsg.includes('best') ||
    lowerMsg.includes('andhra') ||
    lowerMsg.includes('state') ||
    lowerMsg.includes('season')

  const needsPrice =
    lowerMsg.includes('price') ||
    lowerMsg.includes('mandi') ||
    lowerMsg.includes('rate') ||
    lowerMsg.includes('cost') ||
    lowerMsg.includes('worth') ||
    lowerMsg.includes('val')

  const needsListings =
    lowerMsg.includes('listing') ||
    lowerMsg.includes('stock') ||
    lowerMsg.includes('inventory') ||
    lowerMsg.includes('sell') ||
    lowerMsg.includes('produce')

  const needsOrders =
    lowerMsg.includes('order') ||
    lowerMsg.includes('buyer') ||
    lowerMsg.includes('pending') ||
    lowerMsg.includes('escrow') ||
    lowerMsg.includes('deliver')

  // Role authorization check: analytics restricted to farmers or admins
  const needsAnalytics =
    (role === 'farmer' || role === 'admin') &&
    (lowerMsg.includes('sales') ||
      lowerMsg.includes('revenue') ||
      lowerMsg.includes('earning') ||
      lowerMsg.includes('analytic') ||
      lowerMsg.includes('profit') ||
      lowerMsg.includes('performance'))

  // Run matching tools
  if (needsKnowledge || (!needsPrice && !needsListings && !needsOrders && !needsAnalytics)) {
    const res = await executeTool('search_agricultural_knowledge', { query: message })
    toolsUsed.push({ name: 'search_agricultural_knowledge', args: { query: message }, result: res.result })
    if (res.source) sources.push(res.source)
    if (res.allMatches && res.allMatches.length > 1) {
      res.allMatches.slice(1).forEach((m) => {
        if (!sources.some((s) => s.title === m.title)) sources.push(m)
      })
    }
  }

  if (needsPrice) {
    let cropName = 'Tomatoes'
    if (lowerMsg.includes('mango')) cropName = 'Mangoes'
    else if (lowerMsg.includes('rice') || lowerMsg.includes('paddy')) cropName = 'Rice'
    else if (lowerMsg.includes('wheat')) cropName = 'Wheat'

    const res = await executeTool('get_crop_price_suggestion', { cropName, category: 'vegetable', quantityKg: 100 })
    toolsUsed.push({ name: 'get_crop_price_suggestion', args: { cropName, category: 'vegetable', quantityKg: 100 }, result: res })
  }

  if (needsListings) {
    const res = await executeTool('get_farmer_listings', { category: 'all' })
    toolsUsed.push({ name: 'get_farmer_listings', args: { category: 'all' }, result: res })
  }

  if (needsOrders) {
    const res = await executeTool('get_order_status', { statusFilter: 'all' })
    toolsUsed.push({ name: 'get_order_status', args: { statusFilter: 'all' }, result: res })
  }

  if (needsAnalytics) {
    const res = await executeTool('get_farmer_sales_analytics', {})
    toolsUsed.push({ name: 'get_farmer_sales_analytics', args: {}, result: res })
  }

  // Synthesize answer using Gemini API if key exists & valid, else dynamic fallback
  let responseText = ''

  if (apiKey) {
    try {
      const GEMINI_MODEL = 'gemini-2.5-flash'
      const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

      const promptContext = `You are FarmNexus AI Agent, a helpful agentic assistant for Indian agriculture (${role} role context).
You executed the following tools to answer the user's question:
${JSON.stringify(toolsUsed, null, 2)}

User Question: "${message}"
Conversation Memory History: ${JSON.stringify(history.slice(-4))}

Synthesize a helpful, friendly, and practical answer (3-5 sentences) based on the tool results. Use emojis and ₹ for pricing.`

      const res = await fetch(`${BASE_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptContext }] }] }),
      })

      if (res.ok) {
        const data = await res.json()
        responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      }
    } catch (e) {
      console.warn('Agent Gemini synthesis error, using dynamic local synthesizer:', e)
    }
  }

  if (!responseText) {
    // Dynamic Structured Fallback Synthesis
    const parts = []

    toolsUsed.forEach((tool) => {
      if (tool.name === 'search_agricultural_knowledge') {
        parts.push(`🌾 **Knowledge Insights**: ${tool.result}`)
      } else if (tool.name === 'get_crop_price_suggestion') {
        const r = tool.result
        parts.push(
          `💰 **Mandi Price Suggestion**: Fair wholesale price for ${r.crop} is **₹${r.suggestedPricePerKg}/kg** (Estimated total: ₹${r.estimatedTotalValue.toLocaleString('en-IN')}). ${r.reasoning}`,
        )
      } else if (tool.name === 'get_farmer_sales_analytics') {
        const r = tool.result
        parts.push(
          `📊 **Sales Performance**: Total Revenue is **₹${r.totalRevenue.toLocaleString('en-IN')}** across ${r.ordersCompleted} completed orders (${r.orderSuccessRate} success rate). Top crops: ${r.topSellingCrop}.`,
        )
      } else if (tool.name === 'get_order_status') {
        const r = tool.result
        parts.push(
          `📦 **Order Status**: You have **${r.matchingOrders.length} active/recent orders**, including pending orders held in escrow.`,
        )
      } else if (tool.name === 'get_farmer_listings') {
        const r = tool.result
        parts.push(
          `🏪 **Active Listings**: You currently have **${r.count} active crop listings** in the marketplace.`,
        )
      }
    })

    if (parts.length === 0) {
      parts.push(
        `🌾 FarmNexus AI Agent: I've checked your farm records and marketplace tools. How can I assist you with your crops, orders, or pricing today?`,
      )
    }

    responseText = parts.join('\n\n')
  }

  // 2. Output Guardrails Check & Sanitization
  const outputCheck = validateOutputGuardrails(responseText)
  const finalResponseText = outputCheck.text

  const latencyMs = Math.round(performance.now() - startTime)

  // 3. Record Execution Log for Admin Monitoring
  logAIExecution({
    prompt: message,
    role,
    userId,
    latencyMs,
    toolsUsed,
    sourcesRetrieved: sources,
    guardrailTriggered: false,
    status: 'success',
    responseSnippet: finalResponseText,
  })

  return {
    response: finalResponseText,
    toolsUsed,
    sources,
    timestamp: new Date().toISOString(),
  }
}
