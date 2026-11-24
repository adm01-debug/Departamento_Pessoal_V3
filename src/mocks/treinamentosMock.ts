/**
 * ============================================================================
 * MOCK VISUAL — área de Treinamentos (rota `/treinamentos`).
 *
 * ESCOPO: exclusivamente apresentação/validação de LAYOUT — os 4 KPIs
 * (Participação ativa, Conclusão no período, Pendências obrigatórias e
 * Certificados emitidos) e as 6 abas (Treinamentos, Catálogo, Trilhas,
 * Inscrições, Turmas/Instâncias, Certificados). Nenhuma linha é lida do
 * Supabase nesta área: os `useQuery` de `TreinamentosPage` e de
 * `TrilhaCursosSection` curto-circuitam com estes registros fictícios.
 *
 * ⚠️ SOMENTE LEITURA. Toda ação de ESCRITA (criar/excluir treinamento, curso,
 * trilha; vincular/desvincular curso a trilha; criar inscrição) é BLOQUEADA por
 * `bloquearEscritaTreinamentos()` — sem o guard, gravaria registros órfãos com
 * `empresa_id`/`colaborador_id` fictícios (ou falharia por FK).
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, desligamentosMock.ts,
 * desempenhoMock.ts, premiacoesMock.ts e colaboradoresMock.ts): liga somente com
 * as DUAS condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_TREINAMENTOS_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios.
 *
 * PARA DESATIVAR: defina `VITE_TREINAMENTOS_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/treinamentosMock.ts" em:
 *   - src/pages/TreinamentosPage.tsx
 *   - src/services/catalogoCursoService.ts
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_COLABORADORES, MOCK_EMPRESA } from './colaboradoresMock';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isTreinamentosMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_TREINAMENTOS_MOCK === 'true';
}

const EMPRESA = MOCK_EMPRESA.id;

/** Nome do colaborador a partir do id fictício (para os embeds `colaborador`/`instrutor`). */
function nomeColaborador(id: string): string {
  return MOCK_COLABORADORES.find((c) => c.id === id)?.nome_completo ?? 'Colaborador Fictício';
}

/** Foto do colaborador fictício — o mesmo `foto_url` do mock de colaboradores. */
function fotoColaborador(id: string): string | null {
  return MOCK_COLABORADORES.find((c) => c.id === id)?.foto_url ?? null;
}

/** Cargo do colaborador fictício — alimenta a linha do instrutor no card. */
function cargoColaborador(id: string): string | null {
  return MOCK_COLABORADORES.find((c) => c.id === id)?.cargo ?? null;
}

/** Departamento do colaborador fictício — mesma fonte dos cadastros de demo. */
function departamentoColaborador(id: string): string | null {
  return MOCK_COLABORADORES.find((c) => c.id === id)?.departamento ?? null;
}

/* ─── Treinamentos (`treinamentos`) ────────────────────────────────────────── */

export interface TreinamentoMock {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  /** Campo adicional do mock — `treinamentos` não possui categoria real. */
  categoria: string;
  data: string;
  carga_horaria: number;
  /** Coluna real de `treinamentos` (TEXT, default `pendente`). */
  status: string;
  created_at: string;
}

