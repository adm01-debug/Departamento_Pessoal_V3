/**
 * ============================================================================
 * BANCO DE HORAS — vocabulário, formatadores, recortes e agregações.
 *
 * FONTE ÚNICA do que a tela exibe. Nenhum card, gráfico ou linha da tabela
 * recalcula horário, rótulo ou soma por conta própria: KPI Cards, rosca de
 * situação dos saldos, barras de totais, alerta de saldo negativo, série de
 * evolução e o extrato leem TUDO daqui — é o que impede os seis blocos de
 * divergirem na primeira alteração de regra.
 *
 * ── DE ONDE VÊM OS NÚMEROS (nada é inventado) ───────────────────────────────
 * A tabela `banco_horas` guarda `horas`, `saldo_anterior` e `saldo_atual` como
 * `interval` do Postgres — o PostgREST entrega TEXTO ("08:00:00", "1 day
 * 02:00:00"), nunca número. Por isso toda leitura passa por
 * `parsePgIntervalToHours` (`@/utils/pgInterval`), a régua já usada por
 * `bancoHorasService.getSaldo()`: um valor corrompido vira 0 em vez de
 * contaminar o somatório com `NaN`.
 *
 * `tipo` é texto livre no banco; só `credito` soma, QUALQUER outro valor é
 * tratado como débito — a mesma leitura conservadora do serviço.
 *
 * ── FORMATO DE HORAS ────────────────────────────────────────────────────────
 * `formatarHoras` de `horas-extras/horasExtrasComum.ts` é reusado em vez de
 * reescrito: a leitura `2h30` (e não `2.5h`) é a MESMA em toda a família de
 * horas do sistema, e o formatador já trata sinal negativo (`-12h30`). Duplicar
 * aqui faria as duas telas divergirem na primeira mudança de arredondamento.
 *
 * ── O QUE É "SALDO" NESTA TELA ──────────────────────────────────────────────
 * Existem dois recortes DIFERENTES e os textos da interface deixam isso claro:
 *   • SALDO ATUAL (foto): último `saldo_atual` de cada colaborador, em toda a
 *     base carregada — não depende do período escolhido no extrato. É o número
 *     da rosca, do alerta de negativos e do KPI "Saldo atual da equipe".
 *   • SALDO DO PERÍODO (movimento): créditos − débitos dos lançamentos dentro
 *     do recorte de datas. É o número do KPI "Saldo do período", das barras de
 *     totais e da série de evolução.
 * Misturar os dois é o erro clássico da área (um "saldo" que muda de
 * significado entre dois cards da mesma tela), então cada função abaixo diz a
 * qual recorte pertence.
 * ============================================================================
 */
import { formatarHoras } from '@/components/horas-extras/horasExtrasComum';
import { parsePgIntervalToHours } from '@/utils/pgInterval';

/* ──────────────────────────────────────────────────────────────────────────
 * TIPOS
 * ────────────────────────────────────────────────────────────────────────── */

export type TipoMovimento = 'credito' | 'debito';

/** Vínculo embutido da consulta (`colaborador:colaboradores(...)`). */
export interface ColaboradorDoBancoHoras {
  nome_completo?: string | null;
  departamento?: string | null;
  cargo?: string | null;
  foto_url?: string | null;
}

