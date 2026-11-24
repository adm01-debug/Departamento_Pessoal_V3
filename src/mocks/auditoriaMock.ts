/**
 * ============================================================================
 * MOCK VISUAL — Auditoria (Log de auditoria do sistema, rota `/auditoria`).
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT. Nenhuma linha é lida
 * do Supabase: a leitura do RPC `listar_auditoria` é curto-circuitada pela tela
 * com estes dados fictícios. É SOMENTE LEITURA — este mock não escreve nada.
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, dashboardMockData.ts e
 * colaboradoresMock.ts): ativo somente com as DUAS condições abaixo — logo,
 * nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento)
 *   2. `VITE_AUDITORIA_MOCK=true` no `.env`/`.env.local`
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios.
 *
 * PARA DESATIVAR: remova/defina `VITE_AUDITORIA_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e o trecho marcado com
 * "MOCK VISUAL — ver src/mocks/auditoriaMock.ts" em `src/pages/AuditoriaPage.tsx`.
 * ============================================================================
 */

/** Campos consumidos pelo layout da tela (lista + drawer de detalhes). */
export interface AuditoriaMockRow {
  id: string;
  tabela: string;
  registro_id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE_CALC';
  user_id: string;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
}

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isAuditoriaMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_AUDITORIA_MOCK === 'true';
}

/** Datas relativas a "agora" — mantém a trilha sempre com atividade recente. */
const agora = Date.now();
const min = (m: number) => new Date(agora - m * 60_000).toISOString();

const EMAIL_TI = 'ti@promobrindes.com.br';
const EMAIL_RH = 'rh.promobrindes@empresa.com.br';
const EMAIL_GESTOR = 'gestor.regional@empresa.com.br';
const EMAIL_SISTEMA = null;

const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

/**
 * Registros fictícios (empresa de demonstração). Cobrem as quatro ações do filtro
 * (Inclusão/Alteração/Exclusão/Cálculo) e as tabelas mais comuns do módulo.
 */
const REGISTROS: AuditoriaMockRow[] = [];

REGISTROS.push(
  {
    id: 'log-0001',
    tabela: 'colaboradores',
    registro_id: 'c1f0a2e4-8b31-4d77-9a10-6f5e2d3b7c01',
    acao: 'INSERT',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { nome: 'Ana Beatriz Marques', cpf: '312.***.***-07', cargo: 'Analista de RH', salario: 4280.5 },
    created_at: min(6),
  },
  {
    id: 'log-0002',
    tabela: 'admissoes',
    registro_id: 'ad-2026-0091',
    acao: 'UPDATE',
    user_id: 'usr-0002',
    user_email: EMAIL_GESTOR,
    ip_address: '177.92.4.108',
    user_agent: UA_CHROME,
    dados_anteriores: { etapa: 'documentos', status: 'em_andamento' },
    dados_novos: { etapa: 'validacao', status: 'em_andamento' },
    created_at: min(19),
  },
  {
    id: 'log-0003',
    tabela: 'folha_pagamento',
    registro_id: 'folha-2026-10',
    acao: 'EXECUTE_CALC',
    user_id: 'sys-0001',
    user_email: EMAIL_SISTEMA,
    ip_address: null,
    user_agent: null,
    dados_anteriores: null,
    dados_novos: { competencia: '2026-10', colaboradores: 148, total_liquido: 412350.78 },
    created_at: min(41),
  },
  {
    id: 'log-0004',
    tabela: 'desligamentos',
    registro_id: 'dsl-2026-0034',
    acao: 'INSERT',
    user_id: 'usr-0002',
    user_email: EMAIL_GESTOR,
    ip_address: '177.92.4.108',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { colaborador: 'Marcos Vinícius Alves', tipo: 'sem_justa_causa', data: '2026-10-12' },
    created_at: min(73),
  }
);

REGISTROS.push(
  {
    id: 'log-0005',
    tabela: 'colaboradores',
    registro_id: 'c1f0a2e4-8b31-4d77-9a10-6f5e2d3b7c01',
    acao: 'UPDATE',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: { cargo: 'Assistente de RH', salario: 2950.0 },
    dados_novos: { cargo: 'Analista de RH', salario: 4280.5 },
    created_at: min(95),
  },
  {
    id: 'log-0006',
    tabela: 'ferias',
    registro_id: 'fr-2026-0187',
    acao: 'UPDATE',
    user_id: 'usr-0002',
    user_email: EMAIL_GESTOR,
    ip_address: '177.92.4.108',
    user_agent: UA_MOBILE,
    dados_anteriores: { status: 'solicitada' },
    dados_novos: { status: 'aprovada_gestor', aprovado_por: EMAIL_GESTOR },
    created_at: min(128),
  },
  {
    id: 'log-0007',
    tabela: 'ponto',
    registro_id: 'pt-2026-10-05-batida-0093',
    acao: 'INSERT',
    user_id: 'usr-0009',
    user_email: 'colaborador.ponto@empresa.com.br',
    ip_address: '201.17.88.14',
    user_agent: UA_MOBILE,
    dados_anteriores: null,
    dados_novos: { tipo: 'entrada', horario: '08:02:14', origem: 'mobile' },
    created_at: min(156),
  },
  {
    id: 'log-0008',
    tabela: 'usuarios',
    registro_id: 'usr-0044',
    acao: 'UPDATE',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: { ativo: false, roles: ['user'] },
    dados_novos: { ativo: true, roles: ['user', 'rh'] },
    created_at: min(184),
  }
);

