/**
 * ============================================================================
 * METAS & OKRs — derivações da aba (situação, prazo, ordem e filtros).
 *
 * Ponto único dos cálculos que os cards/banner/filtros da aba "Metas & OKRs"
 * exibem. Nada aqui inventa dado: TODAS as funções leem somente campos que já
 * existem em `metas_okrs` (`titulo`, `descricao`, `tipo`, `status`,
 * `data_limite`, `created_at`, `valor_atual`/`meta_valor`/`progresso`) e na
 * relação já carregada por `avaliacaoService.listarMetas`
 * (`colaborador:colaboradores(nome_completo)`).
 *
 * ── SITUAÇÃO DA META (as quatro categorias dos filtros rápidos) ─────────────
 * O banco NÃO tem uma coluna de "situação": ela é DERIVADA das regras que a
 * própria área já usava (`desempenhoComum`), nunca de um número copiado da
 * referência visual:
 *
 *   1. `concluida` → status já encerrado com sucesso (mesmo conjunto de
 *      `STATUS_CONCLUIDO` usado pelas barras/tabelas do módulo);
 *   2. `atrasada`  → prazo vencido e ainda não concluída — é EXATAMENTE o
 *      `estaAtrasado()` compartilhado (`data_limite`/`prazo` < agora);
 *   3. `risco`     → não concluída, não vencida, e o progresso está ABAIXO do
 *      ritmo esperado para o prazo já decorrido (`progressoMeta` <
 *      `(agora − created_at) / (data_limite − created_at)`), ou o status é de
 *      meta sem andamento (`pausado`/`bloqueado`). É a única regra nova e é
 *      uma leitura de RITMO — não há limiar arbitrário de percentual;
 *   4. `emdia`     → todo o resto.
 *
 * Sem `data_limite` não há como afirmar atraso/ritmo: a meta cai em `emdia`
 * (ou em `concluida`, pelo status).
 *
 * ── O QUE A REFERÊNCIA MOSTRA E O SISTEMA NÃO TEM ──────────────────────────
 *  • EVOLUÇÃO ("+12% desde a última atualização"): `metas_okrs` não guarda
 *    histórico de progresso. O campo é lido apenas se existir
 *    (`progresso_anterior`) e a variação é a DIFERENÇA EM PONTOS PERCENTUAIS
 *    entre o progresso atual e a medição anterior (nunca variação relativa);
 *    sem ele o indicador NÃO é exibido. Para validar o layout existe um
 *    histórico SIMULADO no mock de desenvolvimento (`desempenhoMock`), gated
 *    por `VITE_DESEMPENHO_MOCK` — nunca chega a produção e não grava nada.
 *  • DEPARTAMENTO do responsável ("Financeiro", "Marketing"...):
 *    `listarMetas` seleciona somente `nome_completo` na relação `colaborador`.
 *    O campo continua sendo lido primeiro da própria relação e, quando ausente,
 *    é resolvido PELO `colaborador_id` na lista de colaboradores que a própria
 *    `AvaliacaoPage` já carrega (a mesma query da área de Colaboradores, sem
 *    consulta nova) — ver `departamentoDe`. Sem correspondência, a linha
 *    secundária não é renderizada: nada de departamento inventado.
 *  • TIPO "OKR": a coluna `tipo` é texto livre e o dado real só traz
 *    `individual`/`equipe`/`empresa`; o filtro é montado a partir dos tipos
 *    REALMENTE presentes na lista (nada de opção decorativa).
 * ============================================================================
 */
import { estaAtrasado, progressoMeta } from './desempenhoComum';
import { PALETAS_CHIP, type TemaChip } from './chipFiltroComum';

const DIA_MS = 86_400_000;

/** Status que representam meta encerrada com sucesso. */
const STATUS_CONCLUIDO = new Set(['concluido', 'concluida', 'concluída', 'finalizado', 'finalizada']);

/** Status que significam "meta sem andamento" → lida como risco. */
const STATUS_PARADO = new Set(['pausado', 'pausada', 'bloqueado', 'bloqueada', 'em_risco', 'cancelado', 'cancelada']);

/** Situação derivada de uma meta. É o valor dos filtros rápidos por status. */
export type SituacaoMeta = 'emdia' | 'risco' | 'atrasada' | 'concluida';

/** Valor selecionado na barra de filtros rápidos (`todas` = sem corte). */
export type FiltroStatus = 'todas' | SituacaoMeta;

