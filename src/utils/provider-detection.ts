/**
 * Provider detection utilities for LiteLLM models
 * 
 * This module replaces nested if/else statements with Map-based lookups
 * for better maintainability and performance.
 */

import { PROVIDER_REGISTRY } from "../constants";

/**
 * Extract provider prefix from LiteLLM model string
 * @param model - Model string (e.g., "openai/gpt-4", "anthropic/claude-3")
 * @returns Provider prefix or null if not found
 */
function extractProviderPrefix(model: string): string | null {
  const parts = model.split('/');
  return parts.length > 1 ? parts[0].toLowerCase() : null;
}

/**
 * Extract standardized model source from LiteLLM model string
 * Maps to standardized provider constants matching Python implementation
 * 
 * @param model - LiteLLM model string
 * @returns Standardized provider source constant
 */
export function extractModelSource(model: string): string {
  const modelLower = model.toLowerCase();
  const prefix = extractProviderPrefix(model);
  
  // First, try to match by provider prefix (most reliable)
  if (prefix) {
    for (const provider of PROVIDER_REGISTRY) {
      if (provider.prefixes.includes(prefix)) return provider.source;
    }
  }
  
  // Fallback to pattern matching for models without explicit prefixes
  for (const provider of PROVIDER_REGISTRY) {
    if (provider.patterns.some(pattern => modelLower.includes(pattern))) return provider.source;
  }
  
  // Default fallback
  return 'LITELLM';
}

/**
 * Extract provider display name from LiteLLM model string
 * @param model - LiteLLM model string
 * @returns Human-readable provider name
 */
export function extractProvider(model: string): string {
  const modelLower = model.toLowerCase();
  const prefix = extractProviderPrefix(model);
  
  // First, try to match by provider prefix
  if (prefix) {
    for (const provider of PROVIDER_REGISTRY) {
      if (provider.prefixes.includes(prefix)) return provider.displayName;
    }
  }
  
  // Fallback to pattern matching
  for (const provider of PROVIDER_REGISTRY) {
    if (provider.patterns.some(pattern => modelLower.includes(pattern))) return provider.displayName;
  }
  
  // Return the prefix if found but not in registry, otherwise 'Unknown'
  return prefix || 'Unknown';
}

/**
 * Extract clean model name from LiteLLM model string
 * Examples: "openai/gpt-4" -> "gpt-4", "anthropic/claude-3-opus" -> "claude-3-opus"
 * 
 * @param model - LiteLLM model string
 * @returns Clean model name without provider prefix
 */
export function extractModelName(model: string): string {
  return model.includes('/') ? model.split('/').slice(1).join('/') : model;
}

/**
 * Validate if a model string appears to be a valid LiteLLM format
 * @param model - Model string to validate
 * @returns True if model appears valid
 */
export function isValidModelFormat(model: string): boolean {
  if (!model || typeof model !== 'string') return false;
  
  // Basic validation - model should not be empty and should contain valid characters
  return model.trim().length > 0 && /^[a-zA-Z0-9/_.-]+$/.test(model.trim());
}

/**
 * Get all supported providers
 * @returns Array of provider information
 */
export function getSupportedProviders(): Array<{source: string; displayName: string}> {
  return PROVIDER_REGISTRY.map(p => ({
    source: p.source,
    displayName: p.displayName
  }));
}
