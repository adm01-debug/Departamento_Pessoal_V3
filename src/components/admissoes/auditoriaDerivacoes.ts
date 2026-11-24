/**
 * Derivações PURAS da área de Auditoria (aba "Auditoria" do módulo de Admissões).
 * Mesma entrada → mesma saída, nada de JSX, nada de classe CSS.
 *
 * POR QUE UM MÓDULO PRÓPRIO: `admissoesDerivacoes.ts` é a régua do processo
 * admissionAL (prazo, checklist de documentos, progresso por etapa, risco);
 * `kanbanComum.ts` é a régua do BOARD (colunas, tom por etapa, progresso do
 * card). A trilha de auditoria lê outra coisa: eventos já consumados, com
 * status (`sucesso`/`pendente`/`falha`), carimbo de data/hora e responsável.
 * Misturar as réguas convidaria a tela a medir evento com a régua de processo.
 *
 * O que é REAPROVEITADO (nunca recriado): `DIA_MS`, `dataValida` e
 * `inicioDoDia` de `admissoesDerivacoes` — a mesma aritmética de dia que o
 * módulo inteiro usa, inclusive a regra de "hoje" (timestamp no início do dia,
 * para que período/atraso não dependam da hora da renderização).
 *
 * CONTAGEM (o que a tela mostra): `resumoAuditoria` conta os STATUS; a linha de
 * chips soma isso com `contarPorEtapa`. Nenhum número é inventado na UI — o que
 * não existe na trilha conta zero.
 */
import { DIA_MS, dataValida, inicioDoDia } from './admissoesDerivacoes';
import type { EtapaAdmissao, StatusAuditoria } from '@/mocks/admissoesMock';

/**
 * Evento da trilha de auditoria como a tela o consome. Espelha
 * `MockAuditoriaAdmissao` (fonte enquanto a aba é demonstrativa) e tolera campo
 * nulo, como o resto do módulo.
 */
export interface EventoAuditoria {
  id: string;
  data_hora: string;
  candidato: string;
  cargo: string;
  departamento: string;
  /** Título do evento (vira a coluna "Evento"). */
  acao: string;
  etapa: EtapaAdmissao;
  /** Evento do eSocial (`S-2200`…) quando a etapa transmite algo. */
  evento_esocial: string | null;
  /** Recibo devolvido pelo eSocial. */
  protocolo: string | null;
  status: StatusAuditoria;
  responsavel: string;
  /** Função do responsável — a coluna mostra nome + função. */
  responsavel_cargo?: string | null;
  /** Descrição complementar exibida sob o título do evento. */
  detalhe: string;
}

/* ─── Resumo do topo (4 cards) ─────────────────────────────────────────────── */

export interface ResumoAuditoria {
  total: number;
  sucesso: number;
  pendentes: number;
  falhas: number;
  /** Eventos dos últimos 30 dias — indicador secundário do card "Eventos". */
  ultimos30Dias: number;
  /** Fatia de cada status no total (0 quando não há eventos) — nunca NaN. */
  pctSucesso: number;
  pctPendentes: number;
  pctFalhas: number;
}

