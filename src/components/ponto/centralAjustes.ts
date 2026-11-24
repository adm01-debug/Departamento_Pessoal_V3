/**
 * ============================================================================
 * CENTRAL DE AJUSTES — derivações puras (sem React, sem rede, sem estado).
 *
 * TUDO o que a tela AFIRMA sobre as solicitações de ajuste de ponto sai daqui:
 * os quatro KPIs, os contadores dos chips de status, a variação contra o período
 * anterior, as linhas da tabela, a paginação e o contexto de jornada do painel
 * de detalhes. Nenhum componente repete essas contas — assim KPI, chip, tabela e
 * painel nunca discordam entre si.
 *
 * ── DE ONDE VEM CADA NÚMERO ────────────────────────────────────────────────
 * A fonte é SEMPRE a lista de `solicitacoes_ajuste_ponto` que a query devolve
 * (`useQuery` no componente). O período selecionado recorta essa lista
 * (`filtrarAjustes` com o intervalo de `utils/pontoGeofencing`), e o período
 * ANTERIOR de mesma duração serve de base para a variação dos KPIs. Sem base de
 * comparação não existe percentual: `variacoesAjustes` devolve `null` e o card
 * esconde o selo em vez de exibir "0%" inventado.
 *
 * ── ESTADO x STATUS ────────────────────────────────────────────────────────
 * O banco grava `status` como texto livre (`pendente`, `aprovado`, `recusado`,
 * `enviado`, `rascunho`…). A tela só conhece TRÊS estados — pendente, aprovado e
 * rejeitado — e `statusAjuste` faz a tradução: `recusado` e `rejeitado` são o
 * MESMO estado (é o nome que a RPC de aprovação usa), e qualquer outro valor
 * cai em `pendente`, porque uma solicitação sem decisão registrada continua na
 * fila do RH.
 *
 * ── RISCO DA IA ────────────────────────────────────────────────────────────
 * O nível vem do parecer gravado em `relatorio_conformidade.ia_risco` quando a
 * solicitação foi criada. Quando o registro não tem parecer, `riscoDoAjuste`
 * devolve `null` e a tela mostra "—": é proibido inferir risco de heurística
 * (tamanho do id, hash do nome…) — isso inventaria um dado que o RH usaria para
 * decidir.
 * ============================================================================
 */
import { Clock, Coffee, LogIn, LogOut, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { variacaoPercentual, type IntervaloGeo } from '@/utils/pontoGeofencing';

/** Estados que a tela reconhece (o banco grava mais variações — ver o topo). */
export type StatusAjusteResolvido = 'pendente' | 'aprovado' | 'rejeitado';

/** Nível do parecer da análise de risco. */
export type NivelRiscoAjuste = 'baixo' | 'medio' | 'alto';

/** Parecer da IA gravado em `relatorio_conformidade.ia_risco`. */
export interface RiscoIaAjuste {
  nivel: NivelRiscoAjuste;
  /** Texto exibido no painel de detalhes. */
  resumo?: string;
}

/** Recorte de `relatorio_conformidade` (json) que a tela lê. */
export interface RelatorioConformidadeAjuste {
  portaria_671_conformidade?: boolean;
  timezone?: string;
  geofencing?: boolean;
  divergencia_minutos?: number;
  sha256_integridade?: string;
  timestamp_validacao?: string;
  ia_risco?: RiscoIaAjuste;
}

/** Solicitação de ajuste como a tela a consome (join com `colaboradores`). */
export interface SolicitacaoAjustePonto {
  id: string;
  colaborador_id?: string | null;
  colaborador: { nome_completo: string } | null;
  /** Data da batida, `yyyy-MM-dd`. */
  data_ponto: string;
  tipo_ponto: string;
  hora_sugerida?: string | null;
  hora_original?: string | null;
  /** Justificativa escrita pelo colaborador. */
  motivo: string;
  status: string | null;
  observacoes_gestor?: string | null;
  relatorio_conformidade?: RelatorioConformidadeAjuste | null;
  created_at?: string | null;
}

/** Filtro de status dos chips (o `todos` não é um status, é a ausência dele). */
export type FiltroStatusAjuste = 'todos' | 'pendente' | 'aprovado' | 'rejeitado';

/** Períodos oferecidos pelo seletor — os mesmos do painel de Geofencing. */
export type PeriodoAjustes = 'hoje' | '7d' | '30d';

/** Opções do seletor de período, na ordem em que aparecem. */
export const PERIODOS_AJUSTES: readonly { valor: PeriodoAjustes; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
] as const;

/**
 * Filtro do parecer de risco (botão "Filtros" do cabeçalho).
 *
 * `todos` é a ausência de filtro; os demais valores são os níveis do parecer
 * gravado (`relatorio_conformidade.ia_risco.nivel`). Solicitações SEM parecer não
 * entram em nenhum nível — filtrar por risco é pedir explicitamente por quem
 * tem análise, e inventar um nível para quem não tem seria mentir sobre a IA.
 */
export type FiltroRiscoAjuste = 'todos' | NivelRiscoAjuste;

/** Opções do filtro de risco, na ordem do menos para o mais crítico. */
export const RISCOS_FILTRO: readonly { valor: FiltroRiscoAjuste; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'baixo', rotulo: 'Baixo' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'alto', rotulo: 'Elevado' },
] as const;

