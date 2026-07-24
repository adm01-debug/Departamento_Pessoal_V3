import { supabase } from '@/integrations/supabase/client';
import { bitrixBreaker, resendBreaker, genericBreaker } from '@/lib/circuitBreaker';

// NOTA: não enviamos headers customizados (ex.: 'x-request-id') nas invocações de
// edge functions. O CORS das funções (supabase/functions/_shared/contract.ts) só
// permite: authorization, x-client-info, apikey, content-type, x-hub-signature-256.
// Um header fora dessa lista faz o preflight (OPTIONS) cross-origin falhar e
// derruba TODAS as chamadas no browser. Correlação, se necessária, deve ir no body.

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
}

const handleInvoke = async <T>(name: string, options: InvokeOptions, breaker = genericBreaker): Promise<T> => {
  try {
    return await breaker.execute(async () => {
      const { data, error } = await supabase.functions.invoke(name, options as Parameters<typeof supabase.functions.invoke>[1]);
      if (error) {
        throw new Error(error.message || `Erro ao chamar função ${name}`);
      }
      return data as T;
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : `Falha crítica na comunicação com ${name}`;
    throw new Error(msg, { cause: e });
  }
};

export const edgeFunctionsService = {
  /** Dispara alertas automáticos de DP via email */
  dispararAlertasDP: async () => handleInvoke('alertas-dp', { body: { trigger: 'manual' } }),

  /** Envia relatório por email via Resend */
  enviarRelatorioEmail: async (params: {
    tipo: string;
    destinatarios: string[];
    empresaId: string;
    competencia?: string;
  }) => handleInvoke('enviar-relatorio', { body: params }, resendBreaker),

  /** Gera guias DARF/GPS/FGTS via edge function */
  gerarGuias: async (params: {
    empresaId: string;
    competencia: string;
    tipo: 'darf' | 'gps' | 'fgts' | 'fgts_digital' | 'todos';
  }) => handleInvoke('gerar-guias', { body: params }),

  /** Processa ponto do período via edge function */
  processarPonto: async (params: { empresaId: string; dataInicio: string; dataFim: string }) =>
    handleInvoke('processar-ponto', { body: params }),

  /** Calcula férias via edge function */
  calcularFerias: async (params: {
    salario_base: number;
    dias_ferias?: number;
    dias_abono?: number;
    dependentes_irrf?: number;
    colaborador_id?: string;
  }) => handleInvoke('calcular-ferias', { body: params }),

  /** Calcula folha via edge function server-side com resiliência + idempotência.
   *  A `idempotencyKey` viaja no body (o CORS já aceita header, mas body é mais robusto
   *  contra proxies que removem headers custom em preflights antigos). */
  calcularFolha: async (params: { empresaId: string; competencia: string; idempotencyKey?: string }) =>
    handleInvoke('calcular-folha', {
      body: {
        empresa_id: params.empresaId,
        competencia: params.competencia,
        ...(params.idempotencyKey ? { idempotency_key: params.idempotencyKey } : {}),
      },
    }),

  /** Calcula rescisão via edge function */
  calcularRescisao: async (params: {
    salario_base: number;
    data_admissao: string;
    data_desligamento: string;
    tipo_rescisao: string;
    aviso_previo: string;
    saldo_fgts: number;
    ferias_vencidas: boolean;
    dependentes_irrf: number;
  }) => handleInvoke('calcular-rescisao', { body: params }),

  /** Exportação server-side */
  exportarDados: async (params: { tabela: string; formato: 'csv' | 'json'; filtros?: Record<string, unknown> }) =>
    handleInvoke('exportacao', { body: params }),

  /** Health check do sistema */
  healthcheck: async () => handleInvoke('healthcheck', { body: {} }),

  /** Limpeza de dados expirados */
  limpezaDados: async () => handleInvoke('limpeza', { body: {} }),

  /** Backup server-side */
  backupServidor: async (empresaId?: string) => handleInvoke('backup', { body: { empresaId } }),

  /** OCR de documentos via AI (bucket restrito a documentos/documentos-admissao) */
  ocrDocumento: async (params: {
    bucket: 'documentos' | 'documentos-admissao';
    filePath: string;
    documentType?: 'cpf' | 'rg' | 'ctps' | 'comprovante_endereco';
  }) => handleInvoke('OCR', { body: params }),

  /** Métricas do sistema */
  metricas: async (empresaId: string) => handleInvoke('metricas', { body: { empresaId } }),

  /** Notificações */
  enviarNotificacao: async (params: {
    action: 'enviar' | 'listar';
    empresaId?: string;
    tipo?: string;
    destinatarios?: { user_id: string }[];
    assunto?: string;
    conteudo?: string;
  }) => handleInvoke('notificacao', { body: params }),

  /** Processar agendamentos de relatórios */
  processarAgendamentos: async () => handleInvoke('processar-agendamentos', { body: {} }),

  /** Gerar holerite server-side */
  gerarHolerite: async (params: { colaboradorId: string; competencia: string }) =>
    handleInvoke('gerar-holerite', { body: params }),

  /** Assinatura digital */
  assinaturaDigital: async (params: {
    action: 'verificar' | 'assinar' | 'listar';
    tokenId?: string;
    admissaoId?: string;
    assinaturaBase64?: string;
    ipAddress?: string;
  }) => handleInvoke('assinaturaDigital', { body: params }),

  /** Cache de dados */
  cache: async (params: {
    action: 'get' | 'set' | 'invalidate' | 'query_cached' | 'stats';
    key?: string;
    ttlSeconds?: number;
    table?: string;
    query?: Record<string, unknown>;
  }) => handleInvoke('cache', { body: params }),

  /** Criptografia */
  criptografia: async (params: {
    action: 'encrypt' | 'decrypt' | 'hash' | 'generate_token';
    data?: unknown;
    password?: string;
  }) => handleInvoke('criptografia', { body: params }),

  /** Importação de dados */
  importacao: async (params: {
    action: 'validar' | 'importar' | 'template';
    tabela: string;
    formato?: 'csv' | 'json';
    csvContent?: string;
    dados?: unknown;
    empresaId?: string;
  }) => handleInvoke('importacao', { body: params }),

  /** Sincronizar Bitrix24 */
  sincronizarBitrix: async (params: {
    action: 'sync_departamentos' | 'sync_colaboradores' | 'sync_cargos' | 'sync_all' | 'status';
  }) => handleInvoke('sincronizar-bitrix', { body: params }, bitrixBreaker),

  /** Verifica rate limit */
  checkRateLimit: async (key: string, limit: number = 100, windowSeconds: number = 60) =>
    handleInvoke('rateLimit', { body: { key, limit, window_seconds: windowSeconds } }),

  /** Verifica conexão com banco externo */
  checkExternalDb: async () =>
    handleInvoke('external-db-bridge', { body: { action: 'select', table: 'empresas', limit: 1 } }),
};
