/**
 * ============================================================================
 * SOLICITAÇÕES DE HORAS EXTRAS — vocabulário, formatadores e recortes.
 *
 * FONTE ÚNICA do que a área exibe: rótulos/variantes de status, formatadores de
 * horas e de data, busca textual, o recorte por período e os FILTROS da lista.
 * Nenhuma tela inventa rótulo, cor ou data por conta própria — KPI, card de
 * aprovação, detalhe e a tabela do histórico leem tudo daqui, então não há como
 * divergirem.
 *
 * REGRAS DE IDENTIDADE (não mudar sem autorização):
 *  - As CORES de status são VEREDITO, não ação: fundo translúcido + borda sutil
 *    + texto vibrante (`status-aprovada`, `status-rejeitada`) e ÂMBAR de
 *    atenção em `pendente` (`--warning`), no mesmo padrão dos demais
 *    indicadores do sistema. Ver `SELO_STATUS`. O lime da marca (`--primary`)
 *    é cor de AÇÃO e não é usado como veredito.
 *  - Datas passam por `@/utils/format` (pt-BR, fuso America/Sao_Paulo) — a
 *    regra do sistema é nunca chamar `toLocaleDateString` direto.
 *  - Horas são exibidas como `2h30` (e não `2.5h`), a mesma leitura do KPI.
 * ============================================================================
 */
import { formatDate } from '@/utils/format';

export type StatusHoraExtra = 'pendente' | 'aprovada' | 'rejeitada';

/** Vínculo embutido da consulta (`colaborador:colaboradores(...)`). */
export interface ColaboradorDaSolicitacao {
  nome_completo?: string | null;
  departamento?: string | null;
}

/** Linha de `solicitacoes_hora_extra` como a tela consome. */
export interface SolicitacaoHoraExtra {
  id: string;
  colaborador_id?: string | null;
  data?: string | null;
  horas_solicitadas?: number | string | null;
  motivo?: string | null;
  status?: string | null;
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  observacoes_aprovador?: string | null;
  created_at?: string | null;
  colaborador?: ColaboradorDaSolicitacao | null;
}

export const STATUS_LABELS: Record<StatusHoraExtra, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

/**
 * Classes do SELO de status — pill com fundo TRANSLÚCIDO, borda sutil e texto
 * na cor vibrante (o padrão dos indicadores do sistema). Quem renderiza é o
 * `Badge` com `variant="outline"`, então nada aqui depende de variante.
 *
 * `pendente` é ÂMBAR — o token `--warning` do sistema, que no tema CLARO é
 * `hsl(38 92% 50%)` = `#F59E0B` (o hex pedido, exato) e no ESCURO sobe um
 * degrau para `hsl(38 92% 52%)` = `#F5A314`, como `--success`/`--info` fazem
 * para compensar o navy. Não é um tom inventado para esta tela: é a cor de
 * ATENÇÃO do sistema. `pendente` é o único status que ainda espera decisão de
 * alguém, então é o único que pede atenção — o cinza do `--secondary` lia como
 * texto apagado, não como status. A receita é a mesma dos outros dois vereditos
 * (fundo `/12`, borda `/30`, texto na cor vibrante), sem fundo sólido — o pill
 * continua translúcido nos dois temas. O PESO da fonte segue `font-medium`:
 * mudar para `semibold` alargaria o pill e mexeria no respiro do cabeçalho do
 * cartão, e o pedido é só de cor.
 */
export const SELO_STATUS: Record<StatusHoraExtra, string> = {
  pendente: 'border-warning/30 bg-warning/12 font-medium text-warning',
  aprovada: 'border-status-aprovada/40 bg-status-aprovada/10 font-semibold text-status-aprovada',
  rejeitada: 'border-status-rejeitada/45 bg-status-rejeitada/12 font-semibold text-status-rejeitada',
};

