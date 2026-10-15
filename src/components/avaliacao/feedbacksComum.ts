/**
 * ============================================================================
 * FEEDBACKS 360 — derivações da aba "Feedbacks" (Gestão de Desempenho).
 *
 * Ponto único dos cálculos que a aba exibe (tipo, nota/faixa, agrupamento por
 * mês, contadores de segmento, distribuição de notas, médias e prazos). Nada
 * aqui inventa dado: todas as funções leem SOMENTE campos que já existem em
 * `feedbacks_360` (`tipo`, `nota_geral`, `potencial`, `status`, `created_at`,
 * `ciclo_id`, `avaliado_id`, `avaliador_id`, `pontos_fortes`,
 * `pontos_melhoria`, `comentarios`), na relação já carregada
 * (`avaliado:colaboradores(nome_completo)` / `avaliador:...`), na lista de
 * `colaboradores` da página (cargo/departamento), nos `ciclos_avaliacao`
 * (prazo) e nos `pdis` (competência em foco do avaliado).
 *
 * ── O QUE A REFERÊNCIA MOSTRA E O SISTEMA NÃO TEM ──────────────────────────
 *  • CHIPS DE COMPETÊNCIAS do feedback: `feedbacks_360` não guarda competências
 *    avaliadas (o catálogo `competencias_config` é global, não por feedback).
 *    O chip do card é a competência em FOCO no PDI do próprio avaliado
 *    (`pdis.competencia_foco`) — dado real. Sem PDI, nenhum chip é renderizado.
 *  • TELA DE DETALHE: não existe rota/aba de detalhe do feedback; o dialog
 *    desta pasta mostra os campos reais (`pontos_fortes`, `pontos_melhoria`,
 *    `comentarios`) sem inventar histórico.
 *
 * ── TIPO DE FEEDBACK ───────────────────────────────────────────────────────
 * A coluna `tipo` é texto livre; os valores REAIS presentes nos dados são
 * `gestor`, `par`, `auto` e `subordinado`. `tipoFeedback` normaliza tanto o
 * valor curto quanto rótulos por extenso ("Autoavaliação").
 * ============================================================================
 */
import { formatarData, normalizarStatus } from './desempenhoComum';
import { PALETAS_CHIP, type TemaChip } from './chipFiltroComum';

/** Tipos de feedback realmente presentes na coluna `tipo`. */
export type TipoFeedback = 'gestor' | 'par' | 'auto' | 'subordinado';

/** Segmentos dos chips de segmentação (o primeiro é o "sem corte"). */
export type SegmentoFeedback = 'todos' | 'gestor' | 'par' | 'auto';

/** Ordenações suportadas pelos campos reais (data e nota). */
export type CriterioOrdemFeedback = 'recentes' | 'antigos' | 'maior_nota' | 'menor_nota';

/** Contexto opcional para enriquecer o card (cargo/departamento e PDI). */
export interface ContextoFeedbacks {
  /** Colaboradores da página (mesma query de `['colaboradores', empresaId]`). */
  colaboradores?: { id?: string | null; cargo?: string | null; departamento?: string | null }[];
  /** PDIs já carregados — origem da competência em foco do avaliado. */
  pdis?: { colaborador_id?: string | null; competencia_foco?: string | null }[];
}

/** Faixa semântica de nota, na linguagem da referência. */
export interface FaixaNota {
  nota: number;
  rotulo: string;
  /** Tinta do número e das estrelas. */
  tinta: string;
  /** Pele do badge textual (fundo translúcido + borda sutil). */
  badge: string;
  /** Degradê do preenchimento da barra (mesma régua do módulo). */
  barra: string;
}

/** Feedback com tudo que a tela precisa já derivado (não muda o original). */
export interface FeedbackDerivado {
  feedback: any;
  /** Tipo normalizado (`gestor`/`par`/`auto`/`subordinado`). */
  tipo: TipoFeedback;
  /** Segmento dos chips a que o tipo pertence. */
  segmento: Exclude<SegmentoFeedback, 'todos'>;
  /** Rótulo do tipo ("Gestor", "Par", "Autoavaliação"...). */
  tipoRotulo: string;
  /** `true` quando o feedback ainda não foi concluído. */
  pendente: boolean;
  /** Nota real (0–5). */
  nota: number;
  /** Nota formatada em pt-BR com uma casa ("5,0"). */
  notaFormatada: string;
  /** Faixa semântica da nota (rótulo + tintas). */
  faixa: FaixaNota;
  /** Nome do avaliado / avaliador (ou `—`). */
  avaliado: string;
  avaliador: string;
  /** Cargo e departamento do AVALIADO — `null` quando a lista não os traz. */
  cargo: string | null;
  departamento: string | null;
  /** Competência em foco no PDI do avaliado — `null` quando não há PDI. */
  competencia: string | null;
  /** Texto de busca do card (avaliado + avaliador + texto do feedback). */
  busca: string;
  /** Data formatada (dd/mm/aaaa). */
  data: string;
  /** Início do mês do feedback (ms) — base do AGRUPAMENTO por mês. */
  mesMs: number;
  /** Instante exato do feedback (ms) — base da ORDENAÇÃO dentro do mês. */
  criadoMs: number;
  /** Rótulo do grupo ("Outubro 2026"). */
  mesRotulo: string;
  /** Prazo do ciclo do feedback, formatado (dd/mm/aaaa) ou `—`. */
  prazo: string;
}

