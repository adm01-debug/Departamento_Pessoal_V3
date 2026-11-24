/**
 * Dados fictícios para validação visual do Dashboard.
 *
 * ESCOPO: exclusivamente apresentação — nenhuma query, hook, API ou linha do
 * Supabase é tocada. Este módulo só é consultado quando
 * `isDashboardMockEnabled()` é verdadeiro, o que exige as DUAS condições:
 *   1. `import.meta.env.DEV` (build de desenvolvimento)
 *   2. `VITE_DASHBOARD_MOCK=true` no `.env`/`.env.local`
 * Com qualquer uma das duas ausente — incluindo sempre em produção — este
 * módulo é inerte e o Dashboard usa 100% dados reais, exatamente como antes.
 *
 * Para desativar: apague `VITE_DASHBOARD_MOCK` do seu `.env.local` (ou defina
 * como `false`) e reinicie o `vite dev`. Para remover de vez: delete este
 * arquivo e os pequenos trechos marcados com "MOCK VISUAL" nos componentes
 * listados no cabeçalho de cada um.
 *
 * Cenário: empresa fictícia de ~42 colaboradores ativos, todos os números
 * (headcount, departamentos, admissões/demissões, turnover, absenteísmo,
 * passivo) derivam do mesmo conjunto coerente abaixo — não são sorteados
 * independentemente.
 */

/**
 * Ativa o mock apenas em dev e apenas com o opt-in explícito da env var.
 *
 * `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local` que o
 * `vite dev` (não há isolamento automático), então sem essa guarda os testes
 * unitários dos componentes do Dashboard passam a receber estes dados
 * fictícios em vez do mock que cada teste configura via `useQuery`, quebrando
 * suítes que nada têm a ver com esta feature sempre que `VITE_DASHBOARD_MOCK`
 * estiver ligado localmente.
 */
export function isDashboardMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_DASHBOARD_MOCK === 'true';
}

/* ─── Base coerente do cenário fictício ─────────────────────────────────
 * Departamentos somam exatamente `colaboradoresAtivos`; a evolução de 6
 * meses (admissões − demissões por mês) soma o saldo líquido do período. */
const COLABORADORES_ATIVOS = 42;

const DEPARTAMENTOS = [
  { nome: 'Comercial', count: 12 },
  { nome: 'Operações', count: 9 },
  { nome: 'Tecnologia', count: 7 },
  { nome: 'Financeiro', count: 6 },
  { nome: 'Recursos Humanos', count: 5 },
  { nome: 'Marketing', count: 3 },
]; // soma = 42

const EVOLUCAO_6_MESES = [
  { mes: 'Abr/26', admissoes: 3, demissoes: 1, saldo: 2 },
  { mes: 'Mai/26', admissoes: 2, demissoes: 2, saldo: 0 },
  { mes: 'Jun/26', admissoes: 4, demissoes: 1, saldo: 3 },
  { mes: 'Jul/26', admissoes: 2, demissoes: 3, saldo: -1 },
  { mes: 'Ago/26', admissoes: 3, demissoes: 1, saldo: 2 },
  { mes: 'Set/26', admissoes: 4, demissoes: 2, saldo: 2 },
]; // saldo líquido do período = +8 (42 - 8 = 34 há 6 meses)

/** `DashboardStats` — KPIs, Visão Geral, Departamentos, Passivo, Saúde RH. */
export const mockDashboardStats = {
  colaboradoresAtivos: COLABORADORES_ATIVOS,
  folhaMensal: 312_400,
  feriasPendentes: 6,
  bancoHoras: 38,
  turnover: 4.2,
  absenteismo: 2.8,
  headcount: COLABORADORES_ATIVOS,
  admissoesMes: EVOLUCAO_6_MESES[EVOLUCAO_6_MESES.length - 1].admissoes,
  demissoesMes: EVOLUCAO_6_MESES[EVOLUCAO_6_MESES.length - 1].demissoes,
  departamentos: DEPARTAMENTOS,
  passivoTotal: 187_320,
};

/** Alimenta `HeadcountOverviewCard` (gráfico "Visão Geral da Empresa"). */
export const mockEvolucao = EVOLUCAO_6_MESES;

