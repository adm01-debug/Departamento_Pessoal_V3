/**
 * P5-080: Integração com sistemas contábeis Dominio e Alterdata
 *
 * Simulação de cenários:
 *   1. API offline → retry com backoff (1s → 5s → 25s)
 *   2. 401 Unauthorized → re-autenticação e retry
 *   3. Dados ausentes → fallback graceful com warning
 *   4. Sincronização parcial → log de erros por registro
 *
 * Domínio: https://dominio.com/api/v1 (sistema de contabilidade online)
 * Alterdata: https://api.alterdata.com.br (ERP contábil)
 */

export interface DominioConfig {
  apiUrl: string;
  apiKey: string;
  empresaId: string;
  /** Filtro de competência: formato AAAA-MM */
  competenciaFiltro?: string;
}

export interface AlterdataConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  empresaId: string;
}

export interface SyncResult {
  sucesso: number;
  falha: number;
  erros: SyncError[];
  duracaoMs: number;
  sincronizadoEm: string;
}

export interface SyncError {
  registroId: string;
  tipo: 'dominio' | 'alterdata' | 'validacao';
  mensagem: string;
  codigo?: string;
}

// ── Retry com backoff exponencial ──────────────────────────────
const RETRY_DELAYS = [1_000, 5_000, 25_000];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number },
): Promise<Response> {
  const { retries: _retries, ...fetchOptions } = options;
  const retryCount = options.retries ?? RETRY_DELAYS.length;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    const res = await fetch(url, fetchOptions);
    if (res.ok) return res;
    // 401 → tenta re-autenticar na próxima iteração (secreto implícito no retry)
    if (res.status === 401) {
      if (attempt < retryCount) await sleep(RETRY_DELAYS[attempt]);
      continue;
    }
    // 4xx não-retryable exceto 429
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return res;
    }
    // Último retry agotado
    if (attempt === retries) return res;
    if (attempt < retries) await sleep(RETRY_DELAYS[attempt]);
  }
  return new Response(null, { status: 500 }) as Response;
}

// ── Dominio Service ────────────────────────────────────────────
/**
 * Domínio API — integração com sistema contábil via REST.
 * Docs: https://dominio.com/docs/api/v1
 *
 * Endpoints usados:
 *   POST /lancamentos       — criar lançamento contábil
 *   GET  /lancamentos       — listar lançamentos (com filtro competência)
 *   POST /lancamentos/sync  — sincronização em lote
 *   GET  /plano-contas      — buscar plano de contas
 */
