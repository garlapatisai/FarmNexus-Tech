/**
 * FarmNexus — Gemini AI Service
 * Thin wrapper around the Gemini 2.0 Flash REST API.
 * Requires VITE_GEMINI_API_KEY in frontend/.env
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_MODEL = 'gemini-2.5-flash'
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`

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

// ── Core fetch helper (exported for RAG engine) ───────────────────────────────

export async function callGemini(
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

// ── Text Embedding (for RAG vector search) ────────────────────────────────────

/**
 * Get a text embedding vector using Gemini's text-embedding-004 model.
 * Returns a float32 array of dimension 768.
 */
export async function getTextEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set.')
  }

  const res = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Gemini Embedding API error ${res.status}`,
    )
  }

  const data = await res.json()
  const values: number[] = data?.embedding?.values
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Empty embedding returned from Gemini API')
  }
  return values
}

/**
 * Batch-embed multiple texts. Calls embedContent sequentially with
 * a small delay to avoid rate limiting. Returns embeddings in same order.
 */
export async function batchGetTextEmbeddings(
  texts: string[],
  delayMs = 50,
): Promise<number[][]> {
  const results: number[][] = []
  for (let i = 0; i < texts.length; i++) {
    results.push(await getTextEmbedding(texts[i]))
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return results
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

// ── Feature 6 — Crop Protection Image Analysis ─────────────────────────────

/**
 * Analyze a crop image (as base64) to detect diseases and suggest treatment.
 * Uses Gemini's multimodal capability with inline image data.
 */
export async function analyzeCropImage(
  base64Image: string,
  mimeType: string,
  cropName?: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set.')
  }

  const systemInstruction = `You are an expert agricultural pathologist and crop disease specialist for Indian farming.
Analyze the uploaded crop/plant image and provide:
1. **Identified Issue**: Name the disease, pest, or deficiency visible (or say "Healthy" if the crop looks fine).
2. **Severity**: Low / Medium / High
3. **Cause**: Brief explanation of what's causing this.
4. **Treatment**: 2-3 practical remedies (organic + chemical options).
5. **Prevention**: 2 tips to prevent this in the future.
Keep your response concise, practical, and in simple English. Use emojis for readability.`

  const contents = [
    {
      role: 'user' as const,
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: cropName
            ? `Analyze this image of my ${cropName} crop. What disease or issue do you see? Provide treatment suggestions.`
            : `Analyze this crop/plant image. Identify any diseases, pests, or issues and suggest treatments.`,
        },
      ],
    },
  ]

  const body: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
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
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Unable to analyze image.').trim()
}

// ── Feature 7 — Water Management Advice ──────────────────────────────────────

/**
 * Get personalized water management advice based on crop, area, and region.
 */
export async function getWaterManagementAdvice(
  cropName: string,
  areaAcres: number,
  region: string,
  irrigationType?: string,
): Promise<string> {
  const systemInstruction = `You are an expert agricultural water management advisor for Indian farming.
Provide practical, actionable water management advice tailored to the farmer's specific inputs.
Structure your response with these sections:
1. 💧 **Water Requirement**: Estimated daily/weekly water needs for this crop
2. 🗓️ **Irrigation Schedule**: Optimal watering frequency and timing
3. 💡 **Efficiency Tips**: 3-4 water saving techniques specific to their setup
4. ⚠️ **Common Mistakes**: 2 mistakes to avoid
5. 🌧️ **Monsoon Tips**: Seasonal water management advice
Keep responses concise and use simple English. Use emojis for readability.`

  const prompt = `Crop: ${cropName}
Farm Area: ${areaAcres} acres
Region: ${region}, India
Irrigation Type: ${irrigationType || 'Not specified'}
Provide personalized water management advice.`

  return callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )
}

// ── Feature 8 — Productivity & Yield Improvement ─────────────────────────────

/**
 * Get AI-powered productivity improvement suggestions.
 */
export async function getProductivityAdvice(
  cropName: string,
  currentYield: string,
  soilType: string,
  region: string,
): Promise<string> {
  const systemInstruction = `You are an expert agricultural productivity consultant for Indian farming.
