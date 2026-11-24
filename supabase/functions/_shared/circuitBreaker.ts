/**
 * Circuit breaker para chamadas externas (docs/CODE_REVIEW.md: chamadas a
 * servicos de terceiros devem ser protegidas por circuit breaker).
 *
 * Mesma semantica do breaker do front (`src/lib/circuitBreaker.ts`), adaptada
 * ao runtime das Edge Functions: sem timers, o tempo entra como parametro para
 * o teste controlar a transicao sem esperar. O estado vive no isolate — serve
 * para parar de gastar timeout em serie quando o provedor esta fora, nao para
 * contabilidade durável.
 *
 * Cada transicao de estado incrementa a `geracao`. Quem chama guarda a
 * geracao recebida em `permite()` e a devolve ao registrar o resultado: assim
 * um resultado atrasado de uma chamada iniciada antes de o circuito abrir (o
 * envio roda em paralelo) nao fecha um circuito recem-aberto.
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
  private geracao = 0;
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
   * A chamada pode ser tentada agora? Devolve a geracao da permissao (para
   * `registrarSucesso`/`registrarFalha`) ou `null` quando o circuito esta
   * aberto. OPEN expirado vira HALF_OPEN e libera a sonda; um sucesso a fecha,
   * uma falha reabre na hora.
   */
  permite(agora: number = Date.now()): number | null {
    if (this.state === 'CLOSED') return this.geracao;
    if (this.state === 'OPEN' && agora - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
      this.abrirMeio(agora);
      return this.geracao;
    }
    return this.state === 'HALF_OPEN' ? this.geracao : null;
  }

  registrarSucesso(geracao: number): void {
    if (geracao !== this.geracao) return;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.successThreshold) this.fechar();
      return;
    }
    // Ja fechado: zera os contadores SEM trocar a geracao. Trocando, o sucesso
    // de um dispositivo invalidaria as falhas dos envios paralelos ao mesmo
    // provedor que ainda estao em voo — o circuito nunca abriria e a fila
    // seguiria batendo num provedor degradado.
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
  }

  registrarFalha(geracao: number, agora: number = Date.now()): void {
    if (geracao !== this.geracao) return;
    this.failureCount++;
    this.lastFailureTime = agora;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.geracao++;
    }
  }

  estado(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.fechar();
  }

  private abrirMeio(agora: number): void {
    this.state = 'HALF_OPEN';
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = agora;
    this.geracao++;
  }

  private fechar(): void {
    this.state = 'CLOSED';
    this.geracao++;
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Push service fora derruba todas as inscricoes dele: sem breaker o dreno paga
 * o timeout de 8s por dispositivo, em serie.
 *
 * O breaker e POR PROVEDOR: FCM, Mozilla e Apple sao independentes — cinco
 * falhas do FCM nao podem bloquear quem entrega no Mozilla. Sem limite de
 * hosts, o Map cresceria com qualquer endpoint forjado numa assinatura.
 * Ao estourar o teto sai o host usado ha mais tempo (nao o mais novo), para um
 * provedor novo nunca herdar o circuito do vizinho e um provedor que voltou a
 * receber notificacoes recuperar o proprio circuito.
 */
const BREAKERS_POR_HOST = new Map<string, { breaker: CircuitBreaker; ultimoUso: number }>();
const MAX_HOSTS = 20;
const OPCOES_PUSH: CircuitOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  successThreshold: 2,
};
const breakerGeral = new CircuitBreaker(OPCOES_PUSH);

/** Host do endpoint do push service. `null` quando o endpoint e invalido. */
export function hostDoEndpoint(endpoint: string): string | null {
  try {
    return new URL(endpoint).host || null;
  } catch {
    return null;
  }
}

/** Breaker do push service do endpoint; o geral cobre endpoint invalido. */
export function breakerDoPushService(endpoint: string): CircuitBreaker {
  const host = hostDoEndpoint(endpoint);
  if (!host) return breakerGeral;
  const existente = BREAKERS_POR_HOST.get(host);
  if (existente) {
    existente.ultimoUso = Date.now();
    return existente.breaker;
  }
  if (BREAKERS_POR_HOST.size >= MAX_HOSTS) {
    let maisAntigo: string | null = null;
    let piorUso = Infinity;
    for (const [h, entrada] of BREAKERS_POR_HOST) {
      if (entrada.ultimoUso < piorUso) {
        piorUso = entrada.ultimoUso;
        maisAntigo = h;
      }
    }
    if (maisAntigo !== null) BREAKERS_POR_HOST.delete(maisAntigo);
  }
  const novo = new CircuitBreaker(OPCOES_PUSH);
  BREAKERS_POR_HOST.set(host, { breaker: novo, ultimoUso: Date.now() });
  return novo;
}

/** Uso operacional/teste: descarta o estado acumulado por host. */
export function resetarBreakersDePush(): void {
  BREAKERS_POR_HOST.clear();
  breakerGeral.reset();
}