/**
 * As cinco faixas de nota. Os rótulos são os da referência; as tintas e os
 * degradês são os JÁ usados pelo módulo (`AnaliticosDesempenho.FAIXAS_NOTA`),
 * para a leitura verde → lime → âmbar → vermelho ser a mesma em qualquer
 * superfície de Gestão de Desempenho.
 */
export const FAIXAS_NOTA: FaixaNota[] = [
  { nota: 5, rotulo: 'Excelente', tinta: 'text-success', badge: 'border-success/45 bg-success/20 text-success', barra: 'bg-gradient-to-r from-success to-primary' },
  { nota: 4, rotulo: 'Muito bom', tinta: 'text-success', badge: 'border-success/45 bg-success/20 text-success', barra: 'bg-gradient-to-r from-success to-primary' },
  { nota: 3, rotulo: 'Bom', tinta: 'text-primary', badge: 'border-primary/45 bg-primary/20 text-primary', barra: 'bg-gradient-to-r from-primary to-warning' },
  { nota: 2, rotulo: 'Regular', tinta: 'text-warning', badge: 'border-warning/45 bg-warning/20 text-warning', barra: 'bg-gradient-to-r from-warning/60 to-warning' },
  { nota: 1, rotulo: 'A melhorar', tinta: 'text-destructive-vivid', badge: 'border-destructive-vivid/45 bg-destructive-vivid/20 text-destructive-vivid', barra: 'bg-gradient-to-r from-destructive/60 to-destructive-vivid' },
];

/** Faixa semântica de uma nota (0–5). Arredonda como o resto do módulo. */
export function faixaNota(nota: unknown): FaixaNota {
  const bruta = Math.round(Number(nota ?? 0));
  const arredondada = Math.min(5, Math.max(1, Number.isFinite(bruta) && bruta > 0 ? bruta : 1));
  return FAIXAS_NOTA.find((f) => f.nota === arredondada) ?? FAIXAS_NOTA[FAIXAS_NOTA.length - 1];
}

/** Nota com uma casa em pt-BR ("5" → "5,0"). */
export function formatarNota(nota: unknown): string {
  const n = Number(nota ?? 0);
  if (!Number.isFinite(n)) return '0,0';
  return n.toFixed(1).replace('.', ',');
}

/** Rótulo curto de cada tipo (usado nos selects e nas legendas). */
export const ROTULO_TIPO_FEEDBACK: Record<TipoFeedback, string> = {
  gestor: 'Gestor',
  par: 'Par',
  auto: 'Autoavaliação',
  subordinado: 'Subordinado',
};

/**
 * Pele do chip de tipo — mesma linguagem das etiquetas de "Metas & OKRs"
 * (fundo 10 %, borda 25 %, texto cheio), com uma família de cor do sistema por
 * categoria: gestor → limão da marca; par → ciano (`--info`); autoavaliação →
 * roxo (`--chart-4`); subordinado → teal (`--chart-2`).
 */
export const CLASSE_TIPO_FEEDBACK: Record<TipoFeedback, string> = {
  gestor: 'border-primary/25 bg-primary/10 text-primary',
  par: 'border-info/25 bg-info/10 text-info',
  auto: 'border-[hsl(var(--chart-4)/0.25)] bg-[hsl(var(--chart-4)/0.10)] text-[hsl(var(--chart-4))]',
  subordinado: 'border-[hsl(var(--chart-2)/0.25)] bg-[hsl(var(--chart-2)/0.10)] text-[hsl(var(--chart-2))]',
};

/** Cor sólida do marcador de cada tipo (legendas). */
export const COR_TIPO_FEEDBACK: Record<TipoFeedback, string> = {
  gestor: 'bg-primary',
  par: 'bg-info',
  auto: 'bg-[hsl(var(--chart-4))]',
  subordinado: 'bg-[hsl(var(--chart-2))]',
};

