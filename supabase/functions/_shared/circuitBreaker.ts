/**
 * Circuit breaker para chamadas externas (docs/CODE_REVIEW.md: chamadas a
 * servicos de terceiros devem ser protegidas por circuit breaker).
 *
 * Mesma semantica do breaker do front (`src/lib/circuitBreaker.ts`), adaptada
 * ao runtime das Edge Functions: sem timers, o tempo entra como parametro para
 * o teste controlar a transicao sem esperar. O estado vive no isolate — serve
 * para parar de gastar timeout em serie quando o provedor esta fora, nao para
 * contabilidade durável.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitOptions {
  /** Falhas consecutivas que abrem o circuito (default: 5). */
  failureThreshold?: number;
  /** Tempo aberto antes de permitir uma sonda (default: 30s). */
  resetTimeoutMs?: number;
  /** Sucessos consecutivos em HALF_OPEN para fechar (default: 2). */
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private halfOpenSuccessCount = 0;
  private lastFailureTime?: number;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  /**
   * A chamada pode ser tentada agora? OPEN expirado vira HALF_OPEN e libera
   * exatamente a sonda; um sucesso a fecha, uma falha reabre na hora.
   */
  permite(agora: number = Date.now()): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN' && agora - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      return true;
    }
    return this.state === 'HALF_OPEN';
  }

  registrarSucesso(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.successThreshold) this.fechar();
      return;
    }
    this.fechar();
  }

  registrarFalha(agora: number = Date.now()): void {
    this.halfOpenSuccessCount = 0;
    this.failureCount++;
    this.lastFailureTime = agora;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  estado(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.fechar();
  }

  private fechar(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Push service fora afeta TODAS as inscricoes: sem breaker o dreno paga 8s de
 * timeout por dispositivo. 5 falhas seguidas em 1 minuto abrem o circuito.
 */
export const pushBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  successThreshold: 2,
});