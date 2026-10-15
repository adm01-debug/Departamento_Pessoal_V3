/**
 * ============================================================================
 * AUDITORIA — DERIVAÇÕES DA ABA (Gestão de Desempenho → Auditoria).
 *
 * Tudo aqui é PURO e client-side sobre o que a consulta de `audit_log` já
 * devolve. Nenhuma consulta nova, nenhum dado inventado: título, subtítulo,
 * contadores, grupos de data e opções de filtro saem SEMPRE dos campos reais
 * (`tabela`, `acao`, `user_email`, `dados_anteriores`, `dados_novos`,
 * `campos_alterados`, `registro_id`, `created_at`).
 *
 * ── MÓDULOS (chips) ─────────────────────────────────────────────────────────
 * As cinco tabelas que a consulta da aba cobre viram os cinco módulos da
 * referência. `competencias_matriz` é a tabela de competências da MATRIZ de
 * avaliação — é ela que sustenta o chip "Nine-Box"; se não houver evento dela,
 * o chip mostra 0 (nada é inventado para preencher a tela).
 *
 * ── TÍTULOS LEGÍVEIS ────────────────────────────────────────────────────────
 * Cada combinação (tabela + ação) tem um título de RH, e o subtítulo vem do
 * payload real quando existe ("avaliado", "titulo", "colaborador"...). Quando o
 * payload não traz o campo esperado, o evento continua sendo exibido com o que
 * existe — nunca com texto fictício.
 * ============================================================================
 */
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ─── Tipos ───────────────────────────────────────────────────────────────── */

/** Linha de `audit_log` normalizada (campos opcionais tolerados). */
export interface EventoAuditoria {
  id: string;
  tabela: string;
  registroId: string | null;
  acao: string;
  usuarioEmail: string | null;
  criadoEm: Date;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  camposAlterados: string[];
  ipAddress: string | null;
  userAgent: string | null;
}

/* === TEMA VISUAL DOS CHIPS DE FILTRO ========================================
 * O tema (TemaChip / PALETAS_CHIP / TEMA_TODOS) foi EXTRAÍDO para
 * `chipFiltroComum.ts` quando Metas & OKRs, Feedbacks e PDI passaram a usar o
 * MESMO chip colorido (`ColoredFilterChip`). A Auditoria continua sendo a
 * REFERÊNCIA do desenho: reexportamos os mesmos objetos, então a aparência e o
 * funcionamento dos chips desta aba não mudam em nada.
 */
import { PALETAS_CHIP, TEMA_TODOS } from './chipFiltroComum';
import type { PaletaChip, TemaChip } from './chipFiltroComum';
export { PALETAS_CHIP, TEMA_TODOS };
export type { PaletaChip, TemaChip };

/** Módulo (chip) da trilha. `tabela: null` = módulo "Outros". */
export interface ModuloAuditoria {
  tabela: string | null;
  rotulo: string;
  /** Tinta do chip/marcador (classes do tema, discretas). */
  tinta: string;
  /** Cor sólida do marcador da timeline. */
  marcador: string;
  /** Tema do chip de filtro da categoria (barra de filtros). */
  tema: TemaChip;
}

/** Projeção legível de um evento, usada na linha e no diálogo de detalhes. */
export interface EventoDerivado {
  evento: EventoAuditoria;
  modulo: ModuloAuditoria;
  rotuloAcao: string;
  titulo: string;
  subtitulo: string | null;
  complemento: string | null;
  /** Nota real (0–5) quando o payload traz `nota_geral` ou `potencial`. */
  nota: number | null;
  responsavel: string;
  ehSistema: boolean;
}

/* ─── Registro de módulos ─────────────────────────────────────────────────── */

export const OUTROS: ModuloAuditoria = {
  tabela: null,
  rotulo: 'Outros',
  tinta: 'border-border/50 bg-muted/40 text-muted-foreground',
  marcador: 'bg-muted-foreground',
  // "Outros" não vira chip na barra de filtros; o tema só existe para satisfazer
  // o contrato do tipo, no mesmo tom neutro da tinta/marcador.
  tema: {
    ponto: 'bg-muted-foreground',
    texto: 'text-muted-foreground',
    borda: 'border-border/50',
    fundo: 'bg-muted/30',
    hoverFundo: 'hover:bg-muted/40',
    hoverBorda: 'hover:border-border/70',
    hoverTexto: 'hover:text-foreground',
    contador: 'bg-muted/50 text-muted-foreground',
    fundoAtivo: 'bg-muted/50',
    bordaAtiva: 'border-border',
    textoAtivo: 'text-foreground',
    contadorAtivo: 'bg-background/60 text-foreground',
    glow: '',
  },
};