/** Meta com tudo que a tela precisa já derivado (não muda o objeto original). */
export interface MetaDerivada {
  meta: any;
  /** Progresso 0–100 (`progressoMeta`). */
  percentual: number;
  situacao: SituacaoMeta;
  /** Dias até o prazo: 0 = hoje, positivo = restantes, negativo = em atraso. */
  dias: number | null;
  /** Prazo formatado (dd/mm/aaaa) ou `—` quando não há data. */
  prazo: string;
  /** Responsável (nome completo) ou `—`. */
  responsavel: string;
  /** Departamento do responsável — `null` quando a consulta não o traz. */
  departamento: string | null;
  /** Variação em pontos percentuais desde a medição anterior — `null` sem histórico. */
  evolucao: number | null;
}

/**
 * Recorte MÍNIMO de `colaboradores` que a resolução de departamento usa. A
 * lista chega pronta da `AvaliacaoPage` (query `['colaboradores', empresaId]`,
 * a mesma da área de Colaboradores) — nenhuma consulta nova é feita aqui.
 */
export interface ColaboradorBasico {
  id?: string | null;
  departamento?: string | null;
}

/**
 * Departamento do responsável da meta.
 *
 * Ordem de leitura: (1) a relação já embutida na meta
 * (`meta.colaborador.departamento`, quando o `select` a trouxer); (2) a lista de
 * colaboradores recebida por `colaborador_id`. Sem nenhuma das duas, `null` —
 * o card não renderiza a linha (nenhum departamento é inventado).
 */
export function departamentoDe(meta: any, colaboradores: ColaboradorBasico[] = []): string | null {
  const daRelacao = String(meta?.colaborador?.departamento ?? '').trim();
  if (daRelacao) return daRelacao;

  const id = String(meta?.colaborador_id ?? '').trim();
  if (!id) return null;
  const achado = colaboradores.find((c) => String(c?.id ?? '') === id);
  return String(achado?.departamento ?? '').trim() || null;
}

/** Rótulo de exibição de cada situação. */
export const ROTULO_SITUACAO: Record<SituacaoMeta, string> = {
  emdia: 'Em dia',
  risco: 'Em risco',
  atrasada: 'Atrasada',
  concluida: 'Concluída',
};

/**
 * ── ETIQUETAS DO CARD (tipo + situação) ─────────────────────────────────────
 * Geometria e tipografia ÚNICAS das duas etiquetas do card. Ficam aqui (e não
 * no `MetaCard`) porque tipo e situação são o MESMO componente visual em papéis
 * diferentes: assim compartilham altura, padding horizontal, raio, peso
 * tipográfico e o espaçamento ícone↔texto, e uma terceira etiqueta que venha a
 * existir na aba nasce alinhada só por reusar esta base.
 *
 * `min-w-0` (sem `shrink-0`) deixa o rótulo do tipo truncar se o valor livre da
 * coluna for longo; a situação (palavra curta e fixa) trava com `shrink-0` no
 * call-site.
 */
export const ETIQUETA_BASE =
  'inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide';

/**
 * Tom NEUTRO (cinza do sistema): etiqueta sem categoria conhecida — é o tom do
 * tipo vazio/desconhecido (rótulo "Meta") e o tom RESERVADO para um status
 * `rascunho`. Hoje `SituacaoMeta` só produz emdia/risco/atrasada/concluida, ou
 * seja: nenhuma etiqueta de rascunho existe e nenhuma regra nova é criada aqui
 * (um status `rascunho` continua caindo em "Em dia"/"Em risco" pela derivação).
 */
export const CLASSE_NEUTRA = 'border-border/60 bg-muted/40 text-muted-foreground';

/**
 * Pele por TIPO de meta — DISCRETA de propósito (fundo a 10 %, borda a 25 %,
 * texto na cor cheia + ícone na MESMA cor). O destaque do cabeçalho é da
 * etiqueta de SITUAÇÃO, um degrau acima em intensidade (fundo a 20 %, borda a
 * 45 %) — é o que faz as duas serem lidas em papéis diferentes num relance.
 *
 * Cada tom é um token JÁ EXISTENTE do tema (nenhuma cor nova, nenhum token
 * novo, nenhum utilitário global novo):
 *   • individual → `--info`     (azul/ciano);
 *   • equipe     → `--chart-4`  (roxo);
 *   • empresa    → `--chart-2`  (teal / verde-azulado);
 *   • okr        → `--primary`  (lime da marca).
 *
 * `--chart-2`/`--chart-4` não estão registrados como utilitários no
 * `tailwind.config.js`, então entram por valor arbitrário — exatamente o padrão
 * que `AssistenteIAPage.tsx` já usa para roxo (`--chart-4`) e teal (`--chart-2`).
 */
