/**
 * ============================================================================
 * PDI — derivações compartilhadas da aba.
 *
 * Ponto único de TUDO que a aba PDI calcula na tela: categoria de exibição,
 * situação do prazo, contadores das pílulas, critérios de ordenação e o
 * conjunto "precisa de atenção". A `PdiTab` só consome daqui — nenhum número é
 * recalculado dentro de componente.
 *
 * ── O QUE É LIDO (e o que NÃO existe) ───────────────────────────────────────
 * A fonte é a MESMA lista que `AvaliacaoPage` já carregava
 * (`getMockPdis()` ou `avaliacaoService.listarPDIs`), cuja consulta é
 * `pdi_plano_desenvolvimento`. As colunas REAIS dessa tabela são:
 *
 *   id · titulo · colaborador_id · competencia_foco · acao_desenvolvimento ·
 *   prazo · status · comentarios · created_at · updated_at · empresa_id
 *
 * NÃO existe progresso, quantidade de ações, total de ações concluídas nem
 * histórico de evolução. (A coluna `progresso` existe apenas na tabela LEGADA
 * `pdis`, que o serviço não consulta — ler de lá seria inventar dado.) Por isso
 * `PROGRESSO_PDI_DISPONIVEL` é `false` e o card mostra a região de progresso
 * como indisponível, em vez de converter status em percentual.
 *
 * ── REGRAS REAPROVEITADAS (nada de regra nova) ──────────────────────────────
 *  • atraso → `estaAtrasado` de `desempenhoComum` (prazo vencido E não
 *    concluído) — é a MESMA função que o `PerformanceDashboard` já usa nos
 *    PDIs (`pdisAtrasados`);
 *  • concluído → `normalizarStatus` de `desempenhoComum`;
 *  • data → `formatarData` de `desempenhoComum`.
 * Nenhum limiar novo (nada de "sem atualização há N dias") é criado aqui.
 *
 * ── VALORES DESTA ABA ───────────────────────────────────────────────────────
 * Tudo o que é estilo mora aqui e só usa token do tema (`--primary`, `--info`,
 * `--warning`, `--success`, `--destructive-vivid`): nenhuma cor nova, nenhum
 * utilitário global novo, nenhuma alteração no CSS do sistema.
 * ============================================================================
 */
import { estaAtrasado, formatarData, normalizarStatus } from './desempenhoComum';

/* ─── Categoria (as 4 pílulas da referência) ──────────────────────────────── */

/** Categorias da barra de filtros rápidos, na ordem da referência. */
export type CategoriaPdi = 'todos' | 'em_andamento' | 'pendente' | 'concluido';

export const ROTULO_CATEGORIA: Record<CategoriaPdi, string> = {
  todos: 'Todos',
  em_andamento: 'Em andamento',
  pendente: 'Pendentes',
  concluido: 'Concluídos',
};

/**
 * Status do banco → categoria de exibição. O conjunto de status é livre no
 * banco, então a leitura aceita sinônimos comuns e cai em `em_andamento` no que
 * não reconhece (mesmo comportamento tolerante de `normalizarStatus`); status
 * vazio conta como `pendente`, que é o estado inicial de um plano.
 */
export function categoriaPdi(status: unknown): CategoriaPdi {
  const s = normalizarStatus(status);
  if (!s) return 'pendente';
  if (s === 'concluido' || s === 'concluida' || s === 'concluído' || s === 'concluída') return 'concluido';
  if (s === 'pendente' || s === 'aguardando' || s === 'aguardando_inicio' || s === 'nao_iniciado') return 'pendente';
  return 'em_andamento';
}

