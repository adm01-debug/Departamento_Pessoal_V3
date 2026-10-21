/**
 * ============================================================================
 * ORIGEM DE EXECUÇÃO POR REGISTRO — fonte única de serviço + mensagem.
 *
 * A página pode exibir mocks e registros reais ao mesmo tempo. A decisão abaixo
 * depende SOMENTE do registro:
 *   • `mock-*`/`demo-*` → serviço demonstrativo;
 *   • UUID real → `avaliacaoService`/RPC;
 *   • prévia DEV → serviço simulado da prévia;
 *   • sem ID/sem serviço demonstrativo → indisponível, sem fallback silencioso.
 *
 * Nunca usar `modoRealAtivo()`/flag global para escolher a persistência.
 * ============================================================================
 */
import { idDemonstrativo } from './escritaOperacional';

export type OrigemExecucao = 'real' | 'demo' | 'previa' | 'indisponivel';

export interface DestinoExecucao<T> {
  origem: OrigemExecucao;
  servico: T | null;
  /** Motivo quando `origem === 'indisponivel'`. */
  motivo: string | null;
}

export function resolverDestinoAcao<T>({
  feedbackId,
  emPrevia = false,
  previaServico,
  demoService,
  realService,
}: {
  feedbackId: unknown;
  emPrevia?: boolean;
  previaServico?: T | null;
  demoService?: T | null;
  realService: T;
}): DestinoExecucao<T> {
  const id = String(feedbackId ?? '').trim();
  if (!id) {
    return {
      origem: 'indisponivel',
      servico: null,
      motivo: 'Registro sem identificador — a operação não pode ser executada.',
    };
  }

  // Prévia de desenvolvimento: jamais é persistência real, mesmo com UUID.
  if (emPrevia && previaServico) {
    return { origem: 'previa', servico: previaServico, motivo: null };
  }

  if (idDemonstrativo(id)) {
    if (!demoService) {
      return {
        origem: 'indisponivel',
        servico: null,
        motivo: 'Registro demonstrativo sem serviço local disponível.',
      };
    }
    return { origem: 'demo', servico: demoService, motivo: null };
  }

  return { origem: 'real', servico: realService, motivo: null };
}

export type AcaoFinalizacao = 'concluir' | 'cancelar' | 'reabrir';

export const STATUS_FINALIZACAO: Record<AcaoFinalizacao, string> = {
  concluir: 'concluido',
  cancelar: 'cancelado',
  reabrir: 'pendente',
};

export interface RespostaFinalizacao {
  ok?: boolean;
  status_novo?: string;
  /** O serviço demonstrativo devolve `status`; a RPC devolve `status_novo`. */
  status?: string;
  auditoria_id?: string;
  idempotente?: boolean;
}

/**
 * Só há sucesso quando o serviço/banco confirmou `ok:true` E o status novo é
 * exatamente o esperado para a ação. Uma resposta vazia/ambígua não vira toast
 * de sucesso.
 */
export function confirmarFinalizacao(
  resposta: RespostaFinalizacao | null | undefined,
  acao: AcaoFinalizacao,
  origem: OrigemExecucao
): RespostaFinalizacao & { status_novo: string } {
  if (!resposta || resposta.ok !== true) {
    throw new Error(
      origem === 'demo'
        ? 'O armazenamento demonstrativo não confirmou a operação.'
        : 'O banco não confirmou a operação. Nenhum sucesso foi presumido.'
    );
  }
  const status = String(resposta.status_novo ?? resposta.status ?? '').trim().toLowerCase();
  if (status !== STATUS_FINALIZACAO[acao]) {
    throw new Error(
      `A operação não foi confirmada: o status retornado (${status || 'vazio'}) não corresponde a ${STATUS_FINALIZACAO[acao]}.`
    );
  }
  return { ...resposta, status_novo: status };
}

export function mensagemFinalizacao(
  origem: OrigemExecucao,
  acao: AcaoFinalizacao,
  repetida: boolean,
  modo: 'sucesso' | 'falha'
): string {
  const base: Record<AcaoFinalizacao, string> = {
    concluir: repetida ? 'Avaliação já estava concluída.' : 'Avaliação concluída!',
    cancelar: repetida ? 'Cancelamento já registrado.' : 'Avaliação cancelada (registro preservado).',
    reabrir: repetida ? 'Reabertura já registrada.' : 'Avaliação reaberta — voltou para pendente.',
  };

  if (modo === 'falha') return base[acao];
  const semPontuacaoFinal = base[acao].replace(/[.!]$/, '');
  if (origem === 'demo') {
    return `Demonstração: ${semPontuacaoFinal} — salvo apenas no armazenamento local deste navegador; o Supabase não foi alterado.`;
  }
  if (origem === 'previa') {
    return `Prévia: ${semPontuacaoFinal} — operação simulada, sem gravação no Supabase.`;
  }
  if (origem === 'indisponivel') {
    return 'Operação não executada: o registro não possui um identificador válido.';
  }
  return base[acao];
}
