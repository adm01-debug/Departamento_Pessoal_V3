/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — AUDITORIA: DERIVAÇÕES PURAS PARA A TIMELINE.
 *
 * A tabela `premiacoes_auditoria` entrega entidade, ação, motivo, autor
 * (`usuario_id`) e snapshots `dados_anteriores`/`dados_novos`. O banco não tem
 * nome do autor nem colunas financeiras próprias: valores e objetos são
 * resolvidos SOMENTE quando existem nos snapshots ou nos pagamentos/campanhas
 * já carregados pela página.
 *
 * Nada aqui faz I/O, cria evento ou inventa valor: campos ausentes continuam
 * ausentes e a interface mostra o estado neutro.
 * ============================================================================
 */
import { formatCurrency, formatDate, formatDateLong, parseDateSafe } from '@/utils/format';
import type { AuditoriaHub, CampanhaHub, PagamentoHub } from './premiacoesComum';

export type CategoriaAuditoriaId =
  | 'todas'
  | 'campanhas'
  | 'pagamentos'
  | 'regras'
  | 'conciliacao'
  | 'integracoes'
  | 'aprovacoes';

export interface CategoriaAuditoria {
  id: CategoriaAuditoriaId;
  rotulo: string;
}

/** Ordem visual das pills; só as categorias com eventos entram na tela. */
export const CATEGORIAS_AUDITORIA: readonly CategoriaAuditoria[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'campanhas', rotulo: 'Campanhas' },
  { id: 'pagamentos', rotulo: 'Pagamentos' },
  { id: 'regras', rotulo: 'Regras' },
  { id: 'conciliacao', rotulo: 'Conciliação' },
  { id: 'integracoes', rotulo: 'Integrações' },
  { id: 'aprovacoes', rotulo: 'Aprovações' },
] as const;

const ROTULO_CATEGORIA: Record<CategoriaAuditoriaId, string> = Object.fromEntries(
  CATEGORIAS_AUDITORIA.map((c) => [c.id, c.rotulo])
) as Record<CategoriaAuditoriaId, string>;

export type TomAuditoria = 'success' | 'warning' | 'destructive' | 'info' | 'primary' | 'muted';

export interface IntervaloAuditoria {
  inicio: Date | null;
  fim: Date | null;
}

export type PeriodoAuditoria = 'todos' | 'hoje' | '7d' | '30d' | '90d' | 'ano';

export const PERIODOS_AUDITORIA: readonly { id: PeriodoAuditoria; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos os períodos' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7d', rotulo: 'Últimos 7 dias' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: '90d', rotulo: 'Últimos 90 dias' },
  { id: 'ano', rotulo: 'Este ano' },
] as const;

export type OrdemAuditoria = 'recentes' | 'antigos';

export interface FiltrosAuditoria {
  busca: string;
  categoria: CategoriaAuditoriaId;
  tipo: string;
  entidade: string;
  usuario: string;
  periodo: PeriodoAuditoria;
  ordem: OrdemAuditoria;
}

export const FILTROS_AUDITORIA_INICIAIS: FiltrosAuditoria = {
  busca: '',
  categoria: 'todas',
  tipo: 'todos',
  entidade: 'todas',
  usuario: 'todos',
  periodo: 'todos',
  ordem: 'recentes',
};

/** O destaque de "Limpar filtros" é derivado do estado real, nunca à parte. */
export function temFiltrosAtivos(filtros: FiltrosAuditoria): boolean {
  const padrao = FILTROS_AUDITORIA_INICIAIS;
  return (
    filtros.busca.trim() !== padrao.busca ||
    filtros.categoria !== padrao.categoria ||
    filtros.tipo !== padrao.tipo ||
    filtros.entidade !== padrao.entidade ||
    filtros.usuario !== padrao.usuario ||
    filtros.periodo !== padrao.periodo ||
    filtros.ordem !== padrao.ordem
  );
}

export interface ResponsavelAuditoria {
  nome: string | null;
  detalhe: string | null;
  iniciais: string | null;
  automatico: boolean;
}

export interface EntidadeAuditoria {
  rotulo: string;
  nome: string | null;
  detalhe: string | null;
}

