import { ReveniumConfig, Logger } from "./types";
import {
  TypeSafeLogger,
  LogLevel,
  shouldLog,
  formatLogContext,
  createTimestamp,
  LogContext,
} from "./utils/logger-types";
import { validateReveniumConfig } from "./utils/validation";
import { setConfig as setSummaryPrinterConfig } from "./utils/summary-printer";

/**
 * Type-safe console logger implementation
 */
class TypeSafeConsoleLogger implements TypeSafeLogger {
  private getLogLevel(): LogLevel {
    const envLevel = process.env.REVENIUM_LOG_LEVEL?.toUpperCase();
    if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel))
      return envLevel as LogLevel;
    return process.env.REVENIUM_DEBUG === "true"
      ? LogLevel.DEBUG
      : LogLevel.INFO;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = createTimestamp();
    const prefix = `[Revenium LiteLLM${
      level === LogLevel.DEBUG
        ? " Debug"
        : level === LogLevel.WARNING
        ? " Warning"
        : level === LogLevel.ERROR
        ? " Error"
        : ""
    }]`;
    const contextStr = formatLogContext(context, false);
    return `${timestamp} ${prefix} ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (shouldLog(LogLevel.DEBUG, this.getLogLevel())) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (shouldLog(LogLevel.INFO, this.getLogLevel())) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (shouldLog(LogLevel.WARNING, this.getLogLevel())) {
      console.warn(this.formatMessage(LogLevel.WARNING, message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (shouldLog(LogLevel.ERROR, this.getLogLevel())) {
      console.error(this.formatMessage(LogLevel.ERROR, message, context));
    }
  }
}

/**
 * Legacy logger adapter for backward compatibility
 */
class LegacyLoggerAdapter implements Logger {
  private typeSafeLogger = new TypeSafeConsoleLogger();

  debug(message: string, ...args: unknown[]): void {
    // Convert legacy args to context - sanitize unknown data
    const context: LogContext =
      args.length > 0
        ? {
            legacyArgs: args.map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            ),
          }
        : {};
    this.typeSafeLogger.debug(message, context);
  }

  info(message: string, ...args: unknown[]): void {
    const context: LogContext =
      args.length > 0
        ? {
            legacyArgs: args.map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            ),
          }
        : {};
    this.typeSafeLogger.info(message, context);
  }

  warn(message: string, ...args: unknown[]): void {
    const context: LogContext =
      args.length > 0
        ? {
            legacyArgs: args.map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            ),
          }
        : {};
    this.typeSafeLogger.warn(message, context);
  }

  error(message: string, ...args: unknown[]): void {
    const context: LogContext =
      args.length > 0
        ? {
            legacyArgs: args.map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            ),
          }
        : {};
    this.typeSafeLogger.error(message, context);
  }
}

/**
 * Default console logger implementation
 */
export const defaultLogger: Logger = new LegacyLoggerAdapter();

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): ReveniumConfig | null {
  const reveniumMeteringApiKey = process.env.REVENIUM_METERING_API_KEY;
  const reveniumMeteringBaseUrl =
    process.env.REVENIUM_METERING_BASE_URL || "https://api.revenium.ai";
  const litellmProxyUrl = process.env.LITELLM_PROXY_URL;
  const litellmApiKey = process.env.LITELLM_API_KEY;
  const organizationId = process.env.REVENIUM_ORGANIZATION_ID;
  const apiTimeout = process.env.REVENIUM_API_TIMEOUT
    ? parseInt(process.env.REVENIUM_API_TIMEOUT, 10)
    : undefined;
  const failSilent = process.env.REVENIUM_FAIL_SILENT !== "false"; // Default to true
  const maxRetries = process.env.REVENIUM_MAX_RETRIES
    ? parseInt(process.env.REVENIUM_MAX_RETRIES, 10)
    : undefined;

  let printSummary: boolean | "human" | "json" | undefined = undefined;
  const printSummaryEnv = process.env.REVENIUM_PRINT_SUMMARY;
  if (printSummaryEnv) {
    if (printSummaryEnv === "true") {
      printSummary = true;
    } else if (printSummaryEnv === "false") {
      printSummary = false;
    } else if (printSummaryEnv === "human" || printSummaryEnv === "json") {
      printSummary = printSummaryEnv;
    }
  }

  const teamId = process.env.REVENIUM_TEAM_ID;
  const capturePrompts =
    process.env.REVENIUM_CAPTURE_PROMPTS?.toLowerCase() === "true";

  if (!reveniumMeteringApiKey || !litellmProxyUrl) return null;
  return {
    reveniumMeteringApiKey,
    reveniumMeteringBaseUrl,
    litellmProxyUrl,
    litellmApiKey,
    organizationId,
    apiTimeout,
    failSilent,
    maxRetries,
    printSummary,
    teamId,
    capturePrompts,
  };
}

/**
 * Validate Revenium configuration with enhanced error reporting
 */
export function validateConfig(config: ReveniumConfig): void {
  const validation = validateReveniumConfig(config);

  if (!validation.isValid) {
    // Log detailed validation errors
    getLogger().error("Configuration validation failed", {
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
    });

    // Create detailed error message
    let errorMessage = "Configuration validation failed:\n";
    validation.errors.forEach((error, index) => {
      errorMessage += `  ${index + 1}. ${error}\n`;
    });

    if (validation.suggestions && validation.suggestions.length > 0) {
      errorMessage += "\nSuggestions:\n";
      validation.suggestions.forEach((suggestion, index) => {
        errorMessage += `  • ${suggestion}\n`;
      });
    }
    throw new Error(errorMessage.trim());
  }

  // Log warnings if any
  if (validation.warnings && validation.warnings.length > 0) {
    getLogger().warn("Configuration warnings", {
      warnings: validation.warnings,
    });
  }
}

/**
 * Configuration manager singleton for proper state management
 */
class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private config: ReveniumConfig | null = null;
  private logger: Logger = defaultLogger;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance)
      ConfigurationManager.instance = new ConfigurationManager();
    return ConfigurationManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    ConfigurationManager.instance = null;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ReveniumConfig | null {
    return this.config;
  }

  /**
   * Set the configuration
   */
  public setConfig(config: ReveniumConfig): void {
    validateConfig(config);
    this.config = config;
    this.logger.debug("Revenium LiteLLM configuration updated", {
      reveniumMeteringBaseUrl: config.reveniumMeteringBaseUrl,
      litellmProxyUrl: config.litellmProxyUrl,
      hasApiKey: !!config.reveniumMeteringApiKey,
      hasProxyKey: !!config.litellmApiKey,
      organizationId: config.organizationId,
      apiTimeout: config.apiTimeout || 5000,
      failSilent: config.failSilent !== false,
      maxRetries: config.maxRetries || 3,
      printSummary: config.printSummary,
      teamId: config.teamId,
    });

    // Configure summary printer
    setSummaryPrinterConfig({
      reveniumApiKey: config.reveniumMeteringApiKey,
      reveniumBaseUrl: config.reveniumMeteringBaseUrl,
      teamId: config.teamId,
      printSummary: config.printSummary,
    });
  }

  /**
   * Get the current logger
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Set a custom logger
   */
  public setLogger(logger: Logger): void {
    this.logger = logger;
    this.logger.debug("Custom logger set for Revenium LiteLLM middleware");
  }

  /**
   * Reset configuration and logger to defaults (for testing)
   */
  public reset(): void {
    this.config = null;
    this.logger = defaultLogger;
  }

  /**
   * Check if configuration is valid and complete
   */
  public isConfigured(): boolean {
    return this.config !== null;
  }
}

/**
 * Get the current global configuration
 */
export function getConfig(): ReveniumConfig | null {
  return ConfigurationManager.getInstance().getConfig();
}

/**
 * Set the global configuration
 */
export function setConfig(config: ReveniumConfig): void {
  ConfigurationManager.getInstance().setConfig(config);
}

/**
 * Get the current logger
 */
export function getLogger(): Logger {
  return ConfigurationManager.getInstance().getLogger();
}

/**
 * Set a custom logger
 */
export function setLogger(logger: Logger): void {
  ConfigurationManager.getInstance().setLogger(logger);
}

/**
 * Reset configuration manager (for testing)
 */
export function resetConfig(): void {
  ConfigurationManager.getInstance().reset();
}

/**
 * Reset the entire configuration manager instance (for testing)
 */
export function resetConfigManager(): void {
  ConfigurationManager.resetInstance();
}

/**
 * Initialize configuration from environment variables
 */
export function initializeConfig(): boolean {
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    try {
      setConfig(envConfig);
      getLogger().debug(
        "Revenium LiteLLM middleware initialized from environment variables"
      );
      return true;
    } catch (error) {
      getLogger().error(
        "Failed to initialize Revenium LiteLLM configuration:",
        error
      );
      return false;
    }
  }

  // Log what's missing for easier debugging
  const missing = [];
  if (!process.env.REVENIUM_METERING_API_KEY)
    missing.push("REVENIUM_METERING_API_KEY");
  if (!process.env.LITELLM_PROXY_URL) missing.push("LITELLM_PROXY_URL");

  if (missing.length > 0) {
    getLogger().warn(
      `Revenium LiteLLM middleware not initialized. Missing environment variables: ${missing.join(
        ", "
      )}`
    );
    getLogger().info("Check env.example for configuration guidance");
  }

  return false;
}