Provide practical, data-driven advice to help increase crop yields.
Structure your response with:
1. 📊 **Current Assessment**: Brief evaluation based on their inputs
2. 🌾 **Yield Improvement**: 3-4 specific techniques to boost yield
3. 🧪 **Soil & Nutrients**: Fertilizer and soil management recommendations
4. 📅 **Best Practices**: Optimal planting times and crop rotation advice
5. 💰 **Market Tips**: How to maximize revenue from higher yields
Keep responses practical and tailored to Indian conditions. Use emojis.`

  const prompt = `Crop: ${cropName}
Current Yield: ${currentYield}
Soil Type: ${soilType}
Region: ${region}, India
How can I improve my crop yield and productivity?`

  return callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )
}

// ── Feature 9 — Crop Protection Text Advice ──────────────────────────────────

/**
 * Get crop protection advice based on symptoms described by farmer.
 */
export async function getCropProtectionAdvice(
  cropName: string,
  symptoms: string,
  region: string,
): Promise<string> {
  const systemInstruction = `You are an expert plant pathologist and crop protection specialist for Indian farming.
Based on the described symptoms, provide:
1. 🔍 **Likely Diagnosis**: Most probable disease/pest (top 2 possibilities)
2. ⚡ **Severity Level**: Low / Medium / High
3. 💊 **Immediate Treatment**: Steps to take right now (organic + chemical)
4. 🛡️ **Prevention Plan**: How to prevent this in the future
5. 📞 **When to Get Help**: Signs that indicate professional consultation is needed
Keep responses practical and in simple English. Use emojis for readability.`

  const prompt = `Crop: ${cropName}
Symptoms: ${symptoms}
Region: ${region}, India
What's wrong with my crop and how do I fix it?`

  return callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )
}

// ── Feature 10 — Crop Loss Damage Assessment ──────────────────────────────────

export type DamageAssessmentResult = {
  summary: string
  severity: 'low' | 'medium' | 'high' | 'catastrophic'
  estimatedLossPercent: number
  remedies: string
  insuranceEligibility: string
}

/**
 * Assess crop damage based on images, crop details, age, hazard cause, and description.
 * Returns estimated loss percentage, remedies, eligibility, and assessment explanation.
 */
export async function assessCropDamage(
  base64Image: string | null,
  mimeType: string | null,
  cropName: string,
  ageWeeks: number,
  cause: string,
  areaAcres: number,
  description: string,
): Promise<DamageAssessmentResult> {
  if (base64Image && !GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set.')
  }

  const systemInstruction = `You are an expert crop insurance surveyor and agricultural loss auditor.
Analyze the details and image (if provided) of crop damage and calculate:
1. Severity of damage: low / medium / high / catastrophic
2. Estimated yield/financial loss as a percentage (integer between 0 and 100)
3. Direct recommendations or recovery remedies
4. Assessment explanation (a detailed professional summary)
5. Advice on insurance eligibility under typical standard crop insurance schemes (e.g., PMFBY in India).
Always respond with ONLY valid JSON in this exact format — no markdown, no code fences:
{
  "summary": "<2-3 sentence overview of the damage & cause>",
  "severity": "low", // must be exactly "low", "medium", "high", or "catastrophic"
  "estimatedLossPercent": 45, // must be a number
  "remedies": "<markdown list of 2-3 immediate recovery steps>",
  "insuranceEligibility": "<detailed explanation of eligibility and claim guidance>"
}`

  let prompt = `Crop: ${cropName}
Age: ${ageWeeks} weeks
Damage Cause: ${cause}
Total affected area: ${areaAcres} acres
Farmer Description: "${description}"`

  let contents: any[] = []
  if (base64Image && mimeType) {
    contents.push({
      inlineData: {
        mimeType,
        data: base64Image,
      },
    })
    prompt += `\nPlease analyze this crop damage photo alongside the provided parameters.`
  }
  contents.push({ text: prompt })

  const raw = await callGemini(
    [{ role: 'user', parts: contents.map((c) => (c.text ? { text: c.text } : c)) }],
    systemInstruction,
  )

  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned) as DamageAssessmentResult
  
  // Enforce types and constraints
  if (
    typeof parsed.summary !== 'string' ||
    !['low', 'medium', 'high', 'catastrophic'].includes(parsed.severity) ||
    typeof parsed.estimatedLossPercent !== 'number' ||
    typeof parsed.remedies !== 'string' ||
    typeof parsed.insuranceEligibility !== 'string'
  ) {
    throw new Error('Unexpected AI assessment format')
  }

  return parsed
}

