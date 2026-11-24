/**
 * ============================================================================
 * HISTÓRICO DA AVALIAÇÃO — contrato ÚNICO de leitura e apresentação.
 *
 * A mesma lista alimenta:
 *   • a faixa compacta de cancelamento no card;
 *   • o modal "Histórico da avaliação";
 *   • o fallback local da vitrine.
 *
 * Nada aqui inventa evento: a origem real é `listar_historico_feedback`, que lê
 * `audit_log` + `feedbacks_360_aprovacoes_gestor`; a vitrine lê os eventos
 * locais já persistidos em `desempenhoDemoStore`/`aprovacaoLocal`.
 * ============================================================================
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { EstadoLocalDemo, HistoricoLocal } from './aprovacaoLocal';
import type { EstadoRegistrosDemo, EventoDemo } from './desempenhoDemoStore';

export type TipoEventoHistorico =
  'criado' | 'editado' | 'concluido' | 'encaminhado' | 'devolvido' | 'aprovado' | 'cancelado' | 'reaberto';

export interface EventoHistoricoFeedback {
  id: string;
  tipo: TipoEventoHistorico;
  ocorridoEm: string;
  responsavelId: string | null;
  responsavelEmail: string | null;
  responsavelNome: string | null;
  justificativa: string | null;
  statusAnterior: string | null;
  statusPosterior: string | null;
  detalhes: Record<string, unknown> | null;
}

export const ROTULO_EVENTO: Record<TipoEventoHistorico, string> = {
  criado: 'Feedback criado',
  editado: 'Feedback editado',
  concluido: 'Feedback concluído',
  encaminhado: 'Encaminhado ao gestor',
  devolvido: 'Devolvido pelo gestor',
  aprovado: 'Aprovado pelo gestor',
  cancelado: 'Feedback cancelado',
  reaberto: 'Feedback reaberto',
};

const TIPOS = new Set<TipoEventoHistorico>([
  'criado',
  'editado',
  'concluido',
  'encaminhado',
  'devolvido',
  'aprovado',
  'cancelado',
  'reaberto',
]);

function texto(valor: unknown): string | null {
  const t = String(valor ?? '').trim();
  return t === '' ? null : t;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

/** Linha crua da RPC → evento tipado. Evento de tipo desconhecido é descartado. */
export function normalizarEventoHistorico(bruto: unknown): EventoHistoricoFeedback | null {
  const r = (bruto ?? {}) as Record<string, unknown>;
  const tipo = String(r.tipo ?? '').trim() as TipoEventoHistorico;
  if (!TIPOS.has(tipo)) return null;
  const em = texto(r.ocorrido_em) ?? texto(r.ocorridoEm) ?? texto(r.em);
  return {
    id: String(r.id ?? `${tipo}:${em ?? ''}`),
    tipo,
    ocorridoEm: em ?? '',
    responsavelId: texto(r.responsavel_id) ?? texto(r.responsavelId),
    responsavelEmail: texto(r.responsavel_email) ?? texto(r.responsavelEmail) ?? texto(r.por),
    responsavelNome: texto(r.responsavel_nome) ?? texto(r.responsavelNome),
    justificativa: texto(r.justificativa),
    statusAnterior: texto(r.status_anterior) ?? texto(r.statusAnterior),
    statusPosterior: texto(r.status_posterior) ?? texto(r.statusPosterior),
    detalhes: objeto(r.detalhes) ?? objeto(r.dados),
  };
}

/** Normaliza, remove desconhecidos e ordena em ordem cronológica (mais antigo → mais novo). */
export function normalizarHistorico(bruto: unknown): EventoHistoricoFeedback[] {
  const lista = Array.isArray(bruto) ? bruto : [];
  return lista
    .map(normalizarEventoHistorico)
    .filter((e): e is EventoHistoricoFeedback => e !== null)
    .sort((a, b) => {
      const da = new Date(a.ocorridoEm).getTime();
      const db = new Date(b.ocorridoEm).getTime();
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });
}

export interface ResumoCancelamento {
  motivo: string | null;
  responsavel: string | null;
  ocorridoEm: string | null;
  evento: EventoHistoricoFeedback | null;
}

/**
 * Último cancelamento registrado. Se não existir evento (registro antigo),
 * devolve o resumo com campos nulos — nunca inventa motivo/responsável/data.
 */
export function resumoCancelamento(eventos: EventoHistoricoFeedback[]): ResumoCancelamento {
  const cancelamentos = eventos
    .filter((e) => e.tipo === 'cancelado')
    .sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime());
  const evento = cancelamentos[0] ?? null;
  return {
    motivo: evento?.justificativa ?? null,
    responsavel: evento?.responsavelNome ?? evento?.responsavelEmail ?? null,
    ocorridoEm: evento?.ocorridoEm ?? null,
    evento,
  };
}