/** Linha de `banco_horas` como a tela consome (apenas os campos usados). */
export interface RegistroBancoHoras {
  id: string;
  colaborador_id?: string | null;
  /** Data do lançamento (`YYYY-MM-DD`) — coluna `date`, não timestamp. */
  data?: string | null;
  /** `interval` do Postgres serializado como texto. */
  horas?: string | number | null;
  tipo?: string | null;
  motivo?: string | null;
  saldo_anterior?: string | number | null;
  saldo_atual?: string | number | null;
  created_at?: string | null;
  colaborador?: ColaboradorDoBancoHoras | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * LEITURA DE UM LANÇAMENTO
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Tipo normalizado. Só `credito` (com ou sem acento/espaço) soma; todo o resto
 * é débito — mesma regra de `bancoHorasService.getSaldo()`.
 */
export function tipoDoRegistro(registro: RegistroBancoHoras): TipoMovimento {
  const bruto = (registro.tipo ?? '').trim().toLowerCase();
  return bruto === 'credito' || bruto === 'crédito' ? 'credito' : 'debito';
}

/** Horas do lançamento em decimal, SEMPRE positivas (o sinal vem do `tipo`). */
export function horasDoRegistro(registro: RegistroBancoHoras): number {
  return Math.abs(parsePgIntervalToHours(registro.horas));
}

/** Horas já com o sinal do movimento: crédito soma, débito subtrai. */
export function horasComSinal(registro: RegistroBancoHoras): number {
  const horas = horasDoRegistro(registro);
  return tipoDoRegistro(registro) === 'credito' ? horas : -horas;
}

/**
 * `interval` opcional → decimal, preservando a diferença entre AUSENTE e ZERO.
 * `null`/vazio devolve `null` (o chamador decide o fallback); "00:00:00"
 * devolve `0`, que é um saldo zerado de verdade.
 */
export function lerIntervalo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  return parsePgIntervalToHours(valor);
}

/** Horas decimais → `2h30` / `-12h30` (o formatador do sistema). */
export function formatarHorasBanco(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas)) return '—';
  return formatarHoras(horas);
}

/** `interval` opcional → `2h30`; ausente → `—` (nunca `0h00` inventado). */
export function formatarIntervaloBanco(valor: unknown): string {
  const horas = lerIntervalo(valor);
  return horas === null ? '—' : formatarHoras(horas);
}

/** Data do lançamento em `dd/mm/aaaa`. Sem data → `—`. */
export function dataDoRegistro(registro: RegistroBancoHoras): string {
  return formatarDataBR(registro.data);
}

/**
 * `YYYY-MM-DD` → `dd/mm/aaaa` (string pura, sem `Date`).
 *
 * A conversão é textual de propósito: `new Date('2026-03-02')` é meia-noite UTC
 * e um `toLocaleDateString` em fuso negativo devolveria 01/03. Aqui, o que o
 * usuário digitou no seletor de período é exatamente o que ele lê no rótulo.
 */
export function formatarDataBR(iso: unknown): string {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!casamento) return '—';
  const [, ano, mes, dia] = casamento;
  return `${dia}/${mes}/${ano}`;
}

export function nomeDoColaborador(registro: RegistroBancoHoras): string {
  const nome = registro.colaborador?.nome_completo?.trim();
  return nome || 'Colaborador não informado';
}

export function departamentoDoColaborador(registro: RegistroBancoHoras): string {
  return registro.colaborador?.departamento?.trim() || 'Departamento não informado';
}

/* ──────────────────────────────────────────────────────────────────────────
 * RÓTULOS E SELOS
 * ────────────────────────────────────────────────────────────────────────── */

export const ROTULO_TIPO: Record<TipoMovimento, string> = {
  credito: 'Crédito',
  debito: 'Débito',
};

export function rotuloTipo(tipo: TipoMovimento): string {
  return ROTULO_TIPO[tipo];
}

/**
 * Selo do tipo — a MESMA receita dos vereditos do sistema (fundo translúcido +
 * borda sutil + texto na cor vibrante), em `Badge variant="outline"`. Verde de
 * status para crédito e vermelho do tema para débito: são as cores que a tela
 * já usava (`bg-success/20` e `variant="destructive"`), agora sem fundo sólido.
 */
export const SELO_TIPO: Record<TipoMovimento, string> = {
  credito: 'border-success/40 bg-success/10 font-semibold text-success',
  debito: 'border-destructive/40 bg-destructive/10 font-semibold text-destructive',
};

export function seloTipo(tipo: TipoMovimento): string {
  return SELO_TIPO[tipo];
}

/* ──────────────────────────────────────────────────────────────────────────
 * RECORTES (período e filtros do extrato)
 * ────────────────────────────────────────────────────────────────────────── */

/** Período do extrato — as duas pontas são `YYYY-MM-DD` (ou vazio = aberta). */
export interface PeriodoExtrato {
  de: string;
  ate: string;
}

export const PERIODO_EXTRATO_PADRAO: PeriodoExtrato = { de: '', ate: '' };

