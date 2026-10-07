/**
 * ============================================================================
 * MOCK VISUAL — Hub de Premiações (rota `/premiacoes`).
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT — os 4 KPIs, as 4 abas
 * (Campanhas, Pagamentos, Simulador ROI, Auditoria), o fluxo de aprovação
 * (`RewardsApprovalHub`), os cards de campanha, as tabelas de pagamentos e
 * auditoria e os cenários do simulador. Nenhuma linha é lida do Supabase nesta
 * área: os `useQuery` de `PremiacoesPage` e `RewardsSimulator` curto-circuitam
 * com estes registros fictícios.
 *
 * ⚠️ SOMENTE LEITURA. Toda ação de ESCRITA (aprovar/rejeitar/concluir pagamento,
 * conciliar folha, auto-conciliar, criar campanha/regra, salvar cenário de ROI)
 * é BLOQUEADA por `bloquearEscritaPremiacoes()` — sem o guard, gravaria registros
 * órfãos com `empresa_id`/`colaborador_id` fictícios (ou falharia por FK).
 * O botão "Exportar" é simulado por `simularExportacaoPremiacoes()`.
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, desligamentosMock.ts,
 * desempenhoMock.ts, auditoriaMock.ts e colaboradoresMock.ts): liga somente com
 * as DUAS condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_PREMIACOES_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios.
 *
 * PARA DESATIVAR: defina `VITE_PREMIACOES_MOCK=false` no `.env.local` e reinicie
 * o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/premiacoesMock.ts" em:
 *   - src/pages/PremiacoesPage.tsx
 *   - src/components/premiacoes/RewardsSimulator.tsx
 *   - src/components/premiacoes/RewardsApprovalHub.tsx
 *   - src/components/premiacoes/CampaignWizard.tsx
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_COLABORADORES, MOCK_EMPRESA } from './colaboradoresMock';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isPremiacoesMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PREMIACOES_MOCK === 'true';
}

const EMPRESA = MOCK_EMPRESA.id;

/** Relação `colaborador:colaboradores(nome_completo, salario_base)` embutida. */
function colaborador(id: string): { nome_completo: string; salario_base: number } {
  const c = MOCK_COLABORADORES.find((x) => x.id === id);
  return { nome_completo: c?.nome_completo ?? 'Colaborador Fictício', salario_base: c?.salario_base ?? 0 };
}

/** Datas relativas a "agora" — mantém a área sempre com atividade recente. */
const agora = Date.now();
const horasAtras = (h: number) => new Date(agora - h * 3_600_000).toISOString();
const diasAtras = (d: number) => new Date(agora - d * 86_400_000).toISOString();

/* ─── Campanhas (`premiacoes_campanhas`) ───────────────────────────────────── */

export interface CampanhaMock {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  orcamento_estimado: number;
  status_aprovacao: string;
  created_at: string;
  updated_at: string;
}

// `data_inicio`/`data_fim` são exibidas com `formatDate`, que trata
// 'YYYY-MM-DD' como data LOCAL — logo, datas naturais (dia 01) são seguras.
const CAMPANHAS: CampanhaMock[] = [
  {
    id: 'mock-camp-1', empresa_id: EMPRESA,
    nome: 'Campanha de Vendas Q3 2026',
    descricao: 'Aceleração de receita com bônus por batimento trimestral de meta.',
    data_inicio: '2026-07-01', data_fim: '2026-09-30',
    status: 'ativo', orcamento_estimado: 85000, status_aprovacao: 'aprovado',
    created_at: diasAtras(98), updated_at: diasAtras(5),
  },
  {
    id: 'mock-camp-2', empresa_id: EMPRESA,
    nome: 'Bônus por Meta de Produção',
    descricao: 'Incentivo por produtividade e qualidade na operação logística.',
    data_inicio: '2026-08-01', data_fim: '2026-10-31',
    status: 'ativo', orcamento_estimado: 42000, status_aprovacao: 'aprovado',
    created_at: diasAtras(67), updated_at: diasAtras(3),
  },
  {
    id: 'mock-camp-3', empresa_id: EMPRESA,
    nome: 'Programa Indique um Amigo',
    descricao: 'Premiação por indicações que resultaram em contratação.',
    data_inicio: '2026-03-01', data_fim: '2026-06-30',
    status: 'finalizado', orcamento_estimado: 18000, status_aprovacao: 'aprovado',
    created_at: diasAtras(220), updated_at: diasAtras(98),
  },
  {
    id: 'mock-camp-4', empresa_id: EMPRESA,
    nome: 'Premiação de Inovação',
    descricao: 'Reconhecimento de ideias que geraram ganho de eficiência.',
    data_inicio: '2026-10-01', data_fim: '2026-12-31',
    status: 'rascunho', orcamento_estimado: 30000, status_aprovacao: 'revisando',
    created_at: diasAtras(6), updated_at: diasAtras(2),
  },
];

