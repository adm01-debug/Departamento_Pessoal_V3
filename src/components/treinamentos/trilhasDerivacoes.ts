/**
 * ============================================================================
 * TRILHAS — derivações puras da aba Trilhas do Hub de Treinamentos.
 *
 * Mesmo princípio de `treinamentosDerivacoes`: nada de React nem de Supabase
 * aqui, para que filtro, paginação, métricas e resumo de participantes sejam
 * testáveis (`__tests__/trilhasDerivacoes.test.ts`).
 *
 * HONESTIDADE DOS DADOS (o que existe de verdade no schema):
 * - `trilhas_aprendizado` tem `nome` (migração 20260315212539) e a versão LXP
 *   declara `titulo`; o título é lido dos dois campos, nunca inventado.
 * - `trilhas_aprendizado` NÃO tem categoria. O selo do banner mostra o NÍVEL
 *   real (`basico`/`intermediario`/`avancado`) — nada de categoria fictícia.
 * - `ativo` (boolean) é o único estado real da trilha. Enquanto a origem não
 *   devolver a coluna (ex.: fixture antiga), o filtro de Status fica
 *   indisponível em vez de afirmar "Ativa" para todo mundo.
 * - Cursos e horas vêm de `trilhas_cursos` + `catalogo_cursos`; a soma ignora
 *   vínculos sem carga horária válida e o total é marcado como incompleto.
 * - Inscritos vêm de `inscricoes_cursos` cruzado com os cursos da trilha,
 *   contando COLABORADORES ÚNICOS (um colaborador em dois cursos da mesma
 *   trilha conta uma vez). Sem cursos vinculados não existe relação possível e
 *   a métrica é marcada como indisponível.
 * - Conclusão por etapa NÃO é derivada: `inscricoes_cursos` não identifica a
 *   etapa "atual" de uma pessoa na trilha, então nenhuma etapa recebe check.
 * ============================================================================
 */
import { formatarCargaHoraria, normalizarTexto } from './treinamentosDerivacoes';

/* ─── Tipos mínimos aceitos (linhas cruas do Supabase ou do mock visual) ───── */

export interface TrilhaRegistro {
  id: string;
  /** Coluna `titulo` (versão LXP). */
  titulo?: string | null;
  /** Coluna `nome` (versão original da tabela). */
  nome?: string | null;
  descricao?: string | null;
  nivel?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
  /** Capa real da trilha (`training_images`); ausente → banner provisório. */
  imagem_url?: string | null;
}

export interface TrilhaCursoVinculo {
  id: string;
  trilha_id?: string | null;
  curso_id: string;
  ordem?: number | null;
  obrigatorio?: boolean | null;
  curso?: {
    id?: string | null;
    nome?: string | null;
    carga_horaria?: number | string | null;
    modalidade?: string | null;
  } | null;
}

export interface InscricaoTrilha {
  colaborador_id?: string | null;
  curso_id?: string | null;
  colaborador?: { nome_completo?: string | null; foto_url?: string | null } | null;
}

export interface ColaboradorTrilha {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

/* ─── Paginação (mesma régua visual do Hub) ───────────────────────────────── */

export const TRILHAS_POR_PAGINA_PADRAO = 12;
export const TRILHAS_OPCOES_POR_PAGINA = [6, 9, 12, 24] as const;

/* ─── Nível ───────────────────────────────────────────────────────────────── */

/** Os três níveis aceitos pela trilha (CHECK da migração 20260512143657). */
export const NIVEIS_TRILHA = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
] as const;

/** Rótulo do nível real; valor desconhecido/ausente vira `—` (não inventa). */
export function nivelTrilha(nivel?: string | null): string {
  const chave = normalizarTexto(nivel);
  return NIVEIS_TRILHA.find((n) => n.value === chave)?.label ?? '—';
}

/** Título da trilha, aceitando as duas colunas existentes (`titulo` e `nome`). */
export function tituloTrilha(trilha: TrilhaRegistro): string {
  return (trilha.titulo || trilha.nome || '').trim() || 'Trilha sem título';
}