const TREINAMENTOS: TreinamentoMock[] = [
  {
    id: 'mock-trein-1',
    empresa_id: EMPRESA,
    nome: 'Integração e Cultura Organizacional',
    descricao: 'Trilha de integração para novos colaboradores.',
    categoria: 'Onboarding',
    data: '2026-02-10',
    carga_horaria: 8,
    status: 'em_andamento',
    created_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'mock-trein-2',
    empresa_id: EMPRESA,
    nome: 'NR-17 Ergonomia',
    descricao: 'Saúde e segurança no ambiente de trabalho.',
    categoria: 'Segurança do Trabalho',
    data: '2026-08-20',
    carga_horaria: 4,
    status: 'planejado',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'mock-trein-3',
    empresa_id: EMPRESA,
    nome: 'Comunicação Assertiva',
    descricao: 'Técnicas de comunicação e feedback.',
    categoria: 'Desenvolvimento Pessoal',
    data: '2026-04-15',
    carga_horaria: 6,
    status: 'em_andamento',
    created_at: '2026-04-05T09:00:00Z',
  },
  {
    id: 'mock-trein-4',
    empresa_id: EMPRESA,
    nome: 'Liderança e Gestão de Equipes',
    descricao: 'Desenvolvimento de líderes e gestores.',
    categoria: 'Liderança',
    data: '2025-11-05',
    carga_horaria: 12,
    status: 'concluido',
    created_at: '2025-10-28T09:00:00Z',
  },
  {
    id: 'mock-trein-5',
    empresa_id: EMPRESA,
    nome: 'LGPD — Proteção de Dados',
    descricao: 'Boas práticas e conformidade com a LGPD.',
    categoria: 'Compliance',
    data: '2026-03-12',
    carga_horaria: 4,
    status: 'aguardando_inicio',
    created_at: '2026-03-02T09:00:00Z',
  },
  {
    id: 'mock-trein-6',
    empresa_id: EMPRESA,
    nome: 'Diversidade e Inclusão',
    descricao: 'Construindo um ambiente mais plural.',
    categoria: 'Cultura',
    data: '2026-05-22',
    carga_horaria: 4,
    status: 'planejado',
    created_at: '2026-05-12T09:00:00Z',
  },
];

export function getMockTreinamentosLista(): TreinamentoMock[] | undefined {
  return isTreinamentosMockEnabled() ? TREINAMENTOS : undefined;
}

/* ─── Participantes por treinamento (mock visual de ocupação) ──────────────── */

/**
 * A tabela real de participantes (`treinamento_participantes`) não é consultada
 * no modo demonstração. Estes registros alimentam SOMENTE a coluna Participantes
 * da listagem (avatares + "+N" + barra), com os números da referência aprovada:
 * `inscritos` de `capacidade` na barra e `excedente` no chip "+N".
 */
export interface ParticipacaoTreinamentoMock {
  inscritos: number;
  capacidade: number;
  excedente: number;
  colaboradores: { id: string; nome: string; fotoUrl: string | null }[];
}

function avatares(inicio: number, quantidade: number) {
  // `MOCK_COLABORADORES` é finito: o módulo evita que um índice fora da faixa
  // devolva silenciosamente uma linha SEM avatares (só o chip "+N").
  const total = MOCK_COLABORADORES.length;
  return Array.from({ length: quantidade }, (_, i) => MOCK_COLABORADORES[(inicio + i) % total]).map((colaborador) => ({
    id: colaborador.id,
    nome: colaborador.nome_completo,
    fotoUrl: colaborador.foto_url ?? null,
  }));
}

const PARTICIPACAO: Record<string, ParticipacaoTreinamentoMock> = {
  'mock-trein-1': { inscritos: 18, capacidade: 30, excedente: 12, colaboradores: avatares(0, 3) },
  'mock-trein-2': { inscritos: 12, capacidade: 25, excedente: 8, colaboradores: avatares(3, 2) },
  'mock-trein-3': { inscritos: 20, capacidade: 30, excedente: 15, colaboradores: avatares(5, 3) },
  'mock-trein-4': { inscritos: 28, capacidade: 28, excedente: 28, colaboradores: avatares(8, 3) },
  'mock-trein-5': { inscritos: 10, capacidade: 25, excedente: 10, colaboradores: avatares(11, 2) },
  'mock-trein-6': { inscritos: 8, capacidade: 20, excedente: 6, colaboradores: avatares(6, 2) },
};

export function getMockParticipacaoTreinamentos(): Record<string, ParticipacaoTreinamentoMock> | undefined {
  return isTreinamentosMockEnabled() ? PARTICIPACAO : undefined;
}

/* ─── Catálogo de cursos (`catalogo_cursos`) ───────────────────────────────── */

export interface CursoMock {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  categoria: string;
  modalidade: string;
  carga_horaria: number;
  obrigatorio: boolean;
  nr_relacionada: string | null;
  created_at: string;
}