export interface EventoAuditoria {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  categoria: CategoriaAuditoriaId;
  categoriaRotulo: string;
  titulo: string;
  descricao: string;
  data: Date | null;
  dataIso: string | null;
  hora: string;
  tom: TomAuditoria;
  valor: number | null;
  valorAnterior: number | null;
  valorPosterior: number | null;
  valorLegenda: string | null;
  entidade: EntidadeAuditoria;
  responsavel: ResponsavelAuditoria;
  usuarioId: string | null;
  justificativa: string | null;
  status: string | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
}

export interface GrupoAuditoria {
  chave: string;
  rotulo: string;
  eventos: EventoAuditoria[];
}

const normalizar = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase();

const texto = (valor: unknown) => String(valor ?? '').trim();

/** A trilha real pode usar as operações do trigger (`INSERT/UPDATE/DELETE`). */
function acaoCanonica(valor: unknown): string {
  const acao = normalizar(valor);
  if (acao === 'insert' || acao === 'inserted') return 'criacao';
  if (acao === 'update' || acao === 'updated') return 'alteracao';
  if (acao === 'delete' || acao === 'deleted') return 'exclusao';
  return acao;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function numero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor !== 'string' || !valor.trim()) return null;
  const limpo = valor.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const CAMPOS_VALOR = [
  'valor_aprovado',
  'valor_calculado',
  'valor_folha_real',
  'valor',
  'orcamento_estimado',
  'orcamento',
  'valor_fixo',
] as const;

function primeiroValor(...fontes: unknown[]): number | null {
  for (const fonte of fontes) {
    const obj = objeto(fonte);
    if (!obj) continue;
    for (const campo of CAMPOS_VALOR) {
      const n = numero(obj[campo]);
      if (n !== null) return n;
    }
  }
  return null;
}

/** Valor monetário citado no texto real do evento (fallback sem inventar). */
function valorCitado(motivo: string): number | null {
  const achado = motivo.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
  return achado ? numero(achado[1]) : null;
}