// ── Feature 11 — Multilingual Voice Negotiation Agent ─────────────────────────

export type VoiceNegotiationResult = {
  understoodTranslation: string
  analysis: string
  suggestedResponse: string
  suggestedSpeech: string
  quickActions: string[]
}

/**
 * Parses spoken negotiations in regional dialects and proposes optimal counteroffers.
 */
export async function negotiateVoiceOffer(
  spokenText: string,
  languageCode: string,
  role: 'farmer' | 'buyer',
  listingDetails: { name: string; quantity: number; initialPrice: number },
  chatHistory: { sender: string; text: string }[]
): Promise<VoiceNegotiationResult> {
  const systemInstruction = `You are a professional agricultural trade assistant and expert negotiator for Indian farm marketplaces.
Analyze the user's spoken audio transcript (which may be in a regional Indian language like Hindi, Telugu, Kannada, or English) and understand what they are offering or requesting.

Context:
- User Role: ${role} (You are assisting them)
- Crop Item: ${listingDetails.name}
- Total Quantity: ${listingDetails.quantity} kg
- Initial Target Price: ₹${listingDetails.initialPrice}/kg

Recent Conversation History:
${chatHistory.map((m) => `${m.sender}: "${m.text}"`).join('\n')}

Based on this:
1. Translate and summarize their spoken audio input into clear English terms (e.g. "Agrees to ₹38/kg but buyer must pay loading charges").
2. Analyze the offer: is it reasonable? (Consider standard wholesale ranges, quantity scale, and previous chat context).
3. Draft a recommended short chat response in English that they can send to the chat room.
4. Draft a natural spoken response (suggestedSpeech) in the native language corresponding to the language code ${languageCode} (e.g. 'hi' for Hindi, 'te' for Telugu, 'kn' for Kannada, 'en' for English) that the assistant can read back to the farmer to verify.
5. Provide 2-3 quick action suggestion labels (e.g. "Propose ₹39/kg", "Accept Offer", "Decline Price adjustment").

Always respond with ONLY valid JSON in this exact format — no markdown, no code fences:
{
  "understoodTranslation": "<clear English summary of what they said>",
  "analysis": "<brief strategic analysis of the offer>",
  "suggestedResponse": "<short recommended text reply to send>",
  "suggestedSpeech": "<natural phonetic spoken feedback in the local dialect corresponding to language code>",
  "quickActions": ["Action 1", "Action 2"]
}`

  const prompt = `Spoken dialect input: "${spokenText}"
Language code: ${languageCode}
Please generate the negotiation analysis.`

  const raw = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
  )

  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned) as VoiceNegotiationResult

  if (
    typeof parsed.understoodTranslation !== 'string' ||
    typeof parsed.analysis !== 'string' ||
    typeof parsed.suggestedResponse !== 'string' ||
    typeof parsed.suggestedSpeech !== 'string' ||
    !Array.isArray(parsed.quickActions)
  ) {
    throw new Error('Unexpected AI negotiation format')
  }

  return parsed
}