/* ─── Status (`ativo`) ────────────────────────────────────────────────────── */

export type StatusTrilha = 'ativa' | 'inativa' | 'indefinido';

export const OPCOES_STATUS_TRILHA = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'inativa', label: 'Inativa' },
] as const;

/**
 * `undefined`/`null` = a origem não informou o campo — diferente de `false`.
 * Assim o filtro de status não afirma "Ativa" sobre um dado ausente.
 */
export function statusTrilha(trilha: TrilhaRegistro): StatusTrilha {
  if (trilha.ativo === true) return 'ativa';
  if (trilha.ativo === false) return 'inativa';
  return 'indefinido';
}

/** Só habilita o filtro de Status quando ao menos um registro traz `ativo`. */
export function opcoesStatusTrilha(lista: readonly TrilhaRegistro[]): { value: string; label: string }[] {
  return lista.some((t) => statusTrilha(t) !== 'indefinido') ? [...OPCOES_STATUS_TRILHA] : [];
}

/* ─── Filtro / ordenação ──────────────────────────────────────────────────── */

export interface FiltrosTrilha {
  busca?: string;
  nivel?: string;
  status?: string;
}

/**
 * Busca sem acento e sem caixa em título, descrição e rótulo do nível —
 * exatamente os campos que existem no registro (não há categoria).
 */
export function filtrarTrilhas<T extends TrilhaRegistro>(lista: readonly T[], filtros: FiltrosTrilha = {}): T[] {
  const termo = normalizarTexto(filtros.busca);
  const nivelAlvo = filtros.nivel && filtros.nivel !== 'todos' ? normalizarTexto(filtros.nivel) : null;
  const statusAlvo = filtros.status && filtros.status !== 'todos' ? (filtros.status as StatusTrilha) : null;

  return lista.filter((trilha) => {
    if (termo) {
      const alvo = normalizarTexto(
        [tituloTrilha(trilha), trilha.descricao ?? '', nivelTrilha(trilha.nivel), trilha.nivel ?? '']
          .filter(Boolean)
          .join(' ')
      );
      if (!alvo.includes(termo)) return false;
    }

    if (nivelAlvo && normalizarTexto(trilha.nivel) !== nivelAlvo) return false;

    if (statusAlvo && statusTrilha(trilha) !== statusAlvo) return false;

    return true;
  });
}

/** Ordena por `ordem` (nulos por último) e usa o nome como desempate estável. */
export function ordenarVinculos<T extends TrilhaCursoVinculo>(vinculos: readonly T[]): T[] {
  return [...vinculos].sort((a, b) => {
    const ordemA = typeof a.ordem === 'number' ? a.ordem : Number.POSITIVE_INFINITY;
    const ordemB = typeof b.ordem === 'number' ? b.ordem : Number.POSITIVE_INFINITY;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return String(a.curso?.nome ?? '').localeCompare(String(b.curso?.nome ?? ''), 'pt-BR');
  });
}

/* ─── Métricas do card ────────────────────────────────────────────────────── */

export interface MetricasTrilha {
  /** Cursos ÚNICOS vinculados (nenhum vínculo repetido é contado duas vezes). */
  cursos: number;
  /** Soma de `carga_horaria` dos cursos com duração válida. */
  horas: number;
  /** `true` quando TODO curso vinculado tem carga horária válida. */
  horasCompletas: boolean;
  /** `true` quando ao menos um curso tem carga horária — senão a métrica é `—`. */
  horasDisponiveis: boolean;
}

