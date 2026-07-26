/**
 * P5-086: Metabase embed service + dashboard helper
 *
 * Integração: Metabase via embedding SDK (metabase-embedding-sdk) ou
 * via iframe com Signed Embedding (dashboards públicos com token JWT).
 *
 * Dois modos:
 *   1. MetabaseEmbeddingSDK — usa @metabase/embedding-sdk-react
 *      (autenticação via API Key do Metabase, retorno de usuário logado)
 *   2. SignedIframe — iframe com URL assinada (dashboards públicos)
 *
 * Requisitos:
 *   VITE_METABASE_URL=https://metabase.empresa.com
 *   VITE_METABASE_SITE_URL=https://metabase.empresa.com
 *   VITE_METABASE_API_KEY=<api_key>  (para SDK mode)
 *   METABASE_SECRET_KEY=<jwt_secret> (para Signed Embedding mode)
 *
 * Dashboards disponíveis para embed:
 *   - RH Overview (headcount, turnover, custos)
 *   - Folha de Pagamento (gross/net, por departamento)
 *   - eSocial compliance (enviados/pendentes/erros)
 *   - Passivo Trabalhista (requisitos, provisionamentos)
 */

import { loggerService } from './loggerService';

export interface MetabaseConfig {
  /** URL pública do Metabase (usado no iframe src) */
  siteUrl: string;
  /** Chave secreta para assinar URLs (Signed Embedding) */
  secretKey?: string;
  /** Para SDK mode: chave de API do Metabase */
  apiKey?: string;
}

export interface SignedEmbedParams {
  dashboardId: number | string;
  /** Parâmetros de filtro escopados por empresa (filtros do Metabase) */
  params?: Record<string, string | string[]>;
  /** UUID da sessão de embedding (apenas SDK mode) */
  sessionId?: string;
  /** Título do iframe (acessibilidade) */
  title?: string;
  /** Altura do iframe (CSS value) */
  height?: string;
}

function loadMetabaseSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (document.getElementById('metabase-embed-sdk')) { resolve(); return; }
    const url = `${import.meta.env.VITE_METABASE_URL ?? ''}/app/dist/embedding-sdk.js`;
    const script = document.createElement('script');
    script.id = 'metabase-embed-sdk';
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Metabase SDK não carregou'));
    document.head.appendChild(script);
  });
}

function buildSignedUrl(
  siteUrl: string,
  dashboardId: number | string,
  params: Record<string, string | string[]>,
  expiresAt: Date,
): string {
  const secretKey = import.meta.env.VITE_METABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('VITE_METABASE_SECRET_KEY não configurado — use Signed Embedding mode');
  }

  // Parâmetros de filtro para o Metabase
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const vals = Array.isArray(value) ? value : [value];
    for (const v of vals) {
      searchParams.append(`filter_${key}`, String(v));
    }
  }

  const baseUrl = `${siteUrl}/dashboard/${dashboardId}`;
  const qs = searchParams.toString();

  // Em produção real, usar jsonwebtoken ou Auth.js para assinar:
  //   const token = jwt.sign({ resource: { dashboard: dashboardId }, params, exp: ... }, secretKey);
  //   return `${baseUrl}#${token}`;
  //
  // Para desenvolvimento: retorna URL sem assinatura (Metabase em dev mode).
  if (import.meta.env.DEV) {
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  // Placeholder: assinatura JWT deveria ser gerada server-side para proteger secretKey.
  // Este é um stub que indica o caminho de implementação production-ready.
  loggerService.warn('[Metabase] Signed embedding: implemente assinatura JWT server-side');
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

/**
 * Retorna props para renderizar um iframe com dashboard Metabase assinado.
 *用法:
 *   const { src, title, style } = useMetabaseEmbed({ dashboardId: 12, params: { empresa_id: 'uuid' } });
 *   return <iframe src={src} title={title} style={style} />;
 */
export function useMetabaseEmbed(params: SignedEmbedParams) {
  const siteUrl = import.meta.env.VITE_METABASE_SITE_URL ?? '';
  const dashboardId = params.dashboardId;
  const filters = params.params ?? {};
  const title = params.title ?? `Dashboard ${dashboardId}`;
  const height = params.height ?? '800px';

  const src = siteUrl
    ? buildSignedUrl(siteUrl, dashboardId, filters, new Date(Date.now() + 3_600_000))
    : '/metabase-placeholder'; // Dev fallback

  return {
    src,
    title,
    height,
    allow: 'fullscreen',
    style: { border: 'none', width: '100%', height } as React.CSSProperties,
    loading: !siteUrl,
  };
}

/**
 * Provider para Metabase SDK mode (embedding full React).
 * Substitui o iframe por <MetabaseProvider><InteractiveEmbedding></InteractiveEmbedding></MetabaseProvider>
 * quando o SDK está disponível.
 *
 * Docs: https://www.metabase.com/docs/latest/embedding/sdk/react
 */
export async function initMetabaseSDK(config: MetabaseConfig): Promise<void> {
  await loadMetabaseSDK();
  const MB = (window as unknown as Record<string, unknown>).Metabase;
  if (!MB) throw new Error('Metabase SDK não disponível no window');
  // Exemplo de inicialização:
  // const { configure } = MB as { configure: (opts: object) => void };
  // configure({ metabaseUrl: config.siteUrl, apiKey: config.apiKey });
}

export const METABASE_DASHBOARD_IDS = {
  RH_OVERVIEW: Number(import.meta.env.VITE_METABASE_DASHBOARD_RH ?? '1'),
  FOLHA: Number(import.meta.env.VITE_METABASE_DASHBOARD_FOLHA ?? '2'),
  ESOCIAL: Number(import.meta.env.VITE_METABASE_DASHBOARD_ESOCIAL ?? '3'),
  PASSIVO_TRABalhista: Number(import.meta.env.VITE_METABASE_DASHBOARD_PASSIVO ?? '4'),
} as const;