/**
 * Tradução status do banco → estado da tela.
 *
 * `recusado` (nome usado pela RPC `processar_ajuste_aprovado` e pela mutation de
 * resposta) e `rejeitado` são o MESMO estado; `enviado`, `rascunho`, `null` e
 * qualquer valor desconhecido continuam contando como pendentes.
 */
export function statusAjuste(status: string | null | undefined): StatusAjusteResolvido {
  const chave = String(status ?? '')
    .trim()
    .toLowerCase();
  if (chave === 'aprovado') return 'aprovado';
  if (chave === 'recusado' || chave === 'rejeitado') return 'rejeitado';
  return 'pendente';
}

/** Rótulo + variante do `Badge` para cada estado. */
export const STATUS_AJUSTE: Record<
  StatusAjusteResolvido,
  { rotulo: string; badge: 'warning' | 'success' | 'destructive' }
> = {
  pendente: { rotulo: 'Pendente', badge: 'warning' },
  aprovado: { rotulo: 'Aprovado', badge: 'success' },
  rejeitado: { rotulo: 'Rejeitado', badge: 'destructive' },
};

/** Rótulo + variante do `Badge` para cada nível de risco. */
export const RISCOS_AJUSTE: Record<NivelRiscoAjuste, { rotulo: string; badge: 'success' | 'warning' | 'destructive' }> =
  {
    baixo: { rotulo: 'Baixo', badge: 'success' },
    medio: { rotulo: 'Médio', badge: 'warning' },
    alto: { rotulo: 'Alto', badge: 'destructive' },
  };

/** Parecer de risco da solicitação — `null` quando o registro não tem análise. */
export function riscoDoAjuste(solicitacao: SolicitacaoAjustePonto): RiscoIaAjuste | null {
  const risco = solicitacao.relatorio_conformidade?.ia_risco;
  const nivel = risco?.nivel;
  if (nivel === 'baixo' || nivel === 'medio' || nivel === 'alto') {
    return { nivel, resumo: risco?.resumo };
  }
  return null;
}

/** A solicitação está em risco elevado (alimenta o 4º KPI). */
export function riscoElevado(solicitacao: SolicitacaoAjustePonto): boolean {
  return riscoDoAjuste(solicitacao)?.nivel === 'alto';
}

