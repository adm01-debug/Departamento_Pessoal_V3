/**
 * ============================================================================
 * MOCK VISUAL — Gestão de Desempenho (rota `/avaliacao`).
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT — as 6 abas (Ciclos,
 * Metas & OKRs, Feedbacks, PDI, Nine-Box, Auditoria), os 5 KPIs, os gráficos da
 * Dashboard (pizza "Distribuição de Notas" + barras "Progresso de Metas Top 5"),
 * a matriz Nine-Box e a trilha de auditoria. Nenhuma linha é lida do Supabase
 * nesta área: os `useQuery` de `AvaliacaoPage` e o `PerformanceAuditTimeline`
 * curto-circuitam com estes registros fictícios.
 *
 * ⚠️ SOMENTE LEITURA. A página não dispara nenhuma escrita (as mutations de
 * "criar" existem mas não estão ligadas a botões); ainda assim ficam BLOQUEADAS
 * por `bloquearEscritaDesempenho()` — sem o guard, um clique futuro gravaria um
 * ciclo/meta/PDI órfão com `empresa_id`/`colaborador_id` fictícios.
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, desligamentosMock.ts,
 * auditoriaMock.ts, colaboradoresMock.ts e dashboardMockData.ts): liga somente
 * com as DUAS condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_DESEMPENHO_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios em vez das
 * fixtures que cada teste monta.
 *
 * PARA DESATIVAR: defina `VITE_DESEMPENHO_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/desempenhoMock.ts" em:
 *   - src/pages/AvaliacaoPage.tsx
 *   - src/components/avaliacao/PerformanceAuditTimeline.tsx
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_COLABORADORES, MOCK_EMPRESA } from './colaboradoresMock';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isDesempenhoMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_DESEMPENHO_MOCK === 'true';
}

const EMPRESA = MOCK_EMPRESA.id;

/** Nome do colaborador fictício a partir do id de `MOCK_COLABORADORES`. */
function nomeColaborador(id: string): string {
  return MOCK_COLABORADORES.find((c) => c.id === id)?.nome_completo ?? 'Colaborador Fictício';
}

/** Relação embutida que o serviço real entrega (`colaborador:colaboradores(...)`). */
function colaborador(id: string): { nome_completo: string } {
  return { nome_completo: nomeColaborador(id) };
}

/** Datas relativas a "agora" — mantém a área sempre com atividade recente. */
const agora = Date.now();
const horasAtras = (h: number) => new Date(agora - h * 3_600_000).toISOString();
const diasAtras = (d: number) => new Date(agora - d * 86_400_000).toISOString();
const diasAFrente = (d: number) => formatDateLocalISO(addDaysLocal(new Date(), d));

/* ─── Ciclos de Avaliação (`ciclos_avaliacao`) ─────────────────────────────── */

export interface CicloMock {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  tipo: string;
  created_at: string;
  updated_at: string;
}

// Datas de início em dia 02: a tela renderiza com `new Date('YYYY-MM-DD')`
// (interpretado como UTC) e, em UTC-3, o dia 01 "volta" para o mês anterior.
// Com dia 02 a exibição cai no dia 01 do mês pretendido.
const CICLOS: CicloMock[] = [
  {
    id: 'mock-ciclo-1',
    empresa_id: EMPRESA,
    nome: 'Ciclo Anual 2025',
    descricao: 'Avaliação de desempenho anual — metas e competências',
    data_inicio: '2025-01-02',
    data_fim: '2025-12-31',
    status: 'concluido',
    tipo: 'anual',
    created_at: diasAtras(430),
    updated_at: diasAtras(285),
  },
  {
    id: 'mock-ciclo-2',
    empresa_id: EMPRESA,
    nome: 'Ciclo S1 2026',
    descricao: 'Avaliação de desempenho do 1º semestre — metas e competências',
    data_inicio: '2026-01-02',
    data_fim: '2026-06-30',
    status: 'concluido',
    tipo: 'semestral',
    created_at: diasAtras(285),
    updated_at: diasAtras(100),
  },
  {
    id: 'mock-ciclo-3',
    empresa_id: EMPRESA,
    nome: 'Ciclo S2 2026',
    descricao: 'Avaliação de desempenho do 2º semestre — em andamento',
    data_inicio: '2026-07-02',
    data_fim: '2026-12-31',
    status: 'ativo',
    tipo: 'semestral',
    created_at: diasAtras(100),
    updated_at: diasAtras(4),
  },
  {
    id: 'mock-ciclo-4',
    empresa_id: EMPRESA,
    nome: 'Avaliação de Experiência 90 dias',
    descricao: 'Acompanhamento de período de experiência — novas contratações',
    data_inicio: '2026-08-02',
    data_fim: '2026-10-30',
    status: 'em_andamento',
    tipo: 'experiencia',
    created_at: diasAtras(70),
    updated_at: diasAtras(2),
  },
  {
    id: 'mock-ciclo-5',
    empresa_id: EMPRESA,
    nome: 'Ciclo S1 2027',
    descricao: 'Planejamento do próximo semestre — aguardando liberação',
    data_inicio: '2027-01-02',
    data_fim: '2027-06-30',
    status: 'rascunho',
    tipo: 'semestral',
    created_at: diasAtras(9),
    updated_at: diasAtras(6),
  },
];