export const CLASSE_TIPO: Record<string, string> = {
  individual: 'border-info/25 bg-info/10 text-info',
  equipe: 'border-[hsl(var(--chart-4)/0.25)] bg-[hsl(var(--chart-4)/0.10)] text-[hsl(var(--chart-4))]',
  empresa: 'border-[hsl(var(--chart-2)/0.25)] bg-[hsl(var(--chart-2)/0.10)] text-[hsl(var(--chart-2))]',
  okr: 'border-primary/25 bg-primary/10 text-primary',
};

/**
 * Tom do TIPO a partir do valor REAL de `metas_okrs.tipo` (texto livre).
 * Compostos como "okr - equipe" caem em OKR — a MESMA regra do ícone e do
 * rótulo (`rotuloTipo`), para os três nunca discordarem. Sem valor utilizável
 * (ou valor desconhecido), cai no neutro.
 */
export function tomTipo(tipo: unknown): string {
  const t = texto(tipo);
  if (!t) return CLASSE_NEUTRA;
  if (t.includes('okr')) return CLASSE_TIPO.okr;
  return CLASSE_TIPO[t] ?? CLASSE_NEUTRA;
}

/**
 * Pele do badge de SITUAÇÃO (o elemento de maior destaque do cabeçalho).
 *
 * `concluida` usa `--info` (azul) e NÃO o verde de `emdia`: as duas situações
 * aparecem na mesma posição do card, então precisam de famílias de cor
 * diferentes. É também o tom que os filtros rápidos já usam para "Concluídas"
 * (`TEMA_CHIP_METAS.concluida`), deixando o chip da barra e o badge do card na
 * mesma cor pela primeira vez.
 */
export const CLASSE_SITUACAO: Record<SituacaoMeta, string> = {
  emdia: 'border-success/45 bg-success/20 text-success',
  concluida: 'border-info/45 bg-info/20 text-info',
  risco: 'border-warning/45 bg-warning/20 text-warning',
  atrasada: 'border-destructive-vivid/45 bg-destructive-vivid/20 text-destructive-vivid',
};

/** Cor do traço do donut (via `stroke: currentColor`). */
export const COR_DONUT: Record<SituacaoMeta, string> = {
  emdia: 'text-success',
  concluida: 'text-success',
  risco: 'text-warning',
  atrasada: 'text-destructive-vivid',
};

/** Tinta da linha de prazo (a leitura contextual muda com a situação). */
export const TINTA_PRAZO: Record<SituacaoMeta, string> = {
  emdia: 'text-foreground',
  concluida: 'text-success',
  risco: 'text-warning',
  atrasada: 'text-destructive-vivid',
};

/**
 * TEMA de cor das pílulas de status — as MESMAS famílias do Design System
 * usadas pelos chips coloridos da Auditoria (`chipFiltroComum.PALETAS_CHIP`).
 *
 * Cada status usa UMA família de cor, a mesma dos tokens de situação do card
 * (`CLASSE_SITUACAO`/`COR_DONUT`):
 *   • todas     → `lime`    (`--primary`, lime da marca) — destaque da barra;
 *   • emdia     → `emerald` (`--success`, verde);
 *   • risco     → `amber`   (`--warning`, âmbar);
 *   • atrasada  → `red`     (`--destructive-vivid`, vermelho);
 *   • concluida → `blue`    (`--info`, azul) — escolhido NO LUGAR do verde
 *     para separar visualmente de "Em dia" (no card da meta ambos caem em
 *     `success`).
 *
 * Aqui fica SÓ a cor de cada categoria — a única fonte de verdade. A anatomia
 * do chip (altura, padding, formato, bolinha, contador e a animação de glow) é
 * do componente único `ColoredFilterChip`, o MESMO da Auditoria.
 */
export const TEMA_CHIP_METAS: Record<FiltroStatus, TemaChip> = {
  todas: PALETAS_CHIP.lime,
  emdia: PALETAS_CHIP.emerald,
  risco: PALETAS_CHIP.amber,
  atrasada: PALETAS_CHIP.red,
  concluida: PALETAS_CHIP.blue,
};

/** Pílulas da barra de filtros rápidos, na ordem da referência. */
export const FILTROS_STATUS: { valor: FiltroStatus; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'emdia', rotulo: 'Em dia' },
  { valor: 'risco', rotulo: 'Em risco' },
  { valor: 'atrasada', rotulo: 'Atrasadas' },
  { valor: 'concluida', rotulo: 'Concluídas' },
];

