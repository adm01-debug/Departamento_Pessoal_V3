/**
 * ============================================================================
 * TREINAMENTOS — derivações puras do Hub.
 *
 * Tudo o que a tela precisa DECIDIR (filtrar, paginar, formatar e calcular
 * indicadores) vive aqui, sem React e sem Supabase. Assim a regra de negócio é
 * testável (`__tests__/treinamentosDerivacoes.test.ts`) e a página fica só com
 * dados + composição visual.
 *
 * HONESTIDADE DOS DADOS (regra do pedido):
 * - `status` existe de fato na tabela `treinamentos` (TEXT, default `pendente`),
 *   então é lido e mapeado. Valores desconhecidos caem em "Não informado".
 * - `categoria` NÃO existe em `treinamentos` e não há FK para
 *   `catalogo_cursos`: quando o registro não traz categoria o selo mostra
 *   "Sem categoria" — nunca inferimos categoria pelo nome.
 * - "Conclusão no período" é concluídas ÷ inscrições consideradas (canceladas e
 *   desistentes fora do denominador). Sem inscrições, o indicador fica nulo
 *   ("—") em vez de 0%, que seria uma afirmação falsa.
 * - "Pendências obrigatórias" conta COLABORADORES ÚNICOS com inscrição em curso
 *   `obrigatorio` ainda não concluída — não confunde com a quantidade de cursos
 *   obrigatórios cadastrados.
 * - Evolução só é calculada onde existe base histórica real (certificados do
 *   ano atual contra o ano anterior). Nada de percentual inventado.
 * ============================================================================
 */

/* ─── Tipos mínimos aceitos (linhas cruas do Supabase ou do mock visual) ───── */

export interface TreinamentoRegistro {
  id: string;
  nome: string;
  descricao?: string | null;
  data?: string | null;
  carga_horaria?: number | string | null;
  status?: string | null;
  /** Só existe se uma fonte real passar a fornecer o campo. */
  categoria?: string | null;
}

export interface InscricaoIndicador {
  colaborador_id?: string | null;
  curso_id?: string | null;
  status?: string | null;
}

export interface CursoIndicador {
  id: string;
  obrigatorio?: boolean | null;
}

export interface CertificadoIndicador {
  data_emissao?: string | null;
}

export interface ParticipanteRegistro {
  id?: string;
  treinamento_id: string;
  colaborador_id?: string | null;
  presente?: boolean | null;
  colaborador?: { nome_completo?: string | null; foto_url?: string | null } | null;
}