export function getMockCampanhas(): CampanhaMock[] | undefined {
  return isPremiacoesMockEnabled() ? CAMPANHAS : undefined;
}

/* ─── Pagamentos (`premiacoes_pagamentos`) ─────────────────────────────────── */

type HistoricoMudanca = { status: string; data: string; comentario: string; user: string };

export interface PagamentoMock {
  id: string;
  colaborador_id: string;
  campanha_id: string;
  regra_id: string;
  valor_calculado: number;
  valor_aprovado: number | null;
  status: string;
  data_pagamento: string | null;
  observacoes: string | null;
  status_conciliacao: string;
  valor_folha_real: number | null;
  justificativa_divergencia: string | null;
  historico_mudancas: HistoricoMudanca[];
  colaborador: { nome_completo: string; salario_base: number };
  campanha: { nome: string; empresa_id: string };
  created_at: string;
  updated_at: string;
}

/** Nome da campanha a partir do id fictício (para o embed `campanha:nome`). */
function campanhaRef(id: string): { nome: string; empresa_id: string } {
  return { nome: CAMPANHAS.find((c) => c.id === id)?.nome ?? 'Campanha', empresa_id: EMPRESA };
}

/** Histórico de mudanças (último item alimenta o "Último Comentário" do hub). */
function hist(...entradas: [string, string, number][]): HistoricoMudanca[] {
  return entradas.map(([status, comentario, horas]) => ({
    status, comentario, user: 'RH / Admin', data: horasAtras(horas),
  }));
}

/**
 * Cobrem todos os estágios do `RewardsApprovalHub` (calculado → revisando →
 * aprovado_gestor → aprovado_rh → aprovado_financeiro/pago) e a fila de
 * rejeitados, além de gerar KPIs coerentes na página.
 */
