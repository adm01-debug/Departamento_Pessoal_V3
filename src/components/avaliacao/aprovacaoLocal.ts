/**
 * ============================================================================
 * APROVAÇÃO DO GESTOR — PERSISTÊNCIA LOCAL DA DEMONSTRAÇÃO (vitrine).
 *
 * POR QUE EXISTE: os registros fictícios (`mock-*`) NUNCA vão ao banco (a
 * guarda de escrita recusa IDs fictícios). Para permitir TESTAR o fluxo
 * completo na vitrine — RH prepara → gestor aprova/devolve → RH valida o
 * Potencial → Nine-Box classifica — as decisões tomadas sobre registros
 * fictícios são gravadas AQUI, em armazenamento separado, chaveadas pelos IDs
 * de demonstração.
 *
 * ── REGRAS ─────────────────────────────────────────────────────────────────
 *  • NÃO altera os mocks: nenhuma fixture é mutada; o módulo só LÊ os ids e
 *    grava o RESULTADO da decisão em `localStorage` (chave própria).
 *  • NÃO substitui o fluxo real: em registro REAL a decisão continua sendo a
 *    RPC oficial (`decidir_aprovacao_gestor` / `validar_potencial_avaliacao`).
 *  • MESMAS REGRAS do servidor: a validação do Potencial só vale depois da
 *    aprovação do gestor NA MESMA VERSÃO, e uma nova decisão invalida a
 *    validação anterior.
 *  • PERSISTE entre recargas do mesmo perfil (localStorage).
 * ============================================================================
 */

import type { PontoNineBox } from './nineBoxComum';
import {
  estadoAprovacao,
  versaoConsolidadaDemo,
  type DecisaoAprovacaoLida,
  type EstadoAprovacao,
} from './aprovacaoGestor';

/** Chave ÚNICA do armazenamento da vitrine (nada mais do app a usa). */
export const CHAVE_ARMAZENAMENTO = 'dp-desempenho-aprovacoes-demo';

export type OperacaoDemo = 'aprovar' | 'devolver' | 'reenviar' | 'validar_potencial' | 'enviar';

/** Decisão do gestor (espelho da linha de `feedbacks_360_aprovacoes_gestor`). */
export interface DecisaoLocal {
  colaboradorId: string;
  cicloId: string;
  decisao: 'aprovado' | 'devolvido';
  justificativa: string | null;
  /** Versão canônica da avaliação no momento da decisão (invalida se mudar). */
  versaoAvaliacao: string;
  decididoEm: string;
  /** Quem operou a vitrine (e-mail do usuário), para o histórico. */
  decididoPor: string | null;
}

/** Validação do Potencial (espelho de `feedbacks_360_validacoes_potencial`). */
export interface ValidacaoLocal {
  colaboradorId: string;
  cicloId: string;
  versaoAvaliacao: string;
  validadoEm: string;
  validadoPor: string | null;
  observacao: string | null;
}

export interface HistoricoLocal {
  em: string;
  operacao: OperacaoDemo;
  colaboradorId: string;
  cicloId: string;
  versaoAvaliacao: string | null;
  justificativa: string | null;
  por: string | null;
}

/** Encaminhamento automático ao gestor (vitrine) — data mostrada em "Enviado em". */
export interface EncaminhamentoLocal {
  colaboradorId: string;
  cicloId: string;
  /** Versão consolidada no momento do encaminhamento (informativa). */
  versaoAvaliacao: string | null;
  encaminhadoEm: string;
  por: string | null;
  /** `true` = criado sozinho ao salvar a avaliação (sem clique do RH). */
  automatico: boolean;
}

export interface EstadoLocalDemo {
  versao: 1;
  /** `colaboradorId::cicloId` → decisão vigente do gestor. */
  decisoes: Record<string, DecisaoLocal>;
  /** `colaboradorId::cicloId` → validação vigente do RH (na versão aprovada). */
  validacoes: Record<string, ValidacaoLocal>;
  /** `colaboradorId::cicloId` → encaminhamento ao gestor (automático ao salvar). */
  encaminhamentos: Record<string, EncaminhamentoLocal>;
  /** Trilha append-only da vitrine (auditoria da demonstração). */
  historico: HistoricoLocal[];
}