function idCurto(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function iniciais(nome: string | null): string | null {
  if (!nome) return null;
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return null;
  return `${partes[0][0] ?? ''}${partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : ''}`.toUpperCase();
}

export function inferirCategoriaAuditoria({
  entidadeTipo,
  acao,
  motivo,
  divergente = false,
}: {
  entidadeTipo: string;
  acao: string;
  motivo: string;
  divergente?: boolean;
}): CategoriaAuditoriaId {
  const entidade = normalizar(entidadeTipo);
  const acaoNormalizada = normalizar(acao);
  const motivoNormalizado = normalizar(motivo);

  if (divergente || entidade.includes('concili') || motivoNormalizado.includes('divergencia')) return 'conciliacao';
  if (acaoNormalizada.includes('aprov') || entidade.includes('aprov')) return 'aprovacoes';
  if (entidade.includes('campanha')) return 'campanhas';
  if (entidade.includes('pagamento')) return 'pagamentos';
  if (entidade.includes('regra')) return 'regras';
  if (entidade.includes('integr')) return 'integracoes';
  return 'pagamentos';
}

const TOM_CATEGORIA: Record<CategoriaAuditoriaId, TomAuditoria> = {
  todas: 'muted',
  campanhas: 'primary',
  pagamentos: 'success',
  regras: 'info',
  conciliacao: 'warning',
  integracoes: 'info',
  aprovacoes: 'success',
};

function tituloEvento(entidadeTipo: string, acao: string, categoria: CategoriaAuditoriaId): string {
  const entidade = normalizar(entidadeTipo);
  const acaoNormalizada = normalizar(acao);
  if (categoria === 'conciliacao') return 'Divergência identificada na conciliação';
  if (entidade.includes('campanha')) {
    if (acaoNormalizada.includes('cri')) return 'Campanha criada';
    if (acaoNormalizada.includes('excl')) return 'Campanha excluída';
    return 'Campanha atualizada';
  }
  if (entidade.includes('regra')) {
    if (acaoNormalizada.includes('cri')) return 'Regra de premiação criada';
    if (acaoNormalizada.includes('excl')) return 'Regra de premiação excluída';
    return 'Regra de premiação atualizada';
  }
  if (entidade.includes('pagamento')) {
    if (acaoNormalizada.includes('aprov')) return 'Pagamento aprovado';
    if (acaoNormalizada.includes('rejeit')) return 'Pagamento rejeitado';
    if (acaoNormalizada.includes('cri')) return 'Pagamento criado';
    return 'Pagamento atualizado';
  }
  if (entidade.includes('integr')) return 'Evento de integração';
  return `${entidadeTipo} · ${acao}`;
}

function rotuloEntidade(entidadeTipo: string): string {
  const e = normalizar(entidadeTipo);
  if (e.includes('campanha')) return 'Campanha';
  if (e.includes('pagamento')) return 'Pagamento';
  if (e.includes('regra')) return 'Regra';
  if (e.includes('integr')) return 'Integração';
  return entidadeTipo || 'Registro';
}

function chaveData(data: Date | null): string {
  if (!data) return 'sem-data';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

function horaBrasil(data: Date | null): string {
  if (!data) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(data);
}

export function rotuloGrupoData(data: Date | null, agora = new Date()): string {
  if (!data) return 'Data não informada';
  const chave = chaveData(data);
  const hoje = chaveData(agora);
  const ontemData = new Date(agora);
  ontemData.setDate(ontemData.getDate() - 1);
  if (chave === hoje) return `Hoje · ${formatDateLong(data)}`;
  if (chave === chaveData(ontemData)) return `Ontem · ${formatDateLong(data)}`;
  return formatDateLong(data);
}

export function intervaloPeriodo(
  eventos: EventoAuditoria[],
  periodo: PeriodoAuditoria,
  agora = new Date()
): IntervaloAuditoria {
  if (periodo === 'todos') {
    const datas = eventos
      .map((e) => e.data)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    return { inicio: datas[0] ?? null, fim: datas[datas.length - 1] ?? null };
  }
  const fim = new Date(agora);
  const inicio = new Date(agora);
  if (periodo === 'hoje') {
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === '7d') {
    inicio.setDate(inicio.getDate() - 7);
  } else if (periodo === '30d') {
    inicio.setDate(inicio.getDate() - 30);
  } else if (periodo === '90d') {
    inicio.setDate(inicio.getDate() - 90);
  } else {
    inicio.setMonth(0, 1);
    inicio.setHours(0, 0, 0, 0);
  }
  return { inicio, fim };
}

export function rotuloIntervalo(intervalo: IntervaloAuditoria): string {
  if (!intervalo.inicio && !intervalo.fim) return 'Sem período';
  return `${intervalo.inicio ? formatDate(intervalo.inicio) : '—'} → ${intervalo.fim ? formatDate(intervalo.fim) : '—'}`;
}

function usuarioDoHistorico(pagamento: PagamentoHub | undefined): string | null {
  const historico = pagamento?.historico_mudancas;
  if (!Array.isArray(historico) || historico.length === 0) return null;
  const ultimo = historico[historico.length - 1] as { user?: unknown };
  const nome = texto(ultimo?.user);
  return nome && nome !== 'current_user' ? nome : null;
}

function resolverResponsavel(
  usuarioId: string | null,
  pagamento: PagamentoHub | undefined,
  usuarioAtual: { id?: string | null; nome?: string | null; email?: string | null } | undefined
): ResponsavelAuditoria {
  if (usuarioId) {
    const eu = texto(usuarioAtual?.id) === usuarioId;
    const nome = eu ? texto(usuarioAtual?.nome) || texto(usuarioAtual?.email) : `Usuário ${idCurto(usuarioId)}`;
    return {
      nome: nome || null,
      detalhe: 'Responsável',
      iniciais: iniciais(nome || null),
      automatico: false,
    };
  }
  const nome = usuarioDoHistorico(pagamento);
  if (nome) {
    return {
      nome,
      detalhe: 'Responsável',
      iniciais: iniciais(nome),
      automatico: false,
    };
  }
  return { nome: null, detalhe: 'Não informado', iniciais: null, automatico: false };
}

export interface ContextoAuditoria {
  usuarioAtual?: { id?: string | null; nome?: string | null; email?: string | null };
  agora?: Date;
}

export function normalizarEventosAuditoria(
  auditoria: AuditoriaHub[],
  pagamentos: PagamentoHub[],
  campanhas: CampanhaHub[],
  contexto: ContextoAuditoria = {}
): EventoAuditoria[] {
  const pagamentoPorId = new Map(pagamentos.map((p) => [String(p.id), p]));
  const campanhaPorId = new Map(campanhas.map((c) => [String(c.id), c]));

  return auditoria.map((registro) => {
    const entidadeTipo = texto(registro.entidade_tipo).toLowerCase();
    const entidadeId = texto(registro.entidade_id);
    const acao = acaoCanonica(registro.acao);
    const motivo = texto(registro.motivo);
    const dadosAnteriores = objeto(registro.dados_anteriores);
    const dadosNovos = objeto(registro.dados_novos);
    const pagamento = entidadeTipo.includes('pagamento') ? pagamentoPorId.get(entidadeId) : undefined;
    const campanha = entidadeTipo.includes('campanha')
      ? campanhaPorId.get(entidadeId)
      : pagamento
        ? campanhaPorId.get(String(pagamento.campanha_id))
        : undefined;
    const divergente =
      pagamento?.status_conciliacao === 'divergente' || normalizar(motivo).includes('divergencia');
    const categoria = inferirCategoriaAuditoria({ entidadeTipo, acao, motivo, divergente });
    const data = parseDateSafe(registro.created_at);
    const valorAnterior = primeiroValor(dadosAnteriores);
    const valorPosterior = primeiroValor(dadosNovos);
    const valorContexto = pagamento
      ? primeiroValor(pagamento)
      : campanha
        ? primeiroValor(campanha)
        : null;
    const valor = valorPosterior
      ?? valorAnterior
      ?? (categoria === 'conciliacao' ? valorCitado(motivo) : null)
      ?? valorContexto
      ?? valorCitado(motivo);
    const usuarioId = texto(registro.usuario_id) || null;
    const responsavel = resolverResponsavel(usuarioId, pagamento, contexto.usuarioAtual);
    const valorLegenda =
      valorAnterior !== null && valorPosterior !== null && valorAnterior !== valorPosterior
        ? 'Valor anterior → atual'
        : categoria === 'conciliacao'
          ? 'Diferença identificada'
          : categoria === 'campanhas'
            ? 'Orçamento da campanha'
            : categoria === 'regras'
              ? 'Valor da regra'
              : categoria === 'pagamentos' || categoria === 'aprovacoes'
                ? 'Valor do pagamento'
                : valorCitado(motivo) === valor && valorPosterior === null
                  ? 'Valor citado no evento'
                  : 'Valor identificado';

    const entidadeNome = pagamento
      ? texto(pagamento.colaborador?.nome_completo) || `Pagamento ${idCurto(entidadeId)}`
      : campanha
        ? texto(campanha.nome) || `Campanha ${idCurto(entidadeId)}`
        : entidadeTipo.includes('regra')
          ? `Regra ${idCurto(entidadeId)}`
          : entidadeTipo.includes('integr')
            ? `Integração ${idCurto(entidadeId)}`
            : idCurto(entidadeId);

    const entidadeDetalhe = pagamento
      ? texto(pagamento.campanha?.nome) || `Pagamento ${idCurto(entidadeId)}`
      : `ID ${idCurto(entidadeId)}`;

    return {
      id: texto(registro.id),
      entidadeTipo,
      entidadeId,
      acao,
      categoria,
      categoriaRotulo: ROTULO_CATEGORIA[categoria],
      titulo: tituloEvento(entidadeTipo, acao, categoria),
      descricao: motivo || 'Sem descrição registrada.',
      data,
      dataIso: texto(registro.created_at) || null,
      hora: horaBrasil(data),
      tom: categoria === 'conciliacao' ? 'destructive' : TOM_CATEGORIA[categoria],
      valor,
      valorAnterior,
      valorPosterior,
      valorLegenda,
      entidade: {
        rotulo: rotuloEntidade(entidadeTipo),
        nome: entidadeNome || null,
        detalhe: entidadeDetalhe || null,
      },
      responsavel,
      usuarioId,
      justificativa: texto(dadosNovos?.justificativa) || motivo || null,
      status: texto(dadosNovos?.status) || texto(pagamento?.status) || null,
      dadosAnteriores,
      dadosNovos,
    } satisfies EventoAuditoria;
  });
}

export function ordenarEventosAuditoria(eventos: EventoAuditoria[], ordem: OrdemAuditoria): EventoAuditoria[] {
  const sinal = ordem === 'recentes' ? -1 : 1;
  return [...eventos].sort((a, b) => {
    const da = a.data?.getTime() ?? 0;
    const db = b.data?.getTime() ?? 0;
    return (da - db) * sinal || a.id.localeCompare(b.id);
  });
}

export function filtrarEventosAuditoria(
  eventos: EventoAuditoria[],
  filtros: FiltrosAuditoria,
  agora = new Date()
): EventoAuditoria[] {
  const busca = normalizar(filtros.busca);
  const { inicio } = intervaloPeriodo(eventos, filtros.periodo, agora);
  const filtrados = eventos.filter((evento) => {
    if (filtros.categoria !== 'todas' && evento.categoria !== filtros.categoria) return false;
    if (filtros.tipo !== 'todos' && evento.acao !== filtros.tipo) return false;
    if (filtros.entidade !== 'todas' && evento.entidadeTipo !== filtros.entidade) return false;
    if (filtros.usuario !== 'todos') {
      const chave = evento.responsavel.nome ? evento.responsavel.nome : 'sem_responsavel';
      if (chave !== filtros.usuario) return false;
    }
    if (filtros.periodo !== 'todos' && !evento.data) return false;
    if (inicio && evento.data && evento.data < inicio) return false;
    if (!busca) return true;
    return normalizar(
      [
        evento.titulo,
        evento.descricao,
        evento.entidade.rotulo,
        evento.entidade.nome,
        evento.entidade.detalhe,
        evento.responsavel.nome,
        evento.acao,
        evento.valor !== null ? formatCurrency(evento.valor) : '',
      ].join(' ')
    ).includes(busca);
  });
  return ordenarEventosAuditoria(filtrados, filtros.ordem);
}

export function agruparEventosAuditoria(eventos: EventoAuditoria[], agora = new Date()): GrupoAuditoria[] {
  const grupos = new Map<string, EventoAuditoria[]>();
  eventos.forEach((evento) => {
    const chave = chaveData(evento.data);
    grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
  });
  return [...grupos.entries()].map(([chave, lista]) => ({
    chave,
    rotulo: rotuloGrupoData(lista[0]?.data ?? null, agora),
    eventos: lista,
  }));
}

export function categoriasDisponiveis(eventos: EventoAuditoria[]): CategoriaAuditoria[] {
  const existentes = new Set(eventos.map((e) => e.categoria));
  return CATEGORIAS_AUDITORIA.filter((c) => c.id === 'todas' || existentes.has(c.id));
}

export function contarCategoria(eventos: EventoAuditoria[], categoria: CategoriaAuditoriaId): number {
  return categoria === 'todas' ? eventos.length : eventos.filter((e) => e.categoria === categoria).length;
}

export function tiposEventoDisponiveis(eventos: EventoAuditoria[]): { valor: string; rotulo: string }[] {
  return [...new Set(eventos.map((e) => e.acao))]
    .filter(Boolean)
    .sort()
    .map((valor) => ({ valor, rotulo: rotuloAcao(valor) }));
}

export function entidadesDisponiveis(eventos: EventoAuditoria[]): { valor: string; rotulo: string }[] {
  return [...new Set(eventos.map((e) => e.entidadeTipo))]
    .filter(Boolean)
    .sort()
    .map((valor) => ({ valor, rotulo: rotuloEntidade(valor) }));
}

export function usuariosDisponiveis(eventos: EventoAuditoria[]): { valor: string; rotulo: string }[] {
  const nomes = new Set(eventos.map((e) => e.responsavel.nome).filter((n): n is string => Boolean(n)));
  const opcoes = [...nomes].sort().map((nome) => ({ valor: nome, rotulo: nome }));
  if (eventos.some((e) => !e.responsavel.nome)) {
    opcoes.push({ valor: 'sem_responsavel', rotulo: 'Não informado' });
  }
  return opcoes;
}

export function rotuloAcao(acao: string): string {
  const mapa: Record<string, string> = {
    criacao: 'Criação',
    alteracao: 'Alteração',
    aprovacao: 'Aprovação',
    calculo: 'Cálculo',
    exclusao: 'Exclusão',
    conciliacao: 'Conciliação',
  };
  return mapa[normalizar(acao)] ?? acao;
}

export function janelaPaginacao(pagina: number, totalPaginas: number, limite = 5): (number | '…')[] {
  if (totalPaginas <= limite) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const itens: (number | '…')[] = [1];
  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(totalPaginas - 1, atual + 1);
  if (inicio > 2) itens.push('…');
  for (let i = inicio; i <= fim; i += 1) itens.push(i);
  if (fim < totalPaginas - 1) itens.push('…');
  itens.push(totalPaginas);
  return itens;
}