/**
 * Rótulos, ícones e cores dos tipos de batida. Os nomes são os mesmos do card
 * "Últimas Batidas" (`PontoUltimasBatidasCard`), para a mesma batida não
 * aparecer com dois nomes no módulo.
 *
 * `cor`   é a cor do ÍCONE (só tinta) — é o que a tabela e o painel usam hoje:
 *         o glifo fica alinhado ao texto, sem a caixa colorida que engordava a
 *         coluna "Tipo de ajuste".
 * `tom`   é o par fundo + tinta 10% (chip) — mantido para quem quiser o ícone
 *         em bloco; a Central de Ajustes não usa mais.
 *
 * Os rótulos trazem o complemento entre parênteses (`Saída (almoço)`) porque a
 * coluna precisa ser legível sozinha: "Saída almoço" e "Retorno almoço" liam
 * como uma terceira batida, não como o intervalo.
 */
const TIPOS_AJUSTE: Record<string, { rotulo: string; icone: LucideIcon; tom: string; cor: string }> = {
  entrada: { rotulo: 'Entrada', icone: LogIn, tom: 'bg-info/10 text-info', cor: 'text-info' },
  saida: { rotulo: 'Saída', icone: LogOut, tom: 'bg-primary/10 text-primary', cor: 'text-primary' },
  saida_almoco: {
    rotulo: 'Saída (almoço)',
    icone: Coffee,
    tom: 'bg-warning/10 text-warning',
    cor: 'text-warning',
  },
  retorno_almoco: {
    rotulo: 'Retorno (almoço)',
    icone: UtensilsCrossed,
    tom: 'bg-xp/10 text-xp',
    cor: 'text-xp',
  },
};

/** Metadados do tipo de batida, com fallback legível para valores novos. */
export function metaTipoAjuste(tipo: string | null | undefined): {
  rotulo: string;
  icone: LucideIcon;
  tom: string;
  cor: string;
} {
  const chave = String(tipo ?? '')
    .trim()
    .toLowerCase();
  const conhecido = TIPOS_AJUSTE[chave];
  if (conhecido) return conhecido;
  const texto = chave.replace(/_/g, ' ');
  return {
    rotulo: texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : 'Batida',
    icone: Clock,
    tom: 'bg-muted text-muted-foreground',
    cor: 'text-muted-foreground',
  };
}

/** Hora do Postgres (`08:12:00`) no rótulo da tela (`08:12`). */
export function horaAjuste(hora: string | null | undefined): string {
  const bruta = String(hora ?? '').trim();
  return bruta ? bruta.slice(0, 5) : '--:--';
}