/** Chave estável de uma avaliação da vitrine (colaborador × ciclo). */
export function chaveLocal(colaboradorId: unknown, cicloId: unknown): string {
  return `${String(colaboradorId ?? '').trim()}::${String(cicloId ?? '').trim()}`;
}

export function estadoLocalVazio(): EstadoLocalDemo {
  return { versao: 1, decisoes: {}, validacoes: {}, encaminhamentos: {}, historico: [] };
}

/** Lê o estado salvo; qualquer conteúdo inválido devolve o estado vazio. */
export function lerEstadoLocal(): EstadoLocalDemo {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return estadoLocalVazio();
    const lido = JSON.parse(bruto) as Partial<EstadoLocalDemo>;
    return {
      versao: 1,
      decisoes: lido?.decisoes && typeof lido.decisoes === 'object' ? lido.decisoes : {},
      validacoes: lido?.validacoes && typeof lido.validacoes === 'object' ? lido.validacoes : {},
      encaminhamentos: lido?.encaminhamentos && typeof lido.encaminhamentos === 'object' ? lido.encaminhamentos : {},
      historico: Array.isArray(lido?.historico) ? lido.historico : [],
    };
  } catch {
    return estadoLocalVazio();
  }
}

/** Grava o estado (best-effort: ambiente sem storage não derruba a tela). */
export function gravarEstadoLocal(estado: EstadoLocalDemo): EstadoLocalDemo {
  try {
    globalThis.localStorage?.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
  } catch {
    /* storage indisponível (modo restrito): a vitrine segue em memória */
  }
  return estado;
}

/** Limpa SOMENTE o armazenamento da vitrine (mocks permanecem intactos). */
export function limparEstadoLocal(): EstadoLocalDemo {
  try {
    globalThis.localStorage?.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    /* nada a fazer */
  }
  return estadoLocalVazio();
}

/** Registra um evento na trilha da demonstração (nunca apaga os anteriores). */
function registrar(estado: EstadoLocalDemo, evento: Omit<HistoricoLocal, 'em'>): EstadoLocalDemo {
  return { ...estado, historico: [...estado.historico, { em: new Date().toISOString(), ...evento }] };
}

/* ─── Operações da vitrine (mesma máquina de estados do servidor) ────────── */

/**
 * ENCAMINHAMENTO AUTOMÁTICO (vitrine): chamado ao SALVAR qualquer avaliação.
 *
 * Idempotente por (colaborador, ciclo): o primeiro salvamento grava a data do
 * encaminhamento; salvamentos seguintes NÃO duplicam nem reescrevem a data
 * original (a pendência é a MESMA, só atualiza a consolidação). `automatico`
 * registra que o RH não precisou clicar em nada.
 */
export function encaminharLocal({
  colaboradorId,
  cicloId,
  versaoAvaliacao = null,
  por = null,
  automatico = true,
  estado = lerEstadoLocal(),
}: {
  colaboradorId: string;
  cicloId: string;
  versaoAvaliacao?: string | null;
  por?: string | null;
  automatico?: boolean;
  estado?: EstadoLocalDemo;
}): EstadoLocalDemo {
  const chave = chaveLocal(colaboradorId, cicloId);
  if (!colaboradorId || !cicloId) return estado;
  const anterior = estado.encaminhamentos[chave];
  const registro: EncaminhamentoLocal = anterior
    ? { ...anterior, versaoAvaliacao: versaoAvaliacao ?? anterior.versaoAvaliacao, por: por ?? anterior.por }
    : {
        colaboradorId,
        cicloId,
        versaoAvaliacao,
        encaminhadoEm: new Date().toISOString(),
        por,
        automatico,
      };
  return gravarEstadoLocal(
    registrar(
      { ...estado, encaminhamentos: { ...estado.encaminhamentos, [chave]: registro } },
      {
        operacao: 'enviar',
        colaboradorId,
        cicloId,
        versaoAvaliacao,
        justificativa: null,
        por,
      }
    )
  );
}