/**
 * `todos` não recorta; `credito`/`debito` são os tipos reais da tabela e
 * `negativos` é o recorte de ATENÇÃO (só os lançamentos cujo `saldo_atual`
 * ficou abaixo de zero — a linha que o RH precisa ver primeiro).
 */
export type FiltroTipo = 'todos' | TipoMovimento | 'negativos';

export interface FiltrosExtrato {
  busca: string;
  tipo: FiltroTipo;
}

export const FILTROS_EXTRATO_PADRAO: FiltrosExtrato = { busca: '', tipo: 'todos' };

export const OPCOES_TIPO: ReadonlyArray<{ value: FiltroTipo; label: string }> = [
  { value: 'todos', label: 'Todos os lançamentos' },
  { value: 'credito', label: 'Somente créditos' },
  { value: 'debito', label: 'Somente débitos' },
  { value: 'negativos', label: 'Saldos negativos' },
];

/**
 * O lançamento DEIXOU o colaborador no vermelho? (`saldo_atual` < 0)
 *
 * `null`/ausente devolve `false` de propósito: sem a coluna não dá para afirmar
 * que a pessoa ficou negativa, e um alerta falso é pior do que um alerta a
 * menos. É a mesma leitura conservadora de `lerIntervalo`.
 */
export function registroComSaldoNegativo(registro: RegistroBancoHoras): boolean {
  const saldo = lerIntervalo(registro.saldo_atual);
  return saldo !== null && saldo < 0;
}

export function temPeriodoAtivo(periodo: PeriodoExtrato): boolean {
  return Boolean(periodo.de || periodo.ate);
}

/**
 * Recorte por data do lançamento (comparação lexicográfica de `YYYY-MM-DD`,
 * que ordena igual à data). Pontas vazias ficam abertas; registro sem data
 * sai do recorte quando existe QUALQUER ponta — não dá para afirmar que ele
 * está dentro do período.
 */
export function recortarPorPeriodo(
  registros: readonly RegistroBancoHoras[],
  periodo: PeriodoExtrato
): RegistroBancoHoras[] {
  const { de, ate } = periodo;
  if (!de && !ate) return [...registros];
  return registros.filter((registro) => {
    const data = (registro.data ?? '').slice(0, 10);
    if (!data) return false;
    if (de && data < de) return false;
    if (ate && data > ate) return false;
    return true;
  });
}

/** Minúsculas e sem acento — o comparador da busca. */
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Busca textual + tipo. A busca olha colaborador, departamento e motivo (os
 * três campos que o extrato mostra e o usuário usa para achar uma linha) e é
 * insensível a caixa e a acento — "jose" encontra "José".
 */
export function filtrarExtrato(
  registros: readonly RegistroBancoHoras[],
  filtros: FiltrosExtrato
): RegistroBancoHoras[] {
  const termo = normalizarTexto(filtros.busca.trim());
  return registros.filter((registro) => {
    if (filtros.tipo === 'negativos') {
      if (!registroComSaldoNegativo(registro)) return false;
    } else if (filtros.tipo !== 'todos' && tipoDoRegistro(registro) !== filtros.tipo) {
      return false;
    }
    if (!termo) return true;
    const alvo = normalizarTexto(
      [nomeDoColaborador(registro), registro.colaborador?.departamento ?? '', registro.motivo ?? ''].join(' ')
    );
    return alvo.includes(termo);
  });
}

/** Quantos lançamentos há em cada recorte de tipo (os contadores dos chips). */
export interface ContagemTipos {
  todos: number;
  credito: number;
  debito: number;
  negativos: number;
}

/**
 * Contadores da faixa de filtros do extrato.
 *
 * Os quatro números vêm da MESMA lista (a que já passou pelo período e pela
 * busca), então `credito + debito === todos` e `negativos` é um subconjunto —
 * é exatamente o que o usuário confere ao olhar os chips lado a lado.
 */