const PAGAMENTOS: Omit<PagamentoMock, 'colaborador' | 'campanha'>[] = [
  { id: 'mock-pag-1', colaborador_id: 'mock-2', campanha_id: 'mock-camp-1', regra_id: 'mock-regra-1', valor_calculado: 1250, valor_aprovado: null, status: 'calculado', data_pagamento: null, observacoes: 'Aguardando validação do gestor de vendas.', status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: [], created_at: diasAtras(4), updated_at: diasAtras(4) },
  { id: 'mock-pag-2', colaborador_id: 'mock-12', campanha_id: 'mock-camp-1', regra_id: 'mock-regra-1', valor_calculado: 980.5, valor_aprovado: null, status: 'calculado', data_pagamento: null, observacoes: 'Meta de vendas do trimestre atingida.', status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: [], created_at: diasAtras(5), updated_at: diasAtras(5) },
  { id: 'mock-pag-3', colaborador_id: 'mock-11', campanha_id: 'mock-camp-2', regra_id: 'mock-regra-2', valor_calculado: 720, valor_aprovado: null, status: 'calculado', data_pagamento: null, observacoes: 'Produtividade dentro da faixa base.', status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: [], created_at: diasAtras(6), updated_at: diasAtras(6) },
  { id: 'mock-pag-4', colaborador_id: 'mock-5', campanha_id: 'mock-camp-1', regra_id: 'mock-regra-1', valor_calculado: 1400, valor_aprovado: null, status: 'revisando', data_pagamento: null, observacoes: 'Em análise de ajuste de comissão.', status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: hist(['revisando', 'Enviado para revisão de comissões.', 20]), created_at: diasAtras(9), updated_at: diasAtras(1) },
  { id: 'mock-pag-5', colaborador_id: 'mock-9', campanha_id: 'mock-camp-2', regra_id: 'mock-regra-2', valor_calculado: 1100, valor_aprovado: 1100, status: 'aprovado_gestor', data_pagamento: null, observacoes: null, status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: hist(['calculado', 'Cálculo inicial concluído.', 40], ['aprovado_gestor', 'Aprovado pelo gestor imediato.', 26]), created_at: diasAtras(12), updated_at: diasAtras(1) },
  { id: 'mock-pag-6', colaborador_id: 'mock-6', campanha_id: 'mock-camp-2', regra_id: 'mock-regra-2', valor_calculado: 1600, valor_aprovado: 1600, status: 'aprovado_rh', data_pagamento: null, observacoes: null, status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: hist(['aprovado_gestor', 'Aprovado pelo gestor.', 60], ['aprovado_rh', 'Validado pelo RH.', 30]), created_at: diasAtras(15), updated_at: diasAtras(2) },
  { id: 'mock-pag-7', colaborador_id: 'mock-3', campanha_id: 'mock-camp-1', regra_id: 'mock-regra-1', valor_calculado: 2200, valor_aprovado: 2200, status: 'aprovado_financeiro', data_pagamento: null, observacoes: null, status_conciliacao: 'conciliado', valor_folha_real: 2200, justificativa_divergencia: null, historico_mudancas: hist(['aprovado_rh', 'Validado pelo RH.', 72], ['aprovado_financeiro', 'Aprovado pelo financeiro; conciliado com a folha.', 12]), created_at: diasAtras(18), updated_at: diasAtras(1) },
  { id: 'mock-pag-8', colaborador_id: 'mock-8', campanha_id: 'mock-camp-1', regra_id: 'mock-regra-1', valor_calculado: 1750, valor_aprovado: 1750, status: 'aprovado_financeiro', data_pagamento: null, observacoes: 'Divergência de retenção identificada na folha.', status_conciliacao: 'divergente', valor_folha_real: 1680, justificativa_divergencia: 'Diferença de retenção de IRRF sobre a rubrica de bônus.', historico_mudancas: hist(['aprovado_financeiro', 'Detectada divergência de R$ 70,00 na conciliação.', 8]), created_at: diasAtras(20), updated_at: horasAtras(8) },
  { id: 'mock-pag-9', colaborador_id: 'mock-1', campanha_id: 'mock-camp-3', regra_id: 'mock-regra-3', valor_calculado: 1300, valor_aprovado: 1300, status: 'pago', data_pagamento: '2026-06-28', observacoes: 'Pago no ciclo de junho/2026.', status_conciliacao: 'conciliado', valor_folha_real: 1300, justificativa_divergencia: null, historico_mudancas: hist(['aprovado_financeiro', 'Conciliado com a folha.', 120], ['pago', 'Pagamento efetuado no ciclo de junho/2026.', 100]), created_at: diasAtras(130), updated_at: diasAtras(100) },
  { id: 'mock-pag-10', colaborador_id: 'mock-10', campanha_id: 'mock-camp-2', regra_id: 'mock-regra-2', valor_calculado: 900, valor_aprovado: null, status: 'rejeitado', data_pagamento: null, observacoes: 'Meta não elegível neste ciclo.', status_conciliacao: 'pendente', valor_folha_real: null, justificativa_divergencia: null, historico_mudancas: hist(['aprovado_gestor', 'Aprovado pelo gestor.', 50], ['rejeitado', 'Rejeitado: meta de produção não atingida.', 18]), created_at: diasAtras(16), updated_at: diasAtras(3) },
];

export function getMockPagamentos(): PagamentoMock[] | undefined {
  if (!isPremiacoesMockEnabled()) return undefined;
  return PAGAMENTOS.map((p) => ({
    ...p,
    colaborador: colaborador(p.colaborador_id),
    campanha: campanhaRef(p.campanha_id),
  }));
}

/* ─── Auditoria (`premiacoes_auditoria`) ───────────────────────────────────── */

export interface AuditoriaPremiacaoMock {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  acao: string;
  motivo: string;
  created_at: string;
}

const AUDITORIA: AuditoriaPremiacaoMock[] = [
  { id: 'mock-aud-p1', entidade_tipo: 'pagamento', entidade_id: 'a1b2c3d4-0001-4a2b-9c3d-000000000001', acao: 'aprovacao', motivo: 'Pagamento aprovado pelo financeiro e conciliado com a folha.', created_at: horasAtras(12) },
  { id: 'mock-aud-p2', entidade_tipo: 'pagamento', entidade_id: 'a1b2c3d4-0008-4a2b-9c3d-000000000008', acao: 'alteracao', motivo: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).', created_at: horasAtras(8) },
  { id: 'mock-aud-p3', entidade_tipo: 'pagamento', entidade_id: 'a1b2c3d4-0004-4a2b-9c3d-000000000004', acao: 'alteracao', motivo: 'Enviado para revisão de comissões pelo gestor.', created_at: horasAtras(20) },
  { id: 'mock-aud-c1', entidade_tipo: 'campanha', entidade_id: 'b7e2f1a0-0001-4c5d-8e9f-000000000001', acao: 'criacao', motivo: 'Campanha "Campanha de Vendas Q3 2026" criada com orçamento de R$ 85.000,00.', created_at: diasAtras(98) },
  { id: 'mock-aud-c2', entidade_tipo: 'campanha', entidade_id: 'b7e2f1a0-0004-4c5d-8e9f-000000000004', acao: 'alteracao', motivo: 'Campanha "Premiação de Inovação" salva como rascunho para revisão.', created_at: diasAtras(2) },
  { id: 'mock-aud-r1', entidade_tipo: 'regra', entidade_id: 'c3d4e5f6-0001-4f2a-8b9c-000000000001', acao: 'criacao', motivo: 'Regra "Bônus de Batimento" (valor fixo R$ 500,00) vinculada à campanha.', created_at: diasAtras(97) },
  { id: 'mock-aud-p4', entidade_tipo: 'pagamento', entidade_id: 'a1b2c3d4-0010-4a2b-9c3d-000000000010', acao: 'alteracao', motivo: 'Pagamento rejeitado — meta de produção não atingida.', created_at: diasAtras(3) },
  { id: 'mock-aud-p5', entidade_tipo: 'pagamento', entidade_id: 'a1b2c3d4-0009-4a2b-9c3d-000000000009', acao: 'aprovacao', motivo: 'Pagamento do ciclo de junho/2026 efetuado.', created_at: diasAtras(100) },
];