export function getMockCiclos(): CicloMock[] | undefined {
  return isDesempenhoMockEnabled() ? CICLOS : undefined;
}

/* ─── Metas & OKRs (`metas_okrs`) ──────────────────────────────────────────── */

export interface MetaMock {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  ciclo_id: string | null;
  titulo: string;
  descricao: string;
  tipo: 'individual' | 'equipe' | 'empresa';
  valor_objetivo: number;
  valor_atual: number;
  data_limite: string;
  status: string;
  colaborador: { nome_completo: string };
  created_at: string;
  updated_at: string;
}

const METAS: Omit<MetaMock, 'empresa_id' | 'colaborador'>[] = [
  { id: 'mock-meta-1', colaborador_id: 'mock-2', ciclo_id: 'mock-ciclo-3', titulo: 'Reduzir tempo de resposta do frontend', descricao: 'Otimizar o tempo de carregamento das telas principais para menos de 2s.', tipo: 'individual', valor_objetivo: 100, valor_atual: 82, data_limite: diasAFrente(26), status: 'ativo', created_at: diasAtras(58), updated_at: diasAtras(3) },
  { id: 'mock-meta-2', colaborador_id: 'mock-12', ciclo_id: 'mock-ciclo-3', titulo: 'Aumentar vendas da região Sudeste', descricao: 'Elevar o faturamento trimestral da carteira Sudeste em 15%.', tipo: 'equipe', valor_objetivo: 150, valor_atual: 138, data_limite: diasAFrente(18), status: 'ativo', created_at: diasAtras(55), updated_at: diasAtras(1) },
  { id: 'mock-meta-3', colaborador_id: 'mock-5', ciclo_id: 'mock-ciclo-3', titulo: 'Automatizar conciliação financeira', descricao: 'Reduzir em 60% o tempo gasto na conciliação bancária manual.', tipo: 'individual', valor_objetivo: 60, valor_atual: 24, data_limite: diasAFrente(40), status: 'ativo', created_at: diasAtras(50), updated_at: diasAtras(5) },
  { id: 'mock-meta-4', colaborador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', titulo: 'Reduzir turnover voluntário', descricao: 'Meta de empresa: reduzir o turnover voluntário anual para menos de 12%.', tipo: 'empresa', valor_objetivo: 12, valor_atual: 9, data_limite: diasAFrente(70), status: 'ativo', created_at: diasAtras(48), updated_at: diasAtras(7) },
  { id: 'mock-meta-5', colaborador_id: 'mock-6', ciclo_id: 'mock-ciclo-3', titulo: 'Reformular identidade visual das campanhas', descricao: 'Criar novo kit visual para as campanhas sazonais do 2º semestre.', tipo: 'individual', valor_objetivo: 8, valor_atual: 5, data_limite: diasAFrente(12), status: 'ativo', created_at: diasAtras(40), updated_at: diasAtras(2) },
  { id: 'mock-meta-6', colaborador_id: 'mock-9', ciclo_id: 'mock-ciclo-3', titulo: 'Certificar 3 analistas em Power BI', descricao: 'Concluir a trilha de certificação dos analistas do time de dados.', tipo: 'equipe', valor_objetivo: 3, valor_atual: 1, data_limite: diasAFrente(35), status: 'pausado', created_at: diasAtras(33), updated_at: diasAtras(10) },
  { id: 'mock-meta-7', colaborador_id: 'mock-4', ciclo_id: 'mock-ciclo-2', titulo: 'Implantar 5 melhorias no onboarding', descricao: 'Entrega das melhorias mapeadas no projeto de experiência do colaborador.', tipo: 'individual', valor_objetivo: 5, valor_atual: 5, data_limite: '2026-06-30', status: 'concluido', created_at: diasAtras(180), updated_at: diasAtras(105) },
  { id: 'mock-meta-8', colaborador_id: 'mock-10', ciclo_id: 'mock-ciclo-3', titulo: 'Reduzir absenteísmo na operação', descricao: 'Meta do time de operações para reduzir faltas injustificadas em 20%.', tipo: 'equipe', valor_objetivo: 20, valor_atual: 11, data_limite: diasAFrente(48), status: 'ativo', created_at: diasAtras(30), updated_at: diasAtras(4) },
];

export function getMockMetas(): MetaMock[] | undefined {
  if (!isDesempenhoMockEnabled()) return undefined;
  return METAS.map((m) => ({ ...m, empresa_id: EMPRESA, colaborador: colaborador(m.colaborador_id) }));
}

/* ─── Feedbacks 360 (`feedbacks_360`) ──────────────────────────────────────── */

export interface FeedbackMock {
  id: string;
  empresa_id: string;
  ciclo_id: string | null;
  avaliado_id: string;
  avaliador_id: string;
  tipo: string;
  nota_geral: number;
  potencial: number;
  pontos_fortes: string;
  pontos_melhoria: string;
  comentarios: string;
  status: string;
  avaliado: { nome_completo: string };
  avaliador: { nome_completo: string };
  created_at: string;
  updated_at: string;
}

/**
 * Notas e potencial cobrem as cinco faixas (1–5) — a Dashboard agrupa por
 * `Math.round(nota_geral)` (fatia a pizza) e a Nine-Box cruza `nota_geral` e
 * `potencial` (posição na matriz 3×3).
 */
const FEEDBACKS: Omit<FeedbackMock, 'empresa_id' | 'avaliado' | 'avaliador'>[] = [
  { id: 'mock-fb-1', avaliado_id: 'mock-2', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'gestor', nota_geral: 5, potencial: 5, status: 'concluido', pontos_fortes: 'Autonomia técnica e liderança natural.', pontos_melhoria: 'Delegar mais atividades do time.', comentarios: 'Referência técnica do time de frontend.', created_at: diasAtras(6), updated_at: diasAtras(6) },
  { id: 'mock-fb-2', avaliado_id: 'mock-12', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'gestor', nota_geral: 5, potencial: 4, status: 'concluido', pontos_fortes: 'Forte gestão comercial e foco em resultado.', pontos_melhoria: 'Melhorar previsibilidade de forecast.', comentarios: 'Superou a meta de vendas do trimestre.', created_at: diasAtras(5), updated_at: diasAtras(5) },
  { id: 'mock-fb-3', avaliado_id: 'mock-5', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'gestor', nota_geral: 4, potencial: 4, status: 'concluido', pontos_fortes: 'Rigor com números e organização.', pontos_melhoria: 'Abrir mais espaço para inovação.', comentarios: 'Entrega consistente no fechamento contábil.', created_at: diasAtras(9), updated_at: diasAtras(9) },
  { id: 'mock-fb-4', avaliado_id: 'mock-6', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'par', nota_geral: 4, potencial: 5, status: 'concluido', pontos_fortes: 'Criatividade e domínio das ferramentas de design.', pontos_melhoria: 'Cumprir prazos de revisão.', comentarios: 'Alto potencial para liderança de projetos.', created_at: diasAtras(11), updated_at: diasAtras(11) },
  { id: 'mock-fb-5', avaliado_id: 'mock-9', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'par', nota_geral: 3, potencial: 4, status: 'concluido', pontos_fortes: 'Boa análise de dados.', pontos_melhoria: 'Comunicação de resultados para leigos.', comentarios: 'Em desenvolvimento na apresentação executiva.', created_at: diasAtras(14), updated_at: diasAtras(14) },
  { id: 'mock-fb-6', avaliado_id: 'mock-4', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'gestor', nota_geral: 3, potencial: 3, status: 'concluido', pontos_fortes: 'Bom relacionamento interpessoal.', pontos_melhoria: 'Assumir mais protagonismo em projetos.', comentarios: 'Colaborador estável e confiável.', created_at: diasAtras(16), updated_at: diasAtras(16) },
  { id: 'mock-fb-7', avaliado_id: 'mock-10', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'par', nota_geral: 4, potencial: 3, status: 'concluido', pontos_fortes: 'Disciplina operacional.', pontos_melhoria: 'Desenvolver visão estratégica.', comentarios: 'Executa muito bem o plano definido.', created_at: diasAtras(18), updated_at: diasAtras(18) },
  { id: 'mock-fb-8', avaliado_id: 'mock-3', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-2', tipo: 'gestor', nota_geral: 5, potencial: 5, status: 'concluido', pontos_fortes: 'Visão financeira estratégica.', pontos_melhoria: 'Descentralizar decisões operacionais.', comentarios: 'Destaque do semestre na área financeira.', created_at: diasAtras(120), updated_at: diasAtras(120) },
  { id: 'mock-fb-9', avaliado_id: 'mock-8', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-2', tipo: 'par', nota_geral: 3, potencial: 3, status: 'concluido', pontos_fortes: 'Comprometimento com prazos.', pontos_melhoria: 'Aprofundar conhecimento técnico.', comentarios: 'Evolução consistente ao longo do ciclo.', created_at: diasAtras(125), updated_at: diasAtras(125) },
  { id: 'mock-fb-10', avaliado_id: 'mock-7', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'auto', nota_geral: 2, potencial: 3, status: 'concluido', pontos_fortes: 'Autocrítica e vontade de aprender.', pontos_melhoria: 'Precisa elevar a qualidade das entregas.', comentarios: 'Autoavaliação apontou oportunidades claras.', created_at: diasAtras(20), updated_at: diasAtras(20) },
  { id: 'mock-fb-11', avaliado_id: 'mock-11', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'subordinado', nota_geral: 2, potencial: 2, status: 'pendente', pontos_fortes: 'Pontualidade e cordialidade.', pontos_melhoria: 'Reciclagem nas rotinas administrativas.', comentarios: 'Plano de melhoria em discussão com o gestor.', created_at: diasAtras(22), updated_at: diasAtras(22) },
  { id: 'mock-fb-12', avaliado_id: 'mock-1', avaliador_id: 'mock-13', ciclo_id: 'mock-ciclo-3', tipo: 'gestor', nota_geral: 5, potencial: 4, status: 'concluido', pontos_fortes: 'Referência em processos de RH.', pontos_melhoria: 'Delegar rotinas operacionais.', comentarios: 'Excelente apoio às lideranças.', created_at: diasAtras(4), updated_at: diasAtras(4) },
  { id: 'mock-fb-13', avaliado_id: 'mock-2', avaliador_id: 'mock-6', ciclo_id: 'mock-ciclo-3', tipo: 'par', nota_geral: 4, potencial: 5, status: 'concluido', pontos_fortes: 'Colaboração entre equipes.', pontos_melhoria: 'Poderia mentorar colegas júniores.', comentarios: 'Feedback de par elogiando o apoio técnico.', created_at: diasAtras(8), updated_at: diasAtras(8) },
];

export function getMockFeedbacks(): FeedbackMock[] | undefined {
  if (!isDesempenhoMockEnabled()) return undefined;
  return FEEDBACKS.map((f) => ({
    ...f,
    empresa_id: EMPRESA,
    avaliado: colaborador(f.avaliado_id),
    avaliador: colaborador(f.avaliador_id),
  }));
}

/* ─── PDI (`pdi_plano_desenvolvimento`) ────────────────────────────────────── */

export interface PdiMock {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  titulo: string;
  competencia_foco: string;
  acao_desenvolvimento: string;
  prazo: string;
  status: string;
  comentarios: string;
  colaborador: { nome_completo: string };
  created_at: string;
  updated_at: string;
}

const PDIS: Omit<PdiMock, 'empresa_id' | 'colaborador'>[] = [
  { id: 'mock-pdi-1', colaborador_id: 'mock-2', titulo: 'Trilha de Arquitetura Frontend', competencia_foco: 'Arquitetura de software', acao_desenvolvimento: 'Curso avançado de padrões de projeto + mentoria com o tech lead.', prazo: diasAFrente(45), status: 'em_andamento', comentarios: 'Progresso semanal reportado ao gestor.', created_at: diasAtras(60), updated_at: diasAtras(3) },
  { id: 'mock-pdi-2', colaborador_id: 'mock-9', titulo: 'Comunicação Executiva de Dados', competencia_foco: 'Comunicação', acao_desenvolvimento: 'Workshop de storytelling com dados + apresentação mensal para a diretoria.', prazo: diasAFrente(30), status: 'em_andamento', comentarios: 'Agendada primeira apresentação para o comitê.', created_at: diasAtras(40), updated_at: diasAtras(6) },
  { id: 'mock-pdi-3', colaborador_id: 'mock-11', titulo: 'Reciclagem em Rotinas Administrativas', competencia_foco: 'Organização', acao_desenvolvimento: 'Treinamento interno de processos + acompanhamento quinzenal.', prazo: diasAFrente(20), status: 'pendente', comentarios: 'Aguardando início do próximo ciclo de treinamentos.', created_at: diasAtras(15), updated_at: diasAtras(15) },
  { id: 'mock-pdi-4', colaborador_id: 'mock-4', titulo: 'Liderança de Projetos', competencia_foco: 'Liderança', acao_desenvolvimento: 'Assumir a coordenação de um projeto transversal de onboarding.', prazo: diasAFrente(60), status: 'em_andamento', comentarios: 'Projeto escolhido: revisão da jornada de integração.', created_at: diasAtras(35), updated_at: diasAtras(9) },
  { id: 'mock-pdi-5', colaborador_id: 'mock-8', titulo: 'Certificação Técnica', competencia_foco: 'Conhecimento técnico', acao_desenvolvimento: 'Preparação para certificação da área + simulados.', prazo: '2026-09-30', status: 'concluido', comentarios: 'Certificação obtida com aprovação.', created_at: diasAtras(160), updated_at: diasAtras(20) },
];

export function getMockPdis(): PdiMock[] | undefined {
  if (!isDesempenhoMockEnabled()) return undefined;
  return PDIS.map((p) => ({ ...p, empresa_id: EMPRESA, colaborador: colaborador(p.colaborador_id) }));
}

/* ─── Competências (`competencias_config`) ─────────────────────────────────── */

export interface CompetenciaMock {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  categoria: 'tecnica' | 'comportamental';
  nivel_esperado: number;
  ativo: boolean;
  created_at: string;
}

const COMPETENCIAS: Omit<CompetenciaMock, 'empresa_id'>[] = [
  { id: 'mock-comp-1', nome: 'Orientação a Resultados', descricao: 'Capacidade de entregar metas com eficiência e consistência.', categoria: 'comportamental', nivel_esperado: 4, ativo: true, created_at: diasAtras(300) },
  { id: 'mock-comp-2', nome: 'Trabalho em Equipe', descricao: 'Colaboração ativa e suporte entre pares.', categoria: 'comportamental', nivel_esperado: 4, ativo: true, created_at: diasAtras(300) },
  { id: 'mock-comp-3', nome: 'Comunicação', descricao: 'Clareza e assertividade na troca de informações.', categoria: 'comportamental', nivel_esperado: 3, ativo: true, created_at: diasAtras(298) },
  { id: 'mock-comp-4', nome: 'Liderança', descricao: 'Capacidade de inspirar e desenvolver pessoas.', categoria: 'comportamental', nivel_esperado: 3, ativo: true, created_at: diasAtras(298) },
  { id: 'mock-comp-5', nome: 'Domínio Técnico', descricao: 'Profundidade nas ferramentas e processos da função.', categoria: 'tecnica', nivel_esperado: 4, ativo: true, created_at: diasAtras(295) },
  { id: 'mock-comp-6', nome: 'Análise de Dados', descricao: 'Interpretação de indicadores para tomada de decisão.', categoria: 'tecnica', nivel_esperado: 3, ativo: true, created_at: diasAtras(295) },
  { id: 'mock-comp-7', nome: 'Inovação', descricao: 'Proposição de melhorias e novas soluções.', categoria: 'comportamental', nivel_esperado: 3, ativo: false, created_at: diasAtras(200) },
];

export function getMockCompetencias(): CompetenciaMock[] | undefined {
  if (!isDesempenhoMockEnabled()) return undefined;
  return COMPETENCIAS.map((c) => ({ ...c, empresa_id: EMPRESA }));
}

/* ─── Trilha de auditoria (`audit_log` da aba Auditoria) ───────────────────── */

export interface DesempenhoAuditMock {
  id: string;
  tabela: string;
  acao: string;
  user_email: string | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
}

const EMAIL_RH = 'rh.promobrindes@empresa.com.br';
const EMAIL_GESTOR = 'gestor.regional@empresa.com.br';
const EMAIL_SISTEMA = null;

/** Tabelas cobertas pela consulta do `PerformanceAuditTimeline`. */
const AUDIT_LOGS: DesempenhoAuditMock[] = [
  { id: 'mock-dp-aud-1', tabela: 'feedbacks_360', acao: 'INSERT', user_email: EMAIL_GESTOR, dados_novos: { avaliado: 'Carlos Eduardo Lima', nota_geral: 5, tipo: 'gestor' }, created_at: horasAtras(3) },
  { id: 'mock-dp-aud-2', tabela: 'metas_okrs', acao: 'UPDATE', user_email: EMAIL_GESTOR, dados_novos: { titulo: 'Aumentar vendas da região Sudeste', valor_atual: 138 }, created_at: horasAtras(6) },
  { id: 'mock-dp-aud-3', tabela: 'pdis', acao: 'INSERT', user_email: EMAIL_RH, dados_novos: { colaborador: 'Rafaela Cristina Gomes', competencia_foco: 'Comunicação' }, created_at: horasAtras(11) },
  { id: 'mock-dp-aud-4', tabela: 'ciclos_avaliacao', acao: 'UPDATE', user_email: EMAIL_RH, dados_novos: { nome: 'Ciclo S2 2026', status: 'ativo' }, created_at: horasAtras(20) },
  { id: 'mock-dp-aud-5', tabela: 'competencias_matriz', acao: 'INSERT', user_email: EMAIL_RH, dados_novos: { nome: 'Análise de Dados', categoria: 'tecnica' }, created_at: horasAtras(28) },
  { id: 'mock-dp-aud-6', tabela: 'feedbacks_360', acao: 'UPDATE', user_email: EMAIL_GESTOR, dados_novos: { avaliado: 'William Nunes Cardoso', potencial: 4 }, created_at: horasAtras(33) },
  { id: 'mock-dp-aud-7', tabela: 'metas_okrs', acao: 'INSERT', user_email: EMAIL_GESTOR, dados_novos: { titulo: 'Reduzir absenteísmo na operação', tipo: 'equipe' }, created_at: horasAtras(41) },
  { id: 'mock-dp-aud-8', tabela: 'pdis', acao: 'UPDATE', user_email: EMAIL_RH, dados_novos: { colaborador: 'Lucas Gabriel Fernandes', status: 'em_andamento' }, created_at: diasAtras(3) },
  { id: 'mock-dp-aud-9', tabela: 'feedbacks_360', acao: 'DELETE', user_email: EMAIL_SISTEMA, dados_novos: null, created_at: diasAtras(4) },
  { id: 'mock-dp-aud-10', tabela: 'ciclos_avaliacao', acao: 'INSERT', user_email: EMAIL_RH, dados_novos: { nome: 'Avaliação de Experiência 90 dias', tipo: 'experiencia' }, created_at: diasAtras(5) },
];

export function getMockDesempenhoAudit(): DesempenhoAuditMock[] | undefined {
  return isDesempenhoMockEnabled() ? AUDIT_LOGS : undefined;
}

/* ─── Guard de escrita (a UI nunca grava dados fictícios no banco) ─────────── */

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`id`, `empresa_id` e `colaborador_id` não existem
 * no banco): gravar criaria lixo, falharia por FK ou deixaria um registro órfão.
 * Devolve `true` quando a ação deve ser ABORTADA, então o chamador só precisa de
 * `if (bloquearEscritaDesempenho('...')) return;`.
 */
export function bloquearEscritaDesempenho(acao: string): boolean {
  if (!isDesempenhoMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os dados de desempenho exibidos são fictícios.`);
  return true;
}