/** Cor do traço no donut (atributo `stroke`), por tipo. */
export const TRACO_TIPO_FEEDBACK: Record<TipoFeedback, string> = {
  gestor: 'hsl(var(--primary))',
  par: 'hsl(var(--info))',
  auto: 'hsl(var(--chart-4))',
  subordinado: 'hsl(var(--chart-2))',
};

/**
 * Normaliza a coluna `tipo` (texto livre) para um dos quatro tipos reais.
 * Reconhece o valor curto e rótulos por extenso. Sem valor utilizável cai em
 * `gestor`, o tipo dominante dos dados — nenhum tipo novo é inventado.
 */
export function tipoFeedback(tipo: unknown): TipoFeedback {
  const t = String(tipo ?? '').trim().toLowerCase();
  if (t.includes('auto')) return 'auto';
  if (t.includes('subordin')) return 'subordinado';
  if (t.includes('par')) return 'par';
  return 'gestor';
}

/** Rótulo do tipo a partir do valor REAL da coluna. */
export function rotuloTipoFeedback(tipo: unknown): string {
  return ROTULO_TIPO_FEEDBACK[tipoFeedback(tipo)];
}

/** Pele do chip do tipo a partir do valor REAL da coluna. */
export function tomTipoFeedback(tipo: unknown): string {
  return CLASSE_TIPO_FEEDBACK[tipoFeedback(tipo)];
}

/** Segmento de segmentação correspondente ao tipo (subordinado entra em Gestor). */
export function segmentoDoTipo(tipo: unknown): Exclude<SegmentoFeedback, 'todos'> {
  const t = tipoFeedback(tipo);
  return t === 'subordinado' ? 'gestor' : t;
}

/** Feedback pendente = ainda não concluído (mesma régua do módulo). */
export function estaPendente(feedback: any): boolean {
  return normalizarStatus(feedback?.status) !== 'concluido';
}

/** Chips de segmentação, na ordem da referência (o contador vem do dado). */
export const SEGMENTOS: { valor: SegmentoFeedback; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'gestor', rotulo: 'Gestor' },
  { valor: 'par', rotulo: 'Pares' },
  { valor: 'auto', rotulo: 'Autoavaliação' },
];

/**
 * TEMA de cor dos chips de segmentação — as MESMAS famílias do Design System
 * usadas pelos chips coloridos da Auditoria (`chipFiltroComum.PALETAS_CHIP`):
 *   • todos   → `lime`    (`--primary`, verde-lima da marca);
 *   • gestor  → `emerald` (`--success`, verde);
 *   • par     → `blue`    (`--info`, azul/ciano);
 *   • auto    → `violet`  (`--chart-4`, violeta do tema).
 * Aqui fica SÓ a cor de cada categoria. A anatomia do chip (altura, padding,
 * formato, bolinha, contador e a animação de glow) é do componente único
 * `ColoredFilterChip`, o MESMO da Auditoria.
 */
export const TEMA_CHIP_FEEDBACKS: Record<SegmentoFeedback, TemaChip> = {
  todos: PALETAS_CHIP.lime,
  gestor: PALETAS_CHIP.emerald,
  par: PALETAS_CHIP.blue,
  auto: PALETAS_CHIP.violet,
};

/** Contagem por chip de segmentação (chaves iguais às de `SEGMENTOS`). */
export type ContagemSegmentos = Record<SegmentoFeedback, number>;

/** Contagem das metas de cada chip a partir dos segmentos JÁ derivados. */
export function contarPorSegmento(itens: FeedbackDerivado[]): ContagemSegmentos {
  const contagem: ContagemSegmentos = { todos: itens.length, gestor: 0, par: 0, auto: 0 };
  itens.forEach((i) => {
    contagem[i.segmento] += 1;
  });
  return contagem;
}