export interface ColaboradorParticipacao {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

export interface ResumoParticipacao {
  /** Colaboradores ÚNICOS inscritos no treinamento. */
  total: number;
  /** Quantos desses colaboradores têm presença confirmada (`presente = true`). */
  presentes: number;
  /** 0–100, arredondado — base da barra de progresso. */
  percentual: number;
  /**
   * Nº exibido no chip "+N" depois dos 3 avatares. Só é informado por dados
   * demonstrativos (o mock visual fixa o valor da referência); no caminho real
   * é derivado do tamanho da lista de colaboradores.
   */
  excedente?: number;
  colaboradores: ColaboradorParticipacao[];
}

/* ─── Texto / datas / horas ────────────────────────────────────────────────── */

/** Remove acentos e normaliza caixa — busca tolerante a "Comunicacao"/"comunicação". */
export function normalizarTexto(valor: string | null | undefined): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Datas chegam como `YYYY-MM-DD` (coluna TEXT da tabela/mock) ou como
 * timestamp ISO. A leitura manual de `YYYY-MM-DD` evita o recuo de um dia que
 * `new Date('2026-02-10')` (UTC) provoca em UTC-3.
 */
export function parseDataTreinamento(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor).trim());
  if (iso) {
    const data = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** `dd/MM/yyyy`; sem data → `—`. */
export function formatarDataTreinamento(valor: string | null | undefined): string {
  const data = parseDataTreinamento(valor);
  if (!data) return '—';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** `8h`, `1,5h`; sem carga → `—`. */
export function formatarCargaHoraria(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || numero <= 0) return '—';
  const texto = Number.isInteger(numero) ? String(numero) : numero.toFixed(1).replace('.', ',');
  return `${texto}h`;
}

/* ─── Status ───────────────────────────────────────────────────────────────── */

/**
 * Tons dos badges de status.
 * `teal` é exclusivo de “Concluído”: estado POSITIVO de finalização, distinto do
 * verde ativo de “Em andamento” e do cinza de “Não informado”. Usa o token
 * `aqua` (teal do sistema) para não introduzir cor nova.
 */
export type TomStatusTreinamento = 'success' | 'info' | 'warning' | 'teal' | 'neutral' | 'danger';

export interface StatusTreinamento {
  /** Código normalizado usado no filtro (estável). */
  codigo: string;
  label: string;
  tom: TomStatusTreinamento;
}

const STATUS_MAP: Record<string, { label: string; tom: TomStatusTreinamento }> = {
  em_andamento: { label: 'Em andamento', tom: 'success' },
  em_curso: { label: 'Em andamento', tom: 'success' },
  andamento: { label: 'Em andamento', tom: 'success' },
  em_execucao: { label: 'Em andamento', tom: 'success' },
  planejado: { label: 'Planejado', tom: 'info' },
  planejamento: { label: 'Planejado', tom: 'info' },
  agendado: { label: 'Planejado', tom: 'info' },
  aguardando_inicio: { label: 'Aguardando início', tom: 'warning' },
  aguardando: { label: 'Aguardando início', tom: 'warning' },
  pendente: { label: 'Pendente', tom: 'warning' },
  concluido: { label: 'Concluído', tom: 'teal' },
  concluida: { label: 'Concluído', tom: 'teal' },
  finalizado: { label: 'Concluído', tom: 'teal' },
  finalizada: { label: 'Concluído', tom: 'teal' },
  realizado: { label: 'Concluído', tom: 'teal' },
  cancelado: { label: 'Cancelado', tom: 'danger' },
  cancelada: { label: 'Cancelado', tom: 'danger' },
};

/** Chave comparável de status (sem acento, minúscula, `_` no lugar de espaço/hífen). */
export function chaveStatus(valor: string | null | undefined): string {
  return normalizarTexto(valor).replace(/[\s-]+/g, '_');
}

export function statusTreinamento(valor: string | null | undefined): StatusTreinamento {
  const codigo = chaveStatus(valor);
  if (!codigo) return { codigo: 'nao_informado', label: 'Não informado', tom: 'neutral' };
  const conhecido = STATUS_MAP[codigo];
  if (conhecido) return { codigo, ...conhecido };
  return { codigo, label: String(valor).trim(), tom: 'neutral' };
}

export const STATUS_AUSENTE = 'nao_informado';

/* ─── Filtros ──────────────────────────────────────────────────────────────── */

export type PeriodoTreinamento = 'todos' | 'mes' | '30d' | '90d' | 'ano';

export const PERIODO_OPCOES: readonly { value: PeriodoTreinamento; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'mes', label: 'Este mês' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ano', label: 'Este ano' },
];

export interface FiltrosTreinamento {
  busca?: string;
  status?: string;
  categoria?: string;
  periodo?: PeriodoTreinamento;
}

/** Categoria vazia é um valor de filtro próprio (não um curinga). */
export const CATEGORIA_AUSENTE = '__sem_categoria__';

/** Início (00:00 local) da janela do período; `null` = sem recorte. */
export function inicioPeriodoTreinamento(periodo: PeriodoTreinamento, referencia: Date = new Date()): Date | null {
  const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  switch (periodo) {
    case 'mes':
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    case '30d': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 30);
      return inicio;
    }
    case '90d': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 90);
      return inicio;
    }
    case 'ano':
      return new Date(hoje.getFullYear(), 0, 1);
    default:
      return null;
  }
}

