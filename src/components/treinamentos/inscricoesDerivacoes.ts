/**
 * INSCRIÇÕES — derivações puras da aba (sem React e sem Supabase).
 *
 * O schema de `inscricoes_cursos` possui status, data_inicio, data_conclusao,
 * nota, certificado_url, colaborador_id e curso_id. NÃO possui progresso nem
 * conclusão prevista; nenhum percentual é derivado do status. “Atrasado” só
 * existe se o próprio status for literalmente atrasado.
 */
import {
  formatarDataTreinamento,
  inicioPeriodoTreinamento,
  normalizarTexto,
  parseDataTreinamento,
  type PeriodoTreinamento,
} from './treinamentosDerivacoes';
import type { Certificado } from './certificadosDerivacoes';

export interface InscricaoRegistro {
  id: string;
  empresa_id?: string | null;
  colaborador_id?: string | null;
  curso_id?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_conclusao?: string | null;
  nota?: number | string | null;
  certificado_url?: string | null;
  /** Campo opcional: só é usado se uma fonte real passar a fornecê-lo. */
  progresso?: number | string | null;
  colaborador?: {
    id?: string | null;
    nome_completo?: string | null;
    foto_url?: string | null;
    cargo?: string | null;
    departamento?: string | null;
  } | null;
  curso?: { id?: string | null; nome?: string | null; categoria?: string | null } | null;
}

export interface CursoInscricao {
  id: string;
  nome: string;
  categoria?: string | null;
}

export interface ColaboradorInscricao {
  id: string;
  nome_completo?: string | null;
  foto_url?: string | null;
  cargo?: string | null;
  departamento?: string | null;
}

export type TomInscricao = 'sucesso' | 'andamento' | 'inscrito' | 'alerta' | 'perigo' | 'neutro';

export interface StatusInscricao {
  codigo: string;
  label: string;
  tom: TomInscricao;
  original: string | null;
}

const STATUS_MAP: Record<string, { codigo: string; label: string; tom: TomInscricao }> = {
  inscrito: { codigo: 'inscrito', label: 'Inscrito', tom: 'inscrito' },
  inscrita: { codigo: 'inscrito', label: 'Inscrito', tom: 'inscrito' },
  em_andamento: { codigo: 'em_andamento', label: 'Em andamento', tom: 'andamento' },
  em_curso: { codigo: 'em_andamento', label: 'Em andamento', tom: 'andamento' },
  andamento: { codigo: 'em_andamento', label: 'Em andamento', tom: 'andamento' },
  em_execucao: { codigo: 'em_andamento', label: 'Em andamento', tom: 'andamento' },
  concluido: { codigo: 'concluido', label: 'Concluído', tom: 'sucesso' },
  concluida: { codigo: 'concluido', label: 'Concluído', tom: 'sucesso' },
  finalizado: { codigo: 'concluido', label: 'Concluído', tom: 'sucesso' },
  finalizada: { codigo: 'concluido', label: 'Concluído', tom: 'sucesso' },
  realizado: { codigo: 'concluido', label: 'Concluído', tom: 'sucesso' },
  atrasado: { codigo: 'atrasado', label: 'Atrasado', tom: 'perigo' },
  atrasada: { codigo: 'atrasado', label: 'Atrasado', tom: 'perigo' },
  cancelado: { codigo: 'cancelado', label: 'Cancelado', tom: 'perigo' },
  cancelada: { codigo: 'cancelado', label: 'Cancelado', tom: 'perigo' },
  pendente: { codigo: 'pendente', label: 'Pendente', tom: 'alerta' },
};

export function statusInscricao(valor: string | null | undefined): StatusInscricao {
  const original = valor?.trim() || null;
  if (!original) return { codigo: 'nao_informado', label: 'Não informado', tom: 'neutro', original: null };
  const chave = normalizarTexto(original).replace(/[\s-]+/g, '_');
  const conhecido = STATUS_MAP[chave];
  if (conhecido) return { ...conhecido, original };
  return { codigo: chave || 'nao_informado', label: original.replace(/_/g, ' '), tom: 'neutro', original };
}

function normalizarProgresso(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0 || numero > 100) return null;
  return Math.round(numero);
}