/** RH/admin ENVIA a avaliação para aprovação (vitrine): registra na trilha. */
export function enviarLocal({
  colaboradorId,
  cicloId,
  versaoAvaliacao = null,
  por = null,
  estado = lerEstadoLocal(),
}: {
  colaboradorId: string;
  cicloId: string;
  versaoAvaliacao?: string | null;
  por?: string | null;
  estado?: EstadoLocalDemo;
}): EstadoLocalDemo {
  return gravarEstadoLocal(
    registrar(estado, {
      operacao: 'enviar',
      colaboradorId,
      cicloId,
      versaoAvaliacao,
      justificativa: null,
      por,
    })
  );
}

/** DECISÃO DO GESTOR na vitrine (aprovar/devolver). Devolução guarda a justificativa. */
export function decidirLocal({
  colaboradorId,
  cicloId,
  decisao,
  justificativa = null,
  versaoAvaliacao,
  por = null,
  estado = lerEstadoLocal(),
}: {
  colaboradorId: string;
  cicloId: string;
  decisao: 'aprovado' | 'devolvido';
  justificativa?: string | null;
  versaoAvaliacao: string;
  por?: string | null;
  estado?: EstadoLocalDemo;
}): EstadoLocalDemo {
  const chave = chaveLocal(colaboradorId, cicloId);
  const registroDecisao: DecisaoLocal = {
    colaboradorId,
    cicloId,
    decisao,
    justificativa: decisao === 'devolvido' ? (justificativa ?? null) : null,
    versaoAvaliacao,
    decididoEm: new Date().toISOString(),
    decididoPor: por,
  };

  // Nova decisão invalida a validação anterior do Potencial (mesma régua do
  // servidor: a validação vale para a versão aprovada vigente).
  const validacoes = { ...estado.validacoes };
  delete validacoes[chave];

  return gravarEstadoLocal(
    registrar(
      { ...estado, decisoes: { ...estado.decisoes, [chave]: registroDecisao }, validacoes },
      {
        operacao: decisao === 'aprovado' ? 'aprovar' : 'devolver',
        colaboradorId,
        cicloId,
        versaoAvaliacao,
        justificativa: registroDecisao.justificativa,
        por,
      }
    )
  );
}

/**
 * RH REENVIA depois da devolução: a decisão é retirada (volta a aguardar o
 * gestor) e a validação do Potencial também — como o servidor faz quando a
 * avaliação é corrigida.
 */
export function reenviarLocal({
  colaboradorId,
  cicloId,
  por = null,
  estado = lerEstadoLocal(),
}: {
  colaboradorId: string;
  cicloId: string;
  por?: string | null;
  estado?: EstadoLocalDemo;
}): EstadoLocalDemo {
  const chave = chaveLocal(colaboradorId, cicloId);
  const anterior = estado.decisoes[chave] ?? null;
  const decisoes = { ...estado.decisoes };
  delete decisoes[chave];
  const validacoes = { ...estado.validacoes };
  delete validacoes[chave];
  // O reenvio TAMBÉM atualiza a data do encaminhamento (é um envio novo).
  const encaminhamentoAnterior = estado.encaminhamentos[chave];
  const encaminhamentos = encaminhamentoAnterior
    ? {
        ...estado.encaminhamentos,
        [chave]: {
          ...encaminhamentoAnterior,
          encaminhadoEm: new Date().toISOString(),
          por: por ?? encaminhamentoAnterior.por,
        },
      }
    : estado.encaminhamentos;

  return gravarEstadoLocal(
    registrar(
      { ...estado, decisoes, validacoes, encaminhamentos },
      {
        operacao: 'reenviar',
        colaboradorId,
        cicloId,
        versaoAvaliacao: anterior?.versaoAvaliacao ?? null,
        justificativa: null,
        por,
      }
    )
  );
}

export interface ResultadoValidacaoLocal {
  ok: boolean;
  motivo: 'ok' | 'sem_aprovacao' | 'versao_divergente';
  descricao: string;
}

