/**
 * ============================================================================
 * MOCK VISUAL — Módulo Admissões (Dashboard, Gestão de Candidatos, Kanban,
 * Onboarding, Auditoria e drawers/detalhes).
 *
 * ESCOPO: exclusivamente apresentação/validação de layout. Nenhuma linha é
 * gravada no Supabase: todas as leituras usadas pelas telas do módulo são
 * curto-circuitadas com estes dados fictícios e as ESCRITAS disparadas pela UI
 * (Nova Admissão, drag-and-drop do Kanban, "Concluir" de tarefa) são absorvidas
 * em memória pelos guards exportados no fim deste arquivo.
 *
 * GATE (mesmo padrão de src/mocks/dashboardMockData.ts e colaboradoresMock.ts):
 * ativo somente com as DUAS condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento)
 *   2. `VITE_ADMISSOES_MOCK=true` no `.env`/`.env.local`
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev`, então sem ela os testes unitários do módulo (que configuram
 * seus próprios mocks) passariam a receber estes dados fictícios.
 *
 * PARA DESATIVAR: remova/defina `VITE_ADMISSOES_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`. PARA REMOVER DE VEZ: apague este arquivo e os trechos
 * marcados com "MOCK VISUAL — ver src/mocks/admissoesMock.ts" nos arquivos:
 *   • src/hooks/useAdmissoes.ts
 *   • src/hooks/useAdmissaoWorkflow.ts
 *   • src/hooks/useESocial.ts                (envio do S-2200)
 *   • src/hooks/useContratacaoDigital.ts     (validação de documento)
 *   • src/services/admissaoService.ts
 *   • src/services/contratacaoService.ts
 *   • src/pages/AdmissoesPage.tsx            (aba Auditoria + envio de link)
 *   • src/pages/OnboardingPage.tsx           (rota /onboarding)
 *   • src/components/admissoes/OnboardingPageContent.tsx
 *   • src/components/admissoes/OnboardingDashboard.tsx
 *
 * CENÁRIO: mesma empresa fictícia do restante dos mocks (`mock-empresa-1`) e a
 * mesma carteira de nomes do seed `20260730000000_seed_admissao_onboarding_...`
 * para os registros já existentes no banco de demonstração.
 *
 * INTEGRAÇÕES ABSORVIDAS: nenhuma ação da UI chega ao backend com um id
 * fictício — "Enviar Link"/"WhatsApp" (AdmissoesPage + contratacaoService),
 * "Transmitir Agora" do eSocial (useESocial) e a validação de documento do
 * drawer (useContratacaoDigital) são curto-circuitadas por estes guards, que
 * atualizam somente o estado em memória e devolvem recibo demonstrativo.
 * ============================================================================
 */

/** Colunas de `etapa` suportadas pelo módulo (as 8 do Kanban + 2 finais). */
export type EtapaAdmissao =
  | 'solicitacao'
  | 'documentos'
  | 'validacao'
  | 'pendente'
  | 'exame'
  | 'contrato'
  | 'assinatura'
  | 'esocial'
  | 'concluida'
  | 'cancelada';

export type StatusAdmissao = 'rascunho' | 'em_andamento' | 'concluido' | 'cancelado';
export type StatusESocial = 'pendente' | 'enviado';
export type StatusAuditoria = 'sucesso' | 'pendente' | 'falha';

