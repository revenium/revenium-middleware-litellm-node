/**
 * Circuit breaker pattern implementation for handling repeated failures
 * 
 * This module provides a circuit breaker to prevent cascading failures
 * when the Revenium API is experiencing issues.
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery */
  recoveryTimeout: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;
  /** Time window in ms for counting failures */
  timeWindow: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 3,
  timeWindow: 60000 // 1 minute
};

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private failures: number[] = []; // Timestamps of failures
  
  constructor(private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG) {}
  
  /**
   * Execute a function with circuit breaker protection
   * @param fn - Function to execute
   * @returns Promise that resolves with function result or rejects if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - failing fast');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Check if circuit breaker allows execution
   * @returns True if execution is allowed
   */
  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) return true;
    if (this.state === CircuitState.OPEN && this.shouldAttemptRecovery()) return true;
    return false;
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    recentFailures: number;
    timeUntilRecovery?: number;
  } {
    const now = Date.now();
    const recentFailures = this.failures.filter(
      timestamp => now - timestamp < this.config.timeWindow
    ).length;
    
    let timeUntilRecovery: number | undefined;
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = now - this.lastFailureTime;
      timeUntilRecovery = Math.max(0, this.config.recoveryTimeout - timeSinceLastFailure);
    }
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailures,
      timeUntilRecovery
    };
  }
  
  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.failures = [];
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.failures = [];
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
      this.cleanupOldFailures();
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.failures.push(now);
    
    this.cleanupOldFailures();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Go back to open state on any failure in half-open
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      const recentFailures = this.failures.filter(
        timestamp => now - timestamp < this.config.timeWindow
      ).length;
      
      if (recentFailures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }
  }
  
  /**
   * Check if we should attempt recovery from open state
   */
  private shouldAttemptRecovery(): boolean {
    const now = Date.now();
    return now - this.lastFailureTime >= this.config.recoveryTimeout;
  }
  
  /**
   * Remove old failure timestamps outside the time window
   */
  private cleanupOldFailures(): void {
    const now = Date.now();
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.config.timeWindow
    );
  }
}

/**
 * Global circuit breaker instance for Revenium API calls
 */
let globalCircuitBreaker: CircuitBreaker | null = null;

/**
 * Get or create the global circuit breaker instance
 * @param config - Optional configuration for the circuit breaker
 * @returns Global circuit breaker instance
 */
export function getCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!globalCircuitBreaker) {
    const finalConfig = config ? { ...DEFAULT_CIRCUIT_CONFIG, ...config } : DEFAULT_CIRCUIT_CONFIG;
    globalCircuitBreaker = new CircuitBreaker(finalConfig);
  }
  return globalCircuitBreaker;
}

/**
 * Reset the global circuit breaker
 */
export function resetCircuitBreaker(): void {
  if (globalCircuitBreaker) globalCircuitBreaker.reset();
}

/**
 * Check if the global circuit breaker allows execution
 * @returns True if execution is allowed
 */
export function canExecuteRequest(): boolean {
  return getCircuitBreaker().canExecute();
}

/**
 * Execute a function with global circuit breaker protection
 * @param fn - Function to execute
 * @returns Promise that resolves with function result
 */
export async function executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return getCircuitBreaker().execute(fn);
}

/**
 * Get global circuit breaker statistics
 */
export function getCircuitBreakerStats(): ReturnType<CircuitBreaker['getStats']> {
  return getCircuitBreaker().getStats();
}
