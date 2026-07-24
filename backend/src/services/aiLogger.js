/**
 * FarmNexus — AI Execution Logger & RAG Evaluation Metrics Service
 * Maintains an in-memory execution log buffer and calculates live metrics for Admin AI Monitoring.
 */

const MAX_LOG_ENTRIES = 100
const AI_LOGS = []

/**
 * Record an AI Agent execution log entry.
 */
export function logAIExecution(entry) {
  const logItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    prompt: entry.prompt || '',
    role: entry.role || 'farmer',
    userId: entry.userId || 'anonymous',
    latencyMs: entry.latencyMs || 0,
    toolsUsed: entry.toolsUsed || [],
    sourcesRetrieved: entry.sourcesRetrieved || [],
    guardrailTriggered: Boolean(entry.guardrailTriggered),
    guardrailReason: entry.guardrailReason || null,
    ragGrounded: Boolean(entry.sourcesRetrieved && entry.sourcesRetrieved.length > 0),
    status: entry.status || 'success',
    responseSnippet: (entry.responseSnippet || '').slice(0, 300),
  }

  AI_LOGS.unshift(logItem)
  if (AI_LOGS.length > MAX_LOG_ENTRIES) {
    AI_LOGS.pop()
  }

  return logItem
}

/**
 * Calculate live aggregate RAG & Agent evaluation metrics.
 */
export function getAIMetrics() {
  const totalRequests = AI_LOGS.length
  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      avgLatencyMs: 0,
      ragGroundingRate: 100,
      toolCallCount: 0,
      guardrailTriggers: 0,
      successRate: 100,
      recentLogs: [],
    }
  }

  let totalLatency = 0
  let ragCount = 0
  let toolCount = 0
  let guardrailCount = 0
  let successCount = 0

  AI_LOGS.forEach((log) => {
    totalLatency += log.latencyMs
    if (log.ragGrounded) ragCount++
    toolCount += log.toolsUsed.length
    if (log.guardrailTriggered) guardrailCount++
    if (log.status === 'success') successCount++
  })

  return {
    totalRequests,
    avgLatencyMs: Math.round(totalLatency / totalRequests),
    ragGroundingRate: Math.round((ragCount / totalRequests) * 100),
    toolCallCount: toolCount,
    guardrailTriggers: guardrailCount,
    successRate: Math.round((successCount / totalRequests) * 100),
    recentLogs: AI_LOGS.slice(0, 20),
  }
}