export interface MockAdmissao {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  estado_civil: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';
  data_nascimento: string;
  cargo: string;
  departamento: string;
  salario_proposto: number;
  data_prevista: string;
  etapa: EtapaAdmissao;
  status: StatusAdmissao;
  observacoes: string;
  // Checklist (espelha as colunas reais de public.admissoes)
  checklist_documentos_pessoais: boolean;
  checklist_comprovante_endereco: boolean;
  checklist_foto: boolean;
  checklist_ctps: boolean;
  checklist_exame_admissional: boolean;
  checklist_contrato_assinado: boolean;
  checklist_esocial_enviado: boolean;
  // eSocial (S-2200)
  status_esocial: StatusESocial;
  protocolo_esocial: string | null;
  data_transmissao_esocial: string | null;
  metadata: {
    responsavel: string;
    origem_candidato: string;
    tipo_contrato: string;
    jornada: string;
    local_trabalho: string;
    pendencia: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface MockTarefaOnboarding {
  id: string;
  admissao_id: string;
  titulo: string;
  descricao: string;
  responsavel_id: null;
  responsavel_nome: string;
  prazo_dias: number;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string;
}

export interface MockWorkflowHistorico {
  id: string;
  execucao_id: string;
  acao: string;
  observacoes: string;
  created_at: string;
}

export interface MockWorkflowExecucao {
  id: string;
  workflow_id: string;
  empresa_id: string;
  entidade_id: string;
  entidade_tipo: 'admissao';
  status: 'em_andamento';
  etapa_atual: number;
  workflow: { id: string; nome: string; descricao: string };
  historico: MockWorkflowHistorico[];
}

export interface MockAuditoriaAdmissao {
  id: string;
  data_hora: string;
  candidato: string;
  cargo: string;
  departamento: string;
  acao: string;
  etapa: EtapaAdmissao;
  evento_esocial: string | null;
  protocolo: string | null;
  status: StatusAuditoria;
  responsavel: string;
  detalhe: string;
}

/**
 * Ativa o mock apenas em dev e apenas com o opt-in explícito da env var.
 * Ver o cabeçalho para o motivo da guarda `MODE !== 'test'`.
 */
export function isAdmissoesMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_ADMISSOES_MOCK === 'true';
}

/** Ids gerados por este módulo (admissões, tarefas e execuções de workflow). */
export function isMockId(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith('mock-');
}

/** Empresa fictícia — mesmo tenant de demonstração de `colaboradoresMock.ts`. */
const EMPRESA_MOCK_ID = 'mock-empresa-1';

/* ─── Base coerente do cenário fictício ─────────────────────────────────────
 * Uma única tabela de sementes gera TODOS os dados do módulo (admissões,
 * tarefas de onboarding, histórico do workflow e trilha de auditoria), então os
 * números batem entre as abas: 40 admissões → 8 colunas do Kanban com 4–5 cards
 * cada, 5 concluídas e 2 canceladas (33 em andamento no Dashboard). */

type SeedAdmissao = readonly [
  nome: string,
  cargo: string,
  departamento: string,
  salario: number,
  dataPrevista: string,
  etapa: EtapaAdmissao,
  responsavel: string,
  pendencia?: string,
];

const SEED: readonly SeedAdmissao[] = [
  // ── eSocial (5) ──────────────────────────────────────────────────────────
  ['Ana Silva Santos', 'Analista de Marketing', 'Marketing', 3800, '2026-03-02', 'esocial', 'Camila Ribeiro'],
  ['Pedro Almeida Souza', 'Analista de TI', 'TI', 5000, '2026-04-06', 'esocial', 'Marcos Tavares'],
  ['Diego Ramos Siqueira', 'Motorista', 'Operações', 2600, '2026-06-15', 'esocial', 'Bruno Cardoso'],
  ['Olívia Martins Rangel', 'Gerente de Projetos', 'TI', 11200, '2026-06-22', 'esocial', 'Patrícia Nogueira'],
  [
    'Débora Figueiredo Antunes',
    'Analista de Contas a Pagar',
    'Financeiro',
    4100,
    '2026-12-28',
    'esocial',
    'Bruno Cardoso',
  ],
  // ── Concluídas (5) ───────────────────────────────────────────────────────
  ['Maria Oliveira Lima', 'Analista de RH', 'RH', 4200, '2026-01-19', 'concluida', 'Patrícia Nogueira'],
  ['Ricardo Costa Pereira', 'Analista de Vendas', 'Comercial', 3500, '2025-11-10', 'concluida', 'Thiago Barros'],
  ['Juliana Mendes Rocha', 'Analista Financeiro', 'Financeiro', 4500, '2025-12-01', 'concluida', 'Renata Alves'],
  ['Elaine Cristina Prado', 'Coordenadora Comercial', 'Comercial', 9100, '2026-05-18', 'concluida', 'Camila Ribeiro'],
  ['Caio Ferreira Bandeira', 'Representante Comercial', 'Comercial', 3600, '2026-01-05', 'concluida', 'Elaine Prado'],
  // ── Assinatura (4) ───────────────────────────────────────────────────────
  [
    'João Pedro Santos',
    'Assistente Administrativo',
    'Administrativo',
    2100,
    '2026-02-16',
    'assinatura',
    'Diego Martins',
  ],
  ['Carla Souza Ferreira', 'Analista de Marketing', 'Marketing', 3800, '2026-05-04', 'assinatura', 'Elaine Prado'],
  ['Nathan Oliveira Reis', 'Assistente Fiscal', 'Contabilidade', 2700, '2026-07-13', 'assinatura', 'Diego Martins'],
  ['André Luiz Furtado', 'Técnico de Suporte', 'TI', 3100, '2026-04-13', 'assinatura', 'Renata Alves'],
  // ── Contrato (4) ─────────────────────────────────────────────────────────
  [
    'Fernanda Ribeiro Alves',
    'Contadora',
    'Contabilidade',
    6200,
    '2026-07-06',
    'contrato',
    'Camila Ribeiro',
    'Aguardando assinatura do gestor imediato',
  ],
  ['Camila Fontes Barreto', 'Especialista em BI', 'TI', 8600, '2026-09-21', 'contrato', 'Elaine Prado'],
  ['Rodrigo Estevão Lira', 'Analista de Infraestrutura', 'TI', 6900, '2026-03-16', 'contrato', 'Marcos Tavares'],
  ['Beatriz Prado Camargo', 'Analista de Benefícios', 'Financeiro', 4200, '2026-02-23', 'contrato', 'Marcos Tavares'],
  // ── Exame (4) ────────────────────────────────────────────────────────────
  ['Lucas Ferreira Lima', 'Assistente de Logística', 'Operações', 2300, '2026-06-01', 'exame', 'Bruno Cardoso'],
  ['Bruno Henrique Sales', 'Analista de Qualidade', 'Operações', 3900, '2026-07-20', 'exame', 'Marcos Tavares'],
  ['Mariana Souza Tavares', 'Enfermeira do Trabalho', 'Operações', 6800, '2026-08-10', 'exame', 'Camila Ribeiro'],
  ['Zélia Barbosa Marinho', 'Auxiliar de Departamento Pessoal', 'RH', 2300, '2026-06-08', 'exame', 'Thiago Barros'],
  // ── Pendente (4) ─────────────────────────────────────────────────────────
  [
    'Aline Cristina Duarte',
    'Analista Contábil',
    'Contabilidade',
    4300,
    '2026-08-03',
    'pendente',
    'Renata Alves',
    'Aguardando comprovante de residência atualizado',
  ],
  [
    'Jéssica Almeida Campos',
    'Assistente de RH',
    'RH',
    2450,
    '2026-09-28',
    'pendente',
    'Marcos Tavares',
    'Exame admissional reagendado pelo candidato',
  ],
  [
    'Paulo Cesar Bittencourt',
    'Analista de Logística',
    'Operações',
    4000,
    '2026-05-11',
    'pendente',
    'Thiago Barros',
    'CNH vencida — solicitar renovação',
  ],
  [
    'Yasmin Ferraz Coutinho',
    'Analista Jurídico',
    'Jurídico',
    5400,
    '2026-09-07',
    'pendente',
    'Patrícia Nogueira',
    'Falta cópia autenticada do diploma',
  ],
  // ── Validação (4) ────────────────────────────────────────────────────────
  [
    'Gustavo Nunes Barbosa',
    'Técnico de Segurança do Trabalho',
    'Operações',
    3400,
    '2026-09-14',
    'validacao',
    'Diego Martins',
  ],
  ['Igor Moreira Pacheco', 'Supervisor de Produção', 'Operações', 7400, '2026-12-07', 'validacao', 'Renata Alves'],
  ['Sabrina Correia Melo', 'Analista de Treinamento', 'RH', 4400, '2026-03-09', 'validacao', 'Elaine Prado'],
  ['Vanessa Lima Portela', 'Analista de Vendas', 'Comercial', 3300, '2026-12-14', 'validacao', 'Camila Ribeiro'],
  // ── Documentos (4) ───────────────────────────────────────────────────────
  [
    'Rafael Teixeira Moura',
    'Designer Gráfico',
    'Marketing',
    4100,
    '2026-08-17',
    'documentos',
    'Thiago Barros',
    'Portfólio e comprovante de residência pendentes',
  ],
  ['Helena Cardoso Brito', 'Recepcionista', 'Administrativo', 2050, '2026-10-26', 'documentos', 'Thiago Barros'],
  ['Leonardo Peixoto Cunha', 'Analista de E-commerce', 'Marketing', 4200, '2026-10-19', 'documentos', 'Bruno Cardoso'],
  ['Wesley Sousa Andrade', 'Conferente de Estoque', 'Operações', 2200, '2026-11-09', 'documentos', 'Diego Martins'],
  // ── Solicitação (4) ──────────────────────────────────────────────────────
  ['Patrícia Gomes Vieira', 'Advogada Júnior', 'Jurídico', 5800, '2026-10-05', 'solicitacao', 'Patrícia Nogueira'],
  [
    'Gabriela Monteiro Pinto',
    'Analista de Suprimentos',
    'Operações',
    4700,
    '2026-11-16',
    'solicitacao',
    'Patrícia Nogueira',
  ],
  ['Kátia Regina Lopes', 'Analista de Departamento Pessoal', 'RH', 3900, '2026-11-30', 'solicitacao', 'Elaine Prado'],
  ['Tiago Nogueira Farias', 'Comprador Técnico', 'Administrativo', 5100, '2027-01-18', 'solicitacao', 'Bruno Cardoso'],
  // ── Canceladas (2) ───────────────────────────────────────────────────────
  [
    'Felipe Andrade Correia',
    'Auxiliar de Expedição',
    'Operações',
    1850,
    '2026-02-02',
    'cancelada',
    'Diego Martins',
    'Candidato desistiu da vaga',
  ],
  [
    'Queila Santana Rocha',
    'Auxiliar de Serviços Gerais',
    'Administrativo',
    1750,
    '2026-04-27',
    'cancelada',
    'Renata Alves',
    'Vaga congelada por revisão de orçamento',
  ],
];

/* ─── Pools auxiliares (rotativos, para variar os textos do layout) ───────── */

const ORIGENS = [
  'LinkedIn',
  'Indicação interna',
  'Site da empresa',
  'Gupy',
  'Banco de talentos',
  'Feira de carreiras',
  'Instagram',
];
const TIPOS_CONTRATO = [
  'CLT — Prazo Indeterminado',
  'CLT — Prazo Determinado',
  'CLT — Experiência 45+45',
  'Aprendiz',
  'Estágio',
];
const JORNADAS = ['44h semanais', '40h semanais', '36h semanais', '30h semanais', '12x36'];
const LOCAIS = [
  'Matriz — São Paulo/SP',
  'Filial — Campinas/SP',
  'CD — Guarulhos/SP',
  'Híbrido (2x por semana)',
  'Obra — Osasco/SP',
];
const ESTADOS_CIVIS: MockAdmissao['estado_civil'][] = ['solteiro', 'casado', 'divorciado', 'uniao_estavel', 'viuvo'];
/** Time fictício de DP/RH usado como responsável pelas tarefas de integração. */
const RESPONSAVEIS_RH = [
  'Camila Ribeiro',
  'Diego Martins',
  'Patrícia Nogueira',
  'Thiago Barros',
  'Renata Alves',
  'Marcos Tavares',
  'Elaine Prado',
  'Bruno Cardoso',
];

const OBSERVACOES_POR_ETAPA: Record<EtapaAdmissao, string> = {
  solicitacao: 'Requisição de vaga aprovada pelo gestor — aguardando triagem de currículos.',
  documentos: 'Link seguro enviado ao candidato com a lista de documentos obrigatórios.',
  validacao: 'Documentos recebidos e em conferência pelo Departamento Pessoal.',
  pendente: 'Processo travado: candidato não retornou a pendência dentro do prazo combinado.',
  exame: 'ASO agendado na clínica parceira — aguardando resultado para liberar o contrato.',
  contrato: 'Minuta de contrato gerada a partir do template CLT e revisada pelo jurídico.',
  assinatura: 'Contrato na plataforma de assinatura digital — link válido por 7 dias.',
  esocial: 'Admissão transmitida ao eSocial (S-2200) com recibo de protocolo registrado.',
  concluida: 'Colaborador integrado à folha, ao ponto e ao plano de benefícios.',
  cancelada: 'Processo encerrado sem contratação — histórico mantido para auditoria.',
};

/**
 * Checklist por etapa:
 * [docsPessoais, comprovante, foto, ctps, exame, contrato, esocial]
 * Garante progressos diferentes na aba "Documentos" de cada drawer.
 */
const CHECKLIST_POR_ETAPA: Record<EtapaAdmissao, readonly boolean[]> = {
  solicitacao: [false, false, false, false, false, false, false],
  documentos: [true, false, false, false, false, false, false],
  validacao: [true, true, true, false, false, false, false],
  pendente: [true, true, false, true, false, false, false],
  exame: [true, true, true, true, true, false, false],
  contrato: [true, true, true, true, true, true, false],
  assinatura: [true, true, true, true, true, true, false],
  esocial: [true, true, true, true, true, true, true],
  concluida: [true, true, true, true, true, true, true],
  cancelada: [true, false, false, false, false, false, false],
};

const STATUS_POR_ETAPA: Record<EtapaAdmissao, StatusAdmissao> = {
  solicitacao: 'em_andamento',
  documentos: 'em_andamento',
  validacao: 'em_andamento',
  pendente: 'em_andamento',
  exame: 'em_andamento',
  contrato: 'em_andamento',
  assinatura: 'em_andamento',
  esocial: 'em_andamento',
  concluida: 'concluido',
  cancelada: 'cancelado',
};

/** Progresso do workflow usado no histórico do drawer (1..9). */
const TOTAL_PASSOS_WORKFLOW = 9;

/** Etapas em que o colaborador já está em jornada de onboarding. */
const ETAPAS_ONBOARDING: readonly EtapaAdmissao[] = ['contrato', 'assinatura', 'esocial', 'concluida'];

/** Tarefas de integração (títulos alinhados ao seed oficial do banco demo). */
const TAREFAS_ONBOARDING: readonly { titulo: string; descricao: string }[] = [
  {
    titulo: 'Boas-vindas com o gestor imediato',
    descricao: 'Reunião de 30 min para alinhar expectativas e rotina da área.',
  },
  {
    titulo: 'Entrega de notebook e acessórios',
    descricao: 'Kit de equipamentos conferido e assinado no termo de responsabilidade.',
  },
  {
    titulo: 'Configuração de acessos (e-mail, VPN, ERP)',
    descricao: 'Criação das contas corporativas e liberação de perfis no sistema.',
  },
  {
    titulo: 'Assinatura do contrato de trabalho',
    descricao: 'Contrato digital assinado na plataforma e arquivado no dossiê.',
  },
  { titulo: 'Cadastro no sistema de folha', descricao: 'Dados bancários, dependentes e vínculo conferidos pelo DP.' },
  { titulo: 'Tour pelas instalações', descricao: 'Apresentação das áreas, refeitório e pontos de apoio.' },
  {
    titulo: 'Treinamento de integração e cultura',
    descricao: 'Módulo obrigatório de compliance, LGPD e código de conduta.',
  },
  { titulo: 'Inclusão no plano de saúde', descricao: 'Adesão registrada junto à operadora e carteirinha solicitada.' },
];

const TAREFAS_POR_ETAPA: Record<string, number> = { contrato: 5, assinatura: 6, esocial: 7, concluida: 8 };
const TAREFAS_CONCLUIDAS_POR_ETAPA: Record<string, readonly number[]> = {
  contrato: [1, 2],
  assinatura: [2, 3, 4],
  esocial: [4, 5],
  concluida: [8],
};

/* ─── Derivações determinísticas (mesmos dados a cada reload) ─────────────── */

/** Dia base = data prevista menos N dias (formato YYYY-MM-DD). */
function diaBase(dataPrevista: string, dias: number): string {
  // Ancorado ao meio-dia UTC: a aritmética de dias fica estável e o resultado
  // não depende do fuso do navegador. A formatação manual (em vez de
  // `toISOString().slice(0, 10)`) mantém o arquivo fora da regra
  // `no-restricted-syntax` que proíbe derivar datas de calendário de UTC.
  const d = new Date(`${dataPrevista}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Timestamp ISO a partir de um dia + hora/minuto. */
function ts(dia: string, hora = 9, minuto = 0): string {
  return new Date(`${dia}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00.000Z`).toISOString();
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function emailDe(nome: string): string {
  const partes = semAcento(nome)
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/);
  return `${partes.join('.')}@promobrindes.com.br`;
}

function telefoneDe(i: number): string {
  return `(11) 9${String(8000 + i * 13).slice(-4)}-${String(1000 + i * 29).slice(-4)}`;
}

function cpfDe(i: number): string {
  return `123.456.789-${String(10 + i).padStart(2, '0')}`;
}

function nascimentoDe(i: number): string {
  const ano = 1975 + (i % 25);
  const mes = String((i % 12) + 1).padStart(2, '0');
  const dia = String(((i * 3) % 27) + 1).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function protocoloDe(i: number): string {
  return `S2200-2026-${String(100000 + i * 37)}`;
}

/* ─── Builder da admissão ─────────────────────────────────────────────────── */

function buildAdmissao(seed: SeedAdmissao, i: number): MockAdmissao {
  const [nome, cargo, departamento, salario, dataPrevista, etapa, responsavel, pendencia] = seed;
  const checklist = CHECKLIST_POR_ETAPA[etapa];
  const esocialEnviado = etapa === 'esocial' || etapa === 'concluida';
  const criadoEm = diaBase(dataPrevista, 12 + (i % 25));
  const atualizadoEm = diaBase(dataPrevista, 1 + (i % 8));

  return {
    id: `mock-adm-${String(i + 1).padStart(2, '0')}`,
    empresa_id: EMPRESA_MOCK_ID,
    nome,
    email: emailDe(nome),
    telefone: telefoneDe(i),
    cpf: cpfDe(i),
    estado_civil: ESTADOS_CIVIS[i % ESTADOS_CIVIS.length],
    data_nascimento: nascimentoDe(i),
    cargo,
    departamento,
    salario_proposto: salario,
    data_prevista: dataPrevista,
    etapa,
    status: STATUS_POR_ETAPA[etapa],
    observacoes: pendencia ?? OBSERVACOES_POR_ETAPA[etapa],
    checklist_documentos_pessoais: checklist[0],
    checklist_comprovante_endereco: checklist[1],
    checklist_foto: checklist[2],
    checklist_ctps: checklist[3],
    checklist_exame_admissional: checklist[4],
    checklist_contrato_assinado: checklist[5],
    checklist_esocial_enviado: checklist[6],
    status_esocial: esocialEnviado ? 'enviado' : 'pendente',
    protocolo_esocial: esocialEnviado ? protocoloDe(i) : null,
    data_transmissao_esocial: esocialEnviado ? ts(diaBase(dataPrevista, 3), 11, 20 + (i % 30)) : null,
    metadata: {
      responsavel,
      origem_candidato: ORIGENS[i % ORIGENS.length],
      tipo_contrato: TIPOS_CONTRATO[i % TIPOS_CONTRATO.length],
      jornada: JORNADAS[i % JORNADAS.length],
      local_trabalho: LOCAIS[i % LOCAIS.length],
      pendencia: pendencia ?? null,
    },
    created_at: ts(criadoEm, 9, 10 + (i % 40)),
    updated_at: ts(atualizadoEm, 14, 5 + (i % 45)),
  };
}

/* ─── Builder das tarefas de onboarding ───────────────────────────────────── */

function buildTarefas(admissao: MockAdmissao, i: number): MockTarefaOnboarding[] {
  const total = TAREFAS_POR_ETAPA[admissao.etapa] ?? 0;
  const opcoes = TAREFAS_CONCLUIDAS_POR_ETAPA[admissao.etapa] ?? [0];
  const concluidas = opcoes[i % opcoes.length];

  return TAREFAS_ONBOARDING.slice(0, total).map((tarefa, idx) => ({
    id: `mock-tarefa-${admissao.id}-${idx + 1}`,
    admissao_id: admissao.id,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    responsavel_id: null,
    responsavel_nome:
      idx % 2 === 0 ? admissao.metadata.responsavel : RESPONSAVEIS_RH[(i + idx) % RESPONSAVEIS_RH.length],
    prazo_dias: 2 + ((i + idx) % 8),
    concluida: idx < concluidas,
    concluida_em: idx < concluidas ? ts(diaBase(admissao.data_prevista, 3 - (idx % 3)), 16, 30) : null,
    created_at: ts(diaBase(admissao.data_prevista, 5), 8, 45),
  }));
}

/* ─── Histórico do workflow de admissão (aba "Histórico" do drawer) ───────── */

const PASSOS_WORKFLOW: readonly { acao: string; observacoes: string; etapa: EtapaAdmissao }[] = [
  {
    acao: 'Workflow de admissão iniciado',
    observacoes: 'Processo criado automaticamente a partir da requisição de vaga aprovada.',
    etapa: 'solicitacao',
  },
  {
    acao: 'Documentos solicitados ao candidato',
    observacoes: 'Link seguro enviado por e-mail com a lista de documentos obrigatórios.',
    etapa: 'documentos',
  },
  {
    acao: 'Documentos validados pelo DP',
    observacoes: 'RG/CPF, comprovante de residência e CTPS conferidos e anexados ao dossiê.',
    etapa: 'validacao',
  },
  {
    acao: 'Pendência aberta ao candidato',
    observacoes: 'Notificação automática reenviada por e-mail e WhatsApp com o prazo de retorno.',
    etapa: 'pendente',
  },
  {
    acao: 'Exame admissional agendado',
    observacoes: 'ASO agendado na clínica parceira e resultado anexado ao prontuário.',
    etapa: 'exame',
  },
  {
    acao: 'Contrato gerado',
    observacoes: 'Minuta CLT gerada a partir da proposta aprovada e revisada pelo jurídico.',
    etapa: 'contrato',
  },
  {
    acao: 'Link de assinatura enviado',
    observacoes: 'Assinatura digital liberada ao candidato por 7 dias corridos.',
    etapa: 'assinatura',
  },
  {
    acao: 'Evento S-2200 transmitido ao eSocial',
    observacoes: 'Admissão transmitida com recibo de protocolo registrado no dossiê.',
    etapa: 'esocial',
  },
  {
    acao: 'Onboarding iniciado',
    observacoes: 'Tarefas de integração atribuídas ao gestor imediato e ao RH.',
    etapa: 'concluida',
  },
];

/** Quantos passos do fluxo já foram cumpridos em cada etapa. */
const PASSOS_POR_ETAPA: Record<EtapaAdmissao, number> = {
  solicitacao: 1,
  documentos: 2,
  validacao: 3,
  pendente: 4,
  exame: 5,
  contrato: 6,
  assinatura: 7,
  esocial: 8,
  concluida: 9,
  cancelada: 3,
};

/* ─── Trilha de auditoria (aba "Auditoria") ───────────────────────────────── */

const EVENTO_ATUAL_POR_ETAPA: Record<
  EtapaAdmissao,
  { acao: string; detalhe: string; evento: string | null; status: StatusAuditoria }
> = {
  solicitacao: {
    acao: 'Requisição de vaga registrada',
    detalhe: 'Requisitos e faixa salarial enviados pelo gestor da área.',
    evento: null,
    status: 'pendente',
  },
  documentos: {
    acao: 'Solicitação de documentos enviada',
    detalhe: 'Checklist de documentos disparado para o candidato.',
    evento: null,
    status: 'pendente',
  },
  validacao: {
    acao: 'Documentos validados pelo RH',
    detalhe: 'Documentos pessoais e comprovante de endereço conferidos.',
    evento: null,
    status: 'sucesso',
  },
  pendente: {
    acao: 'Pendência documental identificada',
    detalhe: 'Divergência encontrada na conferência — candidato notificado.',
    evento: null,
    status: 'falha',
  },
  exame: {
    acao: 'Exame admissional agendado',
    detalhe: 'ASO solicitado à clínica parceira com data confirmada.',
    evento: null,
    status: 'pendente',
  },
  contrato: {
    acao: 'Contrato de trabalho gerado',
    detalhe: 'Minuta gerada a partir do template CLT da empresa.',
    evento: null,
    status: 'sucesso',
  },
  assinatura: {
    acao: 'Link de contratação digital enviado',
    detalhe: 'E-mail com assinatura digital disparado ao candidato.',
    evento: null,
    status: 'sucesso',
  },
  esocial: {
    acao: 'Transmissão do evento S-2200',
    detalhe: 'Admissão transmitida ao eSocial com recibo de protocolo.',
    evento: 'S-2200',
    status: 'sucesso',
  },
  concluida: {
    acao: 'Admissão concluída',
    detalhe: 'Colaborador integrado à folha, ponto e benefícios.',
    evento: 'S-2200',
    status: 'sucesso',
  },
  cancelada: {
    acao: 'Admissão cancelada',
    detalhe: 'Processo encerrado sem contratação — vaga reaberta.',
    evento: null,
    status: 'falha',
  },
};

/* ─── Estado em memória (permite interagir no demo sem tocar no banco) ────── */

interface MockAdmissoesState {
  admissoes: MockAdmissao[];
  tarefas: Record<string, MockTarefaOnboarding[]>;
  sequenciaNovos: number;
}

let estado: MockAdmissoesState | null = null;

function garantirEstado(): MockAdmissoesState {
  if (!estado) {
    const admissoes = SEED.map(buildAdmissao);
    const tarefas: Record<string, MockTarefaOnboarding[]> = {};
    admissoes.forEach((admissao, i) => {
      tarefas[admissao.id] = buildTarefas(admissao, i);
    });
    estado = { admissoes, tarefas, sequenciaNovos: 0 };
  }
  return estado;
}

function clonarAdmissao(admissao: MockAdmissao): MockAdmissao {
  return { ...admissao, metadata: { ...admissao.metadata } };
}

/** Ordenação espelhando `admissaoService.listarAdmissoes` (data_prevista DESC). */
function porDataPrevistaDesc(a: MockAdmissao, b: MockAdmissao): number {
  return b.data_prevista.localeCompare(a.data_prevista);
}

/* ─── Leituras usadas pelas telas ─────────────────────────────────────────── */

/** Lista do Dashboard / Gestão de Candidatos / Kanban / filtros. */
export function getMockAdmissoes(): MockAdmissao[] {
  return garantirEstado().admissoes.map(clonarAdmissao).sort(porDataPrevistaDesc);
}

/** Um registro por id (drawer de detalhes). */
export function findMockAdmissao(id?: string | null): MockAdmissao | undefined {
  if (!id) return undefined;
  const encontrada = garantirEstado().admissoes.find((admissao) => admissao.id === id);
  return encontrada ? clonarAdmissao(encontrada) : undefined;
}

/** Payload de `['onboarding-list']`: admissões com `tarefas:tarefas_onboarding(*)`. */
export function getMockOnboarding(): Array<MockAdmissao & { tarefas: MockTarefaOnboarding[] }> {
  const { admissoes, tarefas } = garantirEstado();
  return admissoes
    .filter((admissao) => ETAPAS_ONBOARDING.includes(admissao.etapa))
    .map((admissao) => ({
      ...clonarAdmissao(admissao),
      tarefas: (tarefas[admissao.id] ?? []).map((tarefa) => ({ ...tarefa })),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Execução de workflow + histórico para a aba "Histórico" do drawer. */
export function getMockWorkflow(admissaoId?: string | null): MockWorkflowExecucao | undefined {
  const admissao = findMockAdmissao(admissaoId);
  if (!admissao) return undefined;

  const execucaoId = `mock-wf-exec-${admissao.id}`;
  const passos = PASSOS_POR_ETAPA[admissao.etapa];
  const historico: MockWorkflowHistorico[] = PASSOS_WORKFLOW.slice(0, passos).map((passo, idx) => ({
    id: `${execucaoId}-h${idx + 1}`,
    execucao_id: execucaoId,
    acao: passo.acao,
    observacoes: passo.observacoes,
    created_at: ts(diaBase(admissao.data_prevista, 10 - idx), 9 + (idx % 8), 10 + idx * 5),
  }));

  if (admissao.etapa === 'cancelada') {
    historico.push({
      id: `${execucaoId}-cancelamento`,
      execucao_id: execucaoId,
      acao: 'Fluxo interrompido — admissão cancelada',
      observacoes: admissao.metadata.pendencia ?? 'Processo encerrado pelo RH.',
      created_at: ts(diaBase(admissao.data_prevista, 1), 17, 40),
    });
  }

  return {
    id: execucaoId,
    workflow_id: 'mock-wf-admissao-digital',
    empresa_id: EMPRESA_MOCK_ID,
    entidade_id: admissao.id,
    entidade_tipo: 'admissao',
    // O drawer só conhece dois textos de status ("em andamento" / "aguardando
    // início"), então mantemos o processo sempre como em andamento.
    status: 'em_andamento',
    etapa_atual: Math.min(passos, TOTAL_PASSOS_WORKFLOW),
    workflow: {
      id: 'mock-wf-admissao-digital',
      nome: 'Fluxo de Admissão Digital',
      descricao: 'Solicitação → documentos → validação → exame → contrato → eSocial → onboarding.',
    },
    historico,
  };
}

/* ─── Gráfico "Tempo Médio de Admissão" (série de 12 meses) ───────────────── */

/** Formato esperado por `OnboardingDashboard` (`month`/`days`). */
export const MOCK_TEMPO_MEDIO_ADMISSAO: { month: string; days: number }[] = [
  { month: 'Jan', days: 14 },
  { month: 'Fev', days: 12 },
  { month: 'Mar', days: 15 },
  { month: 'Abr', days: 11 },
  { month: 'Mai', days: 13 },
  { month: 'Jun', days: 10 },
  { month: 'Jul', days: 12 },
  { month: 'Ago', days: 9 },
  { month: 'Set', days: 8 },
  { month: 'Out', days: 11 },
  { month: 'Nov', days: 7 },
  { month: 'Dez', days: 9 },
];

/* ─── Trilha de auditoria exposta para a aba "Auditoria" ─────────────────── */

let auditoriaCache: MockAuditoriaAdmissao[] | null = null;

function buildAuditoria(): MockAuditoriaAdmissao[] {
  const { admissoes } = garantirEstado();
  const eventos: MockAuditoriaAdmissao[] = [];

  admissoes.forEach((admissao) => {
    eventos.push({
      id: `mock-aud-${admissao.id}-criacao`,
      data_hora: admissao.created_at,
      candidato: admissao.nome,
      cargo: admissao.cargo,
      departamento: admissao.departamento,
      acao: 'Processo de admissão criado',
      etapa: 'solicitacao',
      evento_esocial: null,
      protocolo: null,
      status: 'sucesso',
      responsavel: admissao.metadata.responsavel,
      detalhe: `Requisição de vaga registrada para ${admissao.cargo} (${admissao.departamento}).`,
    });

    const eventoAtual = EVENTO_ATUAL_POR_ETAPA[admissao.etapa];
    eventos.push({
      id: `mock-aud-${admissao.id}-atual`,
      data_hora: admissao.updated_at,
      candidato: admissao.nome,
      cargo: admissao.cargo,
      departamento: admissao.departamento,
      acao: eventoAtual.acao,
      etapa: admissao.etapa,
      evento_esocial: eventoAtual.evento,
      protocolo: admissao.protocolo_esocial,
      status: eventoAtual.status,
      responsavel: admissao.metadata.responsavel,
      detalhe: admissao.metadata.pendencia ?? eventoAtual.detalhe,
    });
  });

  return eventos.sort((a, b) => b.data_hora.localeCompare(a.data_hora));
}

/** Trilha de auditoria fictícia (mais recentes primeiro). */
export function getMockAuditoria(): MockAuditoriaAdmissao[] {
  if (!auditoriaCache) auditoriaCache = buildAuditoria();
  return auditoriaCache.map((evento) => ({ ...evento }));
}

/* ─── Guards de escrita (a UI nunca grava dados fictícios no banco) ───────── */

/** Reaplica checklist/status/observações quando a etapa muda. */
function aplicarEtapa(admissao: MockAdmissao, etapa: EtapaAdmissao): void {
  const checklist = CHECKLIST_POR_ETAPA[etapa];
  admissao.etapa = etapa;
  admissao.status = STATUS_POR_ETAPA[etapa];
  admissao.observacoes = admissao.metadata.pendencia ?? OBSERVACOES_POR_ETAPA[etapa];
  admissao.checklist_documentos_pessoais = checklist[0];
  admissao.checklist_comprovante_endereco = checklist[1];
  admissao.checklist_foto = checklist[2];
  admissao.checklist_ctps = checklist[3];
  admissao.checklist_exame_admissional = checklist[4];
  admissao.checklist_contrato_assinado = checklist[5];
  admissao.checklist_esocial_enviado = checklist[6];

  if (etapa === 'esocial' || etapa === 'concluida') {
    admissao.status_esocial = 'enviado';
    admissao.protocolo_esocial =
      admissao.protocolo_esocial ?? `S2200-2026-${Math.floor(Math.random() * 900000 + 100000)}`;
    admissao.data_transmissao_esocial = admissao.data_transmissao_esocial ?? new Date().toISOString();
  }
}

/**
 * Absorve `admissaoService.criar()` no modo demo: devolve o registro fictício
 * recém-criado (que passa a aparecer na lista) sem tocar no Supabase.
 * Retorna `undefined` quando o mock está desligado.
 */
export function mockAdmissaoCriada(payload: Record<string, any>): MockAdmissao | undefined {
  if (!isAdmissoesMockEnabled()) return undefined;

  const state = garantirEstado();
  state.sequenciaNovos += 1;

  const agora = new Date().toISOString();
  const base = buildAdmissao(
    [
      String(payload.nome ?? 'Candidato sem nome'),
      String(payload.cargo ?? 'Cargo a definir'),
      String(payload.departamento ?? 'Outro'),
      Number(payload.salario_proposto ?? 0),
      String(payload.data_prevista ?? agora.slice(0, 10)),
      'solicitacao',
      'Sessão de demonstração',
    ],
    SEED.length + state.sequenciaNovos
  );

  const nova: MockAdmissao = {
    ...base,
    ...payload,
    id: `mock-adm-novo-${state.sequenciaNovos}`,
    empresa_id: base.empresa_id,
    etapa: 'solicitacao',
    created_at: agora,
    updated_at: agora,
    metadata: { ...base.metadata, ...(payload.metadata ?? {}) },
  };

  state.admissoes.push(nova);
  state.tarefas[nova.id] = [];
  auditoriaCache = null;
  return clonarAdmissao(nova);
}

/**
 * Absorve `admissaoService.atualizar()` (drag-and-drop do Kanban e mudança de
 * etapa) para ids fictícios, mantendo o demo interativo.
 * Retorna `undefined` quando não é um registro mock.
 */
export function mockAdmissaoAtualizada(id: string, payload: Record<string, any>): MockAdmissao | undefined {
  if (!isAdmissoesMockEnabled() || !isMockId(id)) return undefined;

  const state = garantirEstado();
  const indice = state.admissoes.findIndex((admissao) => admissao.id === id);
  const agora = new Date().toISOString();
  if (indice === -1) return { id, ...payload, updated_at: agora } as MockAdmissao;

  const original = state.admissoes[indice];
  const atualizada = { ...original, ...payload } as MockAdmissao;
  if (payload.etapa && payload.etapa !== original.etapa) {
    aplicarEtapa(atualizada, payload.etapa as EtapaAdmissao);
  }
  atualizada.updated_at = agora;

  state.admissoes[indice] = atualizada;
  auditoriaCache = null;
  return clonarAdmissao(atualizada);
}

/**
 * Absorve o "Concluir" de tarefa de onboarding (OnboardingPage /
 * OnboardingPageContent). Retorna `true` quando a tarefa fictícia foi baixada.
 */
export function mockConcluirTarefaOnboarding(tarefaId?: string | null): boolean {
  if (!isAdmissoesMockEnabled() || !isMockId(tarefaId)) return false;

  const state = garantirEstado();
  const lista = Object.values(state.tarefas).find((tarefas) => tarefas.some((tarefa) => tarefa.id === tarefaId));
  const tarefa = lista?.find((item) => item.id === tarefaId);
  if (!tarefa) return false;

  tarefa.concluida = true;
  tarefa.concluida_em = new Date().toISOString();
  return true;
}

/* ─── Ações de serviços externos absorvidas no modo demo ─────────────────── */

/** Campos de checklist controlados pela validação de documentos do drawer. */
type CampoChecklistAdmissao =
  | 'checklist_documentos_pessoais'
  | 'checklist_comprovante_endereco'
  | 'checklist_foto'
  | 'checklist_ctps'
  | 'checklist_exame_admissional'
  | 'checklist_contrato_assinado'
  | 'checklist_esocial_enviado';

const CAMPO_CHECKLIST_POR_DOCTYPE: Record<string, CampoChecklistAdmissao> = {
  documentos_pessoais: 'checklist_documentos_pessoais',
  comprovante_endereco: 'checklist_comprovante_endereco',
  foto: 'checklist_foto',
  ctps: 'checklist_ctps',
  exame_admissional: 'checklist_exame_admissional',
  contrato_assinado: 'checklist_contrato_assinado',
  esocial_enviado: 'checklist_esocial_enviado',
};

/** Token fictício no mesmo formato do `secureToken` de `contratacaoService`. */
export function mockGerarTokenContratacao(len = 24): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

/**
 * Absorve `contratacaoService.enviarLinkCandidato()` para ids fictícios:
 * devolve um token em memória (mesmo shape do insert real). `undefined` quando
 * não é um registro do modo demonstrativo.
 */
export function mockEnviarLinkCandidato(admissaoId: string, email: string): Record<string, unknown> | undefined {
  if (!isAdmissoesMockEnabled() || !isMockId(admissaoId)) return undefined;

  const expiracao = new Date();
  expiracao.setDate(expiracao.getDate() + 7);

  return {
    id: `mock-token-${admissaoId}`,
    admissao_id: admissaoId,
    token: mockGerarTokenContratacao(),
    email_candidato: email,
    data_expiracao: expiracao.toISOString(),
    created_at: new Date().toISOString(),
  };
}

/** Absorve `contratacaoService.enviarWhatsApp()` — nada é enviado no modo demo. */
export function mockEnviarWhatsApp(admissaoId: string): boolean {
  return isAdmissoesMockEnabled() && isMockId(admissaoId);
}

/**
 * Absorve o "Transmitir Agora" (eSocial S-2200) para ids fictícios: marca a
 * admissão como transmitida em memória e devolve um recibo falso no mesmo
 * formato usado pela UI (`{ success, protocolo }`).
 */
export function mockTransmitirESocial(admissaoId: string): { success: boolean; protocolo: string } | undefined {
  if (!isAdmissoesMockEnabled() || !isMockId(admissaoId)) return undefined;

  const protocolo = `S2200-MOCK-${mockGerarTokenContratacao(10)}`;
  mockAdmissaoAtualizada(admissaoId, {
    etapa: 'esocial',
    status_esocial: 'enviado',
    protocolo_esocial: protocolo,
    data_transmissao_esocial: new Date().toISOString(),
  });

  return { success: true, protocolo };
}

/**
 * Absorve `contratacaoService.validarDocumento()` para ids fictícios: atualiza
 * o checklist em memória para o drawer refletir a validação sem escrever nada.
 */
export function mockValidarDocumento(
  admissaoId: string,
  docType: string,
  status: 'validado' | 'rejeitado',
  observacao?: string
): boolean {
  if (!isAdmissoesMockEnabled() || !isMockId(admissaoId)) return false;

  const admissao = garantirEstado().admissoes.find((item) => item.id === admissaoId);
  if (!admissao) return false;

  const campo = CAMPO_CHECKLIST_POR_DOCTYPE[docType];
  if (campo) admissao[campo] = status === 'validado';
  if (status === 'rejeitado') {
    admissao.metadata.pendencia = observacao ?? `Documento "${docType}" rejeitado pelo DP na conferência.`;
  }
  admissao.updated_at = new Date().toISOString();
  auditoriaCache = null;
  return true;
}