export const MODULOS_AUDITORIA: readonly ModuloAuditoria[] = [
  {
    tabela: 'ciclos_avaliacao',
    rotulo: 'Ciclos',
    tinta: 'border-info/40 bg-info/10 text-info',
    marcador: 'bg-info',
    tema: PALETAS_CHIP.blue,
  },
  {
    tabela: 'metas_okrs',
    rotulo: 'Metas & OKRs',
    tinta: 'border-success/40 bg-success/10 text-success',
    marcador: 'bg-success',
    tema: PALETAS_CHIP.emerald,
  },
  {
    tabela: 'feedbacks_360',
    rotulo: 'Feedbacks',
    tinta: 'border-primary/40 bg-primary/10 text-primary',
    marcador: 'bg-primary',
    tema: PALETAS_CHIP.lime,
  },
  {
    tabela: 'pdis',
    rotulo: 'PDI',
    tinta: 'border-warning/40 bg-warning/10 text-warning',
    marcador: 'bg-warning',
    tema: PALETAS_CHIP.amber,
  },
  {
    tabela: 'competencias_matriz',
    rotulo: 'Nine-Box',
    tinta: 'border-destructive-vivid/40 bg-destructive-vivid/10 text-destructive-vivid',
    marcador: 'bg-destructive-vivid',
    tema: PALETAS_CHIP.red,
  },
];

export function moduloDaTabela(tabela: unknown): ModuloAuditoria {
  const t = String(tabela ?? '')
    .trim()
    .toLowerCase();
  return MODULOS_AUDITORIA.find((m) => m.tabela === t) ?? OUTROS;
}

/** Rótulo de RH para a operação técnica. */
export function rotuloDaAcao(acao: unknown): string {
  const a = String(acao ?? '')
    .trim()
    .toUpperCase();
  if (a === 'INSERT') return 'Criar';
  if (a === 'UPDATE') return 'Atualizar';
  if (a === 'DELETE') return 'Excluir';
  return a || 'Ação';
}

/* ─── Normalização ────────────────────────────────────────────────────────── */

function comoObjeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function comoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'object') return null;
  const t = String(valor).trim();
  return t === '' ? null : t;
}

/** Converte a linha crua de `audit_log` em evento tipado (sem inventar nada). */
export function normalizarEvento(bruto: unknown): EventoAuditoria {
  const r = (bruto ?? {}) as Record<string, unknown>;
  const data = new Date(String(r.created_at ?? ''));
  return {
    id: String(r.id ?? Math.random().toString(36).slice(2)),
    tabela: String(r.tabela ?? '').trim(),
    registroId: comoTexto(r.registro_id),
    acao: String(r.acao ?? '').trim(),
    usuarioEmail: comoTexto(r.user_email),
    criadoEm: Number.isNaN(data.getTime()) ? new Date(0) : data,
    dadosAnteriores: comoObjeto(r.dados_anteriores),
    dadosNovos: comoObjeto(r.dados_novos),
    camposAlterados: Array.isArray(r.campos_alterados) ? (r.campos_alterados as unknown[]).map(String) : [],
    ipAddress: comoTexto(r.ip_address),
    userAgent: comoTexto(r.user_agent),
  };
}

/* ─── Derivação legível do evento ─────────────────────────────────────────── */