/** Data/hora local legível; valor inválido/ausente aparece como "Não registrado". */
export function formatarDataHoraHistorico(valor: string | null | undefined): string {
  if (!valor) return 'Não registrado';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não registrado';
  return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Rótulo legível do status histórico (inclui estados internos de aprovação). */
export function rotuloStatusHistorico(valor: string | null | undefined): string {
  const chave = String(valor ?? '')
    .trim()
    .toLowerCase();
  const mapa: Record<string, string> = {
    pendente: 'Pendente',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    aguardando_gestor: 'Aguardando gestor',
    aprovada_gestor: 'Aprovado pelo gestor',
    devolvida: 'Devolvido para correção',
    sem_gestor: 'Sem gestor atribuído',
    em_preparacao: 'Em preparação',
  };
  return mapa[chave] ?? (chave ? chave.replaceAll('_', ' ') : 'Não registrado');
}

function dadosDoPatch(evento: EventoDemo): Record<string, unknown> {
  return objeto(evento.dados) ?? {};
}

/**
 * Histórico da VITRINE: mescla os eventos do armazenamento de registros
 * (criação/edição/status) com a trilha local de aprovação (envio/aprovação/
 * devolução). É separado do Supabase por desenho.
 */
export function eventosDemoDoFeedback(
  feedback: Record<string, unknown>,
  estado: EstadoRegistrosDemo,
  estadoAprovacao: Pick<EstadoLocalDemo, 'historico'> = { historico: [] }
): EventoHistoricoFeedback[] {
  const feedbackId = String(feedback?.id ?? '').trim();
  const colaboradorId = String(feedback?.avaliado_id ?? '').trim();
  const cicloId = String(feedback?.ciclo_id ?? '').trim();
  if (!feedbackId) return [];

  const eventos: EventoHistoricoFeedback[] = [];
  // O status do registro é o estado FINAL; para a transição do evento, o
  // anterior precisa vir da sequência. Começar pelo final produzia
  // "Cancelado → Cancelado" no cartão de histórico.
  let statusAtual: string | null = null;

  const daLoja = estado.historico
    .filter((e) => e.entidade === 'feedbacks' && e.id === feedbackId)
    .slice()
    .sort((a, b) => new Date(a.em).getTime() - new Date(b.em).getTime());

  daLoja.forEach((e, indice) => {
    const dados = dadosDoPatch(e);
    const statusNovo = texto(dados.status);
    let tipo: TipoEventoHistorico | null = null;
    let statusAnterior: string | null = null;
    let statusPosterior: string | null = statusNovo;
    let justificativa: string | null = null;

    if (e.operacao === 'criar') {
      tipo = 'criado';
      statusAtual = statusNovo ?? 'pendente';
      statusPosterior = statusAtual;
    } else if (e.operacao === 'editar') {
      tipo = 'editado';
      statusAnterior = statusAtual;
      statusAtual = statusNovo ?? statusAtual;
      statusPosterior = statusAtual;
    } else if (e.operacao === 'status') {
      statusAnterior = statusAtual;
      const novo = String(statusNovo ?? '').toLowerCase();
      if (novo === 'cancelado') {
        tipo = 'cancelado';
        justificativa = texto(dados.motivo_cancelamento);
      } else if (novo === 'concluido') {
        tipo = 'concluido';
      } else if (novo === 'pendente' && ['concluido', 'cancelado'].includes(String(statusAtual ?? '').toLowerCase())) {
        tipo = 'reaberto';
        justificativa = texto(dados.justificativa_reabertura);
      }
      if (statusNovo) statusAtual = statusNovo;
      statusPosterior = statusAtual;
    }

    if (!tipo) return;
    eventos.push({
      id: `demo-feedback:${e.em}:${indice}`,
      tipo,
      ocorridoEm: e.em,
      responsavelId: null,
      responsavelEmail: e.por,
      responsavelNome: null,
      justificativa,
      statusAnterior,
      statusPosterior,
      detalhes: dados,
    });
  });

  const daAprovacao = (estadoAprovacao.historico as HistoricoLocal[])
    .filter((h) => h.colaboradorId === colaboradorId && h.cicloId === cicloId)
    .slice()
    .sort((a, b) => new Date(a.em).getTime() - new Date(b.em).getTime());

  daAprovacao.forEach((h, indice) => {
    let tipo: TipoEventoHistorico | null = null;
    let statusPosterior: string | null = null;
    if (h.operacao === 'enviar' || h.operacao === 'reenviar') {
      tipo = 'encaminhado';
      statusPosterior = 'aguardando_gestor';
    } else if (h.operacao === 'aprovar') {
      tipo = 'aprovado';
      statusPosterior = 'aprovada_gestor';
    } else if (h.operacao === 'devolver') {
      tipo = 'devolvido';
      statusPosterior = 'devolvida';
    }
    if (!tipo) return;
    eventos.push({
      id: `demo-aprovacao:${h.em}:${indice}`,
      tipo,
      ocorridoEm: h.em,
      responsavelId: null,
      responsavelEmail: h.por,
      responsavelNome: null,
      justificativa: texto(h.justificativa),
      statusAnterior: null,
      statusPosterior,
      detalhes: { versao_avaliacao: h.versaoAvaliacao },
    });
  });

  return eventos.sort((a, b) => {
    const da = new Date(a.ocorridoEm).getTime();
    const db = new Date(b.ocorridoEm).getTime();
    return da !== db ? da - db : a.id.localeCompare(b.id);
  });
}
