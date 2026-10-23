/**
 * ============================================================================
 * TURMAS / INSTÂNCIAS — derivações puras do painel operacional.
 *
 * Sem React e sem Supabase: a página/aba só entrega as linhas já carregadas
 * (`treinamento_instancias` + `catalogo_cursos` + instrutores) e este módulo
 * decide agrupamento, filtros, ordenação, ocupação e semana da agenda.
 *
 * HONESTIDADE DOS DADOS
 * - `status` é o campo real da instância (`planejado`, `em_curso`, `concluido`,
 *   `cancelado`). Nenhum status é reescrito; o agrupamento apenas escolhe a
 *   coluna em que o registro aparece e o badge continua mostrando o valor real.
 * - `data_inicio` é TIMESTAMPTZ: o horário exibido vem do próprio timestamp,
 *   nunca da carga horária. Registros sem hora (`YYYY-MM-DD`) não inventam
 *   horário.
 * - `local_link` é o único campo de local. Sem ele, a modalidade real do curso
 *   pode suprir a informação quando for online; caso contrário a UI mostra
 *   “Não informado”.
 * - OCUPAÇÃO: `treinamento_instancias` NÃO possui contagem de inscritos. O
 *   cálculo só existe quando uma fonte real fornecer `inscritos`; capacidade
 *   sozinha nunca vira percentual. Divisão por zero e `NaN` são impossíveis.
 * - `cancelado` permanece com seu badge real e entra no histórico (coluna
 *   “Turmas concluídas”), pois a referência tem apenas três colunas e o
 *   registro não pode ser descartado.
 * ============================================================================
 */
import {
  chaveModalidade,
  chaveStatus,
  formatarCargaHoraria,
  normalizarTexto,
  rotuloModalidade,
  statusTreinamento,
  type StatusTreinamento,
} from './treinamentosDerivacoes';

/* ─── Tipos de entrada (linhas cruas do Supabase ou do mock visual) ───────── */

export interface TurmaRegistro {
  id: string;
  curso_id?: string | null;
  instrutor_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  local_link?: string | null;
  capacidade_maxima?: number | string | null;
  status?: string | null;
  /** Só existe se a fonte real passar a fornecer inscritos POR TURMA. */
  inscritos?: number | string | null;
  curso?: { nome?: string | null } | null;
  instrutor?: { nome_completo?: string | null; foto_url?: string | null; cargo?: string | null } | null;
}

export interface CursoTurma {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  modalidade?: string | null;
  carga_horaria?: number | string | null;
  imagem_url?: string | null;
}

export interface ColaboradorTurma {
  id: string;
  nome_completo?: string | null;
  foto_url?: string | null;
  cargo?: string | null;
}

/* ─── Modelo de apresentação ──────────────────────────────────────────────── */

export type GrupoTurma = 'proximas' | 'andamento' | 'concluidas';

export interface OcupacaoTurma {
  inscritos: number;
  capacidade: number;
  /** Percentual real (pode passar de 100 quando a turma está acima da capacidade). */
  percentual: number;
}

export interface Turma {
  id: string;
  cursoId: string | null;
  cursoNome: string;
  categoria: string | null;
  descricao: string | null;
  modalidade: string | null;
  modalidadeRotulo: string;
  cargaHoraria: string | null;
  imagemUrl: string | null;
  instrutorId: string | null;
  instrutorNome: string | null;
  instrutorFoto: string | null;
  instrutorCargo: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  /** Data local normalizada (meia-noite) — usada em filtro, coluna e agenda. */
  data: Date | null;
  /** `HH:mm` somente quando o registro realmente traz horário. */
  hora: string | null;
  local: string | null;
  capacidade: number | null;
  status: string | null;
  statusInfo: StatusTreinamento;
  grupo: GrupoTurma;
  ocupacao: OcupacaoTurma | null;
}

/* ─── Datas / horas ───────────────────────────────────────────────────────── */