/** Normaliza o status da linha (a coluna é restrita a três valores no banco). */
export function statusDe(status: string | null | undefined): StatusHoraExtra {
  return status === 'aprovada' || status === 'rejeitada' ? status : 'pendente';
}

export function rotuloStatus(status: string | null | undefined): string {
  return STATUS_LABELS[statusDe(status)];
}

/** Classe do selo para um status cru da linha (a mesma do `SELO_STATUS`). */
export function seloStatus(status: string | null | undefined): string {
  return SELO_STATUS[statusDe(status)];
}

/**
 * RÉGUA ÚNICA dos DOIS controles que moram no cabeçalho da seção "Aprovações
 * pendentes": o filtro de PERÍODO (à esquerda) e o "Ver todas (N)"/"Mostrar
 * menos" (à direita), separados por 9 px de classe (11,25 px renderizados).
 *
 * Medidas (px de classe × 1,25 = px renderizados pela base rem de 20 px —
 * ver `docs/ESCALA-GLOBAL-DESIGN-SYSTEM.md`):
 *   altura ......... 30 → 37,5
 *   respiro lateral  11 → 13,75
 *   raio ............ 9 → 11,25   (o mesmo dos botões compactos do sistema)
 *   fonte .......... 11 → 13,75   (idêntica aos filtros do histórico)
 *   ícones ..... 13/14 → 16,25/17,5
 *
 * Nenhum dos dois pode ficar "mais alto" que o outro: a altura vem daqui, e
 * `shrink-0` impede que um deles seja esmagado quando o cabeçalho quebra
 * linha (o container é `flex-wrap`).
 */
export const CLASSE_CONTROLE_SECAO =
  'h-[30px] shrink-0 gap-[6px] rounded-[9px] border px-[11px] text-[11px] font-medium transition-colors';

/**
 * Classe do BOTÃO SECUNDÁRIO de navegação — o "Ver todas (N)" / "Mostrar menos"
 * da fila de aprovação (o histórico não tem mais ação no cabeçalho: mostra
 * apenas um contador discreto de registros):
 *
 *  - cor de AÇÃO informativa (`--info`, o azul-ciano do sistema) com borda e
 *    fundo TRANSLÚCIDOS — não é texto solto (ação importante tem que parecer
 *    clicável) e não é lime preenchido (lime é da ação primária);
 *  - altura/respiro/raio/fonte da `CLASSE_CONTROLE_SECAO` (30 px de classe →
 *    37,5 px renderizados): a MESMA altura do filtro de período ao lado;
 *  - hover com fundo e borda mais evidentes (não muda o tamanho, então nada
 *    "pula" na faixa do cabeçalho).
 */
export const CLASSE_BOTAO_SECUNDARIO_INFO = `${CLASSE_CONTROLE_SECAO} border-info/30 bg-info/10 text-info hover:border-info/55 hover:bg-info/20 hover:text-info`;

/**
 * Filtro de PERÍODO no cabeçalho da seção — deixou de ser card (a quarta
 * "superfície" da faixa de indicadores) e virou controle compacto:
 * calendário à esquerda, rótulo do período, chevron à direita. Superfície
 * NEUTRA (`bg-secondary/40` + `border-border`), a mesma dos filtros do
 * histórico; o lime continua reservado a estado ativo/ação primária. Mesma
 * altura do "Ver todas" ao lado (via `CLASSE_CONTROLE_SECAO`).
 *
 * O `cn` do projeto é `tailwind-merge`: estas classes substituem — e não
 * somam com — as do `SelectTrigger` base (`h-9`, `w-full`, `px-3`,
 * `border-input`, `bg-background`).
 */
export const CLASSE_SELECT_PERIODO = `${CLASSE_CONTROLE_SECAO} w-auto justify-between border-border bg-secondary/40 text-left text-foreground hover:border-primary/40 hover:bg-secondary/70 [&>svg]:shrink-0`;