/** Data `yyyy-MM-dd` em `dd/MM/yyyy` (sem passar por `Date`, sem fuso). */
export function dataBR(data: string | null | undefined): string {
  const iso = String(data ?? '')
    .trim()
    .slice(0, 10);
  const partes = iso.split('-');
  if (partes.length !== 3) return '—';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** Data `yyyy-MM-dd` em `dd/MM` (coluna compacta da tabela). */
export function dataCurtaBR(data: string | null | undefined): string {
  const iso = String(data ?? '')
    .trim()
    .slice(0, 10);
  const partes = iso.split('-');
  if (partes.length !== 3) return '—';
  return `${partes[2]}/${partes[1]}`;
}

/** Minutos em rótulo curto (`0 min`, `12 min`, `1 h 05`). */
export function minutosAjuste(minutos: number | null | undefined): string {
  const valor = Number(minutos);
  if (!Number.isFinite(valor) || valor <= 0) return 'Sem divergência';
  if (valor < 60) return `${Math.round(valor)} min`;
  return `${Math.floor(valor / 60)} h ${String(Math.round(valor % 60)).padStart(2, '0')}`;
}

/** Filtros combináveis da listagem (busca por nome, status, risco e janela de datas). */
export interface FiltrosAjuste {
  /** Texto digitado na busca — comparado com o nome do colaborador. */
  busca?: string;
  /** Chip de status ativo (`todos` não filtra). */
  status?: FiltroStatusAjuste;
  /** Nível do parecer de risco (`todos` não filtra). */
  risco?: FiltroRiscoAjuste;
  /** Janela de `data_ponto` (inclusive nas pontas), já recortada pelo período. */
  intervalo?: IntervaloGeo | null;
}

/** Minúsculas e sem acentos — a busca acha "Mariana" digitando "mariana". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Aplica busca + status + risco + intervalo, preservando a ordem recebida (a
 * query já entrega o mais recente primeiro). Sem filtro, devolve a lista
 * inteira.
 */
export function filtrarAjustes(
  lista: readonly SolicitacaoAjustePonto[],
  filtros: FiltrosAjuste = {}
): SolicitacaoAjustePonto[] {
  const termo = normalizar(filtros.busca ?? '');
  const status = filtros.status ?? 'todos';
  const risco = filtros.risco ?? 'todos';
  const intervalo = filtros.intervalo ?? null;

  return lista.filter((solicitacao) => {
    if (status !== 'todos' && statusAjuste(solicitacao.status) !== status) return false;
    if (risco !== 'todos' && riscoDoAjuste(solicitacao)?.nivel !== risco) return false;
    if (intervalo) {
      const data = String(solicitacao.data_ponto ?? '').slice(0, 10);
      if (!data || data < intervalo.inicio || data > intervalo.fim) return false;
    }
    if (termo) {
      const nome = normalizar(solicitacao.colaborador?.nome_completo ?? '');
      if (!nome.includes(termo)) return false;
    }
    return true;
  });
}

/** Contagem por estado + total (números dos chips). */
export interface ContagemAjustes {
  todos: number;
  pendentes: number;
  aprovadas: number;
  rejeitadas: number;
}

export function contarAjustes(lista: readonly SolicitacaoAjustePonto[]): ContagemAjustes {
  const contagem: ContagemAjustes = { todos: lista.length, pendentes: 0, aprovadas: 0, rejeitadas: 0 };
  lista.forEach((solicitacao) => {
    const estado = statusAjuste(solicitacao.status);
    if (estado === 'pendente') contagem.pendentes += 1;
    else if (estado === 'aprovado') contagem.aprovadas += 1;
    else contagem.rejeitadas += 1;
  });
  return contagem;
}

/** Contagem + risco elevado (os quatro KPIs). */
export interface IndicadoresAjustes extends ContagemAjustes {
  riscoElevado: number;
}

export function resumoAjustes(lista: readonly SolicitacaoAjustePonto[]): IndicadoresAjustes {
  return {
    ...contarAjustes(lista),
    riscoElevado: lista.filter(riscoElevado).length,
  };
}

/** Variação de cada KPI contra o período anterior (`null` = sem base). */
export interface VariacoesAjustes {
  pendentes: number | null;
  aprovadas: number | null;
  rejeitadas: number | null;
  riscoElevado: number | null;
}

/**
 * Variação percentual dos quatro KPIs. A regra é a MESMA do painel de
 * Geofencing (`variacaoPercentual`): sem base de comparação o valor é `null` e a
 * tela omite o selo em vez de exibir um percentual inventado.
 */
export function variacoesAjustes(atual: IndicadoresAjustes, anterior: IndicadoresAjustes): VariacoesAjustes {
  return {
    pendentes: variacaoPercentual(atual.pendentes, anterior.pendentes),
    aprovadas: variacaoPercentual(atual.aprovadas, anterior.aprovadas),
    rejeitadas: variacaoPercentual(atual.rejeitadas, anterior.rejeitadas),
    riscoElevado: variacaoPercentual(atual.riscoElevado, anterior.riscoElevado),
  };
}

/** Linhas por página da tabela (padrão e opções do rodapé). */
export const TAMANHO_PAGINA_AJUSTES = 6;

/** Opções do seletor "Linhas por página". */
export const OPCOES_TAMANHO_AJUSTES: readonly number[] = [6, 10, 20];

/** Total de páginas — nunca zero (uma tabela vazia ainda é a página 1). */
export function totalPaginasAjustes(total: number, tamanho: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, tamanho)));
}