/** "a → b" quando os dois lados existem; senão o valor disponível; senão null. */
function transicao(antes: unknown, depois: unknown): string | null {
  const a = comoTexto(antes);
  const b = comoTexto(depois);
  if (a && b) return a === b ? a : `${a} → ${b}`;
  return b ?? a;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Primeiro valor escalar legível do payload (fallback honesto, sem invenção). */
function primeiroEscalar(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const chaves = ['nome', 'titulo', 'colaborador', 'avaliado', 'status', 'competencia_foco', 'tipo', 'descricao'];
  for (const k of chaves) {
    const v = comoTexto(payload[k]);
    if (v) return v;
  }
  return null;
}

const TITULOS: Record<string, { criar: string; atualizar: string; excluir: string }> = {
  feedbacks_360: {
    criar: 'Feedback registrado',
    atualizar: 'Feedback atualizado',
    excluir: 'Feedback removido',
  },
  metas_okrs: { criar: 'Meta criada', atualizar: 'Meta atualizada', excluir: 'Meta removida' },
  pdis: { criar: 'PDI criado', atualizar: 'PDI atualizado', excluir: 'PDI removido' },
  ciclos_avaliacao: {
    criar: 'Ciclo de avaliação criado',
    atualizar: 'Ciclo de avaliação atualizado',
    excluir: 'Ciclo de avaliação removido',
  },
  competencias_matriz: {
    criar: 'Competência adicionada à matriz',
    atualizar: 'Competência atualizada na matriz',
    excluir: 'Competência removida da matriz',
  },
};

/**
 * Título/subtítulo/complemento/nota a partir do evento REAL.
 * Nada é inventado: campo ausente simplesmente não aparece na linha.
 */
export function derivarEvento(evento: EventoAuditoria): EventoDerivado {
  const modulo = moduloDaTabela(evento.tabela);
  const acao = String(evento.acao).toUpperCase();
  const novos = evento.dadosNovos;
  const antes = evento.dadosAnteriores;
  const titulos = TITULOS[evento.tabela];

  const titulo =
    titulos === undefined
      ? `${rotuloDaAcao(evento.acao)} em ${evento.tabela || 'registro'}`
      : acao === 'INSERT'
        ? titulos.criar
        : acao === 'DELETE'
          ? titulos.excluir
          : titulos.atualizar;

  let subtitulo: string | null;
  let complemento: string | null = null;
  let nota: number | null = null;

  if (evento.tabela === 'feedbacks_360') {
    const avaliado = comoTexto(novos?.avaliado) ?? comoTexto(antes?.avaliado);
    const tipo = comoTexto(novos?.tipo);
    subtitulo =
      avaliado && tipo
        ? `${avaliado} recebeu um feedback 360º do tipo ${tipo}`
        : (avaliado ?? (tipo ? `Feedback 360º do tipo ${tipo}` : 'Feedback 360º'));
    nota = numero(novos?.nota_geral) ?? numero(novos?.potencial);
    complemento =
      nota === null
        ? null
        : numero(novos?.nota_geral) !== null
          ? `Nota geral ${transicao(antes?.nota_geral, novos?.nota_geral)}`
          : `Potencial ${transicao(antes?.potencial, novos?.potencial)}`;
  } else if (evento.tabela === 'metas_okrs') {
    subtitulo = comoTexto(novos?.titulo) ?? comoTexto(antes?.titulo);
    const progresso = transicao(antes?.valor_atual, novos?.valor_atual);
    complemento = progresso ? `Progresso: ${progresso}` : null;
  } else if (evento.tabela === 'pdis') {
    const colaborador = comoTexto(novos?.colaborador) ?? comoTexto(antes?.colaborador);
    subtitulo = colaborador ? `Colaborador: ${colaborador}` : null;
    const foco = comoTexto(novos?.competencia_foco);
    const status = transicao(antes?.status, novos?.status);
    const prazo = transicao(antes?.prazo, novos?.prazo);
    complemento =
      [foco ? `Foco: ${foco}` : null, status ? `Status: ${status}` : null, prazo ? `Prazo: ${prazo}` : null]
        .filter(Boolean)
        .join(' · ') || null;
  } else if (evento.tabela === 'ciclos_avaliacao') {
    subtitulo = comoTexto(novos?.nome) ?? comoTexto(antes?.nome);
    complemento = transicao(antes?.status, novos?.status);
    if (complemento) complemento = `Status: ${complemento}`;
  } else if (evento.tabela === 'competencias_matriz') {
    subtitulo = comoTexto(novos?.nome) ?? comoTexto(antes?.nome);
    const categoria = comoTexto(novos?.categoria);
    complemento = categoria ? `Categoria: ${categoria}` : null;
  } else {
    subtitulo = primeiroEscalar(novos) ?? primeiroEscalar(antes);
  }

  return {
    evento,
    modulo,
    rotuloAcao: rotuloDaAcao(evento.acao),
    titulo,
    subtitulo,
    complemento,
    nota,
    responsavel: evento.usuarioEmail ?? 'Sistema',
    ehSistema: evento.usuarioEmail === null,
  };
}

/* ─── Agrupamento por dia ─────────────────────────────────────────────────── */

export interface GrupoAuditoria {
  /** Chave do dia local (yyyy-MM-dd). */
  chave: string;
  /** "Hoje" · "Ontem" · "07 de outubro de 2026". */
  rotulo: string;
  /** Data completa por extenso (linha secundária do cabeçalho). */
  detalhe: string;
  total: number;
  eventos: EventoDerivado[];
}

/**
 * Agrupa por DIA LOCAL do `created_at` (o mesmo fuso que o resto do sistema usa
 * via date-fns), do mais recente para o mais antigo. O rótulo relativo é
 * calculado contra `agora` — parâmetro explícito para o teste ser determinístico.
 */
export function agruparPorDia(eventos: EventoAuditoria[], agora: Date = new Date()): GrupoAuditoria[] {
  const ordenados = [...eventos].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  const mapa = new Map<string, GrupoAuditoria>();

  ordenados.forEach((evento) => {
    const dia = startOfDay(evento.criadoEm);
    const chave = format(dia, 'yyyy-MM-dd');
    const existente = mapa.get(chave);
    const derivado = derivarEvento(evento);
    if (existente) {
      existente.eventos.push(derivado);
      existente.total += 1;
      return;
    }
    mapa.set(chave, {
      chave,
      rotulo: isToday(dia)
        ? 'Hoje'
        : isYesterday(dia)
          ? 'Ontem'
          : format(dia, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      detalhe: format(dia, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      total: 1,
      eventos: [derivado],
    });
  });

  return Array.from(mapa.values());
}

/* ─── Filtros ─────────────────────────────────────────────────────────────── */

export type PeriodoAuditoria = 'todos' | 'hoje' | 'ontem' | '7d' | '30d';
export type OrigemAuditoria = 'todos' | 'usuario' | 'sistema';

export interface FiltrosAuditoria {
  busca: string;
  modulo: string;
  acao: string;
  responsavel: string;
  periodo: PeriodoAuditoria;
  origem: OrigemAuditoria;
  registro: string;
  campo: string;
}

export const FILTROS_VAZIOS: FiltrosAuditoria = {
  busca: '',
  modulo: '',
  acao: '',
  responsavel: '',
  periodo: 'todos',
  origem: 'todos',
  registro: '',
  campo: '',
};

export const PERIODOS_AUDITORIA: { valor: PeriodoAuditoria; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
];

/** Quantos filtros (fora da busca) estão ativos — usado no botão Limpar. */
export function filtrosAtivos(f: FiltrosAuditoria): number {
  return [
    f.modulo !== '',
    f.acao !== '',
    f.responsavel !== '',
    f.periodo !== 'todos',
    f.origem !== 'todos',
    f.registro.trim() !== '',
    f.campo.trim() !== '',
  ].filter(Boolean).length;
}

function passaPeriodo(evento: EventoAuditoria, periodo: PeriodoAuditoria, agora: Date): boolean {
  if (periodo === 'todos') return true;
  if (periodo === 'hoje') return isToday(evento.criadoEm);
  if (periodo === 'ontem') return isYesterday(evento.criadoEm);
  const limite = startOfDay(subDays(agora, periodo === '7d' ? 7 : 30));
  return evento.criadoEm.getTime() >= limite.getTime();
}

/** Texto consultável do evento: identificação, descrição e payload resumido. */
export function textoDoEvento(evento: EventoAuditoria): string {
  const d = derivarEvento(evento);
  return [
    evento.tabela,
    d.modulo.rotulo,
    evento.acao,
    d.rotuloAcao,
    d.titulo,
    d.subtitulo ?? '',
    d.complemento ?? '',
    evento.usuarioEmail ?? 'sistema',
    evento.registroId ?? '',
    JSON.stringify(evento.dadosNovos ?? ''),
    JSON.stringify(evento.dadosAnteriores ?? ''),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Aplica os filtros ativos. `ignorarModulo` existe para os CONTADORES dos chips:
 * eles mostram quantos eventos cada módulo tem mantendo os demais filtros — e
 * não podem ser zerados pelo próprio filtro de módulo.
 */
export function aplicarFiltros(
  eventos: EventoAuditoria[],
  filtros: FiltrosAuditoria,
  opcoes: { ignorarModulo?: boolean; agora?: Date } = {}
): EventoAuditoria[] {
  const agora = opcoes.agora ?? new Date();
  const busca = filtros.busca.trim().toLowerCase();
  const registro = filtros.registro.trim().toLowerCase();
  const campo = filtros.campo.trim().toLowerCase();

  return eventos.filter((evento) => {
    if (!opcoes.ignorarModulo && filtros.modulo !== '' && evento.tabela !== filtros.modulo) return false;
    if (filtros.acao !== '' && String(evento.acao).toUpperCase() !== filtros.acao) return false;
    if (filtros.responsavel !== '') {
      if (filtros.responsavel === 'sistema') {
        if (evento.usuarioEmail !== null) return false;
      } else if (evento.usuarioEmail !== filtros.responsavel) return false;
    }
    if (filtros.origem === 'sistema' && evento.usuarioEmail !== null) return false;
    if (filtros.origem === 'usuario' && evento.usuarioEmail === null) return false;
    if (registro && !(evento.registroId ?? '').toLowerCase().includes(registro)) return false;
    if (campo && !evento.camposAlterados.join(' ').toLowerCase().includes(campo)) return false;
    if (!passaPeriodo(evento, filtros.periodo, agora)) return false;
    if (busca && !textoDoEvento(evento).includes(busca)) return false;
    return true;
  });
}

/** Contagem por módulo (chip "Todos" + um por tabela). Respeita os filtros. */
export function contarPorModulo(
  eventos: EventoAuditoria[],
  filtros: FiltrosAuditoria,
  agora: Date = new Date()
): { todos: number; porTabela: Record<string, number> } {
  const base = aplicarFiltros(eventos, filtros, { ignorarModulo: true, agora });
  const porTabela: Record<string, number> = {};
  base.forEach((e) => {
    porTabela[e.tabela] = (porTabela[e.tabela] ?? 0) + 1;
  });
  return { todos: base.length, porTabela };
}

/** Ações realmente presentes nos registros (opções do select "Ação"). */
export function opcoesDeAcao(eventos: EventoAuditoria[]): string[] {
  return Array.from(new Set(eventos.map((e) => String(e.acao).toUpperCase()).filter(Boolean))).sort();
}

/** Responsáveis reais: e-mails distintos + "Sistema" quando há evento sem autor. */
export function opcoesDeResponsavel(eventos: EventoAuditoria[]): { valor: string; rotulo: string }[] {
  const emails = Array.from(new Set(eventos.map((e) => e.usuarioEmail).filter((v): v is string => Boolean(v)))).sort();
  const opcoes = emails.map((e) => ({ valor: e, rotulo: e }));
  if (eventos.some((e) => e.usuarioEmail === null)) opcoes.push({ valor: 'sistema', rotulo: 'Sistema / Automação' });
  return opcoes;
}

/** Projeção legível para o CSV exportado (mesmo conteúdo da timeline). */
export function linhasParaExport(eventos: EventoAuditoria[]): Record<string, string>[] {
  return eventos.map((evento) => {
    const d = derivarEvento(evento);
    return {
      Data: format(evento.criadoEm, 'dd/MM/yyyy', { locale: ptBR }),
      Hora: format(evento.criadoEm, 'HH:mm', { locale: ptBR }),
      Módulo: d.modulo.rotulo,
      Ação: d.rotuloAcao,
      Evento: d.titulo,
      Detalhe: d.subtitulo ?? '',
      Informação: d.complemento ?? '',
      Responsável: d.responsavel,
      Registro: evento.registroId ?? '',
    };
  });
}