const CURSOS: CursoMock[] = [
  {
    id: 'mock-curso-1',
    empresa_id: EMPRESA,
    nome: 'Integração e Cultura Organizacional',
    descricao: 'Trilha de integração para novos colaboradores.',
    categoria: 'Onboarding',
    modalidade: 'online',
    carga_horaria: 8,
    obrigatorio: true,
    nr_relacionada: null,
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'mock-curso-2',
    empresa_id: EMPRESA,
    nome: 'NR-17 Ergonomia',
    descricao: 'Saúde e bem-estar no ambiente de trabalho.',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
    obrigatorio: true,
    nr_relacionada: 'NR-17',
    created_at: '2026-01-12T09:00:00Z',
  },
  {
    id: 'mock-curso-3',
    empresa_id: EMPRESA,
    nome: 'NR-35 Trabalho em Altura',
    descricao: 'Procedimentos e boas práticas para atividades em altura.',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 8,
    obrigatorio: true,
    nr_relacionada: 'NR-35',
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 'mock-curso-4',
    empresa_id: EMPRESA,
    nome: 'Comunicação Assertiva',
    descricao: 'Técnicas de comunicação e feedback.',
    categoria: 'Desenvolvimento Pessoal',
    modalidade: 'online',
    carga_horaria: 6,
    obrigatorio: false,
    nr_relacionada: null,
    created_at: '2026-02-02T09:00:00Z',
  },
  {
    id: 'mock-curso-5',
    empresa_id: EMPRESA,
    nome: 'Liderança e Gestão de Equipes',
    descricao: 'Desenvolvimento de líderes e gestores.',
    categoria: 'Liderança',
    modalidade: 'hibrido',
    carga_horaria: 12,
    obrigatorio: false,
    nr_relacionada: null,
    created_at: '2026-02-20T09:00:00Z',
  },
  {
    id: 'mock-curso-6',
    empresa_id: EMPRESA,
    nome: 'LGPD — Proteção de Dados',
    descricao: 'Boas práticas e conformidade com a LGPD.',
    categoria: 'Compliance',
    modalidade: 'online',
    carga_horaria: 4,
    obrigatorio: true,
    nr_relacionada: null,
    created_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'mock-curso-7',
    empresa_id: EMPRESA,
    nome: 'Diversidade e Inclusão',
    descricao: 'Construindo um ambiente mais plural.',
    categoria: 'Cultura',
    modalidade: 'online',
    carga_horaria: 4,
    obrigatorio: false,
    nr_relacionada: null,
    created_at: '2026-03-08T09:00:00Z',
  },
];

export function getMockCursos(): CursoMock[] | undefined {
  return isTreinamentosMockEnabled() ? CURSOS : undefined;
}

/**
 * Participação por CURSO — alimenta SOMENTE os cards do Catálogo (avatares,
 * “+N” e “N inscritos”). Os números seguem a referência visual aprovada do
 * Catálogo; nenhuma foto/nome é criado aqui: os avatares vêm de
 * `MOCK_COLABORADORES`, o mesmo cadastro fictício do restante do modo demo.
 * Com o mock desligado, a página usa `agruparInscricoesPorCurso` sobre
 * `inscricoes_cursos` reais.
 */
export interface ParticipacaoCursoMock {
  inscritos: number;
  colaboradores: { id: string; nome: string; fotoUrl: string | null }[];
}

const PARTICIPACAO_CURSOS: Record<string, ParticipacaoCursoMock> = {
  'mock-curso-1': { inscritos: 42, colaboradores: avatares(0, 3) },
  'mock-curso-2': { inscritos: 28, colaboradores: avatares(3, 3) },
  'mock-curso-3': { inscritos: 20, colaboradores: avatares(5, 3) },
  'mock-curso-4': { inscritos: 50, colaboradores: avatares(8, 3) },
  'mock-curso-5': { inscritos: 32, colaboradores: avatares(11, 3) },
  'mock-curso-6': { inscritos: 46, colaboradores: avatares(6, 3) },
  'mock-curso-7': { inscritos: 22, colaboradores: avatares(9, 3) },
};

export function getMockParticipacaoCursos(): Record<string, ParticipacaoCursoMock> | undefined {
  return isTreinamentosMockEnabled() ? PARTICIPACAO_CURSOS : undefined;
}

/* ─── Trilhas (`trilhas_aprendizado`) + vínculos (`trilhas_cursos`) ────────── */

export interface TrilhaMock {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  nivel: string;
  /** Coluna real `trilhas_aprendizado.ativo` (boolean). */
  ativo: boolean;
  created_at: string;
}