/**
 * Largura do filtro de período, em px de CLASSE. Sem largura fixa o controle
 * mudaria de tamanho ao trocar de opção ("Todo o período" ↔ "Últimos 30
 * dias") e a faixa do cabeçalho "pularia": o piso de 138 px (= 172,5 px
 * renderizados, medidos no navegador) é o que comporta o MAIOR rótulo com o
 * cromo do trigger (ícone 17,5 + 2 respiros de 7,5 + chevron 17,5 + 2
 * respiros laterais de 13,75 + rótulo mais longo). Assim os cinco presets
 * desenham EXATAMENTE a mesma largura — dentro da faixa de 155–175 px dos
 * controles compactos. Sem teto: o label é conhecido e curto, então o
 * controle nunca precisa truncar.
 */
export const MEDIDA_SELECT_PERIODO = 'sm:min-w-[138px]';

/**
 * Régua ÚNICA dos controles de filtro (busca, departamento, status e
 * ordenação): 38 px de classe → 47,5 px renderizados, raio 10 → 12,5, respiro
 * 12 → 15 — a MESMA altura e a MESMA tipografia dos demais formulários do
 * sistema (`ConteudoFiltro` desenha rótulo 9 → 11,25 e valor 11 → 13,75).
 *
 * DESTAQUE: o controle ganha superfície própria (`bg-secondary/40`) e borda
 * visível (`border-border`, no lugar do `border-input` apagado do padrão), o
 * que separa os filtros do fundo do cartão sem inventar cor nova. O realce de
 * hover usa o token da marca. O `cn` do projeto é `tailwind-merge`, então
 * estas classes substituem — e não somam com — as do `Input`/`SelectTrigger`.
 *
 * LARGURA — o controle NÃO tem largura fixa:
 *  - até `sm` ocupa a linha inteira (`w-full`), empilhado;
 *  - de `sm` para cima é dimensionado pelo CONTEÚDO (`sm:w-auto`: a largura
 *    natural do trigger já é ícone + rótulo + valor + seta) e divide o espaço
 *    excedente com os irmãos (`sm:grow`), respeitando o piso de cada filtro
 *    (`MEDIDA_FILTRO_*`).
 * Consequência: o valor selecionado aparece INTEIRO sempre que houver espaço
 * na linha; quando não houver, a barra QUEBRA em outra linha (`flex-wrap` no
 * container) em vez de cortar. O `truncate` do valor continua existindo apenas
 * como rede de segurança para o caso fisicamente impossível (nome de
 * departamento enorme numa tela de 390 px).
 *
 * `[&>svg]:shrink-0` é o que impede a seta (e o ícone) de serem esmagados pelo
 * texto: sem isso o SVG é um flex item encolhível e "encosta" no valor quando
 * a linha fica apertada.
 */
export const CLASSE_CONTROLE_FILTRO =
  'h-[38px] w-full justify-between gap-[10px] rounded-[10px] border-border bg-secondary/40 px-[12px] text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-secondary/70 sm:w-auto sm:grow [&>svg]:shrink-0';

/**
 * PISO (e, quando o conteúdo é finito, TETO) de largura por select, em px de
 * CLASSE (× 1,25 no render).
 *
 * O piso sai da MEDIDA do maior rótulo que aquele menu mostra + 87 px de cromo
 * (24 de respiro horizontal + 17,5 do ícone + 12,5 de respiro até o texto +
 * 12,5 até a seta + 20,5 da seta), medidos no navegador com a fonte do sistema
 * (Plus Jakarta Sans 13,75 px). Abaixo, tudo em px RENDERIZADOS:
 *   status        "Aprovadas e rejeitadas" = 150 + 87 = 237
 *   ordenação     "Colaborador (A–Z)"      = 121 + 87 = 208
 *   departamento  "Todos"                  =  93 + 87 = 180
 *
 * O token recebe esse piso em px de CLASSE (÷ 1,25, arredondado PARA CIMA, com
 * 1 px de folga de arredondamento): 237 → `194` (242,5), 208 → `170` (212,5),
 * 180 → `150` (187,5).
 *
 * Por isso o status recebe o piso maior (era ele que aparecia cortado no
 * padrão da tela) e a ordenação o menor. O TETO existe só nos dois menus de
 * conteúdo conhecido — evita que um select sozinho na última linha estique
 * pela largura toda. Departamento fica SEM teto de propósito: o nome vem do
 * banco e o controle cresce até caber (quebrando a linha, se precisar).
 */
