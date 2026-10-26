/**
 * ============================================================================
 * CANDIDATOS — derivações puras da área (sem React/Supabase).
 *
 * FONTE: as candidaturas já carregadas pela página (`candidaturas-todas`, sem
 * paginação de servidor) + o mapa de vagas já carregado. Nenhuma consulta nova,
 * nenhum campo inventado:
 *   • a linha representa UMA CANDIDATURA (participação em um processo), por isso
 *     um candidato com dois processos aparece duas vezes — com ids reais;
 *   • situação final vem de `candidatura.status` (com fallback seguro para a
 *     etapa "contratado");
 *   • etapa vem de `candidatura.etapa` (nunca deduzida do nome da vaga);
 *   • avaliação é `nota_geral`; pretensão/experiência/origem são do candidato;
 *   • última atividade usa `candidatura.updated_at` + rótulo derivado do estado
 *     real (nunca um evento fictício).
 *
 * CAMPOS AUSENTES NO MODELO (documentados, não simulados): foto de perfil,
 * nível profissional e catálogo de origens. O avatar usa iniciais; o filtro de
 * origem usa as strings reais já cadastradas.
 * ============================================================================
 */
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { parseDateSafe } from '@/utils/format';
import { ETAPAS, normalizarBusca, type EtapaPipeline, type EtapaPipelineId } from './pipelineEtapas';

export type SituacaoCandidato = 'todas' | 'em_processo' | 'contratados' | 'reprovados' | 'arquivados';
export type OrdenacaoCandidato = 'recentes' | 'antigos' | 'avaliacao' | 'pretensao' | 'nome' | 'experiencia';

export interface FiltrosCandidatos {
  situacao: SituacaoCandidato;
  vagaId: string;
  etapa: string;
  origem: string;
  ordenacao: OrdenacaoCandidato;
  busca: string;
  apenasAvaliados: boolean;
  apenasComPretensao: boolean;
}

export const FILTROS_CANDIDATOS_PADRAO: FiltrosCandidatos = {
  situacao: 'todas',
  vagaId: 'todas',
  etapa: 'todas',
  origem: 'todas',
  ordenacao: 'recentes',
  busca: '',
  apenasAvaliados: false,
  apenasComPretensao: false,
};

export const SITUACOES: readonly { valor: SituacaoCandidato; label: string }[] = [
  { valor: 'todas', label: 'Todos' },
  { valor: 'em_processo', label: 'Em processo' },
  { valor: 'contratados', label: 'Contratados' },
  { valor: 'reprovados', label: 'Reprovados' },
  { valor: 'arquivados', label: 'Arquivados' },
] as const;

export const ORDENACOES: readonly { valor: OrdenacaoCandidato; label: string }[] = [
  { valor: 'recentes', label: 'Mais recentes' },
  { valor: 'antigos', label: 'Mais antigos' },
  { valor: 'avaliacao', label: 'Maior avaliação' },
  { valor: 'pretensao', label: 'Maior pretensão' },
  { valor: 'experiencia', label: 'Mais experiência' },
  { valor: 'nome', label: 'Nome (A–Z)' },
] as const;

const STATUS_CONTRATADO = new Set(['contratado', 'contratada', 'efetivado', 'efetivada', 'hired']);
const STATUS_REPROVADO = new Set([
  'reprovado',
  'reprovada',
  'rejeitado',
  'rejeitada',
  'desclassificado',
  'desclassificada',
]);
const STATUS_ARQUIVADO = new Set(['arquivado', 'arquivada', 'cancelado', 'cancelada']);

/** Situação final (ou em processo) — usa o status real; etapa contratado é fallback. */
export function situacaoDaCandidatura(cand: CandidaturaComRelacoes): Exclude<SituacaoCandidato, 'todas'> {
  const status = normalizarBusca(cand.status);
  if (STATUS_REPROVADO.has(status)) return 'reprovados';
  if (STATUS_ARQUIVADO.has(status)) return 'arquivados';
  if (STATUS_CONTRATADO.has(status) || normalizarBusca(cand.etapa) === 'contratado') return 'contratados';
  return 'em_processo';
}

export interface ContagemSituacoes {
  todas: number;
  em_processo: number;
  contratados: number;
  reprovados: number;
  arquivados: number;
}