/** Recorte da página, com a página sempre dentro dos limites. */
export function paginarAjustes(
  lista: readonly SolicitacaoAjustePonto[],
  pagina: number,
  tamanho: number
): SolicitacaoAjustePonto[] {
  const porPagina = Math.max(1, tamanho);
  const total = totalPaginasAjustes(lista.length, porPagina);
  const atual = Math.min(Math.max(1, pagina), total);
  const inicio = (atual - 1) * porPagina;
  return lista.slice(inicio, inicio + porPagina);
}

/** Faixa exibida no rodapé (`Mostrando 1–6 de 10`). */
export function faixaExibida(pagina: number, tamanho: number, total: number): { inicio: number; fim: number } {
  if (total <= 0) return { inicio: 0, fim: 0 };
  const porPagina = Math.max(1, tamanho);
  const atual = Math.min(Math.max(1, pagina), totalPaginasAjustes(total, porPagina));
  const inicio = (atual - 1) * porPagina + 1;
  return { inicio, fim: Math.min(total, inicio + porPagina - 1) };
}

/** Registro de `registros_ponto` que o painel lê para montar o contexto. */
export interface RegistroJornadaCru {
  data?: string | null;
  entrada_1?: string | null;
  entrada_2?: string | null;
  entrada_3?: string | null;
  entrada_4?: string | null;
  saida_1?: string | null;
  saida_2?: string | null;
  saida_3?: string | null;
  saida_4?: string | null;
  saida_5?: string | null;
  saida_6?: string | null;
}

/** Contexto de jornada exibido no painel de detalhes. */
export interface ContextoJornadaAjuste {
  /** Registro imediatamente ANTERIOR à data do ajuste (com a última batida). */
  anterior: { data: string; hora: string } | null;
  /** Próximo registro já gravado depois da data do ajuste. */
  proximo: { data: string } | null;
}

/** Campos de batida em ordem decrescente — o último preenchido é a última batida. */
const CAMPOS_BATIDA = [
  'saida_6',
  'saida_5',
  'saida_4',
  'saida_3',
  'saida_2',
  'saida_1',
  'entrada_4',
  'entrada_3',
  'entrada_2',
  'entrada_1',
] as const;

/**
 * Contexto de jornada de uma solicitação: o último registro ANTERIOR à data do
 * ajuste (com a hora da última batida do dia) e o próximo registro existente.
 * Os registros chegam como vieram do banco — a ordenação é feita aqui, então a
 * consulta pode devolver em qualquer ordem.
 */
export function contextoDaJornada(
  registros: readonly RegistroJornadaCru[],
  dataPonto: string | null | undefined
): ContextoJornadaAjuste {
  const alvo = String(dataPonto ?? '').slice(0, 10);
  if (!alvo) return { anterior: null, proximo: null };

  const dias = registros
    .map((registro) => ({ registro, data: String(registro.data ?? '').slice(0, 10) }))
    .filter((item) => item.data.length === 10)
    .sort((a, b) => a.data.localeCompare(b.data));

  const anteriores = dias.filter((item) => item.data < alvo);
  const posteriores = dias.filter((item) => item.data > alvo);
  const ultimo = anteriores[anteriores.length - 1];
  const seguinte = posteriores[0];

  let hora = '--:--';
  if (ultimo) {
    const campo = CAMPOS_BATIDA.find((chave) => {
      const valor = ultimo.registro[chave];
      return typeof valor === 'string' && valor.trim() !== '';
    });
    if (campo) hora = horaAjuste(ultimo.registro[campo]);
  }

  return {
    anterior: ultimo ? { data: ultimo.data, hora } : null,
    proximo: seguinte ? { data: seguinte.data } : null,
  };
}
