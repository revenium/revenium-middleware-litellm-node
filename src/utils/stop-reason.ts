/**
 * Stop reason mapping utilities
 * 
 * This module provides consistent mapping of completion finish reasons
 * to Revenium stop reason constants across different LLM providers.
 */

/**
 * Revenium stop reason constants
 */
export const STOP_REASONS = {
  END: 'END',
  TOKEN_LIMIT: 'TOKEN_LIMIT',
  ERROR: 'ERROR',
  END_SEQUENCE: 'END_SEQUENCE',
  TIMEOUT: 'TIMEOUT'
} as const;

export type StopReason = typeof STOP_REASONS[keyof typeof STOP_REASONS];

/**
 * Mapping of provider finish reasons to Revenium stop reasons
 * Organized by provider for better maintainability
 */
const FINISH_REASON_MAPPINGS = new Map<string, StopReason>([
  // Standard OpenAI reasons
  ['stop', STOP_REASONS.END],
  ['length', STOP_REASONS.TOKEN_LIMIT],
  ['max_tokens', STOP_REASONS.TOKEN_LIMIT],
  ['content_filter', STOP_REASONS.ERROR],
  ['function_call', STOP_REASONS.END_SEQUENCE],
  ['tool_calls', STOP_REASONS.END_SEQUENCE],
  
  // Anthropic reasons
  ['end_turn', STOP_REASONS.END],
  ['max_tokens', STOP_REASONS.TOKEN_LIMIT],
  ['stop_sequence', STOP_REASONS.END_SEQUENCE],
  
  // Google/Vertex AI reasons
  ['STOP', STOP_REASONS.END],
  ['MAX_TOKENS', STOP_REASONS.TOKEN_LIMIT],
  ['SAFETY', STOP_REASONS.ERROR],
  ['RECITATION', STOP_REASONS.ERROR],
  ['OTHER', STOP_REASONS.ERROR],
  
  // Cohere reasons
  ['COMPLETE', STOP_REASONS.END],
  ['MAX_TOKENS', STOP_REASONS.TOKEN_LIMIT],
  ['ERROR', STOP_REASONS.ERROR],
  ['ERROR_TOXIC', STOP_REASONS.ERROR],
  
  // Common timeout/error reasons
  ['timeout', STOP_REASONS.TIMEOUT],
  ['error', STOP_REASONS.ERROR],
  ['cancelled', STOP_REASONS.ERROR],
  ['failed', STOP_REASONS.ERROR],
  
  // End-of-sequence markers
  ['eos', STOP_REASONS.END],
  ['end_sequence', STOP_REASONS.END_SEQUENCE],
  ['end_of_sequence', STOP_REASONS.END_SEQUENCE]
]);

/**
 * Map completion finish reason to Revenium stop reason
 * Works with multiple LLM providers through LiteLLM
 * 
 * @param finishReason - The finish reason from the LLM provider
 * @returns Standardized Revenium stop reason
 */
export function getStopReason(finishReason: string | null | undefined): StopReason {
  if (!finishReason) return STOP_REASONS.END;
  
  // Normalize the finish reason (lowercase, trim whitespace)
  const normalizedReason = finishReason.toLowerCase().trim();
  
  // Look up in the mapping
  const mappedReason = FINISH_REASON_MAPPINGS.get(normalizedReason);
  
  if (mappedReason) return mappedReason;
  
  // Fallback pattern matching for unknown reasons
  if (normalizedReason.includes('token') || normalizedReason.includes('length')) return STOP_REASONS.TOKEN_LIMIT;
  if (normalizedReason.includes('error') || normalizedReason.includes('fail')) return STOP_REASONS.ERROR;
  if (normalizedReason.includes('timeout')) return STOP_REASONS.TIMEOUT;
  if (normalizedReason.includes('function') || normalizedReason.includes('tool')) return STOP_REASONS.END_SEQUENCE;
  
  // Default fallback
  return STOP_REASONS.END;
}

/**
 * Check if a finish reason indicates a successful completion
 * @param finishReason - The finish reason to check
 * @returns True if the completion was successful
 */
export function isSuccessfulCompletion(finishReason: string | null | undefined): boolean {
  const stopReason = getStopReason(finishReason);
  return stopReason === STOP_REASONS.END || stopReason === STOP_REASONS.END_SEQUENCE;
}

/**
 * Check if a finish reason indicates a token limit was reached
 * @param finishReason - The finish reason to check
 * @returns True if token limit was reached
 */
export function isTokenLimitReached(finishReason: string | null | undefined): boolean {
  const stopReason = getStopReason(finishReason);
  return stopReason === STOP_REASONS.TOKEN_LIMIT;
}

/**
 * Check if a finish reason indicates an error occurred
 * @param finishReason - The finish reason to check
 * @returns True if an error occurred
 */
export function isErrorCompletion(finishReason: string | null | undefined): boolean {
  const stopReason = getStopReason(finishReason);
  return stopReason === STOP_REASONS.ERROR || stopReason === STOP_REASONS.TIMEOUT;
}

/**
 * Get all supported finish reasons and their mappings
 * @returns Array of finish reason mappings
 */
export function getSupportedFinishReasons(): Array<{
  finishReason: string;
  stopReason: StopReason;
}> {
  return Array.from(FINISH_REASON_MAPPINGS.entries()).map(([finishReason, stopReason]) => ({
    finishReason,
    stopReason
  }));
}

/**
 * Add custom finish reason mapping
 * @param finishReason - The finish reason to map
 * @param stopReason - The Revenium stop reason to map to
 */
export function addFinishReasonMapping(finishReason: string, stopReason: StopReason): void {
  FINISH_REASON_MAPPINGS.set(finishReason.toLowerCase().trim(), stopReason);
}