/**
 * RH VALIDA O POTENCIAL na vitrine — SOMENTE depois da aprovação do gestor e
 * NA MESMA VERSÃO (senão recusa, como o servidor).
 */
export function validarPotencialLocal({
  colaboradorId,
  cicloId,
  versaoAvaliacao,
  por = null,
  observacao = null,
  estado = lerEstadoLocal(),
}: {
  colaboradorId: string;
  cicloId: string;
  versaoAvaliacao: string;
  por?: string | null;
  observacao?: string | null;
  estado?: EstadoLocalDemo;
}): { estado: EstadoLocalDemo; resultado: ResultadoValidacaoLocal } {
  const chave = chaveLocal(colaboradorId, cicloId);
  const decisao = estado.decisoes[chave] ?? null;

  if (!decisao || decisao.decisao !== 'aprovado') {
    return {
      estado,
      resultado: {
        ok: false,
        motivo: 'sem_aprovacao',
        descricao: 'O Potencial só pode ser validado depois da aprovação do gestor para esta avaliação.',
      },
    };
  }
  if (decisao.versaoAvaliacao !== versaoAvaliacao) {
    return {
      estado,
      resultado: {
        ok: false,
        motivo: 'versao_divergente',
        descricao: 'A avaliação mudou depois da aprovação: a validação anterior não vale para esta versão.',
      },
    };
  }

  const validacao: ValidacaoLocal = {
    colaboradorId,
    cicloId,
    versaoAvaliacao,
    validadoEm: new Date().toISOString(),
    validadoPor: por,
    observacao,
  };

  const novo = registrar(
    { ...estado, validacoes: { ...estado.validacoes, [chave]: validacao } },
    {
      operacao: 'validar_potencial',
      colaboradorId,
      cicloId,
      versaoAvaliacao,
      justificativa: null,
      por,
    }
  );
  return { estado: gravarEstadoLocal(novo), resultado: { ok: true, motivo: 'ok', descricao: '' } };
}

/* ─── Adaptadores para as MESMAS derivações do modo real ─────────────────── */

/**
 * Decisão local no FORMATO DA LINHA do banco (`snake_case`) — o derivador
 * (`situacaoAprovacao`) lê exatamente esses campos, então a vitrine passa pelo
 * mesmo caminho do modo real.
 */
function decisaoComoLinha(d: DecisaoLocal): DecisaoAprovacaoLida & Record<string, unknown> {
  return {
    colaborador_id: d.colaboradorId,
    ciclo_id: d.cicloId,
    decisao: d.decisao,
    justificativa: d.justificativa,
    versao_avaliacao: d.versaoAvaliacao,
    decidido_em: d.decididoEm,
    decidido_por: d.decididoPor,
  };
}

/** Decisões da vitrine no formato de `feedbacks_360_aprovacoes_gestor`. */
export function aprovacoesLocais(estado: EstadoLocalDemo): Record<string, unknown>[] {
  return Object.values(estado.decisoes).map(decisaoComoLinha);
}

/** Validações da vitrine no formato de `feedbacks_360_validacoes_potencial`. */
export function validacoesLocais(estado: EstadoLocalDemo): Record<string, unknown>[] {
  return Object.values(estado.validacoes).map((v) => ({
    colaborador_id: v.colaboradorId,
    ciclo_id: v.cicloId,
    versao_avaliacao: v.versaoAvaliacao,
    validado_em: v.validadoEm,
    validado_por: v.validadoPor,
    observacao: v.observacao,
  }));
}

/**
 * Estado da aprovação de UM colaborador na vitrine — para o modal aplicar as
 * MESMAS decisões locais que a fila e o contador já usam.
 */
export function estadoLocalDe(
  estado: EstadoLocalDemo,
  {
    colaboradorId,
    cicloId,
    versaoGestor,
    responsavel = false,
  }: { colaboradorId: unknown; cicloId: unknown; versaoGestor: string | null; responsavel?: boolean }
): EstadoAprovacao {
  const chave = chaveLocal(colaboradorId, cicloId);
  const guardada = estado.decisoes[chave] ?? null;
  const decisao = guardada ? decisaoComoLinha(guardada) : null;
  const validacao = estado.validacoes[chave] ?? null;
  const validada = !!validacao && !!versaoGestor && validacao.versaoAvaliacao === versaoGestor;
  return estadoAprovacao({ versaoGestor, decisao, validada, responsavel });
}

