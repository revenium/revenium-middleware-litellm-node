/**
 * Validation utilities for type-safe input handling
 *
 * This module provides runtime validation to replace 'any' types
 * with proper type checking and validation.
 */

import {
  HOSTNAME,
  HOSTNAME_IP,
  PATHNAME_URL,
  stringFields,
  SUPPORTED_ROLES,
  URL_PROTOCOL,
} from "../constants";
import { ReveniumConfig, UsageMetadata } from "../types";

/**
 * Type guard for checking if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard for checking if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Validate and extract string from unknown value
 * @param value - Value to validate
 * @param defaultValue - Default value if validation fails
 * @returns Validated string or default
 */
export function validateString(value: unknown, defaultValue = ""): string {
  return isString(value) ? value : defaultValue;
}

/**
 * Validate and extract number from unknown value
 * @param value - Value to validate
 * @param defaultValue - Default value if validation fails
 * @returns Validated number or default
 */
export function validateNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

/**
 * Validate and extract boolean from unknown value
 * @param value - Value to validate
 * @param defaultValue - Default value if validation fails
 * @returns Validated boolean or default
 */
export function validateBoolean(value: unknown, defaultValue = false): boolean {
  return isBoolean(value) ? value : defaultValue;
}

/**
 * Validate HTTP headers object
 * @param headers - Headers to validate
 * @returns Validated headers record
 */
export function validateHeaders(headers: unknown): Record<string, string> {
  if (!isObject(headers)) return {};

  const validHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (isString(key) && isString(value)) {
      validHeaders[key] = value;
    }
  }
  return validHeaders;
}

/**
 * Validate usage metadata object
 * @param metadata - Metadata to validate
 * @returns Validated usage metadata
 */
export function validateUsageMetadata(metadata: unknown): UsageMetadata {
  if (!isObject(metadata)) return {};
  const validated: UsageMetadata = {};

  // Validate string fields
  for (const field of stringFields) {
    const value = (metadata as Record<string, unknown>)[field];
    if (isString(value) && value?.trim()?.length > 0) {
      (validated as Record<string, string>)[field] = value?.trim();
    }
  }

  // Validate number fields
  const responseQualityScore = (metadata as Record<string, unknown>)
    .responseQualityScore;
  if (
    isNumber(responseQualityScore) &&
    responseQualityScore >= 0 &&
    responseQualityScore <= 1
  ) {
    validated.responseQualityScore = responseQualityScore;
  }
  return validated;
}

/**
 * Enhanced configuration validation with detailed error reporting
 */
interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: ReveniumConfig;
  suggestions?: string[];
}

/**
 * Validate Revenium configuration object with enhanced error reporting
 * @param config - Configuration to validate
 * @returns Detailed validation result
 */