/** Títulos dos grupos de mês em pt-BR, na ordem do calendário. */
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Início do mês local de um instante (ms) — base do agrupamento. */
function inicioDoMes(data: unknown): number {
  const d = new Date(String(data ?? ''));
  if (!Number.isFinite(d.getTime())) return 0;
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Rótulo do grupo de um instante ("Outubro 2026"). */
function rotuloMes(ms: number): string {
  if (!ms) return 'Sem data';
  const d = new Date(ms);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Cargo/departamento do colaborador pelo id (lista já carregada pela página). */
function localDe(colaboradores: ContextoFeedbacks['colaboradores'], id: unknown) {
  const alvo = String(id ?? '').trim();
  const achado = alvo ? colaboradores?.find((c) => String(c?.id ?? '') === alvo) : undefined;
  return {
    cargo: String(achado?.cargo ?? '').trim() || null,
    departamento: String(achado?.departamento ?? '').trim() || null,
  };
}

/** Competência em foco do PDI do avaliado (lista já carregada pela página). */
function competenciaDe(pdis: ContextoFeedbacks['pdis'], colaboradorId: unknown): string | null {
  const alvo = String(colaboradorId ?? '').trim();
  if (!alvo) return null;
  const achado = pdis?.find((p) => String(p?.colaborador_id ?? '') === alvo);
  return String(achado?.competencia_foco ?? '').trim() || null;
}

/** Prazo do ciclo do feedback (`data_fim`), formatado. */
function prazoDoCiclo(ciclos: any[] | undefined, cicloId: unknown): string {
  const alvo = String(cicloId ?? '').trim();
  const ciclo = alvo ? ciclos?.find((c) => String(c?.id ?? '') === alvo) : undefined;
  return ciclo?.data_fim ? formatarData(ciclo.data_fim) : '—';
}

/**
 * Deriva a lista inteira de uma vez (um `contexto` vale para todos os itens),
 * sem mutar a entrada e sem consulta nova — mesma régua de `derivarMeta`.
 */
export function derivarFeedbacks(
  feedbacks: any[],
  contexto: ContextoFeedbacks & { ciclos?: any[] } = {}
): FeedbackDerivado[] {
  const { colaboradores = [], pdis = [], ciclos = [] } = contexto;

  return feedbacks.map((f) => {
    const nota = Number(f?.nota_geral ?? 0);
    const mesMs = inicioDoMes(f?.created_at);
    const avaliado = String(f?.avaliado?.nome_completo ?? '').trim() || '—';
    const avaliador = String(f?.avaliador?.nome_completo ?? '').trim() || '—';
    const local = localDe(colaboradores, f?.avaliado_id);
    const tipo = tipoFeedback(f?.tipo);

    return {
      feedback: f,
      tipo,
      segmento: segmentoDoTipo(f?.tipo),
      tipoRotulo: ROTULO_TIPO_FEEDBACK[tipo],
      pendente: estaPendente(f),
      nota: Number.isFinite(nota) ? nota : 0,
      notaFormatada: formatarNota(nota),
      faixa: faixaNota(nota),
      avaliado,
      avaliador,
      cargo: local.cargo,
      departamento: local.departamento,
      competencia: competenciaDe(pdis, f?.avaliado_id),
      busca: `${avaliado} ${avaliador} ${f?.comentarios ?? ''} ${f?.pontos_fortes ?? ''}`.toLowerCase(),
      data: formatarData(f?.created_at),
      mesMs,
      criadoMs: Number.isFinite(new Date(String(f?.created_at ?? '')).getTime())
        ? new Date(String(f?.created_at ?? '')).getTime()
        : 0,
      mesRotulo: rotuloMes(mesMs),
      prazo: prazoDoCiclo(ciclos, f?.ciclo_id),
    };
  });
}

/** Uma faixa da distribuição de notas (5 → 1), com total e percentual. */
export interface LinhaDistribuicao extends FaixaNota {
  quantidade: number;
  percentual: number;
}

/** Distribuição das notas arredondadas em 5 faixas (5 → 1). */
export function distribuicaoNotas(itens: FeedbackDerivado[]): LinhaDistribuicao[] {
  const total = itens.length;
  return FAIXAS_NOTA.map((faixa) => {
    const quantidade = itens.filter((i) => Math.round(i.nota) === faixa.nota).length;
    return { ...faixa, quantidade, percentual: total ? Math.round((quantidade / total) * 100) : 0 };
  });
}

/** Média das notas (0–5) com uma casa decimal; `null` sem feedbacks. */
export function mediaNotas(itens: FeedbackDerivado[]): number | null {
  if (!itens.length) return null;
  const soma = itens.reduce((acc, i) => acc + i.nota, 0);
  return Math.round((soma / itens.length) * 10) / 10;
}

/**
 * Variação da média entre o ciclo atual e o anterior, em pontos de nota.
 * `null` quando um dos lados não tem feedback — sem base de comparação o
 * indicador não é exibido (nada de delta inventado).
 */
export function deltaMedia(atual: FeedbackDerivado[], anterior: FeedbackDerivado[]): number | null {
  const a = mediaNotas(atual);
  const b = mediaNotas(anterior);
  if (a === null || b === null) return null;
  return Math.round((a - b) * 10) / 10;
}

/** Uma linha do widget "Tipos de feedback". */
export interface LinhaTipo {
  tipo: TipoFeedback;
  rotulo: string;
  cor: string;
  traco: string;
  quantidade: number;
  percentual: number;
}

/** Contagem por tipo REALMENTE presente na lista (ordem de `SEGMENTOS`). */
export function contagemTipos(itens: FeedbackDerivado[]): LinhaTipo[] {
  const total = itens.length;
  const tipos: TipoFeedback[] = ['gestor', 'par', 'auto', 'subordinado'];
  return tipos
    .map((tipo) => {
      const quantidade = itens.filter((i) => i.tipo === tipo).length;
      return {
        tipo,
        rotulo: ROTULO_TIPO_FEEDBACK[tipo],
        cor: COR_TIPO_FEEDBACK[tipo],
        traco: TRACO_TIPO_FEEDBACK[tipo],
        quantidade,
        percentual: total ? Math.round((quantidade / total) * 100) : 0,
      };
    })
    .filter((linha) => linha.quantidade > 0);
}

/** Grupo de mês da timeline. */
export interface GrupoMes {
  chave: number;
  rotulo: string;
  itens: FeedbackDerivado[];
}

/** Agrupa por mês/ano (mais recente primeiro), preservando a ordem de cada grupo. */
export function agruparPorMes(itens: FeedbackDerivado[]): GrupoMes[] {
  const mapa = new Map<number, FeedbackDerivado[]>();
  itens.forEach((i) => {
    const atual = mapa.get(i.mesMs) ?? [];
    atual.push(i);
    mapa.set(i.mesMs, atual);
  });
  return [...mapa.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([chave, doMes]) => ({ chave, rotulo: rotuloMes(chave), itens: doMes }));
}

/**
 * Ordena uma cópia da lista — nunca muta a entrada.
 *
 * A ordenação por data usa o INSTANTE exato (`criadoMs`), não o início do mês:
 * assim, dentro do mesmo grupo de mês, a timeline fica na ordem cronológica
 * real (o mais recente primeiro), como a referência.
 */
export function ordenarFeedbacks(itens: FeedbackDerivado[], criterio: CriterioOrdemFeedback): FeedbackDerivado[] {
  const copia = [...itens];
  switch (criterio) {
    case 'antigos':
      return copia.sort((a, b) => a.criadoMs - b.criadoMs || a.avaliado.localeCompare(b.avaliado, 'pt-BR'));
    case 'maior_nota':
      return copia.sort((a, b) => b.nota - a.nota || b.criadoMs - a.criadoMs);
    case 'menor_nota':
      return copia.sort((a, b) => a.nota - b.nota || b.criadoMs - a.criadoMs);
    case 'recentes':
    default:
      return copia.sort((a, b) => b.criadoMs - a.criadoMs || a.avaliado.localeCompare(b.avaliado, 'pt-BR'));
  }
}

/** Opções do seletor "Ordenar por" (padrão = "Mais recentes"). */
export const ORDEM_FEEDBACK_OPCOES: { valor: CriterioOrdemFeedback; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
  { valor: 'maior_nota', rotulo: 'Maior nota' },
  { valor: 'menor_nota', rotulo: 'Menor nota' },
];

/** Avaliadores REALMENTE presentes na lista (opções do filtro). */
export function avaliadoresDisponiveis(itens: FeedbackDerivado[]): string[] {
  const vistos = new Set<string>();
  itens.forEach((i) => {
    if (i.avaliador && i.avaliador !== '—') vistos.add(i.avaliador);
  });
  return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Feedbacks pendentes do recorte, os mais recentes primeiro. */
export function pendentes(itens: FeedbackDerivado[]): FeedbackDerivado[] {
  return ordenarFeedbacks(
    itens.filter((i) => i.pendente),
    'recentes'
  );
}

/**
 * Dias de calendário até o fim do ciclo: `0` vence hoje, positivo = restantes,
 * negativo = já encerrado. `null` quando o ciclo não tem `data_fim` utilizável.
 */
export function diasAteFimDoCiclo(ciclo: any, agora: number = Date.now()): number | null {
  const bruto = String(ciclo?.data_fim ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const alvo = new Date(`${bruto}T00:00:00`).getTime();
  if (!Number.isFinite(alvo)) return null;
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje.getTime()) / 86_400_000);
}

/** Leitura do prazo do ciclo para o banner ("Próximo prazo em 3 dias."). */
export function descricaoPrazoCiclo(ciclo: any, agora: number = Date.now()): string {
  const dias = diasAteFimDoCiclo(ciclo, agora);
  if (dias === null) return 'Ciclo sem prazo definido.';
  if (dias < 0) return `Ciclo encerrado há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}.`;
  if (dias === 0) return 'Último dia do ciclo.';
  return `Próximo prazo em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
}