/** Contagem de metas por pílula (as chaves são as do `FiltroStatus`). */
export type ContagemMetas = Record<FiltroStatus, number>;

/** Critérios de ordenação suportados pelos campos reais. */
export type CriterioOrdem = 'criticos' | 'prazo' | 'maior_progresso' | 'menor_progresso';

/** Opções do seletor "Ordenar por", na ordem da referência. */
export const ORDEM_OPCOES: { valor: CriterioOrdem; rotulo: string }[] = [
  { valor: 'criticos', rotulo: 'Mais críticos' },
  { valor: 'prazo', rotulo: 'Menor prazo' },
  { valor: 'maior_progresso', rotulo: 'Maior progresso' },
  { valor: 'menor_progresso', rotulo: 'Menor progresso' },
];

/** Normaliza texto livre (status/tipo) para comparação e rótulo. */
function texto(valor: unknown): string {
  return String(valor ?? '')
    .trim()
    .toLowerCase();
}

/** Meia-noite local de um instante (ms) — base da contagem em DIAS de calendário. */
function inicioDoDia(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Instante do prazo, no fim do dia. Aceita `data_limite` (coluna real) e
 * `prazo` (nome usado em outras superfícies do módulo); datas `YYYY-MM-DD` são
 * lidas como locais para não "voltar um dia" em UTC-3.
 */
function prazoMs(meta: any): number | null {
  const valor = meta?.data_limite ?? meta?.prazo;
  if (!valor) return null;
  const bruto = String(valor);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? `${bruto}T23:59:59` : bruto;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Dias de calendário até o prazo: `0` vence hoje, positivo = restantes,
 * negativo = já vencido. `null` quando não há prazo utilizável.
 */
export function diasAte(meta: any, agora: number = Date.now()): number | null {
  const limite = prazoMs(meta);
  if (limite === null) return null;
  return Math.round((inicioDoDia(limite) - inicioDoDia(agora)) / DIA_MS);
}

/**
 * Prazo em dd/mm/aaaa.
 *
 * Lê `YYYY-MM-DD` como data LOCAL (e não como UTC, que é o padrão do
 * `new Date('YYYY-MM-DD')`): em UTC-3 o padrão devolveria o DIA ANTERIOR na
 * tela — o mesmo motivo pelo qual `prazoMs` monta `T23:59:59`. Datas com hora
 * (timestamp) seguem o fuso do próprio valor.
 */
export function formatarPrazo(data: unknown): string {
  if (!data) return '—';
  const bruto = String(data);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? `${bruto}T00:00:00` : bruto;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleDateString('pt-BR');
}

/**
 * Ritmo insuficiente: o progresso está abaixo da fração de prazo já decorrida
 * (`created_at` → `data_limite`). Sem as duas datas, ou com prazo anterior à
 * criação, não há leitura possível → `false`.
 */
function ritmoInsuficiente(meta: any, agora: number): boolean {
  const inicio = new Date(String(meta?.created_at ?? '')).getTime();
  const limite = prazoMs(meta);
  if (!Number.isFinite(inicio) || limite === null || limite <= inicio || agora <= inicio) return false;
  const decorrido = (agora - inicio) / (limite - inicio);
  return progressoMeta(meta) < decorrido * 100;
}

/** Situação derivada da meta (ver o bloco de documentação do topo). */
export function situacaoMeta(meta: any, agora: number = Date.now()): SituacaoMeta {
  const status = texto(meta?.status);
  if (STATUS_CONCLUIDO.has(status)) return 'concluida';
  if (estaAtrasado(meta, agora)) return 'atrasada';
  if (STATUS_PARADO.has(status)) return 'risco';
  if (ritmoInsuficiente(meta, agora)) return 'risco';
  return 'emdia';
}

/** Variação em pontos percentuais, travada em −100…100. */
function limitarDelta(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(-100, Math.min(100, Math.round(valor)));
}

/** Deriva tudo que o card/banner precisam, sem alterar o registro original. */
export function derivarMeta(
  meta: any,
  agora: number = Date.now(),
  colaboradores: ColaboradorBasico[] = []
): MetaDerivada {
  const percentual = progressoMeta(meta);
  const anterior = meta?.progresso_anterior;
  const temAnterior = anterior !== null && anterior !== undefined && Number.isFinite(Number(anterior));

  return {
    meta,
    percentual,
    situacao: situacaoMeta(meta, agora),
    dias: diasAte(meta, agora),
    prazo: formatarPrazo(meta?.data_limite ?? meta?.prazo),
    responsavel: String(meta?.colaborador?.nome_completo ?? meta?.responsavel ?? '').trim() || '—',
    departamento: departamentoDe(meta, colaboradores),
    evolucao: temAnterior ? limitarDelta(percentual - Number(anterior)) : null,
  };
}

/** Rótulo do tipo da meta a partir do valor REAL da coluna `tipo`. */
export function rotuloTipo(tipo: unknown): string {
  const t = texto(tipo);
  if (!t) return 'Meta';
  // Cada palavra capitalizada e a sigla sempre em caixa alta — o dado real é
  // texto livre e pode chegar como "okr - equipe" (referência: "OKR - EQUIPE").
  return t
    .split(/\s+/)
    .map((palavra) => (palavra === 'okr' ? 'OKR' : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(' ');
}

/** Tipos realmente presentes na lista (opções do filtro "Tipo"). */
export function tiposDisponiveis(metas: any[]): string[] {
  const vistos = new Set<string>();
  metas.forEach((m) => {
    const t = texto(m?.tipo);
    if (t) vistos.add(t);
  });
  return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Responsáveis realmente presentes na lista (opções do filtro "Responsável"). */
export function responsaveisDisponiveis(itens: MetaDerivada[]): string[] {
  const vistos = new Set<string>();
  itens.forEach((i) => {
    if (i.responsavel && i.responsavel !== '—') vistos.add(i.responsavel);
  });
  return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Conta as metas de cada pílula a partir das situações JÁ derivadas. */
export function contarPorSituacao(itens: MetaDerivada[]): ContagemMetas {
  const contagem: ContagemMetas = { todas: itens.length, emdia: 0, risco: 0, atrasada: 0, concluida: 0 };
  itens.forEach((i) => {
    contagem[i.situacao] += 1;
  });
  return contagem;
}

/** Peso da situação na ordenação "Mais críticos" (menor = mais crítico). */
const PESO_SITUACAO: Record<SituacaoMeta, number> = { atrasada: 0, risco: 1, emdia: 2, concluida: 3 };

/** Ordena uma cópia da lista — nunca muta a entrada. */
export function ordenarMetas(itens: MetaDerivada[], criterio: CriterioOrdem): MetaDerivada[] {
  const copia = [...itens];
  const semPrazo = Number.POSITIVE_INFINITY;

  switch (criterio) {
    case 'prazo':
      return copia.sort((a, b) => (a.dias ?? semPrazo) - (b.dias ?? semPrazo));
    case 'maior_progresso':
      return copia.sort((a, b) => b.percentual - a.percentual);
    case 'menor_progresso':
      return copia.sort((a, b) => a.percentual - b.percentual);
    case 'criticos':
    default:
      return copia.sort(
        (a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao] || (a.dias ?? semPrazo) - (b.dias ?? semPrazo)
      );
  }
}

/** Metas que precisam de atenção = atrasadas + em risco, já ordenadas. */
export function metasCriticas(itens: MetaDerivada[]): MetaDerivada[] {
  return ordenarMetas(
    itens.filter((i) => i.situacao === 'atrasada' || i.situacao === 'risco'),
    'criticos'
  );
}

/** Leitura do prazo para o card ("Atrasada há 6 dias", "4 dias restantes"...). */
export function descricaoPrazo(item: MetaDerivada): string {
  if (item.situacao === 'concluida') return 'Concluída';
  if (item.dias === null) return 'Sem prazo definido';
  if (item.dias < 0) {
    const dias = Math.abs(item.dias);
    return `Atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  if (item.dias === 0) return 'Vence hoje';
  return `${item.dias} ${item.dias === 1 ? 'dia restante' : 'dias restantes'}`;
}

/** Frase curta do problema, usada no banner de metas críticas. */
export function descricaoProblema(item: MetaDerivada): string {
  if (item.situacao === 'atrasada') {
    const dias = Math.abs(item.dias ?? 0);
    return dias === 1 ? 'está atrasada há 1 dia.' : `está atrasada há ${dias} dias.`;
  }
  if (item.situacao === 'risco') {
    if (item.dias !== null && item.dias >= 0) {
      const restante = item.dias === 1 ? '1 dia restante' : `${item.dias} dias restantes`;
      return `tem ${restante} e apenas ${item.percentual}% de progresso.`;
    }
    return `está em risco com ${item.percentual}% de progresso.`;
  }
  return `progresso de ${item.percentual}%.`;
}