const TRILHAS: TrilhaMock[] = [
  {
    id: 'mock-trilha-1',
    empresa_id: EMPRESA,
    titulo: 'Integração de Novos Colaboradores',
    descricao: 'Jornada de onboarding da empresa.',
    nivel: 'basico',
    ativo: true,
    created_at: '2026-01-20T09:00:00Z',
  },
  {
    id: 'mock-trilha-2',
    empresa_id: EMPRESA,
    titulo: 'Liderança e Alta Performance',
    descricao: 'Trilha para gestores e líderes.',
    nivel: 'intermediario',
    ativo: true,
    created_at: '2026-02-25T09:00:00Z',
  },
  {
    id: 'mock-trilha-3',
    empresa_id: EMPRESA,
    titulo: 'Especialista Técnico',
    descricao: 'Aprofundamento técnico e NRs.',
    nivel: 'avancado',
    ativo: true,
    created_at: '2026-03-15T09:00:00Z',
  },
];

export function getMockTrilhas(): TrilhaMock[] | undefined {
  return isTreinamentosMockEnabled() ? TRILHAS : undefined;
}

/** Cursos vinculados por trilha — mapeados para buscar o curso do catálogo. */
const TRILHAS_CURSOS: Record<string, { curso_id: string; ordem: number; obrigatorio: boolean }[]> = {
  'mock-trilha-1': [
    { curso_id: 'mock-curso-1', ordem: 1, obrigatorio: true },
    { curso_id: 'mock-curso-6', ordem: 2, obrigatorio: true },
    { curso_id: 'mock-curso-7', ordem: 3, obrigatorio: false },
  ],
  'mock-trilha-2': [
    { curso_id: 'mock-curso-4', ordem: 1, obrigatorio: true },
    { curso_id: 'mock-curso-5', ordem: 2, obrigatorio: true },
  ],
  'mock-trilha-3': [
    { curso_id: 'mock-curso-2', ordem: 1, obrigatorio: true },
    { curso_id: 'mock-curso-3', ordem: 2, obrigatorio: true },
  ],
};

/** Réplica do embed `curso:catalogo_cursos(id, nome, carga_horaria, modalidade)`. */
export function getMockTrilhasCursos(trilhaId: string):
  | {
      id: string;
      trilha_id: string;
      curso_id: string;
      ordem: number;
      obrigatorio: boolean;
      curso: { id: string; nome: string; carga_horaria: number; modalidade: string | null };
    }[]
  | undefined {
  if (!isTreinamentosMockEnabled()) return undefined;
  return (TRILHAS_CURSOS[trilhaId] ?? []).map((v, i) => {
    const curso = CURSOS.find((c) => c.id === v.curso_id);
    return {
      id: `${trilhaId}-vinculo-${i + 1}`,
      trilha_id: trilhaId,
      curso_id: v.curso_id,
      ordem: v.ordem,
      obrigatorio: v.obrigatorio,
      curso: {
        id: v.curso_id,
        nome: curso?.nome ?? 'Curso',
        carga_horaria: curso?.carga_horaria ?? 0,
        modalidade: curso?.modalidade ?? null,
      },
    };
  });
}

/* ─── Inscrições (`inscricoes_cursos`) ─────────────────────────────────────── */

export interface InscricaoMock {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  curso_id: string;
  status: string;
  data_inicio: string;
  /** Coluna real `inscricoes_cursos.data_conclusao` (DATE opcional). */
  data_conclusao: string | null;
  colaborador: {
    nome_completo: string;
    foto_url: string | null;
    cargo: string | null;
    departamento: string | null;
  };
  curso: { nome: string; categoria: string | null };
  created_at: string;
}

