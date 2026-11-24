/**
 * ============================================================================
 * MOCK DE DEMONSTRAÇÃO — ÁREAS OPERACIONAIS.
 *
 * Envolve o `fetch` do cliente Supabase e responde, EM MEMÓRIA, às leituras
 * das tabelas cobertas pelo dataset (`dados.ts`). Vale apenas:
 *   1. em desenvolvimento (`import.meta.env.DEV`);
 *   2. fora do Vitest (`MODE !== 'test'`);
 *   3. com `VITE_GESTAO_MOCK=true` no `.env`;
 *   4. e nas rotas listadas em `ROTAS_GESTAO_MOCK` (gate.ts).
 *
 * Fora dessas quatro condições devolve exatamente o `fetch` original — nada
 * muda para produção, testes, telas administrativas ou áreas que já têm mock
 * próprio (Desempenho, Colaboradores, Admissões, Tempo & Ausências…).
 *
 * Escritas em tabelas do dataset viram erro 403 local + toast discreto
 * "Modo demonstração": nenhum INSERT/UPDATE/DELETE sai do navegador.
 * ============================================================================
 */
import { toast } from 'sonner';
import { executarConsulta, type Tabelas } from '../layoutMock/postgrest';
import { RPC_LEITURA } from '../layoutMock/dados';
import { construirTabelasGestao } from './dados';
import { isGestaoMockEnabled, rotaNoEscopoDoGestaoMock } from './gate';

export { isGestaoMockEnabled, rotaNoEscopoDoGestaoMock } from './gate';

// ---------------------------------------------------------------------------

let tabelas: Tabelas | null = null;
/** Dataset construído sob demanda (primeira leitura) e reaproveitado. */
function obterTabelas(): Tabelas {
  tabelas ??= construirTabelasGestao();
  return tabelas;
}

/** RPCs de sessão/permissão — precisam ser as reais (RouteGuard/RBAC). */
const RPC_PASSAGEM = new Set(['get_user_roles', 'pode_aprovar_colaborador', 'pode_gerir_avaliacoes', 'has_role']);
/** Edge Functions de health-check do cabeçalho: respondem sem aviso. */
const FUNCOES_SONDA = new Set(['external-db-bridge', 'healthcheck', 'metricas']);
/** RPCs de auditoria/telemetria em segundo plano: descartadas em silêncio. */
const RPC_SILENCIOSAS = new Set(['registrar_auditoria', 'log_frontend_error', 'registrar_telemetria']);

const MENSAGEM_BLOQUEIO = 'Modo demonstração: gravação desabilitada.';

function json(corpo: unknown, status = 200, extras: Record<string, string> = {}): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...extras },
  });
}

function avisarBloqueio(): void {
  // Muitos fluxos já exibem o próprio toast de erro com a mensagem do bloqueio;
  // só avisa se, passado um instante, nenhum toast apareceu.
  window.setTimeout(() => {
    if (document.querySelector('[data-sonner-toast]')) return;
    toast.info('Modo demonstração', { id: 'gestao-mock-bloqueio', description: 'Esta ação não grava dados.' });
  }, 400);
}

function bloquear(silencioso: boolean, descricao: string): Response {
  console.debug(`[gestao-mock] bloqueado${silencioso ? ' (silencioso)' : ''}: ${descricao}`);
  if (silencioso) return new Response(null, { status: 204 });
  avisarBloqueio();
  return json({ code: '42501', message: MENSAGEM_BLOQUEIO, details: null, hint: null }, 403);
}

function lerCorpoJson(init?: RequestInit): Record<string, unknown> {
  try {
    return typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function lerRequisicao(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    window.location.origin
  );
  const metodo = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const cabecalhos = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  return { url, metodo, cabecalhos };
}

/**
 * Envolve o `fetch` do cliente Supabase. Fora do escopo (flag desligada, rota
 * diferente, URL que não é REST/Functions) devolve exatamente o original.
 */
export async function gestaoMockFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fetchOriginal: typeof fetch
): Promise<Response> {
  if (!isGestaoMockEnabled() || !rotaNoEscopoDoGestaoMock()) return fetchOriginal(input, init);

  const { url, metodo, cabecalhos } = lerRequisicao(input, init);
  const dados = obterTabelas();

  // --- Edge Functions -------------------------------------------------------
  if (url.pathname.includes('/functions/v1/')) {
    const funcao = url.pathname.split('/functions/v1/')[1]?.split('/')[0] ?? '';
    if (FUNCOES_SONDA.has(funcao)) return json({ ok: true, data: [], error: null });
    console.debug(`[gestao-mock] bloqueado: Edge Function ${funcao}`);
    avisarBloqueio();
    return json({ error: MENSAGEM_BLOQUEIO }, 503);
  }

  if (!url.pathname.includes('/rest/v1/')) return fetchOriginal(input, init);

  const recurso = url.pathname.split('/rest/v1/')[1]?.replace(/\/$/, '') ?? '';

  // --- RPC ------------------------------------------------------------------
  if (recurso.startsWith('rpc/')) {
    const nomeRpc = recurso.slice(4);
    if (RPC_PASSAGEM.has(nomeRpc)) return fetchOriginal(input, init);
    if (RPC_SILENCIOSAS.has(nomeRpc)) return json(null);
    const leitura = RPC_LEITURA[nomeRpc];
    if (leitura) return json(leitura(dados, lerCorpoJson(init)));
    return bloquear(false, `RPC ${nomeRpc}`);
  }

  const tabela = recurso;
  const noDataset = tabela in dados;

  // --- Escrita em tabela do dataset: bloqueada ------------------------------
  if (metodo !== 'GET' && metodo !== 'HEAD') {
    if (!noDataset) return fetchOriginal(input, init);
    return bloquear(false, `${metodo} ${tabela}`);
  }

  // --- Leitura de tabela fora do dataset: caminho original ------------------
  if (!noDataset) {
    console.debug(`[gestao-mock] leitura sem mock (segue para o Supabase): ${tabela}`);
    return fetchOriginal(input, init);
  }

  // --- Leitura de tabela do dataset: emulada --------------------------------
  const { linhas, total } = executarConsulta(tabela, url.searchParams, dados);
  const offset = Number(url.searchParams.get('offset') ?? 0) || 0;
  const intervalo = linhas.length ? `${offset}-${offset + linhas.length - 1}` : '*';
  const extras: Record<string, string> = { 'Content-Range': `${intervalo}/${total}` };

  if (metodo === 'HEAD') return new Response(null, { status: 200, headers: extras });

  if (cabecalhos.get('Accept')?.includes('vnd.pgrst.object')) {
    if (linhas.length === 1) return json(linhas[0], 200, extras);
    return json(
      {
        code: 'PGRST116',
        details: `The result contains ${linhas.length} rows`,
        hint: null,
        message: 'JSON object requested, multiple (or no) rows returned',
      },
      406,
      extras
    );
  }

  return json(linhas, 200, extras);
}
