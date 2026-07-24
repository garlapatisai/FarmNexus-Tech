/**
 * FarmNexus — AI Safety Guardrails & Input/Output Sanitizer Module
 * Inspects incoming user prompts and outgoing AI responses for domain relevance, safety, and security.
 */

// Blocked patterns (prompt injection attempts, system prompt leaks, non-agricultural abuse)
const SYSTEM_OVERRIDE_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /you are now Dan/i,
  /jailbreak/i,
  /reveal secret keys/i,
]

/**
 * Validate incoming prompt against safety guardrails.
 */
export function validateInputGuardrails(message) {
  if (!message || typeof message !== 'string') {
    return { passed: false, reason: 'Empty or invalid input format' }
  }

  const trimmed = message.trim()

  for (const pattern of SYSTEM_OVERRIDE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        passed: false,
        reason: 'Input contains prohibited system override or prompt injection attempt.',
        flaggedCategory: 'prompt_injection',
      }
    }
  }

  return { passed: true }
}

/**
 * Sanitize and validate outgoing response payload against output guardrails.
 */
export function validateOutputGuardrails(response) {
  if (!response || typeof response !== 'string') {
    return { passed: true, text: 'No response content available.' }
  }

  // Remove any leaked API keys or secret environment patterns
  let sanitized = response
    .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
    .replace(/rzp_(?:test|live)_[A-Za-z0-9]{14}/g, '[REDACTED_RAZORPAY_KEY]')

  return { passed: true, text: sanitized }
}