/**
 * Converte a data da turma em `Date` LOCAL.
 * `YYYY-MM-DD` puro é lido campo a campo (evita o recuo de um dia em UTC-3);
 * timestamps ISO com hora/offset usam o fuso da aplicação, como o banco envia.
 */
export function lerDataTurma(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  const apenasData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (apenasData) {
    const data = new Date(Number(apenasData[1]), Number(apenasData[2]) - 1, Number(apenasData[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** O registro traz hora explícita (`T09:00`/` 09:00`)? */
export function temHoraTurma(valor: string | null | undefined): boolean {
  return /[T ]\d{2}:\d{2}/.test(String(valor ?? ''));
}

/** `HH:mm` local; `null` quando a fonte só tem data (nada é deduzido). */
export function formatarHoraTurma(valor: string | null | undefined): string | null {
  if (!temHoraTurma(valor)) return null;
  const data = lerDataTurma(valor);
  if (!data) return null;
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** `dd/MM/yyyy`; sem data → `—`. */
export function formatarDataTurma(valor: string | null | undefined): string {
  const data = lerDataTurma(valor);
  if (!data) return '—';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Meia-noite local da data informada. */
function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Segunda-feira 00:00 da semana que contém `referencia`. */
export function inicioSemana(referencia: Date): Date {
  const dia = inicioDoDia(referencia);
  const deslocamento = (dia.getDay() + 6) % 7; // domingo (0) → 6; segunda (1) → 0
  dia.setDate(dia.getDate() - deslocamento);
  return dia;
}

/** Soma dias sem mutar a data original. */
export function somarDias(data: Date, dias: number): Date {
  const copia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

const MES_CURTO = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function mesCurto(data: Date): string {
  return MES_CURTO.format(data).replace('.', '');
}

/** `31 ago – 06 set 2026` (ano repetido só quando a semana cruza o ano). */
export function formatarIntervaloSemana(inicio: Date): string {
  const fim = somarDias(inicio, 6);
  const dia = (d: Date) => String(d.getDate()).padStart(2, '0');
  const mesmoAno = inicio.getFullYear() === fim.getFullYear();
  const inicioTexto = `${dia(inicio)} ${mesCurto(inicio)}${mesmoAno ? '' : ` ${inicio.getFullYear()}`}`;
  return `${inicioTexto} – ${dia(fim)} ${mesCurto(fim)} ${fim.getFullYear()}`;
}

const DIA_CURTO = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

/** `SEG`, `TER`… sem o ponto do `Intl`. */
export function abreviacaoDiaSemana(data: Date): string {
  return DIA_CURTO.format(data).replace('.', '').toUpperCase();
}

export function numeroDia(data: Date): string {
  return String(data.getDate()).padStart(2, '0');
}

export interface DiaDaSemana {
  data: Date;
  turmas: Turma[];
}

/** Sete dias (segunda→domingo) com as turmas cuja data cai em cada dia. */
export function diasDaSemanaComTurmas(turmas: readonly Turma[], inicio: Date): DiaDaSemana[] {
  const base = inicioSemana(inicio);
  return Array.from({ length: 7 }, (_, indice) => {
    const dia = somarDias(base, indice);
    const chave = dia.getTime();
    return {
      data: dia,
      turmas: turmas.filter((turma) => turma.data && inicioDoDia(turma.data).getTime() === chave),
    };
  });
}

/**
 * Semana inicial da agenda: a semana corrente quando ela já tem turma;
 * caso contrário, a semana da turma com data mais próxima de hoje (passada ou
 * futura). Sem turmas, retorna `null` e a agenda abre na semana corrente.
 */
export function semanaSugeridaAgenda(turmas: readonly Turma[], referencia: Date = new Date()): Date | null {
  const comData = turmas.filter((turma): turma is Turma & { data: Date } => Boolean(turma.data));
  if (comData.length === 0) return null;

  const hoje = inicioDoDia(referencia).getTime();
  const semanaAtual = inicioSemana(referencia).getTime();
  const naSemanaAtual = comData.some((turma) => inicioSemana(turma.data).getTime() === semanaAtual);
  if (naSemanaAtual) return new Date(semanaAtual);

  let maisProxima = comData[0];
  for (const turma of comData) {
    const distancia = Math.abs(inicioDoDia(turma.data).getTime() - hoje);
    const distanciaAtual = Math.abs(inicioDoDia(maisProxima.data).getTime() - hoje);
    if (distancia < distanciaAtual) maisProxima = turma;
  }
  return inicioSemana(maisProxima.data);
}

/* ─── Normalização e agrupamento ──────────────────────────────────────────── */

/**
 * Coluna de cada status REAL. Status fora do mapa não é descartado: cai em
 * “Próximas turmas” mantendo seu badge original (neutral/aviso).
 * `cancelado` entra no histórico — a turma foi encerrada e o badge continua
 * vermelho com o rótulo real.
 */
const GRUPO_POR_STATUS: Record<string, GrupoTurma> = {
  planejado: 'proximas',
  planejamento: 'proximas',
  agendado: 'proximas',
  aguardando_inicio: 'proximas',
  pendente: 'proximas',
  em_curso: 'andamento',
  em_andamento: 'andamento',
  andamento: 'andamento',
  em_execucao: 'andamento',
  concluido: 'concluidas',
  concluida: 'concluidas',
  finalizado: 'concluidas',
  finalizada: 'concluidas',
  realizado: 'concluidas',
  cancelado: 'concluidas',
  cancelada: 'concluidas',
};

export function grupoDaTurma(status: string | null | undefined): GrupoTurma {
  return GRUPO_POR_STATUS[chaveStatus(status)] ?? 'proximas';
}

/** Capacidade válida (> 0). Zero, negativa, vazia ou inválida → `null`. */
export function capacidadeTurma(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/** Percentual real; `null` quando faltam inscritos ou capacidade válidos. */
export function calcularOcupacaoTurma(
  inscritos: number | string | null | undefined,
  capacidade: number | null
): OcupacaoTurma | null {
  if (!capacidade || capacidade <= 0) return null;
  if (inscritos === null || inscritos === undefined || inscritos === '') return null;
  const total = typeof inscritos === 'number' ? inscritos : Number(String(inscritos).replace(',', '.'));
  if (!Number.isFinite(total) || total < 0) return null;
  return { inscritos: total, capacidade, percentual: Math.round((total / capacidade) * 100) };
}

/** Junta a instância ao curso e ao instrutor JÁ carregados; nada é consultado. */
export function montarTurmas(
  instancias: readonly TurmaRegistro[],
  cursos: readonly CursoTurma[],
  colaboradores: readonly ColaboradorTurma[] = []
): Turma[] {
  const cursoPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const colaboradorPorId = new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador]));

  return instancias.map((instancia) => {
    const curso = instancia.curso_id ? cursoPorId.get(instancia.curso_id) : undefined;
    const instrutor = instancia.instrutor_id ? colaboradorPorId.get(instancia.instrutor_id) : undefined;
    const capacidade = capacidadeTurma(instancia.capacidade_maxima);
    const modalidade = curso?.modalidade ?? null;
    const local = instancia.local_link?.trim() ? String(instancia.local_link).trim() : null;
    const nomeInstrutor = instrutor?.nome_completo ?? instancia.instrutor?.nome_completo ?? null;

    return {
      id: String(instancia.id),
      cursoId: instancia.curso_id ?? null,
      cursoNome: curso?.nome?.trim() || instancia.curso?.nome?.trim() || 'Curso não identificado',
      categoria: curso?.categoria ?? null,
      descricao: curso?.descricao ?? null,
      modalidade,
      modalidadeRotulo: rotuloModalidade(modalidade),
      cargaHoraria: curso?.carga_horaria != null ? formatarCargaHoraria(curso.carga_horaria) : null,
      imagemUrl: curso?.imagem_url ?? null,
      instrutorId: instancia.instrutor_id ?? null,
      instrutorNome: nomeInstrutor,
      instrutorFoto: instrutor?.foto_url ?? instancia.instrutor?.foto_url ?? null,
      instrutorCargo: instrutor?.cargo ?? instancia.instrutor?.cargo ?? null,
      dataInicio: instancia.data_inicio ?? null,
      dataFim: instancia.data_fim ?? null,
      data: lerDataTurma(instancia.data_inicio),
      hora: formatarHoraTurma(instancia.data_inicio),
      local,
      capacidade,
      status: instancia.status ?? null,
      statusInfo: statusTreinamento(instancia.status),
      grupo: grupoDaTurma(instancia.status),
      ocupacao: calcularOcupacaoTurma(instancia.inscritos, capacidade),
    };
  });
}

export interface GruposTurmas {
  proximas: Turma[];
  andamento: Turma[];
  concluidas: Turma[];
}

/** Preserva a ordem recebida (já ordenada) dentro de cada coluna. */
export function agruparTurmas(turmas: readonly Turma[]): GruposTurmas {
  const grupos: GruposTurmas = { proximas: [], andamento: [], concluidas: [] };
  for (const turma of turmas) grupos[turma.grupo].push(turma);
  return grupos;
}

export function contarTurmas(grupos: GruposTurmas): Record<GrupoTurma, number> {
  return {
    proximas: grupos.proximas.length,
    andamento: grupos.andamento.length,
    concluidas: grupos.concluidas.length,
  };
}

/* ─── Filtros / ordenação ─────────────────────────────────────────────────── */

export type PeriodoTurma = 'todas' | 'proximas30' | 'proximas90' | 'mes' | 'ano';

export const PERIODO_TURMA_OPCOES: readonly { value: PeriodoTurma; label: string }[] = [
  { value: 'todas', label: 'Todos' },
  { value: 'proximas30', label: 'Próximos 30 dias' },
  { value: 'proximas90', label: 'Próximos 90 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ano', label: 'Este ano' },
];

export interface IntervaloPeriodoTurma {
  inicio: Date;
  fim: Date;
}

/** Janela local (inclusive) do período; `null` = sem recorte. */
export function intervaloPeriodoTurma(
  periodo: PeriodoTurma,
  referencia: Date = new Date()
): IntervaloPeriodoTurma | null {
  const hoje = inicioDoDia(referencia);
  switch (periodo) {
    case 'proximas30':
      return { inicio: hoje, fim: somarDias(hoje, 30) };
    case 'proximas90':
      return { inicio: hoje, fim: somarDias(hoje, 90) };
    case 'mes':
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0),
      };
    case 'ano':
      return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: new Date(hoje.getFullYear(), 11, 31) };
    default:
      return null;
  }
}

export type OrdenacaoTurma = 'data_asc' | 'data_desc' | 'curso' | 'capacidade';

export const ORDENACAO_TURMA_OPCOES: readonly { value: OrdenacaoTurma; label: string }[] = [
  { value: 'data_asc', label: 'Próximas datas' },
  { value: 'data_desc', label: 'Datas mais recentes' },
  { value: 'curso', label: 'Curso (A–Z)' },
  { value: 'capacidade', label: 'Maior capacidade' },
];

export const ORDENACAO_TURMA_PADRAO: OrdenacaoTurma = 'data_asc';

export interface FiltrosTurma {
  busca?: string;
  /** `todos`/vazio = curinga. Usa o CÓDIGO real do status. */
  status?: string;
  /** `todas`/vazio = curinga. Chave normalizada da modalidade do curso. */
  modalidade?: string;
  periodo?: PeriodoTurma;
  ordenacao?: OrdenacaoTurma;
}

/** Busca por curso, identificação da turma, instrutor, categoria/local. */
export function filtrarTurmas(turmas: readonly Turma[], filtros: FiltrosTurma, referencia: Date = new Date()): Turma[] {
  const termo = normalizarTexto(filtros.busca);
  const statusAlvo = filtros.status && filtros.status !== 'todos' ? chaveStatus(filtros.status) : null;
  const modalidadeAlvo =
    filtros.modalidade && filtros.modalidade !== 'todas' ? chaveModalidade(filtros.modalidade) : null;
  const intervalo = intervaloPeriodoTurma(filtros.periodo ?? 'todas', referencia);

  return turmas.filter((turma) => {
    if (termo) {
      const alvo = normalizarTexto(
        [
          turma.cursoNome,
          turma.instrutorNome ?? '',
          turma.categoria ?? '',
          turma.modalidadeRotulo,
          turma.local ?? '',
          turma.id,
        ]
          .filter(Boolean)
          .join(' ')
      );
      if (!alvo.includes(termo)) return false;
    }

    if (statusAlvo && chaveStatus(turma.status) !== statusAlvo) return false;

    if (modalidadeAlvo && chaveModalidade(turma.modalidade) !== modalidadeAlvo) return false;

    if (intervalo) {
      if (!turma.data) return false;
      const dia = inicioDoDia(turma.data).getTime();
      if (dia < intervalo.inicio.getTime() || dia > intervalo.fim.getTime()) return false;
    }

    return true;
  });
}

function compararCurso(a: Turma, b: Turma): number {
  return a.cursoNome.localeCompare(b.cursoNome, 'pt-BR');
}

/** Ordena uma CÓPIA; registros sem data ficam ao final em ambas as ordens. */
export function ordenarTurmas(turmas: readonly Turma[], ordenacao: OrdenacaoTurma): Turma[] {
  const copia = [...turmas];
  switch (ordenacao) {
    case 'data_desc':
      return copia.sort((a, b) => {
        if (!a.data && !b.data) return compararCurso(a, b);
        if (!a.data) return 1;
        if (!b.data) return -1;
        return b.data.getTime() - a.data.getTime() || compararCurso(a, b);
      });
    case 'curso':
      return copia.sort(compararCurso);
    case 'capacidade':
      return copia.sort((a, b) => (b.capacidade ?? 0) - (a.capacidade ?? 0) || compararCurso(a, b));
    default:
      return copia.sort((a, b) => {
        if (!a.data && !b.data) return compararCurso(a, b);
        if (!a.data) return 1;
        if (!b.data) return -1;
        return a.data.getTime() - b.data.getTime() || compararCurso(a, b);
      });
  }
}

/** Status REAIS presentes no recorte (não uma lista fixa da referência). */
export function opcoesStatusTurma(turmas: readonly Turma[]): { value: string; label: string }[] {
  const vistos = new Map<string, string>();
  for (const turma of turmas) {
    const codigo = chaveStatus(turma.status);
    if (!codigo) continue;
    if (!vistos.has(codigo)) vistos.set(codigo, turma.statusInfo.label);
  }
  return Array.from(vistos, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR')
  );
}

/** Modalidades REAIS dos cursos vinculados às turmas. */
export function opcoesModalidadeTurma(turmas: readonly Turma[]): { value: string; label: string }[] {
  const vistos = new Map<string, string>();
  for (const turma of turmas) {
    const chave = chaveModalidade(turma.modalidade);
    if (!chave) continue;
    if (!vistos.has(chave)) vistos.set(chave, turma.modalidadeRotulo);
  }
  return Array.from(vistos, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR')
  );
}

/**
 * Índice de entrada dos cards na ordem da referência: primeiro card de cada
 * coluna, depois o segundo de cada coluna etc., ignorando colunas vazias.
 */
export function indicesEntradaTurmas(grupos: GruposTurmas): Map<string, number> {
  const colunas = [grupos.proximas, grupos.andamento, grupos.concluidas];
  const maior = Math.max(...colunas.map((coluna) => coluna.length));
  const mapa = new Map<string, number>();
  let indice = 0;
  for (let linha = 0; linha < maior; linha += 1) {
    for (const coluna of colunas) {
      const turma = coluna[linha];
      if (turma) mapa.set(turma.id, indice++);
    }
  }
  return mapa;
}
