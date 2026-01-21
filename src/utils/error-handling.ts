/**
 * Error handling utilities for consistent error management
 * 
 * This module provides centralized error handling and custom error types
 * for better error reporting and debugging.
 */

/**
 * Base error class for Revenium middleware errors
 */
export class ReveniumError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ReveniumError';
    this.code = code;
    this.context = context;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) Error.captureStackTrace(this, ReveniumError);
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends ReveniumError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

/**
 * HTTP client patching errors
 */
export class PatchingError extends ReveniumError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PATCHING_ERROR', context);
    this.name = 'PatchingError';
  }
}

/**
 * Request processing errors
 */
export class RequestProcessingError extends ReveniumError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REQUEST_PROCESSING_ERROR', context);
    this.name = 'RequestProcessingError';
  }
}

/**
 * Revenium API communication errors
 */
export class ReveniumApiError extends ReveniumError {
  public readonly statusCode?: number;
  public readonly responseBody?: string;
  
  constructor(
    message: string, 
    statusCode?: number, 
    responseBody?: string, 
    context?: Record<string, unknown>
  ) {
    super(message, 'REVENIUM_API_ERROR', context);
    this.name = 'ReveniumApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ReveniumError {
  public readonly validationErrors: string[];
  
  constructor(message: string, validationErrors: string[], context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Stream processing errors
 */
export class StreamProcessingError extends ReveniumError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STREAM_PROCESSING_ERROR', context);
    this.name = 'StreamProcessingError';
  }
}

/**
 * Error context builder for consistent error reporting
 */
export class ErrorContext {
  private context: Record<string, unknown> = {};
  
  /**
   * Add request ID to error context
   */
  withRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }
  
  /**
   * Add model information to error context
   */
  withModel(model: string): this {
    this.context.model = model;
    return this;
  }
  
  /**
   * Add URL to error context
   */
  withUrl(url: string): this {
    this.context.url = url;
    return this;
  }
  
  /**
   * Add HTTP status to error context
   */
  withStatus(status: number): this {
    this.context.status = status;
    return this;
  }
  
  /**
   * Add duration to error context
   */
  withDuration(duration: number): this {
    this.context.duration = duration;
    return this;
  }
  
  /**
   * Add custom field to error context
   */
  with(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }
  
  /**
   * Build the context object
   */
  build(): Record<string, unknown> {
    return { ...this.context };
  }
}

/**
 * Safe error message extraction
 * @param error - Error to extract message from
 * @returns Safe error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return 'Unknown error occurred';
}

/**
 * Safe error stack extraction
 * @param error - Error to extract stack from
 * @returns Error stack or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack;
  return;
}

/**
 * Create error context builder
 * @returns New error context builder
 */
export function createErrorContext(): ErrorContext {
  return new ErrorContext();
}

/**
 * Handle and log errors consistently
 * @param error - Error to handle
 * @param logger - Logger instance
 * @param context - Additional context
 */
export function handleError(
  error: unknown,
  logger: { error: (message: string, ...args: unknown[]) => void },
  context?: Record<string, unknown>
): void {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  const logContext: Record<string, unknown> = {
    ...context,
    error: message,
    stack: stack
  };

  if (error instanceof ReveniumError) {
    logContext.errorCode = error.code;
    logContext.errorContext = error.context;

    if (error instanceof ReveniumApiError) {
      logContext.statusCode = error.statusCode;
      logContext.responseBody = error.responseBody;
    }

    if (error instanceof ValidationError) {
      logContext.validationErrors = error.validationErrors;
    }
  }
  logger.error('Error occurred', logContext);
}

/**
 * Wrap async function with error handling
 * @param fn - Function to wrap
 * @param errorHandler - Error handler function
 * @returns Wrapped function
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler: (error: unknown, ...args: T) => void
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error, ...args);
      return undefined;
    }
  };
}

/**
 * Error handling strategy configuration
 */
export interface ErrorHandlingStrategy {
  /** Whether to fail silently or throw errors */
  failSilent: boolean;
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay for retries in milliseconds */
  baseDelay: number;
  /** Whether to log errors */
  logErrors: boolean;
}

/**
 * Default error handling strategy
 */
export const DEFAULT_ERROR_STRATEGY: ErrorHandlingStrategy = {
  failSilent: true,
  maxRetries: 3,
  baseDelay: 1000,
  logErrors: true
};

/**
 * Result of an operation that may fail
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryCount?: number;
}

/**
 * Execute operation with consistent error handling
 * @param fn - Function to execute
 * @param strategy - Error handling strategy
 * @param logger - Logger instance
 * @param context - Additional context for logging
 * @returns Operation result
 */
export async function executeWithErrorHandling<T>(
  fn: () => Promise<T>,
  strategy: ErrorHandlingStrategy = DEFAULT_ERROR_STRATEGY,
  logger?: { error: (message: string, context?: Record<string, unknown>) => void },
  context?: Record<string, unknown>
): Promise<OperationResult<T>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (strategy.logErrors && logger) {
        logger.error(`Operation failed (attempt ${attempt + 1}/${strategy.maxRetries + 1})`, {
          ...context,
          error: lastError.message,
          stack: lastError.stack,
          attempt: attempt + 1
        });
      }

      if (attempt === strategy.maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(strategy.baseDelay * Math.pow(2, attempt), 5000);
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  const result: OperationResult<T> = {
    success: false,
    error: lastError,
    retryCount: strategy.maxRetries + 1
  };

  if (!strategy.failSilent && lastError)throw lastError;
  return result;
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise that resolves with function result or rejects with last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  const strategy: ErrorHandlingStrategy = {
    failSilent: false,
    maxRetries,
    baseDelay,
    logErrors: false
  };

  const result = await executeWithErrorHandling(fn, strategy);
  if (result.success && result.data) return result.data;
  throw result.error || new Error('Operation failed');
}
