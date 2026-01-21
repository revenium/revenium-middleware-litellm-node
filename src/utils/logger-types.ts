/**
 * Enhanced logger types and utilities
 * 
 * This module provides type-safe logging interfaces and utilities
 * to replace 'any' usage in logger implementations.
 */

/**
 * Supported log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARNING]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Serializable log data types
 */
export type LogData = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | LogData[]
  | { [key: string]: LogData };

/**
 * Log context object with known structure
 */
export interface LogContext {
  /** Request identifier */
  requestId?: string;
  /** Model being used */
  model?: string;
  /** URL being accessed */
  url?: string;
  /** HTTP status code */
  status?: number;
  /** Request duration in milliseconds */
  duration?: number;
  /** Error message */
  error?: string;
  /** Error stack trace */
  stack?: string;
  /** Token counts */
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Provider information */
  provider?: string;
  /** Additional structured data */
  [key: string]: LogData;
}

/**
 * Enhanced logger interface with type safety
 */
export interface TypeSafeLogger {
  /**
   * Log debug message
   * @param message - Log message
   * @param context - Optional structured context
   */
  debug(message: string, context?: LogContext): void;
  
  /**
   * Log info message
   * @param message - Log message
   * @param context - Optional structured context
   */
  info(message: string, context?: LogContext): void;
  
  /**
   * Log warning message
   * @param message - Log message
   * @param context - Optional structured context
   */
  warn(message: string, context?: LogContext): void;
  
  /**
   * Log error message
   * @param message - Log message
   * @param context - Optional structured context
   */
  error(message: string, context?: LogContext): void;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to format output as JSON */
  jsonFormat: boolean;
  /** Custom prefix for log messages */
  prefix: string;
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  includeTimestamp: true,
  jsonFormat: false,
  prefix: '[Revenium LiteLLM]'
};

/**
 * Check if a log level should be output based on configuration
 * @param level - Log level to check
 * @param configLevel - Configured minimum log level
 * @returns True if the level should be logged
 */
export function shouldLog(level: LogLevel, configLevel: LogLevel): boolean {
  return LOG_LEVEL_HIERARCHY[level] >= LOG_LEVEL_HIERARCHY[configLevel];
}

/**
 * Format log context for output
 * @param context - Log context to format
 * @param jsonFormat - Whether to format as JSON
 * @returns Formatted context string
 */
export function formatLogContext(context: LogContext | undefined, jsonFormat: boolean): string {
  if (!context || Object.keys(context).length === 0) return '';
  
  if (jsonFormat) {
    try {
      return JSON.stringify(context);
    } catch {
      return '[Invalid JSON context]';
    }
  }
  
  // Format as key-value pairs
  const pairs = Object.entries(context)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        try {
          return `${key}=${JSON.stringify(value)}`;
        } catch {
          return `${key}=[object]`;
        }
      }
      return `${key}=${value}`;
    });
  
  return pairs.length > 0 ? ` ${pairs.join(' ')}` : '';
}

/**
 * Create a timestamp string
 * @returns ISO timestamp string
 */
export function createTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Sanitize log data to ensure it's serializable
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeLogData(data: unknown): LogData {
  if (Array.isArray(data)) return data.map(sanitizeLogData);
  if (data === null)return data;
  if (typeof data === 'object') {
    const sanitized: { [key: string]: LogData } = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') continue;
      
      // Handle circular references and complex objects
      try {
        sanitized[key] = sanitizeLogData(value);
      } catch {
        sanitized[key] = '[Circular or Complex Object]';
      }
    }
    return sanitized;
  }

  // Fallback for other types
  return String(data);
}

/**
 * Create a type-safe logger context builder
 */
export class LogContextBuilder {
  private context: LogContext = {};
  
  /**
   * Add request ID to context
   */
  withRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }
  
  /**
   * Add model to context
   */
  withModel(model: string): this {
    this.context.model = model;
    return this;
  }
  
  /**
   * Add URL to context
   */
  withUrl(url: string): this {
    this.context.url = url;
    return this;
  }
  
  /**
   * Add HTTP status to context
   */
  withStatus(status: number): this {
    this.context.status = status;
    return this;
  }
  
  /**
   * Add duration to context
   */
  withDuration(duration: number): this {
    this.context.duration = duration;
    return this;
  }
  
  /**
   * Add error information to context
   */
  withError(error: string, stack?: string): this {
    this.context.error = error;
    if (stack) this.context.stack = stack;
    return this;
  }
  
  /**
   * Add token counts to context
   */
  withTokens(prompt: number, completion: number, total: number): this {
    this.context.promptTokens = prompt;
    this.context.completionTokens = completion;
    this.context.totalTokens = total;
    return this;
  }
  
  /**
   * Add provider to context
   */
  withProvider(provider: string): this {
    this.context.provider = provider;
    return this;
  }
  
  /**
   * Add custom field to context
   */
  with(key: string, value: LogData): this {
    this.context[key] = value;
    return this;
  }
  
  /**
   * Build the context object
   */
  build(): LogContext {
    return { ...this.context };
  }
}

/**
 * Create a new log context builder
 * @returns New log context builder instance
 */
export function createLogContext(): LogContextBuilder {
  return new LogContextBuilder();
}
