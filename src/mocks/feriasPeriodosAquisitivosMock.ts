/**
 * ============================================================================
 * MOCK DE LAYOUT — Férias › aba "Períodos Aquisitivos".
 *
 * ESCOPO: exclusivamente visual. Serve para encher a tela
 * `src/components/ferias/GerenciamentoPeriodos.tsx` (aba "Períodos Aquisitivos"
 * de `src/pages/FeriasPage.tsx`) com dados fictícios realistas e assim validar
 * espaçamentos, cards, tabela, badges, status, datas, densidade e
 * responsividade.
 *
 * NÃO altera regra de negócio, NÃO grava nada no Supabase, NÃO cria migration
 * e NÃO substitui a fonte de dados real: com a flag desligada o componente
 * volta 100% à consulta original (`feriasService.listPeriodosAquisitivos`).
 *
 * COMO ESTÁ LIGADO:
 *   A constante `ATIVAR_MOCK` abaixo (hoje `true`) MAIS as duas garantias:
 *     - `import.meta.env.DEV`  → nunca em produção;
 *     - `MODE !== 'test'`      → nunca nos testes unitários (Vitest).
 *
 * COMO DESLIGAR (voltar à fonte real):
 *   Troque `ATIVAR_MOCK` para `false` e recarregue a página (HMR).
 *   Para remover de vez: apague este arquivo e os trechos marcados com
 *   "MOCK DE LAYOUT" em `GerenciamentoPeriodos.tsx`.
 * ============================================================================
 */
import { addDaysLocal, formatDateLocalISO, parseDateLocalISO } from '@/utils/dateLocal';

/** Flag local — vire para `false` para desligar os mocks desta tela. */
const ATIVAR_MOCK = true;

/** Ligado apenas em dev e fora dos testes. */
export const USE_MOCK_PERIODOS_AQUISITIVOS =
  ATIVAR_MOCK && import.meta.env.DEV && import.meta.env.MODE !== 'test';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface FeriasColaboradorMock {
  id: string;
  nome_completo: string;
  cpf: string | null;
  foto_url: string | null;
}

export type PeriodoStatusMock = 'aberto' | 'concluido' | 'vencido' | 'gozado' | 'pago';

export interface PeriodoAquisitivoMock {
  // Colunas reais de `periodos_aquisitivos`
  id: string;
  colaborador_id: string;
  empresa_id: string;
  numero_periodo: number;
  data_inicio: string;
  data_fim: string;
  dias_direito: number;
  faltas_periodo: number;
  dias_descontados: number;
  status: string;
  created_at: string;

  // Campos estendidos (apoio à avaliação de layout / telas de detalhe)
  colaboradorNome: string;
  matricula: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  periodoConcessivoFim: string;
  diasGozados: number;
  diasRestantes: number;
  situacao: string;
  abonoPecuniario: boolean;
  vencido: boolean;
  feriasProgramadas: boolean;
  dataPrevistaInicio: string | null;
  dataPrevistaFim: string | null;
  observacoes: string;
}

// ---------------------------------------------------------------------------
// Especificação (o que dá "sabor" a cada período; as datas são geradas)
// ---------------------------------------------------------------------------

interface PeriodoSpec {
  status: PeriodoStatusMock;
  dias_direito: number;
  dias_gozados: number;
  abono?: boolean;
  faltas?: number;
  dias_descontados?: number;
  programado?: boolean;
  previsaoInicio?: number; // dias a partir de hoje
  previsaoFim?: number;
  observacoes: string;
}

interface ColaboradorSpec extends FeriasColaboradorMock {
  matricula: string;
  cargo: string;
  departamento: string;
  data_admissao: string;
  /** Ordem cronológica: do período mais antigo para o mais recente. */
  periodos: PeriodoSpec[];
}

const EMPRESA_ID = 'mock-empresa-1';

// ---------------------------------------------------------------------------
// Massa fictícia — 6 colaboradores, 20 períodos (cenários variados)
// ---------------------------------------------------------------------------

