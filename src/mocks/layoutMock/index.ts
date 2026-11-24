/**
 * ============================================================================
 * MOCK VISUAL (layout) — Tempo & Ausências.
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT das telas
 *   Ponto · Horas Extras · Banco de Horas · Turnos & Escalas · Férias ·
 *   Afastamentos · Feriados · Controle de Acesso.
 * Não altera componente, regra de negócio, fórmula, autenticação, RLS nem
 * migrations: as telas continuam fazendo as MESMAS consultas de sempre — só
 * que, com o mock ligado, as leituras dessas rotas são respondidas aqui, em
 * memória, antes de sair do navegador.
 *
 * COMO LIGA (as DUAS condições — logo, nunca em produção nem em teste):
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_LAYOUT_MOCK=true` no `.env.local`.
 * A guarda `MODE !== 'test'` evita que o Vitest (que lê o mesmo `.env.local`)
 * receba dados fictícios no lugar das fixtures de cada teste.
 *
 * PARA DESATIVAR: `VITE_LAYOUT_MOCK=false` (ou apague a linha) no `.env.local`
 * e reinicie o `vite dev` — o sistema volta ao comportamento original.
 * PARA REMOVER DE VEZ: apague a pasta `src/mocks/layoutMock/` e os trechos
 * marcados "MOCK VISUAL (layout)" em `src/integrations/supabase/client.ts` e
 * `src/hooks/useEmpresas.ts`.
 *
 * NADA É GRAVADO NO SUPABASE:
 *   - leitura  → respondida pelo emulador (`postgrest.ts` + `dados.ts`) quando
 *                a tabela existe no dataset; as demais (sessão, permissões,
 *                vínculo de empresa…) seguem o caminho original;
 *   - escrita  → (INSERT/UPDATE/DELETE/RPC/Edge Function) NUNCA sai do
 *                navegador nas rotas abaixo; vira um erro 403 local + toast
 *                discreto "Modo demonstração".
 * O bloqueio vale por rota (`ROTAS_LAYOUT_MOCK`): fora dessas oito áreas o
 * cliente Supabase é usado exatamente como antes.
 * ============================================================================
 */
import { toast } from 'sonner';
import { executarConsulta, type Tabelas } from './postgrest';
import { construirTabelas, RPC_LEITURA } from './dados';
import { isLayoutMockEnabled } from './gate';

export { isLayoutMockEnabled };

/** Rotas (e sub-rotas) cobertas pelo mock. `/ponto/kiosk` fica de fora: é outra tela. */
export const ROTAS_LAYOUT_MOCK = [
  '/ponto',
  '/horas-extras',
  '/banco-horas',
  '/turnos',
  '/escalas',
  '/ferias',
  '/afastamentos',
  '/feriados',
  '/controle-acesso',
] as const;

const ROTAS_EXCLUIDAS = ['/ponto/kiosk'];

export function rotaNoEscopoDoMock(pathname: string = window.location.pathname): boolean {
  if (ROTAS_EXCLUIDAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return false;
  return ROTAS_LAYOUT_MOCK.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

// ---------------------------------------------------------------------------

let tabelas: Tabelas | null = null;
function obterTabelas(): Tabelas {
  tabelas ??= construirTabelas();
  return tabelas;
}

/** RPCs somente-leitura de sessão/permissão — seguem para o Supabase real. */
const RPC_PASSAGEM = new Set(['get_user_roles']);
/** Edge Functions usadas só como health-check pelo cabeçalho. */
const FUNCOES_SONDA = new Set(['external-db-bridge', 'healthcheck', 'metricas']);
/** RPCs de auditoria/telemetria — descartadas sem aviso. */
const RPC_SILENCIOSAS = new Set(['registrar_auditoria']);

const MENSAGEM_BLOQUEIO = 'Modo demonstração: gravação desabilitada.';

function json(corpo: unknown, status = 200, extras: Record<string, string> = {}): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...extras },
  });
}