function textoData(data: Date | null): string {
  if (!data) return 'Não informado';
  return formatarDataTreinamento(
    `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
  );
}

export interface Inscricao {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorFoto: string | null;
  colaboradorCargo: string | null;
  colaboradorDepartamento: string | null;
  cursoId: string;
  cursoNome: string;
  categoria: string | null;
  statusCodigo: string;
  statusLabel: string;
  statusOriginal: string | null;
  statusTom: TomInscricao;
  dataInicio: Date | null;
  dataInicioTexto: string;
  dataConclusao: Date | null;
  dataConclusaoTexto: string;
  progresso: number | null;
  certificado: Certificado | null;
}

export function montarInscricoes(
  registros: readonly InscricaoRegistro[],
  cursos: readonly CursoInscricao[] = [],
  colaboradores: readonly ColaboradorInscricao[] = [],
  certificados: readonly Certificado[] = []
): Inscricao[] {
  const cursoPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const colaboradorPorId = new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador]));
  const certificadoPorChave = new Map(
    certificados
      .filter((certificado) => certificado.colaboradorId && certificado.cursoId)
      .map((certificado) => [`${certificado.colaboradorId}::${certificado.cursoId}`, certificado])
  );

  return registros.map((registro) => {
    const colaboradorId = String(registro.colaborador_id ?? registro.colaborador?.id ?? '');
    const cursoId = String(registro.curso_id ?? registro.curso?.id ?? '');
    const colaborador = colaboradorPorId.get(colaboradorId);
    const curso = cursoPorId.get(cursoId);
    const status = statusInscricao(registro.status);
    const nome = registro.colaborador?.nome_completo?.trim() || colaborador?.nome_completo?.trim() || '';
    const nomeCurso = registro.curso?.nome?.trim() || curso?.nome?.trim() || '';
    const foto = registro.colaborador?.foto_url ?? colaborador?.foto_url ?? null;
    const cargo = registro.colaborador?.cargo?.trim() || colaborador?.cargo?.trim() || null;
    const departamento = registro.colaborador?.departamento?.trim() || colaborador?.departamento?.trim() || null;
    const categoria = registro.curso?.categoria?.trim() || curso?.categoria?.trim() || null;
    const inicio = parseDataTreinamento(registro.data_inicio);
    const conclusao = parseDataTreinamento(registro.data_conclusao);

    return {
      id: String(registro.id),
      colaboradorId,
      colaboradorNome: nome || 'Colaborador não informado',
      colaboradorFoto: foto,
      colaboradorCargo: cargo,
      colaboradorDepartamento: departamento,
      cursoId,
      cursoNome: nomeCurso || 'Curso não informado',
      categoria,
      statusCodigo: status.codigo,
      statusLabel: status.label,
      statusOriginal: status.original,
      statusTom: status.tom,
      dataInicio: inicio,
      dataInicioTexto: textoData(inicio),
      dataConclusao: conclusao,
      dataConclusaoTexto: textoData(conclusao),
      progresso: normalizarProgresso(registro.progresso),
      certificado: colaboradorId && cursoId ? (certificadoPorChave.get(`${colaboradorId}::${cursoId}`) ?? null) : null,
    };
  });
}

export interface FiltrosInscricao {
  busca?: string;
  status?: string;
  cursoId?: string;
  departamento?: string;
  periodo?: PeriodoTreinamento;
}

export function filtrarInscricoes(
  inscricoes: readonly Inscricao[],
  filtros: FiltrosInscricao,
  referencia: Date = new Date()
): Inscricao[] {
  const termo = normalizarTexto(filtros.busca);
  const status = filtros.status && filtros.status !== 'todos' ? filtros.status : null;
  const curso = filtros.cursoId && filtros.cursoId !== 'todos' ? filtros.cursoId : null;
  const departamento =
    filtros.departamento && filtros.departamento !== 'todos' ? normalizarTexto(filtros.departamento) : null;
  const inicio = inicioPeriodoTreinamento(filtros.periodo ?? 'todos', referencia);

  return inscricoes.filter((inscricao) => {
    if (termo) {
      const alvo = normalizarTexto(
        [
          inscricao.colaboradorNome,
          inscricao.cursoNome,
          inscricao.colaboradorDepartamento ?? '',
          inscricao.colaboradorCargo ?? '',
          inscricao.categoria ?? '',
        ].join(' ')
      );
      if (!alvo.includes(termo)) return false;
    }
    if (status && inscricao.statusCodigo !== status) return false;
    if (curso && inscricao.cursoId !== curso) return false;
    if (departamento && normalizarTexto(inscricao.colaboradorDepartamento) !== departamento) return false;
    if (inicio) {
      if (!inscricao.dataInicio) return false;
      if (inscricao.dataInicio.getTime() < inicio.getTime()) return false;
    }
    return true;
  });
}

export interface OpcaoInscricao {
  value: string;
  label: string;
}

const ORDEM_STATUS = ['em_andamento', 'concluido', 'inscrito', 'pendente', 'atrasado', 'cancelado'];

export function opcoesStatusInscricao(inscricoes: readonly Inscricao[]): OpcaoInscricao[] {
  const mapa = new Map<string, string>();
  for (const inscricao of inscricoes) {
    if (!mapa.has(inscricao.statusCodigo)) mapa.set(inscricao.statusCodigo, inscricao.statusLabel);
  }
  const ordenadas = [...mapa.entries()].sort(([codigoA, labelA], [codigoB, labelB]) => {
    const posicaoA = ORDEM_STATUS.indexOf(codigoA);
    const posicaoB = ORDEM_STATUS.indexOf(codigoB);
    if (posicaoA !== -1 || posicaoB !== -1)
      return (posicaoA === -1 ? 99 : posicaoA) - (posicaoB === -1 ? 99 : posicaoB);
    return labelA.localeCompare(labelB, 'pt-BR');
  });
  return [{ value: 'todos', label: 'Todos' }, ...ordenadas.map(([value, label]) => ({ value, label }))];
}

export function opcoesCursoInscricao(cursos: readonly CursoInscricao[]): OpcaoInscricao[] {
  return [
    { value: 'todos', label: 'Todos' },
    ...cursos
      .map((curso) => ({ value: curso.id, label: curso.nome }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  ];
}

export function opcoesDepartamentoInscricao(inscricoes: readonly Inscricao[]): OpcaoInscricao[] {
  const nomes = [
    ...new Set(inscricoes.map((inscricao) => inscricao.colaboradorDepartamento?.trim()).filter(Boolean) as string[]),
  ];
  return [
    { value: 'todos', label: 'Todos' },
    ...nomes.sort((a, b) => a.localeCompare(b, 'pt-BR')).map((nome) => ({ value: nome, label: nome })),
  ];
}

export interface ContagensSegmentoInscricao {
  todos: number;
  em_andamento: number;
  concluidos: number;
  inscritos: number;
  atrasados: number | null;
}

export function contarSegmentosInscricao(base: readonly Inscricao[]): ContagensSegmentoInscricao {
  const porStatus = new Map<string, number>();
  for (const inscricao of base) {
    porStatus.set(inscricao.statusCodigo, (porStatus.get(inscricao.statusCodigo) ?? 0) + 1);
  }
  return {
    todos: base.length,
    em_andamento: porStatus.get('em_andamento') ?? 0,
    concluidos: porStatus.get('concluido') ?? 0,
    inscritos: porStatus.get('inscrito') ?? 0,
    atrasados: porStatus.has('atrasado') ? (porStatus.get('atrasado') ?? 0) : null,
  };
}

export const INSCRICOES_POR_PAGINA_PADRAO = 10;
export const INSCRICOES_OPCOES_POR_PAGINA = [10, 25, 50] as const;

export interface PaginaInscricoes {
  itens: Inscricao[];
  total: number;
  paginaAtual: number;
  totalPaginas: number;
  inicio: number;
  fim: number;
}

export function paginarInscricoes(
  inscricoes: readonly Inscricao[],
  pagina: number,
  porPagina: number
): PaginaInscricoes {
  const tamanho = Math.max(1, Math.floor(porPagina));
  const total = inscricoes.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const paginaAtual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  const offset = (paginaAtual - 1) * tamanho;
  const itens = inscricoes.slice(offset, offset + tamanho);
  return {
    itens: [...itens],
    total,
    paginaAtual,
    totalPaginas,
    inicio: total === 0 ? 0 : offset + 1,
    fim: total === 0 ? 0 : offset + itens.length,
  };
}