const INSCRICOES: Omit<InscricaoMock, 'colaborador' | 'curso'>[] = [
  {
    id: 'mock-insc-1',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-2',
    curso_id: 'mock-curso-1',
    status: 'concluido',
    data_inicio: '2026-01-15',
    data_conclusao: '2026-01-20',
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 'mock-insc-2',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-5',
    curso_id: 'mock-curso-6',
    status: 'concluido',
    data_inicio: '2026-03-05',
    data_conclusao: '2026-03-10',
    created_at: '2026-03-05T09:00:00Z',
  },
  {
    id: 'mock-insc-3',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-3',
    curso_id: 'mock-curso-5',
    status: 'em_andamento',
    data_inicio: '2026-08-01',
    data_conclusao: null,
    created_at: '2026-08-01T09:00:00Z',
  },
  {
    id: 'mock-insc-4',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-9',
    curso_id: 'mock-curso-4',
    status: 'em_andamento',
    data_inicio: '2026-08-10',
    data_conclusao: null,
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'mock-insc-5',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-6',
    curso_id: 'mock-curso-2',
    status: 'inscrito',
    data_inicio: '2026-09-01',
    data_conclusao: null,
    created_at: '2026-08-25T09:00:00Z',
  },
  {
    id: 'mock-insc-6',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-11',
    curso_id: 'mock-curso-3',
    status: 'inscrito',
    data_inicio: '2026-09-15',
    data_conclusao: null,
    created_at: '2026-09-02T09:00:00Z',
  },
  {
    id: 'mock-insc-7',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-12',
    curso_id: 'mock-curso-7',
    status: 'concluido',
    data_inicio: '2025-08-25',
    data_conclusao: '2025-08-28',
    created_at: '2025-08-25T09:00:00Z',
  },
  {
    id: 'mock-insc-8',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-1',
    curso_id: 'mock-curso-1',
    status: 'concluido',
    data_inicio: '2025-06-10',
    data_conclusao: '2025-06-15',
    created_at: '2025-06-10T09:00:00Z',
  },
];

export function getMockInscricoes(): InscricaoMock[] | undefined {
  if (!isTreinamentosMockEnabled()) return undefined;
  return INSCRICOES.map((i) => ({
    ...i,
    colaborador: {
      nome_completo: nomeColaborador(i.colaborador_id),
      foto_url: fotoColaborador(i.colaborador_id),
      cargo: cargoColaborador(i.colaborador_id),
      departamento: departamentoColaborador(i.colaborador_id),
    },
    curso: {
      nome: CURSOS.find((c) => c.id === i.curso_id)?.nome ?? 'Curso',
      categoria: CURSOS.find((c) => c.id === i.curso_id)?.categoria ?? null,
    },
  }));
}

/* ─── Turmas / Instâncias (`treinamento_instancias`) ───────────────────────── */

export interface InstanciaMock {
  id: string;
  empresa_id: string;
  curso_id: string;
  instrutor_id: string;
  data_inicio: string;
  status: string;
  capacidade_maxima: number;
  /** Coluna real `treinamento_instancias.local_link` (TEXT). */
  local_link: string;
  curso: { nome: string };
  instrutor: { nome_completo: string; foto_url: string | null; cargo: string | null };
}

const INSTANCIAS: Omit<InstanciaMock, 'curso' | 'instrutor'>[] = [
  {
    id: 'mock-inst-1',
    empresa_id: EMPRESA,
    curso_id: 'mock-curso-2',
    instrutor_id: 'mock-4',
    data_inicio: '2026-09-01T12:00:00Z',
    status: 'planejado',
    capacidade_maxima: 20,
    local_link: 'Sala 01',
  },
  {
    id: 'mock-inst-2',
    empresa_id: EMPRESA,
    curso_id: 'mock-curso-3',
    instrutor_id: 'mock-7',
    data_inicio: '2026-09-15T12:00:00Z',
    status: 'planejado',
    capacidade_maxima: 15,
    local_link: 'Sala 02',
  },
  {
    id: 'mock-inst-3',
    empresa_id: EMPRESA,
    curso_id: 'mock-curso-5',
    instrutor_id: 'mock-9',
    data_inicio: '2026-08-01T12:00:00Z',
    status: 'em_curso',
    capacidade_maxima: 25,
    local_link: 'Sala 03 + Online',
  },
  {
    id: 'mock-inst-4',
    empresa_id: EMPRESA,
    curso_id: 'mock-curso-1',
    instrutor_id: 'mock-3',
    data_inicio: '2026-02-05T12:00:00Z',
    status: 'concluido',
    capacidade_maxima: 30,
    local_link: 'Microsoft Teams',
  },
  {
    id: 'mock-inst-5',
    empresa_id: EMPRESA,
    curso_id: 'mock-curso-4',
    instrutor_id: 'mock-13',
    data_inicio: '2026-08-20T12:00:00Z',
    status: 'concluido',
    capacidade_maxima: 18,
    local_link: 'Microsoft Teams',
  },
];