export const MEDIDA_FILTRO_DEPARTAMENTO = 'sm:min-w-[150px]';
export const MEDIDA_FILTRO_STATUS = 'sm:min-w-[194px] sm:max-w-[260px]';
export const MEDIDA_FILTRO_ORDEM = 'sm:min-w-[170px] sm:max-w-[240px]';

/** Campo de BUSCA da barra de filtros — mesma régua e mesmo destaque acima. */
export const CLASSE_CAMPO_BUSCA =
  'h-[38px] rounded-[10px] border-border bg-secondary/40 pl-[30px] text-[11px] transition-colors hover:border-primary/40 focus-visible:bg-background';

/** Base do botão "Limpar" (largura vem do conteúdo; altura é a dos controles). */
const CLASSE_LIMPAR_BASE = 'h-[38px] shrink-0 gap-[6px] rounded-[10px] px-[12px] text-[11px]';

/** Com filtro ativo: lime da marca (cor de AÇÃO), translúcido, com borda. */
const CLASSE_LIMPAR_ATIVO = `${CLASSE_LIMPAR_BASE} border border-primary/45 bg-primary/10 font-medium text-primary hover:border-primary/70 hover:bg-primary/20 hover:text-primary`;

/** Sem filtro ativo: discreto (o botão também fica `disabled`). */
const CLASSE_LIMPAR_INATIVO = `${CLASSE_LIMPAR_BASE} text-muted-foreground hover:text-foreground`;

/**
 * Classe do "Limpar" a partir dos PRÓPRIOS filtros — recebe o objeto inteiro
 * (e não um booleano) para que o destaque não possa dessincronizar do estado
 * real: quem decide é `temFiltroAtivo`.
 */
export function classeBotaoLimpar(filtros: FiltrosHistorico): string {
  return temFiltroAtivo(filtros) ? CLASSE_LIMPAR_ATIVO : CLASSE_LIMPAR_INATIVO;
}

