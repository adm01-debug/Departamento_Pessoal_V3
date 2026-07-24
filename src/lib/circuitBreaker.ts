export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitOptions {
  failureThreshold: number;
  resetTimeout: number;
  /** Nº de sucessos consecutivos em HALF_OPEN antes de fechar o circuito (default: 2) */
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private halfOpenSuccessCount = 0;
  private lastFailureTime?: number;
  private options: Required<CircuitOptions>;

  constructor(options: CircuitOptions = { failureThreshold: 5, resetTimeout: 30000 }) {
    this.options = { successThreshold: 2, ...options };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime || 0) > this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit Breaker is OPEN. Integration temporarily unavailable.');
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

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.halfOpenSuccessCount = 0;
      }
    } else {
      this.state = 'CLOSED';
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.halfOpenSuccessCount = 0;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  /** Snapshot completo do breaker para dashboards operacionais. */
  snapshot() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      halfOpenSuccessCount: this.halfOpenSuccessCount,
      lastFailureTime: this.lastFailureTime ?? null,
      threshold: this.options.failureThreshold,
      successThreshold: this.options.successThreshold,
      resetTimeoutMs: this.options.resetTimeout,
    };
  }

  /** Reset manual — usado pela página de diagnóstico para reabrir o circuito. */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
  }
}

// Singleton instances for specific services
export const bitrixBreaker = new CircuitBreaker();
export const resendBreaker = new CircuitBreaker();
export const genericBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 15000 });