export function getMockInstancias(): InstanciaMock[] | undefined {
  if (!isTreinamentosMockEnabled()) return undefined;
  return INSTANCIAS.map((i) => ({
    ...i,
    curso: { nome: CURSOS.find((c) => c.id === i.curso_id)?.nome ?? 'Curso' },
    instrutor: {
      nome_completo: nomeColaborador(i.instrutor_id),
      foto_url: fotoColaborador(i.instrutor_id),
      cargo: cargoColaborador(i.instrutor_id),
    },
  }));
}

/* ─── Certificados (`treinamento_certificados`) ────────────────────────────── */

export interface CertificadoMock {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  curso_id: string;
  data_emissao: string;
  data_validade: string | null;
  codigo_autenticacao: string;
  curso: { nome: string; carga_horaria: number };
  colaborador: { nome_completo: string; foto_url: string | null; cargo: string | null };
}

// `data_emissao`/`data_validade` usam horário-meio-dia UTC: a página as exibe com
// `new Date(x).toLocaleDateString('pt-BR')`, e um 'YYYY-MM-DD' cru recuaria um
// dia em UTC-3. O cert-6 tem validade já vencida (badge destructive).
// O cert-4 vence em ~29 dias: exercita o estado “A vencer” (janela de 30 dias
// usada pelo sistema) sem alterar realização/contagem de certificados.
const CERTIFICADOS: Omit<CertificadoMock, 'curso' | 'colaborador'>[] = [
  {
    id: 'mock-cert-1',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-2',
    curso_id: 'mock-curso-1',
    data_emissao: '2026-01-20T12:00:00Z',
    data_validade: null,
    codigo_autenticacao: 'A1B2C3D4',
  },
  {
    id: 'mock-cert-2',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-5',
    curso_id: 'mock-curso-6',
    data_emissao: '2026-03-10T12:00:00Z',
    data_validade: '2027-03-10T12:00:00Z',
    codigo_autenticacao: 'E5F6A7B8',
  },
  {
    id: 'mock-cert-3',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-12',
    curso_id: 'mock-curso-7',
    data_emissao: '2025-08-28T12:00:00Z',
    data_validade: null,
    codigo_autenticacao: 'C9D0E1F2',
  },
  {
    id: 'mock-cert-4',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-3',
    curso_id: 'mock-curso-4',
    data_emissao: '2026-04-20T12:00:00Z',
    data_validade: '2026-11-20T12:00:00Z',
    codigo_autenticacao: '11223344',
  },
  {
    id: 'mock-cert-5',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-1',
    curso_id: 'mock-curso-1',
    data_emissao: '2025-06-15T12:00:00Z',
    data_validade: null,
    codigo_autenticacao: '55667788',
  },
  {
    id: 'mock-cert-6',
    empresa_id: EMPRESA,
    colaborador_id: 'mock-9',
    curso_id: 'mock-curso-2',
    data_emissao: '2025-09-10T12:00:00Z',
    data_validade: '2026-09-10T12:00:00Z',
    codigo_autenticacao: '99AABBCC',
  },
];

export function getMockCertificados(): CertificadoMock[] | undefined {
  if (!isTreinamentosMockEnabled()) return undefined;
  return CERTIFICADOS.map((c) => {
    const curso = CURSOS.find((x) => x.id === c.curso_id);
    return {
      ...c,
      curso: { nome: curso?.nome ?? 'Curso', carga_horaria: curso?.carga_horaria ?? 0 },
      colaborador: {
        nome_completo: nomeColaborador(c.colaborador_id),
        foto_url: fotoColaborador(c.colaborador_id),
        cargo: cargoColaborador(c.colaborador_id),
      },
    };
  });
}

/* ─── Guard de escrita (modo demo) ─────────────────────────────────────────── */

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`empresa_id`/`colaborador_id` não existem no
 * banco): gravar criaria lixo, falharia por FK ou deixaria registros órfãos.
 * Devolve `true` quando a ação deve ser ABORTADA, então o chamador só precisa de
 * `if (bloquearEscritaTreinamentos('...')) return;`.
 */
export function bloquearEscritaTreinamentos(acao: string): boolean {
  if (!isTreinamentosMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os dados de treinamentos exibidos são fictícios.`);
  return true;
}
