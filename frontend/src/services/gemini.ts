/**
 * FarmNexus — Gemini AI Service
 * Thin wrapper around the Gemini 2.0 Flash REST API.
 * Requires VITE_GEMINI_API_KEY in frontend/.env
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_MODEL = 'gemini-2.5-flash'
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export type PriceSuggestion = {
  price: number
  reasoning: string
}

export type ParsedSearchFilters = {
  category?: string
  maxPrice?: number
  keywords?: string
}

export type DemandTrend = {
  region: string
  crop: string
  demand: number
  color: string
}

export type TopCropPrediction = {
  name: string
  sub: string
  aiPrice: number
  marketPrice: number
  img: string
  highlight: string
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function callGemini(
  contents: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Add it to frontend/.env to enable AI features.',
    )
  }

  const body: Record<string, unknown> = { contents }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Gemini API error ${res.status}`,
    )
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text.trim()
}

// ── Feature 1 — Crop Price Advisor ───────────────────────────────────────────

/**
 * Ask Gemini for a fair market price for a given crop.
 * Returns a suggested price in ₹/kg and a short reasoning.
 */
export async function suggestCropPrice(
  produceName: string,
  category: string,
  quantityKg: number,
): Promise<PriceSuggestion> {
  const systemInstruction = `You are an agricultural market expert for India. 
Your job is to suggest a fair wholesale price per kg for farm produce.
Always respond with ONLY valid JSON in this exact format — no markdown, no code fences:
{"price": <number>, "reasoning": "<1–2 sentence explanation in English>"}
Base the price on current Indian wholesale mandi rates, seasonal demand, and typical margins.`

  const prompt = `Crop: ${produceName}
Category: ${category}
Quantity available: ${quantityKg} kg
Suggest a fair wholesale price per kg in Indian Rupees (₹).`

  const raw = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```[a-z]*\n?/g, '').trim()
  const parsed = JSON.parse(cleaned) as { price: number; reasoning: string }
  if (typeof parsed.price !== 'number' || typeof parsed.reasoning !== 'string') {
    throw new Error('Unexpected AI response format')
  }
  return parsed
}

// ── Feature 2 — Farm Assistant Chat ──────────────────────────────────────────

const FARM_ASSISTANT_SYSTEM = `You are FarmNexus AI, a friendly and knowledgeable agricultural assistant for Indian farmers.
You help with:
- Crop cultivation, planting seasons, and harvest timing
- Post-harvest storage and loss reduction
- Pricing strategy and market negotiations
- Connecting with buyers effectively
- Soil health, pest management, and weather advice
Keep responses concise (3–5 sentences max), practical, and tailored to Indian farming conditions.
Use simple English. Occasionally use relevant emojis for friendliness.`

/**
 * Send a conversation thread to the Farm Assistant.
 * Pass the full message history so the model has context.
 */
export async function chatWithFarmAssistant(
  messages: GeminiMessage[],
): Promise<string> {
  return callGemini(messages, FARM_ASSISTANT_SYSTEM)
}

// ── Feature 3 — Smart Search Query Parser ────────────────────────────────────

/**
 * Parse a natural language buyer search query into structured filters.
 * Returns partial filters — only fields the AI is confident about.
 */
export async function parseSearchQuery(
  query: string,
): Promise<ParsedSearchFilters> {
  const systemInstruction = `You are a search intent parser for an Indian agricultural marketplace.
Extract structured filters from a buyer's natural language query.
Valid categories: vegetable, fruit, grain, dairy, spices, other
Respond with ONLY valid JSON (no markdown):
{"category": "<category or null>", "maxPrice": <number or null>, "keywords": "<short keyword or null>"}
If uncertain about a field, use null. maxPrice is in ₹/kg.`

  const prompt = `Buyer query: "${query}"`

  const raw = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )

  const cleaned = raw.replace(/```[a-z]*\n?/g, '').trim()
  const parsed = JSON.parse(cleaned) as {
    category: string | null
    maxPrice: number | null
    keywords: string | null
  }

  const result: ParsedSearchFilters = {}
  if (parsed.category && parsed.category !== 'null') result.category = parsed.category
  if (parsed.maxPrice && parsed.maxPrice > 0) result.maxPrice = parsed.maxPrice
  if (parsed.keywords && parsed.keywords !== 'null') result.keywords = parsed.keywords
  return result
}

// ── Feature 4 — Regional Demand Trends ───────────────────────────────────────