function avisarBloqueio(): void {
  // Muitos fluxos já exibem o próprio toast de erro (com a mensagem do bloqueio). Só avisa se,
  // passado um instante, nenhum toast apareceu — evita dois avisos para a mesma ação.
  // `id` fixo: cliques repetidos atualizam o mesmo toast em vez de empilhar.
  window.setTimeout(() => {
    if (document.querySelector('[data-sonner-toast]')) return;
    toast.info('Modo demonstração', { id: 'layout-mock-bloqueio', description: 'Esta ação não grava dados.' });
  }, 400);
}

function bloquear(silencioso: boolean, descricao: string): Response {
  console.debug(`[layout-mock] bloqueado${silencioso ? ' (silencioso)' : ''}: ${descricao}`);
  if (silencioso) return new Response(null, { status: 204 });
  avisarBloqueio();
  return json({ code: '42501', message: MENSAGEM_BLOQUEIO, details: null, hint: null }, 403);
}

/** Corpo JSON da chamada RPC (`supabase.rpc` envia os argumentos como string JSON). */
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
    window.location.origin,
  );
  const metodo = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const cabecalhos = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  return { url, metodo, cabecalhos };
}

/**
 * Envolve o `fetch` do cliente Supabase. Fora do escopo do mock (flag
 * desligada, rota diferente, URL que não é REST/Functions) devolve
 * exatamente o `fetch` original.
 */
export async function layoutMockFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fetchOriginal: typeof fetch,
): Promise<Response> {
  if (!isLayoutMockEnabled() || !rotaNoEscopoDoMock()) return fetchOriginal(input, init);

  const { url, metodo, cabecalhos } = lerRequisicao(input, init);
  const dados = obterTabelas();

  // --- Edge Functions: nunca saem do navegador nas oito áreas -------------
  if (url.pathname.includes('/functions/v1/')) {
    const funcao = url.pathname.split('/functions/v1/')[1];
    // Sondas de saúde do cabeçalho ("DB Conectado"): não são ação do usuário — respondem sem aviso.
    if (FUNCOES_SONDA.has(funcao)) return json({ ok: true, data: [], error: null });
    console.debug(`[layout-mock] bloqueado: Edge Function ${funcao}`);
    avisarBloqueio();
    return json({ error: MENSAGEM_BLOQUEIO }, 503);
  }

  if (!url.pathname.includes('/rest/v1/')) return fetchOriginal(input, init);

  const recurso = url.pathname.split('/rest/v1/')[1]?.replace(/\/$/, '') ?? '';

  // --- RPC -----------------------------------------------------------------
  if (recurso.startsWith('rpc/')) {
    const nomeRpc = recurso.slice(4);
    // Infra de sessão/permissão: precisa ser a real (senão o RouteGuard manda para /login).
    if (RPC_PASSAGEM.has(nomeRpc)) return fetchOriginal(input, init);
    // Auditoria/telemetria de fundo: descarta em silêncio (não é ação do usuário).
    if (RPC_SILENCIOSAS.has(nomeRpc)) return json(null);
    const leitura = RPC_LEITURA[nomeRpc];
    if (leitura) return json(leitura(dados, lerCorpoJson(init)));
    return bloquear(false, `RPC ${nomeRpc}`);
  }

  const tabela = recurso;
  const noDataset = tabela in dados;

  // --- Escrita: bloqueada sempre, em qualquer tabela ------------------------
  if (metodo !== 'GET' && metodo !== 'HEAD') {
    // Tabelas do dataset = ação de negócio do usuário (avisa). As demais são
    // ruído de fundo (auditoria, telemetria, log de acesso): descarta em silêncio.
    return bloquear(!noDataset, `${metodo} ${tabela}`);
  }

  // --- Leitura de tabela fora do dataset: caminho original -----------------
  if (!noDataset) {
    console.debug(`[layout-mock] leitura sem mock (segue para o Supabase): ${tabela}`);
    return fetchOriginal(input, init);
  }

  // --- Leitura de tabela do dataset: emulada -------------------------------
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
      extras,
    );
  }
  return json(linhas, 200, extras);
}