function cargaHorariaNumerica(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/** Conta cursos únicos e soma a carga horária real dos vínculos da trilha. */
export function calcularMetricasTrilha(vinculos: readonly TrilhaCursoVinculo[]): MetricasTrilha {
  const unicos = new Map<string, TrilhaCursoVinculo>();
  for (const vinculo of vinculos) {
    if (!unicos.has(vinculo.curso_id)) unicos.set(vinculo.curso_id, vinculo);
  }

  let horas = 0;
  let comCarga = 0;
  for (const vinculo of unicos.values()) {
    const carga = cargaHorariaNumerica(vinculo.curso?.carga_horaria);
    if (carga !== null) {
      horas += carga;
      comCarga += 1;
    }
  }

  return {
    cursos: unicos.size,
    horas,
    horasCompletas: unicos.size > 0 && comCarga === unicos.size,
    horasDisponiveis: comCarga > 0,
  };
}

/** `3 cursos` / `1 curso`. */
export function rotuloCursos(total: number): string {
  return `${total} ${total === 1 ? 'curso' : 'cursos'}`;
}

/** `16 horas` / `16,5 horas` (com `+` quando algum curso não tem duração). */
export function rotuloHoras(metricas: MetricasTrilha): string {
  if (!metricas.horasDisponiveis) return '—';
  const texto = formatarCargaHoraria(metricas.horas).replace('h', '');
  return `${texto} ${metricas.horas === 1 ? 'hora' : 'horas'}${metricas.horasCompletas ? '' : '+'}`;
}

/* ─── Participantes (inscritos únicos) ────────────────────────────────────── */

export interface InscritosTrilha {
  /** Colaboradores ÚNICOS com inscrição em algum curso da trilha. */
  total: number;
  colaboradores: ColaboradorTrilha[];
  /**
   * `false` quando não há curso vinculado — sem vínculo não existe relação
   * confiável entre trilha, inscrição e colaborador, então nada é afirmado.
   */
  disponivel: boolean;
}

/**
 * Cruza `inscricoes_cursos` com os cursos da trilha. A chave de deduplicação é
 * o colaborador (id, ou o nome quando a origem não trouxe id), então estar em
 * dois cursos da mesma trilha não infla o número.
 */
export function resumirInscritosTrilha(
  vinculos: readonly TrilhaCursoVinculo[],
  inscricoes: readonly InscricaoTrilha[]
): InscritosTrilha {
  const idsCursos = new Set(vinculos.map((v) => v.curso_id).filter(Boolean));
  if (idsCursos.size === 0) return { total: 0, colaboradores: [], disponivel: false };

  const unicos = new Map<string, ColaboradorTrilha>();
  for (const inscricao of inscricoes) {
    if (!inscricao.curso_id || !idsCursos.has(inscricao.curso_id)) continue;
    const nome = (inscricao.colaborador?.nome_completo ?? '').trim();
    const chave = inscricao.colaborador_id || nome;
    if (!chave || unicos.has(chave)) continue;
    unicos.set(chave, {
      id: chave,
      nome: nome || 'Colaborador',
      fotoUrl: inscricao.colaborador?.foto_url ?? null,
    });
  }

  const colaboradores = [...unicos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return { total: colaboradores.length, colaboradores, disponivel: true };
}

/** `42 colaboradores inscritos` / `1 colaborador inscrito`. */
export function rotuloInscritos(total: number): string {
  return `${total} ${total === 1 ? 'colaborador inscrito' : 'colaboradores inscritos'}`;
}

/* ─── Etapas ──────────────────────────────────────────────────────────────── */

/** Modalidade real do curso, com inicial maiúscula; ausente → null. */
export function rotuloModalidade(modalidade?: string | null): string | null {
  const texto = (modalidade ?? '').trim();
  if (!texto) return null;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Linha secundária da etapa: `8h · Online · Obrigatório` (só o que existe). */
export function metaEtapa(vinculo: TrilhaCursoVinculo): string {
  const carga = formatarCargaHoraria(vinculo.curso?.carga_horaria);
  const partes = [
    carga === '—' ? null : carga,
    rotuloModalidade(vinculo.curso?.modalidade),
    vinculo.obrigatorio === true ? 'Obrigatório' : vinculo.obrigatorio === false ? 'Opcional' : null,
  ].filter((parte): parte is string => Boolean(parte));
  return partes.join(' · ') || 'Sem detalhes do curso';
}