export function contarSituacoes(candidaturas: readonly CandidaturaComRelacoes[]): ContagemSituacoes {
  const contagem: ContagemSituacoes = {
    todas: candidaturas.length,
    em_processo: 0,
    contratados: 0,
    reprovados: 0,
    arquivados: 0,
  };
  for (const cand of candidaturas) contagem[situacaoDaCandidatura(cand)] += 1;
  return contagem;
}

/** Etapa real da candidatura; null quando ausente/desconhecida. */
export function etapaDaCandidatura(cand: CandidaturaComRelacoes): EtapaPipeline | null {
  const id = (cand.etapa ?? '').trim();
  if (!id) return null;
  return ETAPAS.find((etapa) => etapa.id === id) ?? null;
}

/** Rótulo/estilo do badge "Etapa atual" — situação final tem precedência. */
export interface BadgeEtapa {
  label: string;
  classe: string;
  etapaId: EtapaPipelineId | null;
}

const PILL_ETAPA: Record<EtapaPipelineId, string> = {
  triagem: 'border-info/35 bg-info/10 text-info',
  entrevista: 'border-[hsl(var(--chart-4)/0.35)] bg-[hsl(var(--chart-4)/0.10)] text-[hsl(var(--chart-4))]',
  teste: 'border-warning/35 bg-warning/10 text-warning',
  proposta: 'border-[hsl(var(--chart-5)/0.35)] bg-[hsl(var(--chart-5)/0.10)] text-[hsl(var(--chart-5))]',
  contratado: 'border-success/35 bg-success/10 text-success',
};
const PILL_FINAL: Record<'reprovados' | 'arquivados' | 'contratados', string> = {
  reprovados: 'border-destructive-vivid/40 bg-destructive-vivid/10 text-destructive-vivid',
  arquivados: 'border-border/70 bg-muted/40 text-muted-foreground',
  contratados: 'border-success/35 bg-success/10 text-success',
};
const PILL_NEUTRA = 'border-border/70 bg-muted/30 text-muted-foreground';

export function badgeEtapa(cand: CandidaturaComRelacoes): BadgeEtapa {
  const situacao = situacaoDaCandidatura(cand);
  if (situacao === 'reprovados') return { label: 'Reprovado', classe: PILL_FINAL.reprovados, etapaId: null };
  if (situacao === 'arquivados') return { label: 'Arquivado', classe: PILL_FINAL.arquivados, etapaId: null };
  if (situacao === 'contratados') return { label: 'Contratado', classe: PILL_FINAL.contratados, etapaId: null };
  const etapa = etapaDaCandidatura(cand);
  if (!etapa) return { label: 'Não informada', classe: PILL_NEUTRA, etapaId: null };
  return { label: etapa.label, classe: PILL_ETAPA[etapa.id], etapaId: etapa.id };
}

/** Origem real do candidato (nunca "Website" inventado). */
export function rotuloOrigem(cand: CandidaturaComRelacoes): string {
  return cand.candidato?.origem?.trim() || 'Não informada';
}

const ORIGEM_ESTILO: Record<string, string> = {
  linkedin: 'border-info/30 bg-info/10 text-info',
  indeed: 'border-warning/30 bg-warning/10 text-warning',
  gupy: 'border-[hsl(var(--chart-4)/0.30)] bg-[hsl(var(--chart-4)/0.10)] text-[hsl(var(--chart-4))]',
  site: 'border-[hsl(var(--aqua)/0.32)] bg-[hsl(var(--aqua)/0.10)] text-[hsl(var(--aqua))]',
  website: 'border-[hsl(var(--aqua)/0.32)] bg-[hsl(var(--aqua)/0.10)] text-[hsl(var(--aqua))]',
  indicacao: 'border-success/30 bg-success/10 text-success',
};
const ORIGEM_NEUTRA = 'border-border/70 bg-muted/30 text-muted-foreground';

/** Classe do badge de origem — determinística pelo texto real. */
export function estiloOrigem(origem: string | null | undefined): string {
  return ORIGEM_ESTILO[normalizarBusca(origem)] ?? ORIGEM_NEUTRA;
}