/**
 * Busca (nome/descrição/categoria) + status + categoria + período.
 * Filtro vazio é curinga; registro sem data fica FORA quando há período ativo.
 */
export function filtrarTreinamentos<T extends TreinamentoRegistro>(
  lista: readonly T[],
  filtros: FiltrosTreinamento,
  referencia: Date = new Date()
): T[] {
  const termo = normalizarTexto(filtros.busca);
  const statusAlvo = filtros.status && filtros.status !== 'todos' ? filtros.status : null;
  const categoriaAlvo = filtros.categoria && filtros.categoria !== 'todos' ? filtros.categoria : null;
  const inicio = inicioPeriodoTreinamento(filtros.periodo ?? 'todos', referencia);

  return lista.filter((item) => {
    if (termo) {
      const alvo = normalizarTexto([item.nome, item.descricao ?? '', item.categoria ?? ''].filter(Boolean).join(' '));
      if (!alvo.includes(termo)) return false;
    }

    if (statusAlvo && statusTreinamento(item.status).codigo !== statusAlvo) return false;

    if (categoriaAlvo) {
      const categoriaItem = item.categoria ? normalizarTexto(item.categoria) : CATEGORIA_AUSENTE;
      if (categoriaItem !== categoriaAlvo) return false;
    }

    if (inicio) {
      const data = parseDataTreinamento(item.data);
      if (!data || data < inicio) return false;
    }

    return true;
  });
}

/** Opções de status a partir dos DADOS (nunca uma lista fixa da referência). */
export function opcoesStatusTreinamento(lista: readonly TreinamentoRegistro[]): { value: string; label: string }[] {
  const vistos = new Map<string, string>();
  for (const item of lista) {
    const status = statusTreinamento(item.status);
    if (!vistos.has(status.codigo)) vistos.set(status.codigo, status.label);
  }
  return Array.from(vistos, ([value, label]) => ({ value, label }));
}

/** Opções de categoria a partir dos DADOS; vazio quando não há vínculo real. */
export function opcoesCategoriaTreinamento(lista: readonly TreinamentoRegistro[]): { value: string; label: string }[] {
  const vistos = new Map<string, string>();
  for (const item of lista) {
    if (!item.categoria) continue;
    const value = normalizarTexto(item.categoria);
    if (!vistos.has(value)) vistos.set(value, String(item.categoria).trim());
  }
  return Array.from(vistos, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR')
  );
}

/* ─── Paginação ────────────────────────────────────────────────────────────── */

export interface PaginaTreinamentos<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  inicio: number;
  fim: number;
  total: number;
}

export const TREINAMENTOS_POR_PAGINA_PADRAO = 10;
export const TREINAMENTOS_OPCOES_POR_PAGINA = [5, 10, 20, 50] as const;

/** Fatia a lista JÁ filtrada; nunca devolve página inexistente nem linhas vazias. */
export function paginarTreinamentos<T>(lista: readonly T[], pagina: number, porPagina: number): PaginaTreinamentos<T> {
  const tamanho = Math.max(1, Math.floor(porPagina) || 1);
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const paginaAtual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  const inicioIdx = (paginaAtual - 1) * tamanho;
  const itens = lista.slice(inicioIdx, inicioIdx + tamanho);
  return {
    itens,
    pagina: paginaAtual,
    totalPaginas,
    inicio: total === 0 ? 0 : inicioIdx + 1,
    fim: inicioIdx + itens.length,
    total,
  };
}

/* ─── Participantes ────────────────────────────────────────────────────────── */

/**
 * Agrupa `treinamento_participantes` por treinamento, contando COLABORADORES
 * ÚNICOS. `presentes` é a presença confirmada — é o numerador da barra
 * ("X de Y"). Nenhum número é estimado: sem registros, o treinamento fica sem
 * resumo e a célula mostra o estado vazio.
 */