export function validateReveniumConfig(
  config: unknown
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!isObject(config)) {
    return {
      isValid: false,
      errors: ["Configuration must be an object"],
      warnings: [],
      suggestions: [
        "Ensure you are passing a valid configuration object with required fields",
      ],
    };
  }

  const cfg = config as Record<string, unknown>;

  // Validate required API key
  if (!isString(cfg?.reveniumMeteringApiKey)) {
    errors.push("reveniumMeteringApiKey is required and must be a string");
    suggestions.push(
      "Set REVENIUM_METERING_API_KEY environment variable or provide reveniumMeteringApiKey in config"
    );
  } else if (!cfg?.reveniumMeteringApiKey?.trim()) {
    errors.push("reveniumMeteringApiKey cannot be empty");
  } else if (!cfg?.reveniumMeteringApiKey?.startsWith("hak_")) {
    errors.push('reveniumMeteringApiKey must start with "hak_"');
    suggestions.push(
      "Obtain a valid Revenium API key from your Revenium dashboard"
    );
  } else if (cfg?.reveniumMeteringApiKey?.length < 20) {
    warnings.push(
      "reveniumMeteringApiKey appears to be too short - verify it is correct"
    );
  }

  // Validate Revenium base URL
  if (!isString(cfg?.reveniumMeteringBaseUrl)) {
    errors.push("reveniumMeteringBaseUrl is required and must be a string");
  } else if (!cfg?.reveniumMeteringBaseUrl?.trim()) {
    errors.push("reveniumMeteringBaseUrl cannot be empty");
  } else {
    try {
      const url = new URL(cfg.reveniumMeteringBaseUrl);
      if (!url.protocol.startsWith(URL_PROTOCOL)) {
        errors.push("reveniumMeteringBaseUrl must use HTTP or HTTPS protocol");
      }
      if (url.hostname === HOSTNAME || url.hostname === HOSTNAME_IP) {
        warnings.push(
          "Using localhost for Revenium API - ensure this is intended for development"
        );
      }
    } catch {
      errors.push("reveniumMeteringBaseUrl must be a valid URL");
      suggestions.push("Use format: https://api.revenium.ai");
    }
  }

  // Validate LiteLLM proxy URL
  if (!isString(cfg?.litellmProxyUrl)) {
    errors.push("litellmProxyUrl is required and must be a string");
    suggestions.push(
      "Set LITELLM_PROXY_URL environment variable or provide litellmProxyUrl in config"
    );
  } else if (!cfg?.litellmProxyUrl?.trim()) {
    errors.push("litellmProxyUrl cannot be empty");
  } else {
    try {
      const url = new URL(cfg?.litellmProxyUrl);
      if (!url.protocol.startsWith(URL_PROTOCOL)) {
        errors.push("litellmProxyUrl must use HTTP or HTTPS protocol");
      }
      // Check for common LiteLLM endpoints
      if (PATHNAME_URL.some((path) => url.pathname.includes(path))) {
        warnings.push(
          "litellmProxyUrl includes endpoint path - ensure this is correct"
        );
      }
    } catch {
      errors.push("litellmProxyUrl must be a valid URL");
      suggestions.push(
        "Use format: http://localhost:4000 or https://your-litellm-proxy.com"
      );
    }
  }

  // Validate optional fields with enhanced checks
  if (cfg?.litellmApiKey !== undefined && !isString(cfg?.litellmApiKey)) {
    errors.push("litellmApiKey must be a string if provided");
  } else if (cfg?.litellmApiKey?.trim()?.length === 0) {
    warnings.push("litellmApiKey is empty - proxy authentication may fail");
  }

  if (cfg?.organizationId !== undefined && !isString(cfg?.organizationId)) {
    errors.push("organizationId must be a string if provided");
  } else if (cfg?.organizationId?.trim()?.length === 0) {
    warnings.push("organizationId is empty");
  }

  if (cfg?.apiTimeout !== undefined && !isNumber(cfg?.apiTimeout)) {
    errors.push("apiTimeout must be a number if provided");
  } else if (cfg?.apiTimeout !== undefined && cfg?.apiTimeout < 1000) {
    errors.push("apiTimeout must be at least 1000ms");
  } else if (cfg?.apiTimeout !== undefined && cfg?.apiTimeout > 60000) {
    errors.push("apiTimeout must not exceed 60000ms");
  } else if (cfg?.apiTimeout !== undefined && cfg?.apiTimeout < 3000) {
    warnings.push(
      "apiTimeout is very low - may cause timeouts for slow networks"
    );
  }

  if (cfg?.failSilent !== undefined && !isBoolean(cfg?.failSilent)) {
    errors.push("failSilent must be a boolean if provided");
  }

  if (cfg?.maxRetries !== undefined && !isNumber(cfg?.maxRetries)) {
    errors.push("maxRetries must be a number if provided");
  } else if (cfg?.maxRetries !== undefined && cfg?.maxRetries < 0) {
    errors.push("maxRetries cannot be negative");
  } else if (cfg?.maxRetries !== undefined && cfg?.maxRetries > 10) {
    errors.push("maxRetries should not exceed 10");
  } else if (cfg?.maxRetries !== undefined && cfg?.maxRetries === 0) {
    warnings.push("maxRetries is 0 - no retry attempts will be made");
  }

  if (errors.length > 0)
    return { isValid: false, errors, warnings, suggestions };

  // Build validated config
  const validatedConfig: ReveniumConfig = {
    reveniumMeteringApiKey: cfg?.reveniumMeteringApiKey as string,
    reveniumMeteringBaseUrl: cfg?.reveniumMeteringBaseUrl as string,
    litellmProxyUrl: cfg?.litellmProxyUrl as string,
    litellmApiKey: isString(cfg?.litellmApiKey)
      ? cfg?.litellmApiKey
      : undefined,
    organizationId: isString(cfg?.organizationId)
      ? cfg?.organizationId
      : undefined,
    apiTimeout: isNumber(cfg?.apiTimeout) ? cfg?.apiTimeout : undefined,
    failSilent: isBoolean(cfg?.failSilent) ? cfg?.failSilent : undefined,
    maxRetries: isNumber(cfg?.maxRetries) ? cfg?.maxRetries : undefined,
  };

  return {
    isValid: true,
    errors: [],
    warnings,
    config: validatedConfig,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Validate stream chunk data
 * @param chunk - Chunk data to validate
 * @returns Validated chunk or null if invalid
 */
export function validateStreamChunk(chunk: unknown): {
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{ finish_reason?: string; delta?: { content?: string } }>;
  x_groq?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
} | null {
  if (!isObject(chunk)) return null;

  const validated: ReturnType<typeof validateStreamChunk> = {};

  // Validate usage
  const usage = (chunk as Record<string, unknown>).usage;
  if (isObject(usage)) {
    validated.usage = {
      prompt_tokens: validateNumber(
        (usage as Record<string, unknown>).prompt_tokens
      ),
      completion_tokens: validateNumber(
        (usage as Record<string, unknown>).completion_tokens
      ),
      total_tokens: validateNumber(
        (usage as Record<string, unknown>).total_tokens
      ),
    };
  }

  // Validate choices
  const choices = (chunk as Record<string, unknown>).choices;
  if (Array.isArray(choices)) {
    validated.choices = choices.map((choice) => {
      if (!isObject(choice)) return {};

      const validatedChoice: {
        finish_reason?: string;
        delta?: { content?: string };
      } = {};

      const finishReason = (choice as Record<string, unknown>).finish_reason;
      if (isString(finishReason)) validatedChoice.finish_reason = finishReason;

      const delta = (choice as Record<string, unknown>).delta;
      if (isObject(delta)) {
        const content = (delta as Record<string, unknown>).content;
        if (isString(content)) validatedChoice.delta = { content };
      }
      return validatedChoice;
    });
  }

  // Validate Groq-specific usage
  const xGroq = (chunk as Record<string, unknown>).x_groq;
  if (isObject(xGroq)) {
    const groqUsage = (xGroq as Record<string, unknown>).usage;
    if (isObject(groqUsage)) {
      validated.x_groq = {
        usage: {
          prompt_tokens: validateNumber(
            (groqUsage as Record<string, unknown>).prompt_tokens
          ),
          completion_tokens: validateNumber(
            (groqUsage as Record<string, unknown>).completion_tokens
          ),
          total_tokens: validateNumber(
            (groqUsage as Record<string, unknown>).total_tokens
          ),
        },
      };
    }
  }
  return validated;
}

/**
 * Validate LiteLLM request data
 * @param requestData - Request data to validate
 * @param endpointType - Type of endpoint (chat or embeddings)
 * @returns Validation result
 */
export function validateLiteLLMRequest(
  requestData: unknown,
  endpointType: "chat" | "embeddings"
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(requestData))
    return {
      isValid: false,
      errors: ["Request data must be an object"],
      warnings: [],
    };
  const data = requestData as Record<string, unknown>;

  // Validate model field (required for both endpoints)
  if (!isString(data?.model))
    errors.push("model field is required and must be a string");
  else if (data?.model?.trim()?.length === 0)
    errors.push("model field cannot be empty");

  if (endpointType === "chat") {
    // Validate chat completion specific fields
    if (!Array.isArray(data?.messages)) {
      errors.push(
        "messages field is required and must be an array for chat completions"
      );
    } else if (data?.messages?.length === 0) {
      errors.push("messages array cannot be empty");
    } else {
      // Validate message structure
      data?.messages?.forEach((message, index) => {
        if (!isObject(message)) {
          errors.push(`Message at index ${index} must be an object`);
          return;
        }

        const msg = message as Record<string, unknown>;
        if (!isString(msg?.role)) {
          errors.push(`Message at index ${index} must have a role field`);
        } else if (!SUPPORTED_ROLES.includes(msg?.role)) {
          warnings.push(
            `Message at index ${index} has unusual role: ${msg?.role}`
          );
        }

        if (!isString(msg?.content)) {
          warnings.push(
            `Message at index ${index} content should be a string or null`
          );
        }
      });
    }

    // Validate optional chat parameters
    if (!isNumber(data?.temperature)) {
      warnings.push("temperature should be a number");
    } else if (data?.temperature < 0 || data?.temperature > 2) {
      warnings.push("temperature should be between 0 and 2");
    }

    if (!isNumber(data?.max_tokens))
      warnings.push("max_tokens should be a number");
    else if (data?.max_tokens <= 0)
      warnings.push("max_tokens should be positive");

    if (!isBoolean(data?.stream)) warnings.push("stream should be a boolean");
  } else if (endpointType === "embeddings") {
    // Validate embeddings specific fields
    if (!isString(data?.input) && !Array.isArray(data?.input)) {
      errors.push("input field must be a string or array of strings");
    } else if (Array.isArray(data?.input)) {
      if (data?.input?.length === 0) {
        errors.push("input array cannot be empty");
      } else {
        data.input.forEach((item, index) => {
          if (!isString(item)) {
            errors.push(`Input item at index ${index} must be a string`);
          }
        });
      }
    }

    if (!isNumber(data?.dimensions))
      warnings.push("dimensions should be a number");
    else if (data?.dimensions <= 0)
      warnings.push("dimensions should be positive");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate URL for LiteLLM proxy requests
 * @param url - URL to validate
 * @param proxyUrl - Configured proxy URL
 * @returns Validation result
 */
export function validateLiteLLMUrl(
  url: string,
  proxyUrl: string
): {
  isValid: boolean;
  errors: string[];
  endpointType?: "chat" | "embeddings";
} {
  const errors: string[] = [];

  try {
    const requestUrl = new URL(url);
    const configuredProxyUrl = new URL(proxyUrl);

    // Check hostname and port match
    if (requestUrl.hostname !== configuredProxyUrl.hostname) {
      errors.push(
        `Request hostname ${requestUrl.hostname} does not match configured proxy ${configuredProxyUrl.hostname}`
      );
    }

    if (requestUrl.port !== configuredProxyUrl.port) {
      errors.push(
        `Request port ${requestUrl.port} does not match configured proxy port ${configuredProxyUrl.port}`
      );
    }

    // Determine endpoint type
    let endpointType: "chat" | "embeddings" | undefined;

    if (
      requestUrl.pathname.endsWith("/chat/completions") ||
      requestUrl.pathname.endsWith("/v1/chat/completions")
    ) {
      endpointType = "chat";
    } else if (
      requestUrl.pathname.endsWith("/embeddings") ||
      requestUrl.pathname.endsWith("/v1/embeddings")
    ) {
      endpointType = "embeddings";
    } else {
      errors.push(`Unsupported endpoint: ${requestUrl.pathname}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      endpointType,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Invalid URL format: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ],
    };
  }
}