/** Rótulo humano do status cru do registro (sem inventar taxonomia nova). */
export function rotuloStatus(status: unknown): string {
  const s = String(status ?? '').trim();
  if (!s) return 'Sem status';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Situação do PRAZO (conceito separado do status do plano) ────────────── */

/**
 * Situação do prazo — NUNCA substitui o status do PDI. É informação
 * COMPLEMENTAR, calculada só de `prazo` + `status`:
 *   • `concluido` — plano encerrado com sucesso (o prazo não importa mais);
 *   • `vencido`   — prazo passado e plano não concluído (regra de `estaAtrasado`);
 *   • `em_dia`    — prazo futuro (ou ausente) e plano em aberto.
 */
export type SituacaoPrazo = 'concluido' | 'vencido' | 'em_dia';

/** Tinta de cada situação do prazo — tokens do tema, nenhum tom novo. */
export const TINTA_PRAZO: Record<SituacaoPrazo, string> = {
  concluido: 'text-success',
  vencido: 'text-destructive-vivid',
  em_dia: 'text-foreground',
};

/** Rótulo curto da situação do prazo (o "indicador contextual" do card). */
export const ROTULO_PRAZO: Record<SituacaoPrazo, string> = {
  concluido: 'Concluído no prazo',
  vencido: 'Prazo vencido',
  em_dia: 'Dentro do prazo',
};

/** Bolinha semântica de cada situação (usada ao lado do rótulo). */
export const COR_PONTO_PRAZO: Record<SituacaoPrazo, string> = {
  concluido: 'bg-success',
  vencido: 'bg-destructive-vivid',
  em_dia: 'bg-success',
};

/** Converte `prazo` (DATE/ISO) no fim do dia LOCAL, em ms (`null` se inválido). */
export function fimDoDiaPrazo(prazo: unknown): number | null {
  if (!prazo) return null;
  const texto = String(prazo);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T23:59:59` : texto;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Dias inteiros até o prazo (negativo = em atraso). `null` sem prazo válido.
 *
 * Conta DIAS DE CALENDÁRIO: compara o começo do dia do prazo com o começo do
 * dia de hoje. Comparar a hora corrente com o fim do dia do prazo inflaria a
 * conta em 1 (um prazo para hoje apareceria como "1 dia") — e é justamente esse
 * número que o card mostra ao lado da data.
 */
export function diasAtePrazo(prazo: unknown, agora: number = Date.now()): number | null {
  const limite = fimDoDiaPrazo(prazo);
  if (limite === null) return null;
  const inicioDoDiaPrazo = limite - 86_399_999; // 23:59:59.999 → 00:00:00 do mesmo dia
  const inicioDoDiaAgora = new Date(agora).setHours(0, 0, 0, 0);
  const dias = Math.round((inicioDoDiaPrazo - inicioDoDiaAgora) / 86_400_000);
  // `Math.round(-0.0)` devolve `-0`; normaliza para 0 (senão vira "-0" na tela).
  return dias === 0 ? 0 : dias;
}

/** Leitura curta do prazo: "43 dias restantes", "12 dias em atraso", "Sem prazo". */
export function descricaoPrazo(dias: number | null, situacao: SituacaoPrazo): string {
  if (situacao === 'concluido') return 'Plano concluído';
  if (dias === null) return 'Sem prazo definido';
  if (dias < 0) {
    const n = Math.abs(dias);
    return `${n} ${n === 1 ? 'dia' : 'dias'} em atraso`;
  }
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `${dias} dias restantes`;
}

/* ─── Progresso: esta aba NÃO inventa percentual ──────────────────────────── */

/**
 * `false` porque a tabela consultada não tem progresso nem ações. É o
 * interruptor único lido por `PdiCard` para decidir entre a barra com número
 * real (quando o dado existir) e a apresentação "não acompanhado".
 */
export const PROGRESSO_PDI_DISPONIVEL: boolean = false;

/** Texto padrão da região de progresso quando o dado não existe. */
export const TEXTO_PROGRESSO_AUSENTE = 'Progresso não acompanhado';

/**
 * Explicação exibida abaixo da barra quando não há dado — deixa claro que a
 * ausência é de ACOMPANHAMENTO, não um 0% de execução.
 */
export const DETALHE_PROGRESSO_AUSENTE = 'O plano não registra ações nem percentual de execução.';

/* ─── Etiquetas (geometria única das badges do card) ──────────────────────── */

/**
 * Base das etiquetas do card (competência e status). Mantém a MESMA geometria
 * já aprovada em `metasComum.ETIQUETA_BASE` (altura 24px, raio 6px, texto de
 * 10px em caixa alta) para que a aba PDI não crie um terceiro padrão de badge
 * dentro do módulo.
 */
export const ETIQUETA_BASE =
  'inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide';

/** Etiqueta neutra: sem categoria/status reconhecido. */
export const CLASSE_NEUTRA = 'border-border/60 bg-muted/40 text-muted-foreground';

/** Pele da etiqueta de STATUS — uma família de cor por categoria, a MESMA dos chips. */
export const CLASSE_STATUS: Record<CategoriaPdi, string> = {
  todos: CLASSE_NEUTRA,
  em_andamento: 'border-info/25 bg-info/10 text-info',
  pendente: 'border-warning/25 bg-warning/10 text-warning',
  concluido: 'border-success/25 bg-success/10 text-success',
};

/* ─── Pílulas de filtro rápido (tokens oficiais) ──────────────────────────── */

export interface PeleChip {
  /** Fundo/borda/texto do chip INATIVO (colorido, intensidade menor). */
  chip: string;
  /** Fundo/borda/texto do chip ATIVO (mesma família, mais contraste). */
  chipAtivo: string;
  /** Badge numérica INATIVA. */
  badge: string;
  /** Badge numérica ATIVA. */
  badgeAtivo: string;
}

/**
 * Pele de cada pílula, na família de cor pedida pela referência e usando
 * SOMENTE tokens do tema:
 *   • Todos         → `--primary`  (verde-lima da marca);
 *   • Em andamento  → `--info`     (azul/ciano);
 *   • Pendentes     → `--warning`  (âmbar);
 *   • Concluídos    → `--success`  (verde de sucesso).
 * O chip NÃO selecionado continua colorido, com tint mais leve; o ativo sobe um
 * degrau de intensidade — o mesmo desenho de `metasComum.PELE_FILTRO`.
 */
export const PELE_CHIP: Record<CategoriaPdi, PeleChip> = {
  todos: {
    chip: 'border-primary/25 bg-primary/5 text-primary/80 hover:border-primary/45 hover:bg-primary/10 hover:text-primary',
    chipAtivo: 'border-primary/60 bg-primary/15 text-primary',
    badge: 'bg-primary/10 text-primary/80',
    badgeAtivo: 'bg-primary/20 text-primary',
  },
  em_andamento: {
    chip: 'border-info/25 bg-info/5 text-info/80 hover:border-info/45 hover:bg-info/10 hover:text-info',
    chipAtivo: 'border-info/60 bg-info/15 text-info',
    badge: 'bg-info/10 text-info/80',
    badgeAtivo: 'bg-info/20 text-info',
  },
  pendente: {
    chip: 'border-warning/25 bg-warning/5 text-warning/80 hover:border-warning/45 hover:bg-warning/10 hover:text-warning',
    chipAtivo: 'border-warning/60 bg-warning/15 text-warning',
    badge: 'bg-warning/10 text-warning/80',
    badgeAtivo: 'bg-warning/20 text-warning',
  },
  concluido: {
    chip: 'border-success/25 bg-success/5 text-success/80 hover:border-success/45 hover:bg-success/10 hover:text-success',
    chipAtivo: 'border-success/60 bg-success/15 text-success',
    badge: 'bg-success/10 text-success/80',
    badgeAtivo: 'bg-success/20 text-success',
  },
};

/** Pílulas da barra de filtros rápidos, na ordem da referência. */
export const CHIPS_PDI: { valor: CategoriaPdi; rotulo: string }[] = [
  { valor: 'todos', rotulo: ROTULO_CATEGORIA.todos },
  { valor: 'em_andamento', rotulo: ROTULO_CATEGORIA.em_andamento },
  { valor: 'pendente', rotulo: ROTULO_CATEGORIA.pendente },
  { valor: 'concluido', rotulo: ROTULO_CATEGORIA.concluido },
];

/** Contagem por pílula (chaves = `CategoriaPdi`). */
export type ContagemPdi = Record<CategoriaPdi, number>;

/* ─── Filtro de prazo ("Mais filtros") ────────────────────────────────────── */

/** Recorte por situação do prazo — calculado pela regra de atraso existente. */
export type FiltroPrazo = 'todos' | 'vencidos' | 'no_prazo';

export const FILTROS_PRAZO: { valor: FiltroPrazo; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos os prazos' },
  { valor: 'vencidos', rotulo: 'Prazo vencido' },
  { valor: 'no_prazo', rotulo: 'Dentro do prazo' },
];

/* ─── Ordenação ───────────────────────────────────────────────────────────── */

/** Critérios suportados pelos campos REAIS (`prazo` e `created_at`). */
export type CriterioOrdemPdi = 'prazo' | 'prazo_desc' | 'recentes' | 'antigos';

export const ORDEM_PDI_OPCOES: { valor: CriterioOrdemPdi; rotulo: string }[] = [
  { valor: 'prazo', rotulo: 'Menor prazo' },
  { valor: 'prazo_desc', rotulo: 'Maior prazo' },
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
];


/* ─── Item derivado ───────────────────────────────────────────────────────── */

/** Colaborador mínimo para resolver cargo/departamento/foto do PDI. */
export interface ColaboradorPdi {
  id?: string | null;
  nome_completo?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  foto_url?: string | null;
}

export interface PdiDerivado {
  /** Registro cru, preservado para as ações que dependem dele. */
  pdi: Record<string, unknown>;
  id: string;
  titulo: string;
  colaboradorId: string | null;
  colaborador: string;
  cargo: string | null;
  departamento: string | null;
  foto: string | null;
  competencia: string | null;
  /** Descrição da ação de desenvolvimento (campo real, sem "próxima ação"). */
  acao: string | null;
  comentarios: string | null;
  categoria: CategoriaPdi;
  statusRotulo: string;
  prazoTexto: string;
  /** Dias até o prazo (negativo = atraso). `null` sem prazo válido. */
  dias: number | null;
  situacao: SituacaoPrazo;
  prazoDescricao: string;
  /** Prazo vencido e plano não concluído — regra existente (`estaAtrasado`). */
  vencido: boolean;
  criadoEm: number;
}

/** Procura o colaborador do PDI na lista já carregada pela página. */
function acharColaborador(pdi: Record<string, unknown>, colaboradores: ColaboradorPdi[]): ColaboradorPdi | null {
  const id = String(pdi?.colaborador_id ?? '').trim();
  if (!id) return null;
  return colaboradores.find((c) => String(c?.id ?? '') === id) ?? null;
}

/**
 * Deriva UM PDI. `colaboradores` é opcional: sem ele, cargo/departamento/foto
 * ficam `null` e o card simplesmente não renderiza essas linhas (nunca um
 * placeholder inventado).
 */
export function derivarPdi(
  pdi: unknown,
  colaboradores: ColaboradorPdi[] = [],
  agora: number = Date.now()
): PdiDerivado {
  const p = (pdi ?? {}) as Record<string, unknown>;
  const relacao = (p.colaborador ?? {}) as ColaboradorPdi;
  const extra = acharColaborador(p, colaboradores);

  const nome = String(relacao.nome_completo ?? extra?.nome_completo ?? '').trim() || 'Sem colaborador';
  const categoria = categoriaPdi(p.status);
  const vencido = estaAtrasado(p, agora);
  const dias = diasAtePrazo(p.prazo, agora);
  const situacao: SituacaoPrazo = categoria === 'concluido' ? 'concluido' : vencido ? 'vencido' : 'em_dia';

  return {
    pdi: p,
    id: String(p.id ?? ''),
    titulo: String(p.titulo ?? '').trim() || 'PDI sem título',
    colaboradorId: String(p.colaborador_id ?? '').trim() || null,
    colaborador: nome,
    cargo: String(extra?.cargo ?? '').trim() || null,
    departamento: String(extra?.departamento ?? '').trim() || null,
    foto: String(extra?.foto_url ?? '').trim() || null,
    competencia: String(p.competencia_foco ?? '').trim() || null,
    acao: String(p.acao_desenvolvimento ?? '').trim() || null,
    comentarios: String(p.comentarios ?? '').trim() || null,
    categoria,
    statusRotulo: rotuloStatus(p.status),
    prazoTexto: p.prazo ? formatarData(p.prazo) : '—',
    dias,
    situacao,
    prazoDescricao: descricaoPrazo(dias, situacao),
    vencido,
    criadoEm: new Date(String(p.created_at ?? 0)).getTime() || 0,
  };
}

/* ─── Conjuntos derivados ─────────────────────────────────────────────────── */

/** Contagem por pílula — sempre as QUATRO chaves, mesmo com lista vazia. */
export function contarPorCategoria(itens: PdiDerivado[]): ContagemPdi {
  const base: ContagemPdi = { todos: itens.length, em_andamento: 0, pendente: 0, concluido: 0 };
  itens.forEach((i) => {
    if (i.categoria !== 'todos') base[i.categoria] += 1;
  });
  return base;
}

/** Competências realmente presentes nos PDIs, em ordem alfabética. */
export function competenciasDisponiveis(pdis: unknown[]): string[] {
  const nomes = pdis
    .map((p) => String((p as Record<string, unknown>)?.competencia_foco ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Colaboradores realmente presentes nos PDIs (para o filtro da barra). */
export function colaboradoresDosPdis(itens: PdiDerivado[]): { id: string; nome: string }[] {
  const mapa = new Map<string, string>();
  itens.forEach((i) => {
    if (i.colaboradorId) mapa.set(i.colaboradorId, i.colaborador);
  });
  return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * PDIs que precisam de atenção. Só dois critérios, ambos COMPROVÁVEIS:
 *   • prazo vencido e não concluído (regra de `estaAtrasado`);
 *   • plano com status `pendente`.
 */
export function pdisEmAtencao(itens: PdiDerivado[]): PdiDerivado[] {
  return itens.filter((i) => i.vencido || i.categoria === 'pendente');
}

/** Resumo do banner: quantos vencidos e quantos pendentes (sem repetir). */
export function resumoAtencao(itens: PdiDerivado[]): { total: number; vencidos: number; pendentes: number } {
  const vencidos = itens.filter((i) => i.vencido).length;
  const pendentes = itens.filter((i) => !i.vencido && i.categoria === 'pendente').length;
  return { total: vencidos + pendentes, vencidos, pendentes };
}

/** Ordena pela régua escolhida. Sem prazo vai para o fim nas réguas de prazo. */
export function ordenarPdis(itens: PdiDerivado[], criterio: CriterioOrdemPdi): PdiDerivado[] {
  const copia = [...itens];
  switch (criterio) {
    case 'prazo':
      return copia.sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity));
    case 'prazo_desc':
      return copia.sort((a, b) => (b.dias ?? -Infinity) - (a.dias ?? -Infinity));
    case 'recentes':
      return copia.sort((a, b) => b.criadoEm - a.criadoEm);
    case 'antigos':
    default:
      return copia.sort((a, b) => a.criadoEm - b.criadoEm);
  }
}

/**
 * Busca livre por TÍTULO, NOME DO COLABORADOR e COMPETÊNCIA — os três campos
 * que o placeholder promete. Também aceita a descrição da ação de
 * desenvolvimento, que é texto real do plano.
 */
export function correspondeBusca(item: PdiDerivado, termo: string): boolean {
  const t = termo.trim().toLowerCase();
  if (!t) return true;
  return [item.titulo, item.colaborador, item.competencia, item.acao, item.comentarios]
    .map((v) => String(v ?? '').toLowerCase())
    .some((v) => v.includes(t));
}