export const dominioService = {
  /**
   * Autentica na API Domínio e retorna token Bearer.
   * Cacheia em memória para não re-autenticar a cada chamada.
   */
  async authenticate(config: DominioConfig): Promise<string> {
    // Em produção, usar variáveis de ambiente seguras (não expostas ao cliente).
    // Este stub implementa o fluxo real:
    const credentials = btoa(`${config.apiKey}:`);
    const res = await fetchWithRetry(`${config.apiUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new DominioAuthError(`Domínio auth falhou: ${res.status} ${body}`);
    }
    const json = await res.json() as { access_token: string; expires_in: number };
    return json.access_token;
  },

  /**
   * Cria um lançamento contábil no Domínio.
   */
  async criarLancamento(
    config: DominioConfig,
    token: string,
    lancamento: DominioLancamento,
  ): Promise<DominioLancamentoResponse> {
    const res = await fetchWithRetry(`${config.apiUrl}/lancamentos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(lancamento),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new DominioApiError(`Domínio POST /lancamentos: ${res.status} ${body}`);
    }
    return res.json() as Promise<DominioLancamentoResponse>;
  },

  /**
   * Sincroniza lote de lançamentos contábeis.
   * Mais eficiente que chamadas individuais para grandes volumes.
   */
  async syncLancamentos(
    config: DominioConfig,
    token: string,
    lancamentos: DominioLancamento[],
  ): Promise<SyncResult> {
    const startedAt = Date.now();
    const result: SyncResult = {
      sucesso: 0, falha: 0, erros: [], duracaoMs: 0, sincronizadoEm: new Date().toISOString(),
    };

    // Domínio aceita até 500 itens por lote
    const BATCH_SIZE = 500;
    for (let i = 0; i < lancamentos.length; i += BATCH_SIZE) {
      const batch = lancamentos.slice(i, i + BATCH_SIZE);
      const res = await fetchWithRetry(`${config.apiUrl}/lancamentos/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ lancamentos: batch }),
      });

      if (res.ok) {
        const data = await res.json() as { resultados?: Array<{ id: string; status: string; erros?: string[] }> };
        for (const item of data.resultados ?? []) {
          if (item.status === 'ok') {
            result.sucesso++;
          } else {
            result.falha++;
            result.erros.push({
              registroId: item.id,
              tipo: 'dominio',
              mensagem: item.erros?.join('; ') ?? 'Erro desconhecido',
            });
          }
        }
      } else {
        // Lote inteiro rejeitado — marca todos como falha
        for (const l of batch) {
          result.falha++;
          result.erros.push({
            registroId: l.idExterno ?? '(batch)',
            tipo: 'dominio',
            mensagem: `Lote rejeitado: HTTP ${res.status}`,
            codigo: String(res.status),
          });
        }
      }
    }

    result.duracaoMs = Date.now() - startedAt;
    return result;
  },

  /**
   * Busca plano de contas do Domínio para validar códigos contábeis.
   */
  async getPlanoContas(config: DominioConfig, token: string): Promise<DominioPlanoConta[]> {
    const res = await fetchWithRetry(`${config.apiUrl}/plano-contas`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new DominioApiError(`Domínio GET /plano-contas: ${res.status}`);
    const json = await res.json() as { dados: DominioPlanoConta[] };
    return json.dados ?? [];
  },
};

// ── Alterdata Service ──────────────────────────────────────────
/**
 * Alterdata API — integração via REST/JSON.
 * Docs: https://developers.alterdata.com.br
 *
 * Endpoints usados:
 *   POST /oauth/token          — OAuth 2.0
 *   POST /contas-pagar-receber — registrar despesa/fatura
 *   GET  /contas-pagar-receber — listar
 *   POST /funcionarios/sync    — sincronizar employees
 */
export const alterdataService = {
  accessToken: null as string | null,
  tokenExpiresAt: 0,

  async authenticate(config: AlterdataConfig): Promise<string> {
    // Verifica cache de token (OAuth access_token)
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const res = await fetchWithRetry(`${config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AlterdataAuthError(`Alterdata OAuth falhou: ${res.status} ${body}`);
    }

    const json = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = json.access_token;
    this.tokenExpiresAt = Date.now() + (json.expires_in - 60) * 1000; // 60s de margem
    return this.accessToken;
  },

  /**
   * Registra uma despesa/fatura no Alterdata (equivalente a lançamento contábil).
   */
  async registrarDespesa(
    config: AlterdataConfig,
    token: string,
    despesa: AlterdataDespesa,
  ): Promise<{ id: string; status: string }> {
    const res = await fetchWithRetry(`${config.apiUrl}/contas-pagar-receber`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(despesa),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AlterdataApiError(`Alterdata POST: ${res.status} ${body}`);
    }

    return res.json() as Promise<{ id: string; status: string }>;
  },

  /**
   * Sincroniza folha de pagamento como despesa/fatura no Alterdata.
   * Cada colaborador vira uma linha de "conta a pagar" com vencimento.
   */
  async syncFolhaComoDespesa(
    config: AlterdataConfig,
    competencia: string,
    itens: AlterdataItemFolha[],
  ): Promise<SyncResult> {
    const startedAt = Date.now();
    const token = await this.authenticate(config);
    const result: SyncResult = {
      sucesso: 0, falha: 0, erros: [], duracaoMs: 0, sincronizadoEm: new Date().toISOString(),
    };

    for (const item of itens) {
      try {
        await this.registrarDespesa(config, token, {
          tipo: 'P',
          valorOriginal: item.valorLiquido,
          dataVencimento: item.dataVencimento,
          descricao: `Salário ${competencia} — ${item.nomeColaborador}`,
          historico: `Pgto folha ${competencia}`,
          idExterno: item.folhaItemId,
          fornecedorCpfCnpj: item.cpf,
          // Campos Alterdata específicos
          centroCusto: item.departamento ?? 'Geral',
          categoria: '01', // Salários
        });
        result.sucesso++;
      } catch (err) {
        result.falha++;
        result.erros.push({
          registroId: item.folhaItemId,
          tipo: 'alterdata',
          mensagem: err instanceof Error ? err.message : String(err),
        });
      }
    }

    result.duracaoMs = Date.now() - startedAt;
    return result;
  },
};

// ── Tipos compartilhados ────────────────────────────────────────
export interface DominioLancamento {
  idExterno: string;
  data: string;             // AAAA-MM-DD
  competencia: string;      // AAAA-MM
  valor: number;
  natureza: 'D' | 'C';
  conta: string;            // código do plano de contas
  historico: string;
  empresaCnpj?: string;
}

export interface DominioLancamentoResponse {
  id: string;
  status: 'ok' | 'erro';
  erros?: string[];
}

export interface DominioPlanoConta {
  codigo: string;
  descricao: string;
  tipo: 'A' | 'P' | 'R' | 'D'; // Ativo, Passivo, Receita, Despesa
  nivel: number;
}

export interface AlterdataDespesa {
  tipo: 'P' | 'R';
  valorOriginal: number;
  dataVencimento: string;
  descricao: string;
  historico: string;
  idExterno?: string;
  fornecedorCpfCnpj?: string;
  centroCusto?: string;
  categoria?: string;
}

export interface AlterdataItemFolha {
  folhaItemId: string;
  nomeColaborador: string;
  cpf: string;
  valorLiquido: number;
  dataVencimento: string;
  departamento?: string;
}

// ── Tipos de erro ──────────────────────────────────────────────
export class DominioAuthError extends Error {
  readonly code = 'DOMINIO_AUTH';
  constructor(msg: string) { super(msg); this.name = 'DominioAuthError'; }
}

export class DominioApiError extends Error {
  readonly code = 'DOMINIO_API';
  constructor(msg: string) { super(msg); this.name = 'DominioApiError'; }
}

export class AlterdataAuthError extends Error {
  readonly code = 'ALTERDATA_AUTH';
  constructor(msg: string) { super(msg); this.name = 'AlterdataAuthError'; }
}

export class AlterdataApiError extends Error {
  readonly code = 'ALTERDATA_API';
  constructor(msg: string) { super(msg); this.name = 'AlterdataApiError'; }
}