export function contarTiposExtrato(registros: readonly RegistroBancoHoras[]): ContagemTipos {
  let credito = 0;
  let negativos = 0;
  for (const registro of registros) {
    if (tipoDoRegistro(registro) === 'credito') credito += 1;
    if (registroComSaldoNegativo(registro)) negativos += 1;
  }
  return {
    todos: registros.length,
    credito,
    debito: registros.length - credito,
    negativos,
  };
}

/** Ordenação do extrato — os dois sentidos que o seletor oferece. */
export type OrdemExtrato = 'recentes' | 'antigos';

export const ORDENS_EXTRATO: ReadonlyArray<{ value: OrdemExtrato; label: string }> = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
];

/**
 * Ordena o extrato por data do lançamento (desempate por `created_at`, depois
 * pela ordem de chegada — `Array.prototype.sort` é estável desde o ES2019).
 *
 * A ordenação é feita AQUI, e não confiada à ordem em que a consulta chegou:
 * o serviço já devolve `data desc, created_at desc`, mas a tela precisa poder
 * inverter isso sem uma nova ida ao banco.
 */
export function ordenarExtrato(registros: readonly RegistroBancoHoras[], ordem: OrdemExtrato): RegistroBancoHoras[] {
  const sinal = ordem === 'antigos' ? -1 : 1;
  return [...registros].sort((a, b) => sinal * compararRecencia(b, a));
}

/** Existe filtro ativo no extrato? (o "Limpar" só acende quando existe) */
export function temFiltroExtratoAtivo(filtros: FiltrosExtrato, periodo: PeriodoExtrato): boolean {
  return Boolean(filtros.busca.trim()) || filtros.tipo !== 'todos' || temPeriodoAtivo(periodo);
}

/* ──────────────────────────────────────────────────────────────────────────
 * AGREGAÇÕES — recorte de MOVIMENTO (créditos − débitos)
 * ────────────────────────────────────────────────────────────────────────── */

export interface ResumoHoras {
  /** Horas creditadas no recorte. */
  creditos: number;
  /** Horas debitadas no recorte (positivas). */
  debitos: number;
  /** `creditos - debitos` (pode ser negativo). */
  saldo: number;
  /** Quantidade de lançamentos no recorte. */
  registros: number;
  lancamentosCredito: number;
  lancamentosDebito: number;
  /** Colaboradores distintos com lançamento no recorte. */
  colaboradores: number;
}

/** Identidade do colaborador para agrupar (id quando existe; nome como reserva). */
function chaveDoColaborador(registro: RegistroBancoHoras): string {
  const id = registro.colaborador_id?.trim();
  return id || nomeDoColaborador(registro);
}

