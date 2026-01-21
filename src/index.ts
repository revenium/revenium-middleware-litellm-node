import {
  initializeConfig,
  getConfig,
  setConfig,
  getLogger,
  setLogger,
} from "./config";
import {
  patchHttpClient,
  unpatchHttpClient,
  isHttpClientPatched,
} from "./client";
import type { ReveniumConfig, Logger, MiddlewareStatus } from "./types";

/**
 * Track initialization state
 */
let isInitialized = false;

// Global logger
const logger = getLogger();
// Global config
const config = getConfig();

/**
 * Initialize the Revenium LiteLLM middleware
 */
function initialize(): boolean {
  if (isInitialized) {
    logger.debug("Revenium LiteLLM middleware already initialized");
    return true;
  }

  logger.debug("Initializing Revenium LiteLLM middleware");

  // Try to load configuration from environment
  const configLoaded = initializeConfig();
  if (!configLoaded) {
    logger.warn(
      "Revenium LiteLLM middleware not initialized - missing configuration"
    );
    logger.info(
      "Required environment variables: REVENIUM_METERING_API_KEY, LITELLM_PROXY_URL"
    );
    logger.info("See env.example for complete configuration options");
    return false;
  }

  // Patch HTTP client to intercept LiteLLM Proxy requests
  const patchSuccess = patchHttpClient();

  if (!patchSuccess) {
    logger.error("Failed to patch HTTP client - middleware disabled");
    return false;
  }

  isInitialized = true;
  logger.info("🚀 Revenium LiteLLM middleware initialized successfully");
  logger.info(
    "All requests to your LiteLLM Proxy will now be tracked automatically"
  );

  if (config) {
    logger.debug("Configuration details", {
      reveniumMeteringBaseUrl: config.reveniumMeteringBaseUrl,
      litellmProxyUrl: config.litellmProxyUrl,
      hasProxyKey: !!config.litellmApiKey,
      organizationId: config.organizationId,
    });
  }

  return true;
}

/**
 * Auto-initialize when module is imported (zero-touch experience)
 *
 * This follows the industry standard pattern used by Sentry, DataDog, New Relic, etc.
 * If environment variables are properly set, the middleware will automatically start
 * tracking LiteLLM requests with zero configuration required.
 *
 * If auto-initialization fails (missing env vars), it gracefully falls back
 * to allow manual configuration via initialize() or configure().
 *
 * Usage patterns:
 *
 * Zero-touch (90% of users):
 *   import '@revenium/litellm';
 *   // Done! All LiteLLM requests are now tracked
 *
 * Explicit control (10% of users):
 *   import { initialize, configure } from '@revenium/litellm';
 *   initialize(); // or configure({...})
 */
try {
  const autoInitialized = initialize();
  if (autoInitialized)
    logger.debug("Revenium LiteLLM middleware auto-initialized successfully");
} catch (error) {
  // Graceful fallback - don't throw, just log debug message
  // This allows manual configuration later via initialize() or configure()
  logger.debug("Auto-initialization skipped - manual configuration available", {
    reason: error instanceof Error ? error.message : String(error),
    hint: "Use initialize() or configure() for manual setup",
  });
}

// Export public API

/**
 * Manually set configuration (alternative to environment variables)
 */
export function configure(config: ReveniumConfig): boolean {
  try {
    setConfig(config);
    logger.info("Revenium LiteLLM configuration updated manually");

    // Re-initialize with new configuration
    if (!isHttpClientPatched()) {
      const patchSuccess = patchHttpClient();
      if (patchSuccess) {
        isInitialized = true;
        logger.info(
          "🚀 Revenium LiteLLM middleware enabled with manual configuration"
        );
      }
      return patchSuccess;
    }

    return true;
  } catch (error) {
    logger.error("Failed to set Revenium LiteLLM configuration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Check if middleware is initialized and working
 */
export function isMiddlewareInitialized(): boolean {
  return isInitialized && isHttpClientPatched();
}

/**
 * Check if the middleware has been initialized (for testing)
 */
export function getInitializationState(): boolean {
  return isInitialized;
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitializationState(): void {
  isInitialized = false;
}

/**
 * Get detailed status information
 */
export function getStatus(): MiddlewareStatus {
  return {
    initialized: isInitialized,
    patched: isHttpClientPatched(),
    hasConfig: !!config,
    proxyUrl: config?.litellmProxyUrl,
  };
}

/**
 * Enable the middleware (patch HTTP client)
 */
export function enable(): boolean {
  if (!config) {
    logger.error("Cannot enable middleware without configuration");
    return false;
  }

  const success = patchHttpClient();
  if (success) {
    isInitialized = true;
    logger.info("Revenium LiteLLM middleware enabled");
  }
  return success;
}

/**
 * Disable the middleware (unpatch HTTP client)
 */
export function disable(): boolean {
  const success = unpatchHttpClient();
  if (success) {
    isInitialized = false;
    logger.info("Revenium LiteLLM middleware disabled");
  }
  return success;
}

/**
 * Set a custom logger
 */
export function setCustomLogger(logger: Logger): void {
  setLogger(logger);
}

// Re-export types for TypeScript users
export type {
  ReveniumConfig,
  UsageMetadata,
  Logger,
  MiddlewareStatus,
  LiteLLMChatCompletionRequest,
  LiteLLMChatCompletionResponse,
  ReveniumHeaders,
} from "./types";

// Export configuration functions for advanced usage
export {
  getConfig,
  getLogger,
  resetConfig,
  resetConfigManager,
} from "./config";

// Export HTTP client management functions for testing
export { resetHttpClientManager } from "./client";

// Export the initialize function for explicit initialization
export { initialize };

// Testing utilities are exported above with their function declarations