const LISTA: ColaboradorSpec[] = [
  {
    id: 'mock-ferias-col-1',
    nome_completo: 'Ana Beatriz Souza Lima',
    cpf: '321.654.987-00',
    foto_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    matricula: 'MAT001',
    cargo: 'Analista de Recursos Humanos Pleno',
    departamento: 'Recursos Humanos',
    data_admissao: '2017-04-10',
    periodos: [
      { status: 'pago', dias_direito: 30, dias_gozados: 30, observacoes: 'Férias de 2017/2018 quitadas em folha.' },
      { status: 'pago', dias_direito: 30, dias_gozados: 30, observacoes: 'Férias de 2018/2019 quitadas em folha.' },
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, observacoes: 'Gozo integral dentro do período concessivo.' },
      { status: 'vencido', dias_direito: 30, dias_gozados: 0, observacoes: 'Período não concedido — sujeito a dobra (CLT art. 137).' },
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, observacoes: 'Regularizado após ajuste de escala.' },
      { status: 'concluido', dias_direito: 24, dias_gozados: 24, faltas: 8, observacoes: 'Direito reduzido por 8 faltas (CLT art. 130).' },
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, abono: true, observacoes: '10 dias convertidos em abono pecuniário.' },
      { status: 'aberto', dias_direito: 15, dias_gozados: 0, programado: true, previsaoInicio: 30, previsaoFim: 59, observacoes: 'Em aquisição — férias já programadas com o gestor.' },
    ],
  },
  {
    id: 'mock-ferias-col-2',
    nome_completo: 'Carlos Eduardo Nascimento Albuquerque Filho',
    cpf: '456.789.123-11',
    foto_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    matricula: 'MAT014',
    cargo: 'Assistente Administrativo',
    departamento: 'Administrativo',
    data_admissao: '2022-02-01',
    periodos: [
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, observacoes: 'Férias concedidas no primeiro ano.' },
      { status: 'vencido', dias_direito: 30, dias_gozados: 0, observacoes: 'Período vencido — alerta de vencimento emitido.' },
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, abono: true, observacoes: 'Fracionamento: 20 + 10 dias (abono).' },
      { status: 'aberto', dias_direito: 24, dias_gozados: 0, programado: true, previsaoInicio: 10, previsaoFim: 39, observacoes: 'Em aquisição — programação aprovada pelo RH.' },
    ],
  },
  {
    id: 'mock-ferias-col-3',
    nome_completo: 'João Pedro dos Santos',
    cpf: '789.123.456-22',
    foto_url: 'https://randomuser.me/api/portraits/men/75.jpg',
    matricula: 'MAT027',
    cargo: 'Auxiliar de Produção',
    departamento: 'Operações',
    data_admissao: '2024-06-15',
    periodos: [
      { status: 'concluido', dias_direito: 30, dias_gozados: 20, observacoes: 'Saldo de 10 dias transferido para o próximo período.' },
      { status: 'aberto', dias_direito: 12, dias_gozados: 0, observacoes: 'Em aquisição — colaborador sem férias programadas.' },
    ],
  },
  {
    id: 'mock-ferias-col-4',
    nome_completo: 'Maria Fernanda Rodrigues da Conceição Oliveira',
    cpf: '159.357.246-33',
    foto_url: 'https://randomuser.me/api/portraits/women/65.jpg',
    matricula: 'MAT009',
    cargo: 'Coordenadora de Logística e Distribuição Regional',
    departamento: 'Logística e Distribuição',
    data_admissao: '2021-09-01',
    periodos: [
      { status: 'concluido', dias_direito: 30, dias_gozados: 30, observacoes: 'Gozo fracionado em dois períodos (CLT art. 134 §1º).' },
      { status: 'vencido', dias_direito: 30, dias_gozados: 0, observacoes: 'Período vencido por indisponibilidade de cobertura.' },
      { status: 'aberto', dias_direito: 18, dias_gozados: 0, programado: true, previsaoInicio: 45, previsaoFim: 74, observacoes: 'Em aquisição — programação em análise.' },
    ],
  },
  {
    id: 'mock-ferias-col-5',
    nome_completo: 'Luís Antônio da Silva',
    cpf: '246.810.135-44',
    foto_url: 'https://randomuser.me/api/portraits/men/21.jpg',
    matricula: 'MAT031',
    cargo: 'Motorista',
    departamento: 'Transportes',
    data_admissao: '2025-11-20',
    // Sem períodos fechados ainda → exercita o estado vazio da tabela.
    periodos: [],
  },
  {
    id: 'mock-ferias-col-6',
    nome_completo: 'Rafael Augusto Pereira',
    cpf: '852.963.741-55',
    foto_url: null,
    matricula: 'MAT018',
    cargo: 'Desenvolvedor de Software',
    departamento: 'Tecnologia da Informação e Transformação Digital',
    data_admissao: '2023-03-05',
    periodos: [
      { status: 'vencido', dias_direito: 30, dias_gozados: 0, observacoes: 'Período vencido — pendente de regularização.' },
      { status: 'concluido', dias_direito: 18, dias_gozados: 18, faltas: 20, observacoes: 'Direito reduzido por 20 faltas (CLT art. 130).' },
      { status: 'aberto', dias_direito: 9, dias_gozados: 0, observacoes: 'Em aquisição — início do período aquisitivo recente.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Geração (datas relativas a "hoje" para os prazos ficarem coerentes)
// ---------------------------------------------------------------------------

const HOJE = new Date();
const dataOffset = (dias: number): string => formatDateLocalISO(addDaysLocal(HOJE, dias));

const ROTULO_SITUACAO: Record<PeriodoStatusMock, string> = {
  aberto: 'Em aquisição',
  concluido: 'Adquirido',
  vencido: 'Vencido',
  gozado: 'Gozado',
  pago: 'Pago',
};

function montarPeriodos(colab: ColaboradorSpec): PeriodoAquisitivoMock[] {
  const total = colab.periodos.length;

  return colab.periodos.map((p, i) => {
    const eAtual = i === total - 1;
    // Período em curso (aberto): de -180 dias a +184 dias.
    // Demais: janelas de 365 dias, encostando no período seguinte.
    const fim = eAtual ? 184 : -181 - 365 * (total - 2 - i);
    const inicio = eAtual ? -180 : fim - 364;

    const data_inicio = dataOffset(inicio);
    const data_fim = dataOffset(fim);
    const periodoConcessivoFim = dataOffset(fim + 365);

    const diasGozados = p.dias_gozados;
    const diasRestantes = Math.max(0, p.dias_direito - diasGozados);

    const limiteConcessao = parseDateLocalISO(periodoConcessivoFim);
    const vencido =
      p.status === 'vencido' || (diasRestantes > 0 && !!limiteConcessao && limiteConcessao < HOJE);

    const programado = p.programado ?? false;

    return {
      id: `mock-per-${colab.id}-${i + 1}`,
      colaborador_id: colab.id,
      empresa_id: EMPRESA_ID,
      numero_periodo: i + 1,
      data_inicio,
      data_fim,
      dias_direito: p.dias_direito,
      faltas_periodo: p.faltas ?? 0,
      dias_descontados: p.dias_descontados ?? 0,
      status: p.status,
      created_at: `${data_inicio}T08:00:00-03:00`,

      colaboradorNome: colab.nome_completo,
      matricula: colab.matricula,
      cargo: colab.cargo,
      departamento: colab.departamento,
      dataAdmissao: colab.data_admissao,
      periodoAquisitivoInicio: data_inicio,
      periodoAquisitivoFim: data_fim,
      periodoConcessivoFim,
      diasGozados,
      diasRestantes,
      situacao: ROTULO_SITUACAO[p.status],
      abonoPecuniario: p.abono ?? false,
      vencido,
      feriasProgramadas: programado,
      dataPrevistaInicio: programado ? dataOffset(p.previsaoInicio ?? 15) : null,
      dataPrevistaFim: programado ? dataOffset(p.previsaoFim ?? 44) : null,
      observacoes: p.observacoes,
    };
  });
}

// ---------------------------------------------------------------------------
// Exports consumidos pela tela
// ---------------------------------------------------------------------------

/** Lista simplificada para o seletor/busca de colaborador. */
export const MOCK_FERIAS_COLABORADORES: FeriasColaboradorMock[] = LISTA.map((c) => ({
  id: c.id,
  nome_completo: c.nome_completo,
  cpf: c.cpf,
  foto_url: c.foto_url,
}));

/** Todos os períodos fictícios, já "achatados". */
export const MOCK_PERIODOS_AQUISITIVOS: PeriodoAquisitivoMock[] = LISTA.flatMap(montarPeriodos);

/**
 * Períodos de um colaborador — mesma ordenação do serviço real
 * (`data_inicio` decrescente). Colaborador desconhecido devolve `[]`.
 */
export function getMockPeriodosAquisitivos(colaboradorId: string): PeriodoAquisitivoMock[] {
  return MOCK_PERIODOS_AQUISITIVOS
    .filter((p) => p.colaborador_id === colaboradorId)
    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
}