/** Origens reais presentes nas candidaturas (sem catálogo fictício). */
export function origensDisponiveis(candidaturas: readonly CandidaturaComRelacoes[]): string[] {
  const valores = new Map<string, string>();
  for (const cand of candidaturas) {
    const origem = cand.candidato?.origem?.trim();
    if (origem) {
      const chave = normalizarBusca(origem);
      if (!valores.has(chave)) valores.set(chave, origem);
    }
  }
  return [...valores.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export interface OpcaoVaga {
  id: string;
  titulo: string;
}

/**
 * Opções do filtro de vaga: TODAS as vagas reais/autorizadas carregadas pela
 * página + qualquer vaga referenciada por candidatura que não esteja na lista
 * (ex.: cache antigo). Nada de catálogo fictício.
 */
export function vagasComCandidaturas(
  candidaturas: readonly CandidaturaComRelacoes[],
  vagas?: readonly VagaRow[]
): OpcaoVaga[] {
  const porId = new Map<string, string>();
  for (const vaga of vagas ?? []) {
    porId.set(vaga.id, vaga.titulo?.trim() || 'Vaga não informada');
  }
  for (const cand of candidaturas) {
    const titulo = cand.vaga?.titulo?.trim() || vagas?.find((v) => v.id === cand.vaga_id)?.titulo?.trim();
    if (cand.vaga_id && !porId.has(cand.vaga_id)) porId.set(cand.vaga_id, titulo || 'Vaga não informada');
  }
  return [...porId.entries()]
    .map(([id, titulo]) => ({ id, titulo }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

export interface DadosVagaCandidatura {
  titulo: string;
  detalhe: string;
}

/** Título + "Departamento · Modalidade" — usa o join e/ou o mapa de vagas. */
export function dadosVagaDaCandidatura(cand: CandidaturaComRelacoes, vaga?: VagaRow | null): DadosVagaCandidatura {
  const titulo = cand.vaga?.titulo?.trim() || vaga?.titulo?.trim() || 'Vaga não informada';
  const departamento = cand.vaga?.departamento?.trim() || vaga?.departamento?.trim() || null;
  const modalidade = vaga?.modalidade?.trim() || null;
  const detalhe = [departamento, modalidade].filter(Boolean).join(' · ');
  return { titulo, detalhe: detalhe || 'Sem informações do processo' };
}

export interface AtividadeCandidato {
  data: string | null;
  descricao: string;
}

const DATA_ATIVIDADE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Última atividade real: data de `updated_at` + rótulo derivado do estado.
 * Não há tabela de eventos consultada por linha (evita N+1); o evento exibido
 * é a atualização registrada na própria candidatura.
 */
export function ultimaAtividade(cand: CandidaturaComRelacoes, referencia: Date = new Date()): AtividadeCandidato {
  const data = parseDateSafe(cand.updated_at);
  if (!data) return { data: null, descricao: 'Sem atividade registrada' };

  const situacao = situacaoDaCandidatura(cand);
  let descricao: string;
  if (situacao === 'reprovados') descricao = 'Candidatura reprovada';
  else if (situacao === 'arquivados') descricao = 'Candidatura arquivada';
  else if (situacao === 'contratados') descricao = 'Contratação concluída';
  else {
    const proxima = parseDateSafe(cand.data_proxima_etapa);
    descricao = proxima && proxima.getTime() >= referencia.getTime() ? 'Próxima etapa agendada' : 'Processo atualizado';
  }
  return { data: DATA_ATIVIDADE.format(data), descricao };
}

/** Aplica situação + filtros combináveis. */
export function filtrarCandidaturas(
  candidaturas: readonly CandidaturaComRelacoes[],
  filtros: FiltrosCandidatos
): CandidaturaComRelacoes[] {
  const busca = normalizarBusca(filtros.busca);
  const origem = normalizarBusca(filtros.origem);

  return candidaturas.filter((cand) => {
    if (filtros.situacao !== 'todas' && situacaoDaCandidatura(cand) !== filtros.situacao) return false;
    if (filtros.vagaId !== 'todas' && cand.vaga_id !== filtros.vagaId) return false;
    if (filtros.etapa !== 'todas' && (cand.etapa ?? '') !== filtros.etapa) return false;
    if (origem && origem !== 'todas' && normalizarBusca(cand.candidato?.origem) !== origem) return false;
    if (filtros.apenasAvaliados && cand.nota_geral === null) return false;
    if (filtros.apenasComPretensao && (cand.candidato?.pretensao_salarial ?? null) === null) return false;

    if (busca) {
      const texto = [
        cand.candidato?.nome,
        cand.candidato?.email,
        cand.candidato?.origem,
        cand.vaga?.titulo,
        cand.vaga?.departamento,
      ]
        .map(normalizarBusca)
        .join(' ');
      if (!texto.includes(busca)) return false;
    }
    return true;
  });
}

const tempo = (valor: string | null | undefined) => parseDateSafe(valor)?.getTime() ?? 0;
const nome = (cand: CandidaturaComRelacoes) => normalizarBusca(cand.candidato?.nome);
const desempate = (a: CandidaturaComRelacoes, b: CandidaturaComRelacoes) => nome(a).localeCompare(nome(b), 'pt-BR');

/** Ordenação real (updated_at, nota, pretensão, nome ou experiência). */
export function ordenarCandidaturas(
  candidaturas: readonly CandidaturaComRelacoes[],
  ordenacao: OrdenacaoCandidato
): CandidaturaComRelacoes[] {
  const copia = [...candidaturas];
  switch (ordenacao) {
    case 'antigos':
      return copia.sort((a, b) => tempo(a.created_at) - tempo(b.created_at) || desempate(a, b));
    case 'avaliacao':
      return copia.sort((a, b) => (b.nota_geral ?? -1) - (a.nota_geral ?? -1) || desempate(a, b));
    case 'pretensao':
      return copia.sort(
        (a, b) => (b.candidato?.pretensao_salarial ?? -1) - (a.candidato?.pretensao_salarial ?? -1) || desempate(a, b)
      );
    case 'experiencia':
      return copia.sort(
        (a, b) => (b.candidato?.experiencia_anos ?? -1) - (a.candidato?.experiencia_anos ?? -1) || desempate(a, b)
      );
    case 'nome':
      return copia.sort(desempate);
    default:
      return copia.sort((a, b) => tempo(b.created_at) - tempo(a.created_at) || desempate(a, b));
  }
}

export interface PaginaCandidatos<T> {
  itens: T[];
  total: number;
  totalPaginas: number;
  paginaAtual: number;
  inicio: number;
  fim: number;
}

export function paginarCandidaturas<T>(itens: readonly T[], pagina: number, tamanho: number): PaginaCandidatos<T> {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = total === 0 ? 0 : (paginaAtual - 1) * tamanho + 1;
  const fim = Math.min(total, paginaAtual * tamanho);
  return {
    itens: itens.slice((paginaAtual - 1) * tamanho, paginaAtual * tamanho),
    total,
    totalPaginas,
    paginaAtual,
    inicio,
    fim,
  };
}

/** Números de página com reticências (máx. 5 botões + extremos). */
export function paginasVisiveis(totalPaginas: number, paginaAtual: number): (number | 'gap')[] {
  if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  const paginas = new Set<number>([1, totalPaginas, paginaAtual - 1, paginaAtual, paginaAtual + 1]);
  const validas = [...paginas].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);
  const saida: (number | 'gap')[] = [];
  validas.forEach((p, i) => {
    if (i > 0 && p - validas[i - 1] > 1) saida.push('gap');
    saida.push(p);
  });
  return saida;
}

export interface ResumoSelecao {
  total: number;
  mediaAvaliacao: number | null;
  mediaPretensao: number | null;
}

/** Agregados reais da seleção local (nenhuma escrita em candidato). */
export function resumoSelecao(
  candidaturas: readonly CandidaturaComRelacoes[],
  ids: ReadonlySet<string>
): ResumoSelecao {
  const selecionadas = candidaturas.filter((cand) => ids.has(cand.id));
  const notas = selecionadas.map((cand) => cand.nota_geral).filter((n): n is number => n !== null);
  const pretensoes = selecionadas
    .map((cand) => cand.candidato?.pretensao_salarial)
    .filter((n): n is number => n !== null);
  const media = (valores: number[]) =>
    valores.length ? valores.reduce((total, valor) => total + valor, 0) / valores.length : null;
  return {
    total: selecionadas.length,
    mediaAvaliacao: media(notas),
    mediaPretensao: media(pretensoes),
  };
}

/** Há algum filtro além da ordenação padrão? */
export function temFiltrosAtivos(filtros: FiltrosCandidatos): boolean {
  return (
    filtros.situacao !== 'todas' ||
    filtros.vagaId !== 'todas' ||
    filtros.etapa !== 'todas' ||
    filtros.origem !== 'todas' ||
    filtros.busca.trim() !== '' ||
    filtros.apenasAvaliados ||
    filtros.apenasComPretensao
  );
}

/** Quantidade de filtros extras ativos (badge do botão "Mais filtros"). */
export function contarFiltrosExtras(filtros: FiltrosCandidatos): number {
  return (filtros.busca.trim() ? 1 : 0) + (filtros.apenasAvaliados ? 1 : 0) + (filtros.apenasComPretensao ? 1 : 0);
}