/** `2.5` → `2h30`; `4` → `4h00`; `1.25` → `1h15`. Entrada inválida → `—`. */
export function formatarHoras(horas: number | string | null | undefined): string {
  // String vazia/em branco é AUSÊNCIA de valor — e não 0, que `Number('')`
  // devolveria (e o KPI imprimiria "0h00" para um campo simplesmente vazio).
  let valor: number | null | undefined;
  if (typeof horas === 'string') {
    const texto = horas.trim();
    valor = texto === '' ? Number.NaN : Number(texto.replace(',', '.'));
  } else {
    valor = horas;
  }
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '—';
  const totalMinutos = Math.round(valor * 60);
  const h = Math.trunc(totalMinutos / 60);
  const m = Math.abs(totalMinutos % 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** Soma das horas de uma lista (ignora valores inválidos). */
export function somarHoras(itens: readonly SolicitacaoHoraExtra[]): number {
  return itens.reduce((total, s) => {
    const n = Number(s.horas_solicitadas);
    return total + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * DECISÕES de um recorte — a base do KPI "Taxa de aprovação".
 *
 * `decididas` conta SÓ aprovadas + rejeitadas: pendente é fila, não veredito,
 * e não pode entrar no denominador (senão a taxa cairia a cada pedido novo,
 * sem que ninguém tivesse decidido nada).
 */
export interface ResumoDecisoes {
  /** Quantas foram aprovadas. */
  aprovadas: number;
  /** Quantas foram rejeitadas. */
  rejeitadas: number;
  /** Aprovadas + rejeitadas (o denominador da taxa). */
  decididas: number;
  /** 0–100 arredondado; `null` quando não houve decisão (nada de divisão por 0). */
  taxa: number | null;
}

/** Deriva a taxa de aprovação do recorte — nenhum percentual é fixo. */
export function resumoDecisoes(itens: readonly SolicitacaoHoraExtra[]): ResumoDecisoes {
  let aprovadas = 0;
  let rejeitadas = 0;
  for (const s of itens) {
    const status = statusDe(s.status);
    if (status === 'aprovada') aprovadas += 1;
    else if (status === 'rejeitada') rejeitadas += 1;
  }
  const decididas = aprovadas + rejeitadas;
  return {
    aprovadas,
    rejeitadas,
    decididas,
    taxa: decididas === 0 ? null : Math.round((aprovadas / decididas) * 100),
  };
}

/**
 * Valor do KPI em texto: `86%` ou `—` quando não há decisão no período. Em
 * porcentagem inteira porque o card é um indicador de leitura rápida (a
 * contagem exata fica na descrição auxiliar: "6 de 7 solicitações decididas").
 */
export function rotuloTaxaAprovacao(taxa: number | null): string {
  return taxa === null ? '—' : `${taxa}%`;
}

/**
 * Descrição auxiliar do KPI: quantas aprovadas sobre quantas decididas.
 * Sem decisão, a frase muda de assunto (não existe "0 de 0").
 */
export function descricaoTaxaAprovacao(resumo: ResumoDecisoes): string {
  if (resumo.decididas === 0) return 'Nenhuma decisão no período';
  const sufixo = resumo.decididas === 1 ? 'solicitação decidida' : 'solicitações decididas';
  return `${resumo.aprovadas} de ${resumo.decididas} ${sufixo}`;
}

export function nomeDoColaborador(s: SolicitacaoHoraExtra): string {
  return s.colaborador?.nome_completo?.trim() || 'Colaborador não informado';
}

/** Departamento do colaborador, quando a consulta trouxer o vínculo. */
export function departamentoDoColaborador(s: SolicitacaoHoraExtra): string | null {
  return s.colaborador?.departamento?.trim() || null;
}

/** Ocorrência da hora extra (`data`) em `dd/mm/aaaa`. */
export function dataDaRealizacao(s: SolicitacaoHoraExtra): string {
  return formatDate(s.data);
}

/** Data em que a solicitação foi registrada (`created_at`) em `dd/mm/aaaa`. */
export function dataDaSolicitacao(s: SolicitacaoHoraExtra): string {
  return formatDate(s.created_at);
}

/** Busca textual por colaborador, departamento, motivo e status. */
export function combinaBusca(s: SolicitacaoHoraExtra, termo: string): boolean {
  const alvo = termo.trim().toLowerCase();
  if (!alvo) return true;
  return [nomeDoColaborador(s), departamentoDoColaborador(s) ?? '', s.motivo ?? '', rotuloStatus(s.status)]
    .join(' ')
    .toLowerCase()
    .includes(alvo);
}

/* ─── Filtros da lista (a tabela do histórico é a única vista) ────────────── */

/**
 * As cinco leituras do filtro de status. `todas` é o conjunto COMPLETO (as três
 * situações na mesma tabela), `aprovadasRejeitadas` é o padrão de abertura — as
 * pendentes já ocupam a fila de aprovação acima — e as demais são recortes por
 * veredito. Nenhuma delas é recorte de dados: é o MESMO conjunto, com o filtro
 * aberto.
 */
export type FiltroStatus = 'aprovadasRejeitadas' | 'pendente' | 'aprovada' | 'rejeitada' | 'todas';

/** Ordenações oferecidas pela lista. Ordenar NÃO é filtrar (ver `temFiltroAtivo`). */
export type OrdemHistorico = 'recentes' | 'antigas' | 'nome' | 'horas';

/**
 * Opções do filtro de status, na ordem em que o menu abre: primeiro o conjunto
 * completo, depois cada veredito e, por último, o agrupamento que é o padrão da
 * tela (a opção continua disponível porque é o estado inicial).
 */
export const STATUS_FILTRO_OPCOES: readonly { value: FiltroStatus; label: string }[] = [
  { value: 'todas', label: 'Todas as solicitações' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovada', label: 'Aprovadas' },
  { value: 'rejeitada', label: 'Rejeitadas' },
  { value: 'aprovadasRejeitadas', label: 'Aprovadas e rejeitadas' },
];

export const ORDEM_OPCOES: readonly { value: OrdemHistorico; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'nome', label: 'Colaborador (A–Z)' },
  { value: 'horas', label: 'Mais horas' },
];

/** Sentinela do "sem filtro" de departamento (o `Select` do Radix não aceita ''). */
export const TODOS_DEPARTAMENTOS = 'todos';

/** Estado completo dos filtros da lista — um único objeto, uma única verdade. */
export interface FiltrosHistorico {
  busca: string;
  departamento: string;
  status: FiltroStatus;
  ordem: OrdemHistorico;
}

/** Padrão da tabela: sem busca, todos os departamentos, veredito, recentes. */
export const FILTROS_PADRAO: FiltrosHistorico = {
  busca: '',
  departamento: TODOS_DEPARTAMENTOS,
  status: 'aprovadasRejeitadas',
  ordem: 'recentes',
};

/** A linha casa com o filtro de status? `todas` nunca descarta. */
export function casaStatus(s: SolicitacaoHoraExtra, filtro: FiltroStatus): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'aprovadasRejeitadas') return statusDe(s.status) !== 'pendente';
  return statusDe(s.status) === filtro;
}

/** A linha casa com o departamento escolhido? `todos` nunca descarta. */
export function casaDepartamento(s: SolicitacaoHoraExtra, alvo: string): boolean {
  if (alvo === TODOS_DEPARTAMENTOS) return true;
  return (departamentoDoColaborador(s) ?? '') === alvo;
}

/** `YYYY-MM-DD` comparável (o `created_at` é timestamp ISO). */
export function chaveData(s: SolicitacaoHoraExtra): string {
  return (s.created_at ?? s.data ?? '').slice(0, 10);
}

/** Departamentos presentes nos dados — o filtro nunca oferece opção vazia. */
export function departamentosDisponiveis(itens: readonly SolicitacaoHoraExtra[]): string[] {
  const nomes = new Set<string>();
  for (const s of itens) {
    const d = departamentoDoColaborador(s);
    if (d) nomes.add(d);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Aplica TODOS os filtros da lista e devolve uma cópia ordenada. É a única
 * função de recorte da área — a tabela do histórico não tem uma segunda via de
 * filtro, então não existe a possibilidade de duas vistas discordarem.
 */
export function filtrarSolicitacoes(
  itens: readonly SolicitacaoHoraExtra[],
  filtros: FiltrosHistorico
): SolicitacaoHoraExtra[] {
  const lista = itens.filter(
    (s) => combinaBusca(s, filtros.busca) && casaStatus(s, filtros.status) && casaDepartamento(s, filtros.departamento)
  );
  switch (filtros.ordem) {
    case 'antigas':
      return lista.sort((a, b) => chaveData(a).localeCompare(chaveData(b)));
    case 'nome':
      return lista.sort((a, b) => nomeDoColaborador(a).localeCompare(nomeDoColaborador(b), 'pt-BR'));
    case 'horas':
      return lista.sort((a, b) => (Number(b.horas_solicitadas) || 0) - (Number(a.horas_solicitadas) || 0));
    default:
      return lista.sort((a, b) => chaveData(b).localeCompare(chaveData(a)));
  }
}

/**
 * Existe filtro ATIVO? Só busca, departamento e status contam — ORDENAÇÃO NÃO
 * é filtro (o "Limpar" não deve acender só porque a lista foi reordenada).
 *
 * A comparação é sempre com `FILTROS_PADRAO`: o destaque nasce do estado real
 * dos filtros, nunca de um booleano paralelo que possa dessincronizar.
 */
export function temFiltroAtivo(filtros: FiltrosHistorico): boolean {
  return (
    filtros.busca.trim() !== '' ||
    filtros.departamento !== TODOS_DEPARTAMENTOS ||
    filtros.status !== FILTROS_PADRAO.status
  );
}

/* ─── Período ─────────────────────────────────────────────────────────────── */

export type PeriodoId = 'todos' | '7d' | '30d' | 'mesAtual' | 'mesAnterior';

export const PERIODO_OPCOES: readonly { value: PeriodoId; label: string }[] = [
  { value: 'todos', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mesAtual', label: 'Este mês' },
  { value: 'mesAnterior', label: 'Mês anterior' },
];

export interface IntervaloPeriodo {
  /** `YYYY-MM-DD` (inclusive). */
  de: string;
  /** `YYYY-MM-DD` (inclusive). */
  ate: string;
}

/** `Date` → `YYYY-MM-DD` no fuso LOCAL (mesma régua de `utils/dateLocal`). */
function isoLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Converte o preset em intervalo fechado. `null` = sem recorte. */
export function resolverPeriodo(id: PeriodoId, hoje: Date = new Date()): IntervaloPeriodo | null {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  switch (id) {
    case '7d':
    case '30d': {
      const dias = id === '7d' ? 6 : 29;
      return { de: isoLocal(new Date(ano, mes, hoje.getDate() - dias)), ate: isoLocal(hoje) };
    }
    case 'mesAtual':
      return { de: isoLocal(new Date(ano, mes, 1)), ate: isoLocal(new Date(ano, mes + 1, 0)) };
    case 'mesAnterior':
      return { de: isoLocal(new Date(ano, mes - 1, 1)), ate: isoLocal(new Date(ano, mes, 0)) };
    default:
      return null;
  }
}

/**
 * Rótulo CURTO do preset ("Todo o período", "Últimos 7 dias"…): é o que o
 * controle compacto do cabeçalho da seção mostra. A faixa de datas exata
 * continua disponível em `rotuloPeriodo` (usada no `title` do controle).
 */
export function rotuloOpcaoPeriodo(id: PeriodoId): string {
  return PERIODO_OPCOES.find((o) => o.value === id)?.label ?? PERIODO_OPCOES[0].label;
}

/** Rótulo do card "Período": `01/10/2026 – 31/10/2026` ou "Todo o período". */
export function rotuloPeriodo(id: PeriodoId, hoje: Date = new Date()): string {
  const faixa = resolverPeriodo(id, hoje);
  return faixa ? `${formatDate(faixa.de)} – ${formatDate(faixa.ate)}` : 'Todo o período';
}

/**
 * Recorta as solicitações pela DATA DE REALIZAÇÃO — a mesma data que a tabela
 * exibe na coluna "Data da realização". `data` vazia cai em `created_at`, para
 * nenhum registro sumir do recorte por falta de campo.
 */
export function recortarPorPeriodo(
  itens: readonly SolicitacaoHoraExtra[],
  id: PeriodoId,
  hoje: Date = new Date()
): SolicitacaoHoraExtra[] {
  const faixa = resolverPeriodo(id, hoje);
  if (!faixa) return [...itens];
  return itens.filter((s) => {
    const alvo = (s.data ?? s.created_at ?? '').slice(0, 10);
    return Boolean(alvo) && alvo >= faixa.de && alvo <= faixa.ate;
  });
}