export function resumirHoras(registros: readonly RegistroBancoHoras[]): ResumoHoras {
  let creditos = 0;
  let debitos = 0;
  let lancamentosCredito = 0;
  let lancamentosDebito = 0;
  const colaboradores = new Set<string>();

  for (const registro of registros) {
    const horas = horasDoRegistro(registro);
    if (tipoDoRegistro(registro) === 'credito') {
      creditos += horas;
      lancamentosCredito += 1;
    } else {
      debitos += horas;
      lancamentosDebito += 1;
    }
    colaboradores.add(chaveDoColaborador(registro));
  }

  return {
    creditos,
    debitos,
    saldo: creditos - debitos,
    registros: registros.length,
    lancamentosCredito,
    lancamentosDebito,
    colaboradores: colaboradores.size,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * AGREGAÇÕES — recorte de FOTO (saldo atual por colaborador)
 * ────────────────────────────────────────────────────────────────────────── */

export interface SaldoDoColaborador {
  /** `colaborador_id` (ou o nome, quando o vínculo não trouxe id). */
  id: string;
  nome: string;
  departamento: string;
  /** Saldo em horas decimais — negativo é dívida com a empresa. */
  saldo: number;
  /** Data do lançamento que definiu o saldo (`YYYY-MM-DD`). */
  data: string;
  /** Quantos lançamentos esse colaborador tem na base carregada. */
  registros: number;
}

/** Qual lançamento é mais recente: data, depois `created_at`. */
function compararRecencia(a: RegistroBancoHoras, b: RegistroBancoHoras): number {
  const dataA = (a.data ?? '').slice(0, 10);
  const dataB = (b.data ?? '').slice(0, 10);
  if (dataA !== dataB) return dataA > dataB ? 1 : -1;
  const criadoA = a.created_at ?? '';
  const criadoB = b.created_at ?? '';
  if (criadoA !== criadoB) return criadoA > criadoB ? 1 : -1;
  return 0;
}

/**
 * Saldo ATUAL de cada colaborador: o `saldo_atual` do lançamento mais recente
 * dele (desempate por `created_at`, depois pela ordem de chegada no array).
 *
 * Quando o lançamento mais recente não traz `saldo_atual` (coluna opcional), o
 * fallback é o líquido acumulado dos lançamentos DELE (créditos − débitos) — um
 * número real, derivado dos mesmos dados, em vez de zero ou de um `—` no card.
 *
 * A ordem de saída é do mais NEGATIVO para o mais positivo: é a ordem em que o
 * alerta e a legenda precisam ler.
 */
export function saldosPorColaborador(registros: readonly RegistroBancoHoras[]): SaldoDoColaborador[] {
  interface Acumulado {
    ultimo: RegistroBancoHoras;
    registros: number;
    liquido: number;
  }
  const mapa = new Map<string, Acumulado>();

  for (const registro of registros) {
    const chave = chaveDoColaborador(registro);
    const liquido = horasComSinal(registro);
    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, { ultimo: registro, registros: 1, liquido });
      continue;
    }
    atual.registros += 1;
    atual.liquido += liquido;
    if (compararRecencia(registro, atual.ultimo) > 0) atual.ultimo = registro;
  }

  return Array.from(mapa.entries())
    .map(([id, dados]) => ({
      id,
      nome: nomeDoColaborador(dados.ultimo),
      departamento: departamentoDoColaborador(dados.ultimo),
      saldo: lerIntervalo(dados.ultimo.saldo_atual) ?? dados.liquido,
      data: (dados.ultimo.data ?? '').slice(0, 10),
      registros: dados.registros,
    }))
    .sort((a, b) => a.saldo - b.saldo || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface SituacaoSaldos {
  positivos: number;
  negativos: number;
  zerados: number;
  /** Colaboradores com pelo menos um lançamento. */
  total: number;
  /** Soma dos saldos atuais (foto da equipe). */
  saldoTotal: number;
  /** Soma das horas em dívida (positiva) — o tamanho do rombo. */
  horasNegativas: number;
}

export function resumirSituacaoSaldos(saldos: readonly SaldoDoColaborador[]): SituacaoSaldos {
  let positivos = 0;
  let negativos = 0;
  let zerados = 0;
  let saldoTotal = 0;
  let horasNegativas = 0;

  for (const item of saldos) {
    saldoTotal += item.saldo;
    if (item.saldo > 0) positivos += 1;
    else if (item.saldo < 0) {
      negativos += 1;
      horasNegativas += Math.abs(item.saldo);
    } else zerados += 1;
  }

  return { positivos, negativos, zerados, total: saldos.length, saldoTotal, horasNegativas };
}

/** Somente quem está no vermelho — a lista do card de alerta. */
export function colaboradoresNegativos(saldos: readonly SaldoDoColaborador[]): SaldoDoColaborador[] {
  return saldos.filter((item) => item.saldo < 0);
}

/* ──────────────────────────────────────────────────────────────────────────
 * SÉRIE DE EVOLUÇÃO
 * ────────────────────────────────────────────────────────────────────────── */

export interface PontoEvolucao {
  /** `YYYY-MM-DD` — chave ordenável da série. */
  data: string;
  /** Rótulo curto do eixo (`dd/mm`). */
  eixo: string;
  /** Saldo acumulado até o fim desse dia (horas decimais). */
  saldo: number;
  /** Variação do dia (créditos − débitos). */
  variacao: number;
}

/** `YYYY-MM-DD` → `dd/mm` (rótulo do eixo X). */
export function rotuloEixoData(data: string): string {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!casamento) return data;
  const [, , mes, dia] = casamento;
  return `${dia}/${mes}`;
}

/**
 * Saldo ACUMULADO do período, um ponto por dia com movimentação.
 *
 * A série começa em zero no primeiro dia do recorte e recebe a variação de cada
 * dia (`créditos − débitos`); o último ponto é exatamente o "Saldo do período"
 * do KPI. Não há seed com `saldo_anterior`: esse campo é o saldo de UM
 * colaborador, e usá-lo semearia a curva da equipe com a dívida (ou o crédito)
 * de uma pessoa só.
 *
 * Dias sem lançamento não entram — a linha liga os dias COM movimento, e o eixo
 * mostra as datas reais em vez de inventar pontos vazios.
 */
export function evolucaoSaldo(registros: readonly RegistroBancoHoras[]): PontoEvolucao[] {
  const porDia = new Map<string, number>();

  for (const registro of registros) {
    const data = (registro.data ?? '').slice(0, 10);
    if (!data) continue;
    porDia.set(data, (porDia.get(data) ?? 0) + horasComSinal(registro));
  }

  let acumulado = 0;
  return Array.from(porDia.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0))
    .map(([data, variacao]) => {
      acumulado += variacao;
      return { data, eixo: rotuloEixoData(data), saldo: acumulado, variacao };
    });
}