export function getMockAuditoriaPremiacoes(): AuditoriaPremiacaoMock[] | undefined {
  return isPremiacoesMockEnabled() ? AUDITORIA : undefined;
}

/* ─── Cenários de ROI (`premiacoes_roi_cenarios`) ──────────────────────────── */

export interface CenarioRoiMock {
  id: string;
  nome: string;
  name: string;
  configuracoes: { employees: number; avgSalary: number; bonusPercent: number; performanceLevel: number; retentionImpact: number };
  resultados: { totalBudget: number; savings: number; roi: number };
  snapshot_logs: unknown[];
  created_at: string;
}

/**
 * Números coerentes com `RewardsSimulator.calculateMetrics`:
 *   totalBudget = employees * avgSalary * (bonus/100) * (perf/100)
 *   savings     = avgSalary * 3 * employees * 0.15 * (ret/100)
 *   roi         = savings / totalBudget
 * `nome` e `name` são ambos preenchidos: o serviço grava `nome`, mas o
 * componente lê `s.name`.
 */
const CENARIOS_ROI: CenarioRoiMock[] = [
  {
    id: 'mock-roi-1', nome: 'Cenário 1', name: 'Cenário 1',
    configuracoes: { employees: 50, avgSalary: 4500, bonusPercent: 10, performanceLevel: 85, retentionImpact: 5 },
    resultados: { totalBudget: 19125, savings: 5062.5, roi: 0.2647 },
    snapshot_logs: [{ timestamp: diasAtras(30), version: '1.0' }], created_at: diasAtras(30),
  },
  {
    id: 'mock-roi-2', nome: 'Expansão Comercial', name: 'Expansão Comercial',
    configuracoes: { employees: 120, avgSalary: 5200, bonusPercent: 15, performanceLevel: 90, retentionImpact: 8 },
    resultados: { totalBudget: 84240, savings: 22464, roi: 0.2667 },
    snapshot_logs: [{ timestamp: diasAtras(14), version: '1.0' }], created_at: diasAtras(14),
  },
  {
    id: 'mock-roi-3', nome: 'Liderança Premium', name: 'Liderança Premium',
    configuracoes: { employees: 30, avgSalary: 8000, bonusPercent: 12, performanceLevel: 95, retentionImpact: 10 },
    resultados: { totalBudget: 27360, savings: 10800, roi: 0.3947 },
    snapshot_logs: [{ timestamp: diasAtras(4), version: '1.0' }], created_at: diasAtras(4),
  },
];

export function getMockCenariosRoi(): CenarioRoiMock[] | undefined {
  return isPremiacoesMockEnabled() ? CENARIOS_ROI : undefined;
}

/* ─── Guards de escrita / simulação de export (modo demo) ──────────────────── */

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`empresa_id`/`colaborador_id` não existem no
 * banco): gravar criaria lixo, falharia por FK ou deixaria registros órfãos.
 * Devolve `true` quando a ação deve ser ABORTADA, então o chamador só precisa de
 * `if (bloquearEscritaPremiacoes('...')) return;`.
 */
export function bloquearEscritaPremiacoes(acao: string): boolean {
  if (!isPremiacoesMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os dados de premiações exibidos são fictícios.`);
  return true;
}

/**
 * Simula a exportação do relatório: devolve a contagem de pagamentos fictícios
 * (para o toast) quando o mock está ligado, senão `undefined` (o chamador segue
 * para o `exportarRelatorio` real). Evita chamar `listarPagamentos` com uma
 * empresa inexistente no modo demo.
 */
export function simularExportacaoPremiacoes(): number | undefined {
  return isPremiacoesMockEnabled() ? PAGAMENTOS.length : undefined;
}