// Cache to prevent hitting rate limits
let cachedTrends: DemandTrend[] | null = null
let cachedProducts: TopCropPrediction[] | null = null

/**
 * Fetch dynamic regional demand trends using AI.
 * Returns an array of 5 regions with their top crop and demand percentage.
 */
export async function getRegionalDemandTrends(): Promise<DemandTrend[]> {
  if (cachedTrends) return cachedTrends;
  
  const systemInstruction = `You are an agricultural market analyst for India.
Generate current or projected regional agricultural demand trends based on seasonality and market conditions.
Return exactly 5 Indian regions/states.
Respond with ONLY valid JSON array (no markdown fences) in this exact format:
[{"region": "<state name>", "crop": "<top crop>", "demand": <number between 60 and 100>, "color": "<hex color representing the crop>"}]`

  const prompt = "Generate the latest regional demand trends for Indian agriculture."

  try {
    const raw = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    )

    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned) as DemandTrend[]
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Not an array')
    
    // Ensure all required fields exist
    cachedTrends = parsed.slice(0, 5).map(p => ({
      region: p.region || 'Unknown',
      crop: p.crop || 'Unknown',
      demand: p.demand || 50,
      color: p.color || '#cccccc'
    }))
    return cachedTrends
  } catch (e) {
    console.error('getRegionalDemandTrends error:', e)
    // Fallback if parsing or API fails
    return [
      { region: 'Andhra Pradesh', crop: 'Rice', demand: 92, color: '#2E7D32' },
      { region: 'Maharashtra', crop: 'Mangoes', demand: 85, color: '#F57C00' },
      { region: 'Karnataka', crop: 'Tomatoes', demand: 78, color: '#D32F2F' },
      { region: 'Punjab', crop: 'Wheat', demand: 70, color: '#1F8A70' },
      { region: 'Tamil Nadu', crop: 'Bananas', demand: 65, color: '#7B1FA2' },
    ]
  }
}

// ── Feature 5 — Crop Price Predictions ───────────────────────────────────────

/**
 * Fetch dynamic price predictions and marketplace prices for top crops.
 */
export async function getTopCropsPredictions(): Promise<TopCropPrediction[]> {
  if (cachedProducts) return cachedProducts;
  
  const systemInstruction = `You are an agricultural market expert for India.
Generate AI predicted price and current marketplace price for exactly these 4 crops: Rice, Wheat, Tomatoes, Mangoes.
Respond with ONLY valid JSON array (no markdown fences) in this exact format:
[
  {"name": "Rice", "sub": "<sub-variety like Basmati>", "aiPrice": <number>, "marketPrice": <number>, "img": "🌾", "highlight": "orange"},
  {"name": "Wheat", "sub": "<sub-variety like Sharbati>", "aiPrice": <number>, "marketPrice": <number>, "img": "🌾", "highlight": "orange"},
  {"name": "Tomatoes", "sub": "<sub-variety like Red Cherry>", "aiPrice": <number>, "marketPrice": <number>, "img": "🍅", "highlight": "teal"},
  {"name": "Mangoes", "sub": "<sub-variety like Alphonso>", "aiPrice": <number>, "marketPrice": <number>, "img": "🥭", "highlight": "green"}
]
Provide wholesale prices in ₹/kg based on typical current Indian rates.`

  const prompt = "Generate current crop prices."

  try {
    const raw = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    )

    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned) as TopCropPrediction[]
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Not an array')
    
    cachedProducts = parsed.map(p => ({
      name: p.name || 'Crop',
      sub: p.sub || '',
      aiPrice: p.aiPrice || 0,
      marketPrice: p.marketPrice || 0,
      img: p.img || '🌱',
      highlight: p.highlight || 'teal'
    }))
    return cachedProducts
  } catch (e) {
    console.error('getTopCropsPredictions error:', e)
    return [
      { name: 'Rice', sub: 'Basmati', aiPrice: 42, marketPrice: 40, img: '🌾', highlight: 'orange' },
      { name: 'Wheat', sub: 'Sharbati', aiPrice: 28, marketPrice: 26, img: '🌾', highlight: 'orange' },
      { name: 'Tomatoes', sub: 'Red Cherry', aiPrice: 23, marketPrice: 25, img: '🍅', highlight: 'teal' },
      { name: 'Mangoes', sub: 'Alphonso', aiPrice: 109, marketPrice: 105, img: '🥭', highlight: 'green' },
    ]
  }
}