export function agruparParticipantes(
  participantes: readonly ParticipanteRegistro[]
): Record<string, ResumoParticipacao> {
  const porTreinamento = new Map<string, Map<string, { colaborador: ColaboradorParticipacao; presente: boolean }>>();

  for (const registro of participantes) {
    const treinamentoId = registro.treinamento_id;
    if (!treinamentoId) continue;

    const nome = registro.colaborador?.nome_completo?.trim() || 'Colaborador';
    const chaveColaborador = registro.colaborador_id || registro.id || `${treinamentoId}:${nome}`;
    const mapa = porTreinamento.get(treinamentoId) ?? new Map();

    const anterior = mapa.get(chaveColaborador);
    mapa.set(chaveColaborador, {
      colaborador: {
        id: chaveColaborador,
        nome,
        fotoUrl: registro.colaborador?.foto_url ?? null,
      },
      presente: Boolean(anterior?.presente) || registro.presente === true,
    });
    porTreinamento.set(treinamentoId, mapa);
  }

  const resultado: Record<string, ResumoParticipacao> = {};
  for (const [treinamentoId, mapa] of porTreinamento) {
    const colaboradores = Array.from(mapa.values());
    const total = colaboradores.length;
    const presentes = colaboradores.filter((c) => c.presente).length;
    resultado[treinamentoId] = {
      total,
      presentes,
      percentual: total === 0 ? 0 : Math.round((presentes / total) * 100),
      colaboradores: colaboradores.map((c) => c.colaborador),
    };
  }
  return resultado;
}

/* ─── Ocupação (fonte demonstrativa) ──────────────────────────────────────── */

/**
 * Ocupação de um treinamento quando a fonte informa INSCRITOS × CAPACIDADE em
 * vez das linhas de `treinamento_participantes`. É o formato do mock visual
 * (`getMockParticipacaoTreinamentos`), cujos números vêm da referência aprovada:
 * "X de Y" na barra e `excedente` no chip "+N".
 */
export interface OcupacaoParticipacao {
  /** Colaboradores inscritos — numerador de "X de Y". */
  inscritos: number;
  /** Capacidade/total de vagas — denominador de "X de Y". */
  capacidade: number;
  /** Nº fixo do chip "+N"; sem ele, deriva dos avatares exibidos. */
  excedente?: number;
  colaboradores: ColaboradorParticipacao[];
}

/** Quantos avatares a célula Participantes mostra antes do chip "+N". */
const AVATARES_VISIVEIS = 3;

/**
 * Converte uma ocupação informada (inscritos de capacidade) no MESMO
 * `ResumoParticipacao` que a tabela consome. `presentes` recebe os inscritos para
 * que a célula leia "X de Y" com os números da fonte; nenhum valor é estimado.
 */
export function resumirOcupacao({
  inscritos,
  capacidade,
  excedente,
  colaboradores,
}: OcupacaoParticipacao): ResumoParticipacao {
  const total = Math.max(0, Math.floor(Number(capacidade) || 0));
  const presentes = Math.min(total, Math.max(0, Math.floor(Number(inscritos) || 0)));
  const visiveis = Math.min(AVATARES_VISIVEIS, colaboradores.length);
  return {
    total,
    presentes,
    percentual: total === 0 ? 0 : Math.round((presentes / total) * 100),
    excedente: excedente ?? Math.max(0, presentes - visiveis),
    colaboradores,
  };
}

/** Aplica `resumirOcupacao` a um mapa treinamento → ocupação. */
export function resumirOcupacoes(
  porTreinamento: Record<string, OcupacaoParticipacao>
): Record<string, ResumoParticipacao> {
  return Object.fromEntries(
    Object.entries(porTreinamento).map(([treinamentoId, ocupacao]) => [treinamentoId, resumirOcupacao(ocupacao)])
  );
}

/* ─── Indicadores (KPIs) ───────────────────────────────────────────────────── */