/** `Pendencia[]` — cartão "Ações em Destaque". */
export const mockPendencias = [
  { tipo: 'ferias', descricao: '6 férias pendentes', quantidade: 6, icone: 'ferias' as const },
  { tipo: 'afastamentos', descricao: '2 afastamentos ativos', quantidade: 2, icone: 'afastamentos' as const },
  { tipo: 'admissoes', descricao: '3 admissões em curso', quantidade: 3, icone: 'admissoes' as const },
  { tipo: 'assinaturas', descricao: '5 assinaturas pendentes', quantidade: 5, icone: 'assinaturas' as const },
  { tipo: 'ponto', descricao: '4 ajustes de ponto', quantidade: 4, icone: 'ponto' as const },
];

/** Formato de `useSystemHealth()` — cartão "Status do Sistema". */
export const mockSystemHealth = {
  latency: 42,
  status: 'online' as const,
  metrics: { success_rate: 99.2, avg_latency: 38, recent_failures: 0 },
};

/** Formato de `useMorningBriefing()` — cartão "Próximos Eventos". */
export const mockMorningBriefing = {
  aniversariantes: [
    { nome: 'Marina Costa', dia: new Date().getDate() }, // aniversariante "hoje" — testa o banner
    { nome: 'Rafael Souza', dia: ((new Date().getDate() + 12) % 28) + 1 },
  ],
  feriasPeriodo: [
    { nome: 'Camila Rocha', inicio: '2026-09-05', fim: '2026-09-20' },
    { nome: 'Bruno Alves', inicio: '2026-09-10', fim: '2026-09-24' },
  ],
  afastadosHoje: [{ nome: 'Juliana Mendes', tipo: 'Atestado médico' }],
  admissoesHoje: [{ nome: 'Pedro Lima', cargo: 'Analista de Vendas' }],
  vencimentosHoje: [{ descricao: 'Exame Periódico de Ana Paula — 12/09', tipo: 'exame' }],
  totalAtivos: COLABORADORES_ATIVOS,
  pontosRegistradosHoje: 39,
  esocialHealth: 97,
};

/** Formato de `viewsService.alertasRH()` — cartão "Alertas de RH". */
export const mockAlertasRH = [
  { descricao: '3 colaboradores sem endereço cadastrado', tipo: 'cadastro_incompleto', prioridade: 'media' },
  { descricao: 'Exame periódico vencendo em 5 dias — Ana Paula', tipo: 'exame_vencendo', prioridade: 'alta' },
  { descricao: 'Assinatura de contrato pendente há 4 dias', tipo: 'assinatura_pendente', prioridade: 'media' },
  { descricao: '2 batidas de ponto sem justificativa', tipo: 'ponto_pendente', prioridade: 'baixa' },
];

/** Formato de `TimelineEvent[]` — cartão "Atividade Recente" (só em /dashboard). */
function horasAtras(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

export const mockTimelineEvents = [
  { id: 'mock-1', title: 'Colaboradores: INSERT', description: 'Novo colaborador cadastrado: Pedro Lima', raw_time: horasAtras(1), type: 'admissao' as const },
  { id: 'mock-2', title: 'Ferias: UPDATE', description: 'Férias aprovadas para Camila Rocha', raw_time: horasAtras(3), type: 'ferias' as const },
  { id: 'mock-3', title: 'Alerta Portaria 671: GEOFENCING', description: 'Batida fora do perímetro autorizado', raw_time: horasAtras(19), type: 'geofencing' as const },
  { id: 'mock-4', title: 'Batidas_ponto: INSERT', description: 'Ponto registrado por Bruno Alves', raw_time: horasAtras(24), type: 'ponto' as const },
  { id: 'mock-5', title: 'Desligamentos: INSERT', description: 'Desligamento processado: Marcos Vieira', raw_time: horasAtras(46), type: 'demissao' as const },
].map(e => ({ ...e, time: formatRelativeLabel(e.raw_time) }));

function formatRelativeLabel(iso: string): string {
  const d = new Date(iso);
  const hoursAgo = Math.round((Date.now() - d.getTime()) / (60 * 60 * 1000));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (hoursAgo < 20) return `${hh}:${mm}`;
  if (hoursAgo < 40) return `ontem, ${hh}:${mm}`;
  return `${Math.round(hoursAgo / 24)} dias atrás`;
}
