/**
 * FarmNexus — Agentic AI Frontend Service
 * Connects frontend UI to backend Agentic AI orchestrator endpoint.
 */

export type ExecutedTool = {
  name: string
  args: Record<string, unknown>
  result: unknown
}

export type AgentSource = {
  title: string
  source: string
  similarity: number
}

export type AgentResponse = {
  response: string
  toolsUsed: ExecutedTool[]
  sources: AgentSource[]
  timestamp: string
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export async function askAgenticAI(
  message: string,
  history: { role: 'user' | 'model'; text: string }[] = [],
  role: 'farmer' | 'buyer' = 'farmer'
): Promise<AgentResponse> {
  const res = await fetch(`${BACKEND_URL}/api/ai/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, role }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Agent endpoint HTTP ${res.status}`)
  }

  return res.json()
}