export interface EntradaIndicadoresTreinamentos {
  inscricoes: readonly InscricaoIndicador[];
  cursos: readonly CursoIndicador[];
  certificados: readonly CertificadoIndicador[];
  referencia?: Date;
}

export interface IndicadoresTreinamentos {
  /** Colaboradores únicos com inscrição ativa. */
  participacaoAtiva: number;
  /** % concluídas sobre inscrições consideradas; `null` sem base. */
  conclusaoPercentual: number | null;
  conclusoes: number;
  inscricoesConsideradas: number;
  /** Colaboradores únicos com curso obrigatório pendente. */
  pendenciasObrigatorias: number;
  /** Certificados emitidos no ano corrente. */
  certificadosAno: number;
  /** Variação % contra o ano anterior; `null` quando não há base. */
  variacaoCertificados: number | null;
  /** `false` quando a consulta de origem ainda não trouxe dados. */
  participacaoDisponivel: boolean;
  conclusaoDisponivel: boolean;
  pendenciasDisponiveis: boolean;
  certificadosDisponiveis: boolean;
}

const STATUS_ATIVOS = ['em_andamento', 'em_curso', 'andamento', 'em_execucao', 'inscrito'];
const STATUS_CONCLUIDOS = ['concluido', 'concluida', 'finalizado', 'finalizada', 'certificado', 'aprovado'];
const STATUS_FORA_DENOMINADOR = ['cancelado', 'cancelada', 'desistente', 'trancado', 'trancada'];

export function calcularIndicadoresTreinamentos({
  inscricoes,
  cursos,
  certificados,
  referencia = new Date(),
}: EntradaIndicadoresTreinamentos): IndicadoresTreinamentos {
  const ativos = new Set<string>();
  const inscricoesValidas: InscricaoIndicador[] = [];

  for (const inscricao of inscricoes) {
    const chave = chaveStatus(inscricao.status);
    if (STATUS_FORA_DENOMINADOR.includes(chave)) continue;
    inscricoesValidas.push(inscricao);
    if (inscricao.colaborador_id && STATUS_ATIVOS.includes(chave)) ativos.add(inscricao.colaborador_id);
  }

  const obrigatorios = new Set(cursos.filter((c) => c.obrigatorio === true).map((c) => c.id));
  const pendentes = new Set<string>();
  if (obrigatorios.size > 0) {
    for (const inscricao of inscricoesValidas) {
      if (!inscricao.colaborador_id || !inscricao.curso_id) continue;
      if (!obrigatorios.has(inscricao.curso_id)) continue;
      const chave = chaveStatus(inscricao.status);
      if (STATUS_CONCLUIDOS.includes(chave)) continue;
      pendentes.add(inscricao.colaborador_id);
    }
  }

  const anoAtual = referencia.getFullYear();
  let certificadosAno = 0;
  let certificadosAnoAnterior = 0;
  for (const certificado of certificados) {
    const data = parseDataTreinamento(certificado.data_emissao);
    if (!data) continue;
    if (data.getFullYear() === anoAtual) certificadosAno += 1;
    else if (data.getFullYear() === anoAtual - 1) certificadosAnoAnterior += 1;
  }

  const total = inscricoesValidas.length;
  const conclusoes = inscricoesValidas.filter((i) => STATUS_CONCLUIDOS.includes(chaveStatus(i.status))).length;

  return {
    participacaoAtiva: ativos.size,
    conclusaoPercentual: total === 0 ? null : Math.round((conclusoes / total) * 100),
    conclusoes,
    inscricoesConsideradas: total,
    pendenciasObrigatorias: pendentes.size,
    certificadosAno,
    variacaoCertificados:
      certificadosAnoAnterior === 0
        ? null
        : Math.round(((certificadosAno - certificadosAnoAnterior) / certificadosAnoAnterior) * 100),
    participacaoDisponivel: inscricoes.length > 0,
    conclusaoDisponivel: total > 0,
    pendenciasDisponiveis: cursos.length > 0,
    certificadosDisponiveis: certificados.length > 0,
  };
}