/* ──────────────────────────────────────────────────────────────────────────
 * BARRAS DE TOTAIS — escala COMPARTILHADA
 * ────────────────────────────────────────────────────────────────────────── */

export interface BarraTotais {
  chave: TipoMovimento;
  rotulo: string;
  horas: number;
  /** 0–100 na escala COMUM do par (maior valor = 100%). */
  percentual: number;
  lancamentos: number;
}

/** Fração 0–100 de `valor` sobre `maior` (0 quando não há base). */
export function percentualDe(valor: number, maior: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(maior) || maior <= 0) return 0;
  return Math.max(0, Math.min(100, (valor / maior) * 100));
}

/**
 * As duas barras de "Totais de horas" na MESMA escala: o maior dos dois valores
 * ocupa 100% e o outro fica proporcional. Escalas independentes (cada barra
 * cheia) fariam 2h de débito parecer maior que 40h de crédito — mentira visual
 * que a área não pode se dar ao luxo de ter.
 *
 * Sem movimento nenhum, os dois percentuais são 0 (barras vazias): não existe
 * divisão por zero nem barra cheia "decorativa".
 */
export function barrasDeTotais(resumo: ResumoHoras): BarraTotais[] {
  const maior = Math.max(resumo.creditos, resumo.debitos);
  return [
    {
      chave: 'credito',
      rotulo: ROTULO_TIPO.credito,
      horas: resumo.creditos,
      percentual: percentualDe(resumo.creditos, maior),
      lancamentos: resumo.lancamentosCredito,
    },
    {
      chave: 'debito',
      rotulo: ROTULO_TIPO.debito,
      horas: resumo.debitos,
      percentual: percentualDe(resumo.debitos, maior),
      lancamentos: resumo.lancamentosDebito,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────────────
 * EXTRATO — identidade da lista e exportação
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Chave do `<tbody>` da cascata (ver `ui/cascade-table.tsx`): quando ela muda, o
 * corpo da tabela remonta e as linhas entram de novo. A BUSCA fica fora de
 * propósito — reanimar a sequência a cada tecla viraria piscada, o mesmo
 * critério aprovado em `HistoricoSolicitacoes`.
 */
export function chaveCascataExtrato(
  filtros: FiltrosExtrato,
  pagina: number,
  porPagina: number,
  ordem: OrdemExtrato = 'recentes'
): string {
  // O PERÍODO saiu daqui junto com os seletores de data: eles moraram no
  // cabeçalho da página, e o recorte já chega pronto em `registros`.
  return [pagina, porPagina, filtros.tipo, ordem].join('|');
}

/**
 * Linhas do CSV. As chaves `colaborador` e `data` são obrigatórias para o
 * exportador do sistema (`services/exportService.ts` → `validateExportData`,
 * que avisa quando elas faltam), e as horas saem já no formato `2h30` — o mesmo
 * que o usuário vê na tela.
 */
export function linhasParaExportacao(registros: readonly RegistroBancoHoras[]): Array<Record<string, string>> {
  return registros.map((registro) => ({
    colaborador: nomeDoColaborador(registro),
    departamento: registro.colaborador?.departamento?.trim() || '',
    data: dataDoRegistro(registro),
    tipo: rotuloTipo(tipoDoRegistro(registro)),
    horas: formatarHoras(horasDoRegistro(registro)),
    saldo_anterior: formatarIntervaloBanco(registro.saldo_anterior),
    saldo_atual: formatarIntervaloBanco(registro.saldo_atual),
    motivo: (registro.motivo ?? '').trim(),
  }));
}

/** `1 registro` / `N registros` — o contador discreto do cabeçalho. */
export function pluralRegistros(quantidade: number): string {
  return quantidade === 1 ? '1 registro' : `${quantidade} registros`;
}

/** `1 movimentação` / `N movimentações` — o rodapé da tabela. */
export function pluralMovimentacoes(quantidade: number): string {
  return quantidade === 1 ? '1 movimentação' : `${quantidade} movimentações`;
}

/* ---------------------------------------------
 * COMPARATIVO COM O PERÍODO ANTERIOR
 * --------------------------------------------- */

/** Meia-noite UTC de uma data `YYYY-MM-DD` (sem fuso, sem horário de verão). */
function diasDesdeEpoca(iso: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) return null;
  return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
}

/** Volta de milissegundos para `YYYY-MM-DD` (mesma base UTC da ida). */
function dataDaEpoca(ms: number): string {
  const data = new Date(ms);
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${data.getUTCFullYear()}-${mes}-${dia}`;
}

/**
 * Soma (ou subtrai) dias de uma data `YYYY-MM-DD`, em UTC.
 *
 * `new Date(iso)` interpretaria `2026-03-02` como meia-noite UTC e, ao somar
 * dias em horário local, devolveria o dia anterior em fusos negativos. Ancorar
 * tudo em `Date.UTC` mantém a aritmética de calendário pura.
 */
export function somarDias(iso: string, dias: number): string | null {
  const base = diasDesdeEpoca(iso);
  if (base === null) return null;
  return dataDaEpoca(base + dias * 86_400_000);
}

/** Janela do recorte e a janela IMEDIATAMENTE anterior, do mesmo tamanho. */
export interface JanelaComparacao {
  /** Recorte que a tela está mostrando (pontas abertas já resolvidas). */
  atual: PeriodoExtrato;
  /** Mesma quantidade de dias, logo antes de `atual.de`. */
  anterior: PeriodoExtrato;
  /** Tamanho do recorte em dias (inclusive as duas pontas). */
  dias: number;
}

/**
 * Resolve a janela de comparação a partir da base de lançamentos.
 *
 * Regra: o comparativo usa a MESMA quantidade de dias imediatamente antes do
 * recorte atual ("vs. período anterior" só é honesto assim). Quando a base é
 * vazia ou não tem data, devolve `null` — e os cards mostram `—` em vez de um
 * percentual inventado.
 */
export function janelaDeComparacao(
  registros: readonly RegistroBancoHoras[],
  periodo: PeriodoExtrato
): JanelaComparacao | null {
  const datas = registros
    .map((registro) => (registro.data ?? '').slice(0, 10))
    .filter((data) => diasDesdeEpoca(data) !== null)
    .sort();

  if (datas.length === 0) return null;

  const inicioBase = datas[0];
  const fimBase = datas[datas.length - 1];
  const de = periodo.de || inicioBase;
  const ate = periodo.ate || fimBase;

  const msDe = diasDesdeEpoca(de);
  const msAte = diasDesdeEpoca(ate);
  if (msDe === null || msAte === null || msAte < msDe) return null;

  const dias = Math.round((msAte - msDe) / 86_400_000) + 1;

  return {
    atual: { de, ate },
    anterior: {
      de: dataDaEpoca(msDe - dias * 86_400_000),
      ate: dataDaEpoca(msDe - 86_400_000),
    },
    dias,
  };
}

/** Como o valor de uma métrica mudou da janela anterior para a atual. */
export type DirecaoVariacao = 'aumento' | 'queda' | 'estavel' | 'sem-base';

export interface VariacaoMetrica {
  /** Variação percentual arredondada; `null` quando não há base de comparação. */
  percentual: number | null;
  direcao: DirecaoVariacao;
  /** Rótulo pronto para a tela: `+12%`, `-8%`, `0%` ou `—`. */
  rotulo: string;
}

/** Variação percentual entre duas janelas (denominador sempre absoluto). */
function variacaoEntre(atual: number, anterior: number): VariacaoMetrica {
  if (anterior === 0) return { percentual: null, direcao: 'sem-base', rotulo: '—' };
  const percentual = Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
  if (percentual === 0) return { percentual: 0, direcao: 'estavel', rotulo: '0%' };
  return {
    percentual,
    direcao: percentual > 0 ? 'aumento' : 'queda',
    rotulo: `${percentual > 0 ? '+' : ''}${percentual}%`,
  };
}

/** Tudo o que os KPI Cards precisam para o selo "vs. período anterior". */
export interface ComparativoPeriodo {
  janela: JanelaComparacao | null;
  /** Resumo do recorte atual (o mesmo que a página usa nos números). */
  atual: ResumoHoras;
  /** Resumo da janela anterior, de mesmo tamanho. */
  anterior: ResumoHoras;
  movimentacoes: VariacaoMetrica;
  creditos: VariacaoMetrica;
  debitos: VariacaoMetrica;
  saldo: VariacaoMetrica;
  /** Sufixo curto do selo ("vs. período anterior" / "sem base anterior"). */
  rotuloJanela: string;
}

/**
 * Compara o recorte atual com a janela anterior de mesmo tamanho.
 *
 * Os quatro selos dos KPI Cards saem daqui — nenhum card recalcula percentual
 * por conta própria, então os cinco números da faixa nunca divergem entre si.
 */
export function compararPeriodos(
  registros: readonly RegistroBancoHoras[],
  periodo: PeriodoExtrato
): ComparativoPeriodo {
  const janela = janelaDeComparacao(registros, periodo);
  const atual = resumirHoras(recortarPorPeriodo(registros, janela?.atual ?? periodo));
  const anterior = janela ? resumirHoras(recortarPorPeriodo(registros, janela.anterior)) : resumirHoras([]);

  return {
    janela,
    atual,
    anterior,
    movimentacoes: variacaoEntre(atual.registros, anterior.registros),
    creditos: variacaoEntre(atual.creditos, anterior.creditos),
    debitos: variacaoEntre(atual.debitos, anterior.debitos),
    saldo: variacaoEntre(atual.saldo, anterior.saldo),
    rotuloJanela: anterior.registros > 0 ? 'vs. período anterior' : 'sem base anterior',
  };
}

/* ---------------------------------------------
 * MINI GRÁFICO DE BARRAS DOS KPI CARDS
 * --------------------------------------------- */

/** O que a micro-série de cada card secundário mede. */
export type MetricaMiniBarra = 'movimentacoes' | 'credito' | 'debito';

/**
 * Série diária compacta para o mini gráfico de barras de um KPI Card.
 *
 * Devolve os valores dos ÚLTIMOS `limite` dias que têm lançamento, em ordem
 * cronológica — mesma convenção de `evolucaoSaldo` (dia com movimento, não dia
 * de calendário), para que dias vazios não virem uma barra zerada no meio do
 * desenho. O card escala as alturas pelo maior valor da própria série.
 */
export function miniBarras(registros: readonly RegistroBancoHoras[], metrica: MetricaMiniBarra, limite = 12): number[] {
  const porDia = new Map<string, number>();

  for (const registro of registros) {
    const data = (registro.data ?? '').slice(0, 10);
    if (!data) continue;
    const acumulado = porDia.get(data) ?? 0;
    if (metrica === 'movimentacoes') {
      porDia.set(data, acumulado + 1);
      continue;
    }
    const tipo = tipoDoRegistro(registro);
    if (tipo !== metrica) continue;
    porDia.set(data, acumulado + horasDoRegistro(registro));
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-Math.max(limite, 1))
    .map(([, valor]) => Number(valor.toFixed(2)));
}