/** Fatia arredondada; 0 quando o total é zero (nunca NaN/Infinity). */
function fatia(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/**
 * Contadores dos cards do topo. `hoje` é o timestamp de `inicioDoDia` — o mesmo
 * parâmetro que `resumoOnboarding` recebe, para a tela inteira medir "agora"
 * pela mesma régua.
 */
export function resumoAuditoria(eventos: EventoAuditoria[] | null | undefined, hoje: number): ResumoAuditoria {
  const lista = eventos ?? [];
  const sucesso = lista.filter((e) => e.status === 'sucesso').length;
  const pendentes = lista.filter((e) => e.status === 'pendente').length;
  const falhas = lista.filter((e) => e.status === 'falha').length;
  const limite = hoje - 30 * DIA_MS;
  const ultimos30Dias = lista.filter((e) => {
    const data = dataValida(e.data_hora);
    return !!data && data.getTime() >= limite && data.getTime() <= hoje + DIA_MS;
  }).length;

  return {
    total: lista.length,
    sucesso,
    pendentes,
    falhas,
    ultimos30Dias,
    pctSucesso: fatia(sucesso, lista.length),
    pctPendentes: fatia(pendentes, lista.length),
    pctFalhas: fatia(falhas, lista.length),
  };
}

/* ─── Filtros ─────────────────────────────────────────────────────────────── */

/** Períodos oferecidos no filtro da primeira linha (valor → dias para trás). */
export type PeriodoAuditoria = 'todos' | '7d' | '30d' | '90d' | 'ano';

export const DIAS_DO_PERIODO: Record<PeriodoAuditoria, number | null> = {
  todos: null,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  ano: 365,
};

export interface FiltrosAuditoria {
  /** Busca livre (candidato, ação, responsável, protocolo, cargo…). */
  termo: string;
  /** `''` = todos os status. */
  status: StatusAuditoria | '';
  /** `''` = todas as etapas. */
  etapa: EtapaAdmissao | '';
  /** `''` = todos os responsáveis. */
  responsavel: string;
  periodo: PeriodoAuditoria;
  /** Tipo de evento = `acao` exata (filtro avançado de "Mais filtros"). */
  tipo: string;
  /** Só eventos com recibo do eSocial (filtro avançado). */
  somenteComProtocolo: boolean;
  /** Intervalo exato de datas (`YYYY-MM-DD`), do painel avançado. */
  de: string;
  ate: string;
}

export const FILTROS_AUDITORIA_VAZIOS: FiltrosAuditoria = {
  termo: '',
  status: '',
  etapa: '',
  responsavel: '',
  periodo: 'todos',
  tipo: '',
  somenteComProtocolo: false,
  de: '',
  ate: '',
};

/** Há QUALQUER filtro fora do padrão? Governa o realce de "Limpar filtros". */
export function possuiFiltrosAtivos(filtros: FiltrosAuditoria): boolean {
  return (
    filtros.termo.trim() !== '' ||
    filtros.status !== '' ||
    filtros.etapa !== '' ||
    filtros.responsavel !== '' ||
    filtros.periodo !== 'todos' ||
    filtros.tipo !== '' ||
    filtros.somenteComProtocolo ||
    filtros.de !== '' ||
    filtros.ate !== ''
  );
}

/** Data (`YYYY-MM-DD`) no início/fim do dia — comparação estável com `hoje`. */
function dataLimite(valor: string | null | undefined, fimDoDia: boolean): number | null {
  if (!valor) return null;
  const data = new Date(`${valor}T${fimDoDia ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(data.getTime()) ? null : data.getTime();
}

/** O evento passa por TODOS os filtros ativos? (E, não E-ou.) */
function passaNosFiltros(evento: EventoAuditoria, filtros: FiltrosAuditoria, hoje: number): boolean {
  if (filtros.status && evento.status !== filtros.status) return false;
  if (filtros.etapa && evento.etapa !== filtros.etapa) return false;
  if (filtros.responsavel && evento.responsavel !== filtros.responsavel) return false;
  if (filtros.tipo && evento.acao !== filtros.tipo) return false;
  if (filtros.somenteComProtocolo && !evento.protocolo) return false;

  const data = dataValida(evento.data_hora);
  if (!data) return false;
  const ts = data.getTime();

  const dias = DIAS_DO_PERIODO[filtros.periodo];
  if (dias !== null && ts < hoje - dias * DIA_MS) return false;

  const de = dataLimite(filtros.de, false);
  if (de !== null && ts < de) return false;
  const ate = dataLimite(filtros.ate, true);
  if (ate !== null && ts > ate) return false;

  if (filtros.termo.trim()) {
    const termo = filtros.termo.trim().toLowerCase();
    const campos = [
      evento.candidato,
      evento.cargo,
      evento.departamento,
      evento.acao,
      evento.detalhe,
      evento.responsavel,
      evento.responsavel_cargo,
      evento.protocolo,
      evento.evento_esocial,
    ];
    if (!campos.some((campo) => campo && String(campo).toLowerCase().includes(termo))) return false;
  }

  return true;
}

/** Aplica busca + todos os filtros (inclusive os do painel avançado). */
export function filtrarAuditoria(
  eventos: EventoAuditoria[] | null | undefined,
  filtros: FiltrosAuditoria,
  hoje: number
): EventoAuditoria[] {
  return (eventos ?? []).filter((evento) => passaNosFiltros(evento, filtros, hoje));
}

/* ─── Chip rápido (linha de filtros rápidos) ─────────────────────────────── */

/**
 * Id do chip rápido — a ÚNICA fonte do destaque da linha de chips.
 *
 * POR QUE UM ID PRÓPRIO (e não `status`/`etapa` direto): `status` e `etapa` são
 * filtros INDEPENDENTES (faz sentido combinar Status=Falha com Etapa=Contrato).
 * Se o chip acendesse por `status === 'falha' || etapa === 'contrato'`, dois
 * chips ficariam ativos ao mesmo tempo. Com um id próprio, a linha é mutuamente
 * exclusiva por construção: no máximo UM chip casa com o `quickFilter`.
 */
export type QuickFilter =
  'todos' | 'sucesso' | 'pendente' | 'falha' | 'esocial' | 'documentos' | 'contrato' | 'validacao';

/** Ordem dos chips na faixa (status primeiro, depois as etapas de processo). */
export const QUICK_FILTERS: readonly QuickFilter[] = [
  'todos',
  'sucesso',
  'pendente',
  'falha',
  'esocial',
  'documentos',
  'contrato',
  'validacao',
];

/** Estado inicial — e o de "nada aplicado" na linha de chips. */
export const QUICK_FILTER_PADRAO: QuickFilter = 'todos';

/**
 * O que CADA chip grava nos filtros combináveis. Sempre os DOIS campos
 * (`status` e `etapa`): é isso que apaga o resíduo do chip anterior — clicar em
 * "eSocial" depois de "Falha" não pode deixar `status: 'falha'` preso.
 */
export const QUICK_FILTER_VALORES: Record<QuickFilter, Pick<FiltrosAuditoria, 'status' | 'etapa'>> = {
  todos: { status: '', etapa: '' },
  sucesso: { status: 'sucesso', etapa: '' },
  pendente: { status: 'pendente', etapa: '' },
  falha: { status: 'falha', etapa: '' },
  esocial: { status: '', etapa: 'esocial' },
  documentos: { status: '', etapa: 'documentos' },
  contrato: { status: '', etapa: 'contrato' },
  validacao: { status: '', etapa: 'validacao' },
};

/**
 * Aplica um chip rápido: reescreve `status`/`etapa` com os valores do chip e
 * mantém TODO o resto (busca, responsável, período e o painel avançado), que
 * continuam combináveis e independentes.
 */
export function aplicarQuickFilter(filtros: FiltrosAuditoria, quick: QuickFilter): FiltrosAuditoria {
  return { ...filtros, ...QUICK_FILTER_VALORES[quick] };
}

/* ─── Contagens auxiliares (chips e opções de filtro) ─────────────────────── */

/** Quantos eventos existem por etapa (chave = valor real de `etapa`). */
export function contarPorEtapa(eventos: EventoAuditoria[] | null | undefined): Record<string, number> {
  const contagem: Record<string, number> = {};
  (eventos ?? []).forEach((evento) => {
    contagem[evento.etapa] = (contagem[evento.etapa] ?? 0) + 1;
  });
  return contagem;
}

/** Responsáveis presentes na trilha, em ordem alfabética (opções do filtro). */
export function responsaveisDisponiveis(eventos: EventoAuditoria[] | null | undefined): string[] {
  const nomes = new Set<string>();
  (eventos ?? []).forEach((evento) => {
    if (evento.responsavel) nomes.add(evento.responsavel);
  });
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export interface TipoEvento {
  /** Valor real de `acao` — é o que o filtro compara. */
  acao: string;
  total: number;
}

/** Tipos de evento (ações distintas) com contagem, do mais para o menos frequente. */
export function tiposDeEvento(eventos: EventoAuditoria[] | null | undefined): TipoEvento[] {
  const contagem = new Map<string, number>();
  (eventos ?? []).forEach((evento) => {
    contagem.set(evento.acao, (contagem.get(evento.acao) ?? 0) + 1);
  });
  return [...contagem.entries()]
    .map(([acao, total]) => ({ acao, total }))
    .sort((a, b) => b.total - a.total || a.acao.localeCompare(b.acao, 'pt-BR'));
}

/* ─── Ordenação ───────────────────────────────────────────────────────────── */

export type OrdemAuditoria = 'recentes' | 'antigos' | 'candidato' | 'status';

/** Peso do status na ordenação (o que exige atenção primeiro). */
const PESO_STATUS: Record<StatusAuditoria, number> = { falha: 0, pendente: 1, sucesso: 2 };

/**
 * Ordena a trilha. `recentes`/`antigos` usam `data_hora`; `candidato` usa o
 * nome (A→Z); `status` põe falhas e pendentes na frente (é o que a operação
 * precisa ver primeiro). Empate cai sempre em "mais recentes" — ordem estável.
 */
export function ordenarAuditoria(
  eventos: EventoAuditoria[] | null | undefined,
  ordem: OrdemAuditoria
): EventoAuditoria[] {
  const lista = [...(eventos ?? [])];
  const porData = (a: EventoAuditoria, b: EventoAuditoria) => b.data_hora.localeCompare(a.data_hora);

  switch (ordem) {
    case 'antigos':
      return lista.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
    case 'candidato':
      return lista.sort((a, b) => (a.candidato ?? '').localeCompare(b.candidato ?? '', 'pt-BR') || porData(a, b));
    case 'status':
      return lista.sort((a, b) => PESO_STATUS[a.status] - PESO_STATUS[b.status] || porData(a, b));
    case 'recentes':
    default:
      return lista.sort(porData);
  }
}

/* ─── Formatação ──────────────────────────────────────────────────────────── */

/** Timestamp de "hoje" — mesma régua das outras áreas do módulo. */
export function hojeAuditoria(referencia: Date = new Date()): number {
  return inicioDoDia(referencia);
}

/** Data e hora separadas para a célula da tabela (`data` + `hora` em linhas). */
export function formatarDataHora(valor?: string | null): { data: string; hora: string } {
  const parsed = dataValida(valor);
  if (!parsed) return { data: '—', hora: '' };
  return {
    data: parsed.toLocaleDateString('pt-BR'),
    hora: parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}