/* ─── Nine-Box: o MESMO portão do motor oficial, aplicado à vitrine ──────── */

/**
 * Aplica as decisões da vitrine sobre os pontos do Nine-Box (demonstração).
 *
 * Regra (a mesma do motor oficial):
 *   • decisão VIGENTE + validação do Potencial na MESMA versão → quadrante;
 *   • decisão vigente sem validação → segue no Nine-Box, mas FORA do quadrante,
 *     marcada como `aguardandoValidacaoRh` (o banner/insights mostram quem é);
 *   • decisão de versão ANTIGA (a avaliação mudou) → aprovação invalidada:
 *     fora do quadrante, `aguardandoAprovacao`;
 *   • devolvida → fora do quadrante, `aguardandoAprovacao`;
 *   • SEM decisão local permanece intocado (a vitrine aprovada não muda).
 *
 * `feedbacks` é a MESMA lista da aba Feedbacks (sem os mocks exclusivos do
 * Nine-Box): é dela que sai a versão consolidada atual do grupo, a MESMA âncora
 * usada pela fila. Sem a lista, a checagem de versão é omitida (compatibilidade).
 */
export function aplicarAprovacaoLocal(
  pontos: PontoNineBox[],
  estado: EstadoLocalDemo,
  cicloId: string | null,
  feedbacks: unknown[] = []
): PontoNineBox[] {
  if (!cicloId) return pontos;

  const versaoDoGrupo = (colaboradorId: string): string | null => {
    if (feedbacks.length === 0) return null;
    const grupo = feedbacks.filter((bruto) => {
      const f = (bruto ?? {}) as Record<string, unknown>;
      return (
        String(f.avaliado_id ?? '').trim() === colaboradorId &&
        String(f.ciclo_id ?? '').trim() === cicloId &&
        String(f.status ?? '')
          .trim()
          .toLowerCase() !== 'cancelado'
      );
    });
    return grupo.length > 0 ? versaoConsolidadaDemo(grupo) : null;
  };

  return pontos.map((ponto) => {
    const chave = chaveLocal(ponto.colaboradorId, cicloId);
    const decisao = estado.decisoes[chave] ?? null;
    if (!decisao) return ponto;

    const semQuadrante = {
      quadrante: null,
      nomeQuadrante: null,
      pontuacao: null,
      pendencias: ponto.pendencias ?? ('sem_potencial' as const),
    };

    // A avaliação mudou depois da decisão ⇒ a aprovação anterior não vale.
    const versaoAtual = versaoDoGrupo(String(ponto.colaboradorId ?? ''));
    if (versaoAtual && decisao.versaoAvaliacao !== versaoAtual) {
      return {
        ...ponto,
        ...semQuadrante,
        aguardandoValidacaoRh: false,
        aguardandoAprovacao: true,
        motivoNaoClassificado:
          'Aprovação anterior invalidada: a avaliação mudou depois da decisão. Aguardando nova aprovação do gestor.',
      };
    }

    if (decisao.decisao === 'devolvido') {
      return {
        ...ponto,
        ...semQuadrante,
        aguardandoValidacaoRh: false,
        aguardandoAprovacao: true,
        motivoNaoClassificado: 'Avaliação devolvida para correção pelo gestor.',
      };
    }

    const validacao = estado.validacoes[chave] ?? null;
    const liberado = !!validacao && validacao.versaoAvaliacao === decisao.versaoAvaliacao;
    if (liberado) {
      return { ...ponto, aguardandoValidacaoRh: false, aguardandoAprovacao: false, motivoNaoClassificado: null };
    }

    return {
      ...ponto,
      ...semQuadrante,
      aguardandoValidacaoRh: true,
      aguardandoAprovacao: false,
      motivoNaoClassificado: 'Potencial aguardando validação do RH.',
    };
  });
}