REGISTROS.push(
  {
    id: 'log-0009',
    tabela: 'medidas_disciplinares',
    registro_id: 'md-2026-0012',
    acao: 'INSERT',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { colaborador: 'Juliana Prado', tipo: 'advertencia_verbal', descricao: 'Atraso reiterado' },
    created_at: min(211),
  },
  {
    id: 'log-0010',
    tabela: 'beneficios',
    registro_id: 'bn-2026-0007',
    acao: 'DELETE',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: { colaborador: 'Rafael Nunes', beneficio: 'vale_transporte', valor: 320.0 },
    dados_novos: null,
    created_at: min(248),
  },
  {
    id: 'log-0011',
    tabela: 'empresas',
    registro_id: 'empresa-1',
    acao: 'UPDATE',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: { razao_social: 'Promobrindes Comércio LTDA' },
    dados_novos: { razao_social: 'Promobrindes Comércio e Indústria LTDA', cnae: '4789-0/99' },
    created_at: min(302),
  },
  {
    id: 'log-0012',
    tabela: 'folha_pagamento',
    registro_id: 'folha-2026-09',
    acao: 'EXECUTE_CALC',
    user_id: 'sys-0001',
    user_email: EMAIL_SISTEMA,
    ip_address: null,
    user_agent: null,
    dados_anteriores: { status: 'processando' },
    dados_novos: { status: 'fechada', competencia: '2026-09', total_liquido: 398412.15 },
    created_at: min(355),
  }
);

REGISTROS.push(
  {
    id: 'log-0013',
    tabela: 'admissoes',
    registro_id: 'ad-2026-0088',
    acao: 'DELETE',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: { candidato: 'Teste Homologação', etapa: 'solicitacao' },
    dados_novos: null,
    created_at: min(402),
  },
  {
    id: 'log-0014',
    tabela: 'colaboradores',
    registro_id: 'a7d3b9c1-2e88-45f0-bb21-90c4e7a1d332',
    acao: 'UPDATE',
    user_id: 'usr-0002',
    user_email: EMAIL_GESTOR,
    ip_address: '177.92.4.108',
    user_agent: UA_MOBILE,
    dados_anteriores: { centro_custo: 'CC-100' },
    dados_novos: { centro_custo: 'CC-220', gestor_id: 'usr-0002' },
    created_at: min(468),
  },
  {
    id: 'log-0015',
    tabela: 'desligamentos',
    registro_id: 'dsl-2026-0033',
    acao: 'UPDATE',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: { status: 'em_aviso' },
    dados_novos: { status: 'concluido', data_efetiva: '2026-10-01' },
    created_at: min(521),
  },
  {
    id: 'log-0016',
    tabela: 'ferias',
    registro_id: 'fr-2026-0186',
    acao: 'INSERT',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { colaborador: 'Patrícia Lemos', periodo: '2026-11-03 a 2026-11-22', dias: 20 },
    created_at: min(587),
  }
);

REGISTROS.push(
  {
    id: 'log-0017',
    tabela: 'usuarios',
    registro_id: 'usr-0031',
    acao: 'INSERT',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { email: 'novo.gestor@empresa.com.br', roles: ['user', 'gestor'], ativo: true },
    created_at: min(634),
  },
  {
    id: 'log-0018',
    tabela: 'ponto',
    registro_id: 'pt-2026-10-04-ajuste-0004',
    acao: 'UPDATE',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: { batida: '17:58:00', justificativa: null },
    dados_novos: { batida: '18:12:00', justificativa: 'Ajuste aprovado pelo gestor' },
    created_at: min(701),
  },
  {
    id: 'log-0019',
    tabela: 'medidas_disciplinares',
    registro_id: 'md-2026-0011',
    acao: 'DELETE',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_CHROME,
    dados_anteriores: { colaborador: 'Eduardo Lima', tipo: 'suspensao', dias: 2 },
    dados_novos: null,
    created_at: min(768),
  },
  {
    id: 'log-0020',
    tabela: 'empresas',
    registro_id: 'empresa-2',
    acao: 'INSERT',
    user_id: 'usr-0003',
    user_email: EMAIL_TI,
    ip_address: '189.5.220.71',
    user_agent: UA_CHROME,
    dados_anteriores: null,
    dados_novos: { razao_social: 'Promobrindes Filial Sul LTDA', cnpj: '12.***.***/0002-88', uf: 'RS' },
    created_at: min(842),
  },
  {
    id: 'log-0021',
    tabela: 'beneficios',
    registro_id: 'bn-2026-0008',
    acao: 'INSERT',
    user_id: 'usr-0001',
    user_email: EMAIL_RH,
    ip_address: '191.36.14.22',
    user_agent: UA_MOBILE,
    dados_anteriores: null,
    dados_novos: { colaborador: 'Camila Ferraz', beneficio: 'plano_saude', valor: 489.9 },
    created_at: min(903),
  },
  {
    id: 'log-0022',
    tabela: 'admissoes',
    registro_id: 'ad-2026-0087',
    acao: 'EXECUTE_CALC',
    user_id: 'sys-0001',
    user_email: EMAIL_SISTEMA,
    ip_address: null,
    user_agent: null,
    dados_anteriores: null,
    dados_novos: { evento: 'S-2200', status: 'enviado', recibo: '1.2.0000000012' },
    created_at: min(968),
  }
);

/** Trilha fictícia (mais recente primeiro), pronta para o layout da tela. */
export function getMockAuditoriaGlobal(): AuditoriaMockRow[] {
  return REGISTROS;
}
