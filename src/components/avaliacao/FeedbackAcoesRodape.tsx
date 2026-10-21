/**
 * ============================================================================
 * RODAPÉ OPERACIONAL DO DETALHE DO FEEDBACK — controles de fluxo (MODO REAL).
 *
 * ONDE ENTRA: é o ÚLTIMO bloco do `DialogContent` de `FeedbackDetalheDialog`,
 * logo abaixo de "Ver só deste colaborador" (proposta aprovada em
 * `docs/ninebox-proposta-controles-feedback.md`). Nenhuma dimensão, cor,
 * tipografia ou estrutura do resto do modal mudou: reaproveita `Separator`,
 * `Dialog`, `DialogFooter`, `Button`, `Textarea`, `Label` e os ícones Lucide.
 *
 * ── QUANDO APARECE ──────────────────────────────────────────────────────────
 * Só com o MODO REAL ligado (`NINEBOX_MODO_REAL_ATIVO`). Em demonstração
 * devolve `null`: a experiência visual atual fica intacta e NENHUMA escrita é
 * disparada (a guarda de `escritaOperacional.ts` bloqueia em qualquer caminho).
 *
 * ── QUEM DECIDE O QUÊ ───────────────────────────────────────────────────────
 *  • front (aqui): não OFERECER controle que a máquina de estados/papel recusa
 *    (`statusFeedback.ts` + `acoesFeedback.ts`) e validar o texto obrigatório
 *    antes de enviar;
 *  • servidor (RPC `finalizar_feedback` / `validar_potencial_avaliacao`):
 *    autorização real, transição, vínculo com a versão canônica e auditoria na
 *    MESMA transação. Sucesso só é anunciado DEPOIS da resposta.
 * ============================================================================
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { avaliacaoService } from '@/services/avaliacaoService';

import { idDemonstrativo } from './escritaOperacional';
import { confirmarFinalizacao, mensagemFinalizacao, resolverDestinoAcao } from './execucaoFeedback';
import { notaNaEscala } from './nineBoxConsolidacao';
import { criarChaveIdempotente, type ChaveIdempotente } from './criacaoFeedback';
import {
  MIN_CARACTERES_JUSTIFICATIVA,
  MIN_CARACTERES_MOTIVO,
  normalizarStatus,
  validarCancelamento,
  validarConclusao,
  validarReabertura,
} from './statusFeedback';
import {
  ROTULO_SITUACAO_POTENCIAL,
  acoesDisponiveis,
  ehGestorResponsavel,
  perfisOperadorEfetivos,
  podeConcluirFeedback,
  podeValidarPotencial,
  situacaoPotencial,
  type AcaoDisponivel,
  type PapelApp,
  type SituacaoPotencial,
  type ValidacaoPotencialLida,
} from './acoesFeedback';
import { tipoFeedback, type FeedbackDerivado } from './feedbacksComum';
import { statusCanonico } from './feedbackCanonico';
import { capacidadesAvaliacao } from './papeisAvaliacao';
import { CHAVE_ARMAZENAMENTO as CHAVE_QUERY_DEMO, decidirLocal } from './aprovacaoLocal';
import {
  MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO,
  MOTIVO_FALTA_AVALIACAO_GESTOR,
  MOTIVO_GESTOR_NAO_ATRIBUIDO,
  validarJustificativaDevolucao,
  type EstadoAprovacao,
} from './aprovacaoGestor';

/** Ações de status oferecidas por este rodapé. */
type AcaoStatusRodape = 'concluir' | 'cancelar' | 'reabrir';

/** Mensagem REAL do erro (RPC/validação/rede) para o aviso ao usuário. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error && erro.message) return erro.message;
  const mensagem = (erro as { message?: unknown } | null)?.message;
  return mensagem ? String(mensagem) : 'erro inesperado.';
}

/** Pele discreta do indicador de Potencial (mesma família dos badges da aba). */
const TOM_SITUACAO: Record<SituacaoPotencial, string> = {
  sem_validacao: 'border-border/50 bg-muted/40 text-muted-foreground',
  validada: 'border-success/30 bg-success/10 text-success',
  desatualizada: 'border-warning/30 bg-warning/10 text-warning',
};

/** Ícone e rótulo de cada ação (ícones já usados no sistema). */
const ESTILO_ACAO: Record<
  AcaoStatusRodape,
  { icone: typeof CheckCircle2; variante: 'default' | 'outline'; destrutiva: boolean }
> = {
  concluir: { icone: CheckCircle2, variante: 'default', destrutiva: false },
  cancelar: { icone: Ban, variante: 'outline', destrutiva: true },
  reabrir: { icone: RotateCcw, variante: 'outline', destrutiva: false },
};

/**
 * Contrato mínimo do serviço usado pelo rodapé (o serviço real satisfaz por
 * estrutura, então não há duplicação de tipos).
 */
export interface ServicoAcoes {
  finalizarFeedback: typeof avaliacaoService.finalizarFeedback;
  validarPotencialAvaliacao: typeof avaliacaoService.validarPotencialAvaliacao;
  listarValidacoesPotencial: typeof avaliacaoService.listarValidacoesPotencial;
  listarVersoesAvaliacao: typeof avaliacaoService.listarVersoesAvaliacao;
  /** Vínculos (`id`, `user_id`, `supervisor_id`) — prova do gestor responsável. */
  listarVinculos: typeof avaliacaoService.listarVinculos;
  /** DECISÃO DA APROVAÇÃO FORMAL do gestor (aprovar/devolver) — a mesma RPC da fila. */
  decidirAprovacaoGestor: typeof avaliacaoService.decidirAprovacaoGestor;
}

/**
 * ETAPA em que o modal foi aberto — decide QUAIS ações o rodapé oferece.
 *
 * O MESMO modal serve três etapas do fluxo, e cada uma tem um conjunto PRÓPRIO
 * de ações (nunca todas ao mesmo tempo):
 *
 *   • `avaliacoes`        — aba Avaliações: só as ações do STATUS do registro
 *                           (`pendente` → Concluir/Cancelar; `concluido`/
 *                           `cancelado` → nenhuma). Sempre SEM ações de
 *                           aprovação.
 *   • `aguardando_gestor` — fila de aprovação: SOMENTE Aprovar/Devolver, para o
 *                           gestor responsável daquela avaliação.
 *   • `rh`                — etapa de validação: SOMENTE "Validar Potencial"
 *                           (com aprovação formal vigente), sem conclusão nem
 *                           aprovação.
 */
export type ContextoAcoes = 'avaliacoes' | 'aguardando_gestor' | 'rh';

/**
 * Injeções EXCLUSIVAS DE PRÉVIA LOCAL — nunca em produção.
 *
 * Só produzem efeito quando `import.meta.env.DEV` é verdadeiro: no build de
 * produção esse valor é substituído por `false`, o bloco é eliminado pelo
 * empacotador e não existe caminho de prévia:
 *   • `servico` — serviço SIMULADO (nenhuma RPC, nenhum Supabase);
 *   • `papel`   — papel simulado, para conferir os controles de cada perfil.
 */
export interface PreviewAcoes {
  servico?: ServicoAcoes;
  papel?: PapelApp;
  /**
   * Simula a prova de RESPONSABILIDADE (`ehGestorResponsavel`). Só existe na
   * prévia de DEV para conferir o controle "Concluir avaliação" do gestor
   * responsável; em produção o vínculo vem dos dados (`listarVinculos`).
   */
  responsavel?: boolean;
}

export function FeedbackAcoesRodape({
  item,
  previa,
  estadoAprovacao,
  servicoDemo,
  contexto = 'avaliacoes',
}: {
  item: FeedbackDerivado;
  previa?: PreviewAcoes;
  /** Estado da APROVAÇÃO FORMAL — a MESMA instância da fila "Aguardando gestor". */
  estadoAprovacao?: EstadoAprovacao | null;
  /**
   * VITRINE (demonstração): serviço com PERSISTÊNCIA LOCAL. Presente, os MESMOS
   * controles executam a ação gravando no armazenamento demonstrativo — nunca no
   * banco. Ausente (modo real), vale o `avaliacaoService`/RPC.
   */
  servicoDemo?: ServicoAcoes;
  /** Etapa em que o modal foi aberto — ver `ContextoAcoes`. */
  contexto?: ContextoAcoes;
}) {
  const qc = useQueryClient();
  const { user, isAdmin, hasRole } = useAuth();
  const f = (item?.feedback ?? {}) as Record<string, unknown>;

  const feedbackId = String(f?.id ?? '').trim();
  const empresaId = String(f?.empresa_id ?? '').trim();
  const cicloId = String(f?.ciclo_id ?? '').trim();
  const statusAtual = normalizarStatus(f?.status);
  /** Status canônico do registro — badge de fallback quando não há aprovação. */
  const statusRegistro = statusCanonico(f?.status);

  /* ─── Prévia local (DEV) × operação real ─────────────────────────────────── */
  const emPrevia = import.meta.env.DEV && !!previa;
  /**
   * REGISTRO REAL × FICTÍCIO. `registroReal` vale para identificadores que NÃO
   * são `mock-*`/`demo-*`. O rodapé operacional não depende de flag de ambiente:
   * os dados fictícios continuam sem ações e a guarda de escrita os recusa.
   */
  const registroReal = feedbackId !== '' && !idDemonstrativo(feedbackId);
  // Sem checagem de papel AQUI: quem já filtra por papel são os próprios botões
  // (`acoesDisponiveis` por perfil e `podeValidarAgora` só para RH). O servidor
  // revalida na RPC de qualquer forma.
  /**
   * SERVIÇO + ORIGEM = UMA ÚNICA DECISÃO POR REGISTRO.
   *   • real (não demonstrativo) → `avaliacaoService`/RPC, mesmo em tela mista;
   *   • `mock-*`/`demo-*` → `servicoDemo` (localStorage);
   *   • prévia DEV → serviço simulado;
   *   • sem ID/serviço → indisponível.
   * O toast usa a MESMA origem do serviço executado.
   */
  const destino = resolverDestinoAcao<ServicoAcoes>({
    feedbackId,
    emPrevia,
    previaServico: previa?.servico,
    demoService: servicoDemo,
    realService: avaliacaoService,
  });
  const servico: ServicoAcoes = destino.servico ?? avaliacaoService;
  const modoDemoLocal = destino.origem === 'demo';
  const modoRealOuPrevia = destino.origem !== 'indisponivel';

  /* ─── Papel do operador (o servidor revalida de qualquer forma) ─────────── */
  const roles = useMemo(() => (user?.roles ?? []).map((r) => String(r).toLowerCase().trim()), [user]);
  const papeisConta = useMemo(
    () => (isAdmin && !roles.includes('admin') ? [...roles, 'admin'] : roles),
    [isAdmin, roles]
  );
  /**
   * CAPACIDADES POR PAPEL (não por precedência). Uma conta pode ser `admin` E
   * `gestor` ao mesmo tempo (`user_roles` tem uma linha por papel): a leitura de
   * `papelStatus` continua existindo para rótulo/prévia, mas quem decide cada
   * controle são os papéis da CONTA — ter `admin` não anula `gestor`.
   */
  const capacidades = useMemo(() => capacidadesAvaliacao(papeisConta), [papeisConta]);
  const temRh = capacidades.rh;
  // Requisito do fluxo: a checagem usa o `hasRole('gestor')` real do contexto
  // (lista de papéis da conta — ter `admin` não anula `gestor`). Na PRÉVIA DEV o
  // papel simulado manda, como já acontece com o RH.
  const temGestor =
    emPrevia && previa?.papel !== undefined ? previa.papel === 'gestor' : hasRole('gestor') || capacidades.gestor;
  const papelReal: PapelApp =
    isAdmin || capacidades.admin
      ? 'admin'
      : temRh
        ? 'rh'
        : capacidades.gestor
          ? 'gestor'
          : roles.includes('user')
            ? 'user'
            : null;
  const papelStatus: PapelApp = emPrevia && previa?.papel !== undefined ? previa.papel : papelReal;
  /** Validação de Potencial é EXCLUSIVA do RH (nem o admin valida). */
  const podeValidar = podeValidarPotencial(
    emPrevia && previa?.papel !== undefined ? papelStatus : temRh ? 'rh' : papelStatus
  );

  /* ─── Dados do Potencial (só no modo real; erro não quebra o modal) ─────── */
  const consultaPotencialAtiva = modoRealOuPrevia && !!empresaId && !!feedbackId;
  const { data: validacoes = [] } = useQuery({
    queryKey: ['feedbacks_360_validacoes_potencial', empresaId, cicloId, feedbackId],
    queryFn: () => servico.listarValidacoesPotencial(empresaId, cicloId || undefined),
    enabled: consultaPotencialAtiva && podeValidar,
    retry: false,
  });
  const { data: versoes = [] } = useQuery({
    queryKey: ['vw_feedbacks_360_versao', empresaId, cicloId, feedbackId],
    queryFn: () => servico.listarVersoesAvaliacao(empresaId, cicloId || undefined),
    enabled: consultaPotencialAtiva && podeValidar,
    retry: false,
  });

  const validacoesLidas = validacoes as (ValidacaoPotencialLida & { feedback_id?: unknown })[];
  const validacaoVigente = useMemo(
    () => validacoesLidas.find((v) => String(v?.feedback_id ?? '') === feedbackId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validacoes, feedbackId]
  );

  const versaoAtual = useMemo(() => {
    const linha = (versoes as { feedback_id?: unknown; versao_avaliacao?: unknown }[]).find(
      (v) => String(v?.feedback_id ?? '') === feedbackId
    );
    return linha ? String(linha.versao_avaliacao ?? '') : null;
  }, [versoes, feedbackId]);

  const situacao = situacaoPotencial(validacaoVigente, versaoAtual, f?.status);

  /* ─── GESTOR RESPONSÁVEL (vínculo, não o tipo da avaliação) ───────────────
     A conclusão só é oferecida a quem PROVA o vínculo: papel real `gestor` +
     ser o `supervisor_id` do avaliado (ou o próprio avaliado). A prova vem dos
     vínculos escopados à empresa; o servidor revalida em
     `pode_aprovar_colaborador` antes de gravar. Sem prova, o controle não
     aparece (fail-closed) — nem para `admin`/`rh`, que também não têm o perfil. */
  const avaliadoId = String(f?.avaliado_id ?? '').trim();
  const consultaVinculosAtiva =
    modoRealOuPrevia &&
    !emPrevia &&
    !!avaliadoId &&
    (temGestor || temRh || isAdmin || hasRole('user')) &&
    (!!empresaId || modoDemoLocal);
  const { data: vinculos = [] } = useQuery({
    // A chave separa o cenário DEMONSTRATIVO do banco REAL: sem o discriminante,
    // um modal de mock poderia deixar vínculos fictícios no cache e liberar a
    // aprovação de um registro UUID. O modo real mantém a MESMA chave da página.
    queryKey: modoDemoLocal ? ['colaboradores_vinculos', 'demo', empresaId] : ['colaboradores_vinculos', empresaId],
    queryFn: () => servico.listarVinculos(empresaId),
    enabled: consultaVinculosAtiva,
    retry: false,
  });
  const responsavel =
    emPrevia && previa?.responsavel !== undefined
      ? previa.responsavel === true
      : ehGestorResponsavel({ avaliadoId, vinculos, usuarioId: user?.id });

  /* ─── Elegibilidade dos controles ───────────────────────────────────────── */
  /**
   * CONCLUSÃO ≠ APROVAÇÃO. A conclusão usa a autorização do REGISTRO:
   * avaliador designado, gestor responsável, exceção confirmada ou RH/admin.
   * A ausência de `supervisor_id` não bloqueia um avaliador designado.
   */
  const avaliadorId = String(f?.avaliador_id ?? '').trim();
  const papeisConclusao = (emPrevia && previa?.papel !== undefined ? [previa.papel] : papeisConta).filter(
    (p): p is string => typeof p === 'string' && p.trim() !== ''
  );
  const autorizadoConcluir = podeConcluirFeedback({
    papeis: papeisConclusao,
    avaliadorId,
    vinculos,
    usuarioId: user?.id,
    responsavel,
    autorizadoServidor: estadoAprovacao?.autorizadoServidor === true,
  });
  const acoes = acoesDisponiveis({
    statusAtual: f?.status,
    papel: papelStatus,
    // Conta com vários papéis: cada ação pelo perfil que a concede. A aprovação
    // continua sendo decidida à parte (`decisaoPorVinculo`/servidor).
    perfis: perfisOperadorEfetivos(emPrevia && previa?.papel !== undefined ? previa.papel : papeisConta, responsavel),
    responsavel,
    autorizadoConcluir,
  });
  const conclusao = validarConclusao(f);
  const potencialValido = notaNaEscala(f?.potencial) !== null;
  const ehAvaliacaoDoGestor = tipoFeedback(f?.tipo) === 'gestor';
  /* ─── APROVAÇÃO FORMAL — a MESMA regra/instância derivada pela fila ─────── */
  const aprovacao = estadoAprovacao ?? null;
  /** Solicitação de aprovação pendente para esta avaliação? */
  const aprovacaoPendente = aprovacao?.pendente === true;

  const podeValidarAgora =
    podeValidar &&
    ehAvaliacaoDoGestor &&
    statusAtual === 'concluido' &&
    potencialValido &&
    situacao !== 'validada' &&
    // Controle legado visível apenas na etapa em que ele existia (aprovada).
    // No fluxo novo ele fica desabilitado; antes da aprovação não é oferecido.
    (!aprovacao || aprovacao.status === 'aprovada_gestor' || aprovacao.status === 'concluida_validada');
  /**
   * O selo de situação só aparece para quem PODE consultar as validações (RH):
   * sem essa consulta não existe dado para afirmar "aguardando"/"validado" — e
   * o sistema não inventa estado.
   */
  const mostrarSituacao = podeValidar && ehAvaliacaoDoGestor && potencialValido;

  /* ─── Idempotência: uma chave por OPERAÇÃO (reaproveitada no reenvio) ───── */
  const chavesRef = useRef<Map<AcaoStatusRodape, ChaveIdempotente> | null>(null);
  // Inicialização preguiçosa no formato que a regra `react-hooks/refs` aceita
  // (`ref.current == null`), com o mapa criado UMA única vez por montagem.
  if (chavesRef.current == null) chavesRef.current = new Map();
  const chaveDe = (acao: AcaoStatusRodape, observacao: string): string => {
    const mapa = chavesRef.current as Map<AcaoStatusRodape, ChaveIdempotente>;
    if (!mapa.has(acao)) mapa.set(acao, criarChaveIdempotente());
    return (mapa.get(acao) as ChaveIdempotente).para(`${acao}:${feedbackId}:${observacao}`);
  };

  /* ─── Estado dos diálogos de justificativa ──────────────────────────────── */
  const [motivoAberto, setMotivoAberto] = useState<'cancelar' | 'reabrir' | null>(null);
  const [motivo, setMotivo] = useState('');
  /** Devolução da APROVAÇÃO (ação do gestor responsável) — diálogo próprio. */
  const [devolucaoAberta, setDevolucaoAberta] = useState(false);
  const [justificativaDevolucao, setJustificativaDevolucao] = useState('');

  /* ─── APROVAÇÃO FORMAL: quem decide (o estado já foi derivado acima) ────── */
  /**
   * REGISTRO REAL → exige o vínculo provado (`responsavel`), reconferido no
   * servidor por `pode_aprovar_colaborador`.
   * REGISTRO FICTÍCIO (vitrine `mock-*`) → a decisão é DEMONSTRATIVA: os botões
   * existem para demonstrar o fluxo, mas NADA é gravado no banco. O PAPEL é o
   * MESMO do fluxo real (`gestor`) — rh/admin NÃO substituem a aprovação.
   */
  const podeDecidirPorPapel =
    emPrevia && previa?.papel !== undefined ? previa.papel === 'gestor' : capacidades.podeDecidirAprovacao;
  const decisaoDemonstrativa = aprovacaoPendente && !registroReal;
  /** Motivo derivado pela MESMA instância da fila (escopo sem vínculo). */
  const motivoBloqueioAprovacao = aprovacao?.motivoBloqueio ?? null;
  /**
   * DECISÃO — a MESMA regra do servidor:
   *   • requisitos obrigatórios: gestor identificado + proposta consolidada com
   *     Desempenho/Potencial válidos (`motivoBloqueio` já traz o texto);
   *   • ESCOPO real: ser o gestor vinculado (ou exceção confirmada pelo
   *     servidor); RH/admin NÃO aprovam;
   *   • VITRINE: papel `gestor`, com os mesmos requisitos.
   *
   * A conclusão do REGISTRO não entra aqui: conclusão ≠ aprovação.
   */
  const decisaoPorVinculo = temGestor && responsavel === true;
  const decisaoPorServidor = aprovacao?.autorizadoServidor === true;
  const podeOferecerDecisao = registroReal ? decisaoPorVinculo || decisaoPorServidor : podeDecidirPorPapel;
  const motivoDecisao = !aprovacao
    ? 'Sem consolidação para este colaborador e ciclo.'
    : !aprovacaoPendente
      ? `A avaliação não está aguardando decisão do gestor (${aprovacao.rotulo}).`
      : (motivoBloqueioAprovacao ??
        (!aprovacao.gestorIdentificado && !decisaoPorServidor
          ? MOTIVO_GESTOR_NAO_ATRIBUIDO
          : !aprovacao.avaliacaoGestorValida
            ? MOTIVO_FALTA_AVALIACAO_GESTOR
            : podeOferecerDecisao
              ? null
              : 'Somente o gestor responsável pela avaliação pode aprovar ou devolver.'));
  const chaveAprovacaoRef = useRef<ChaveIdempotente | null>(null);
  if (chaveAprovacaoRef.current == null) chaveAprovacaoRef.current = criarChaveIdempotente();

  const decidirAprovacao = useMutation({
    mutationFn: (v: { decisao: 'aprovado' | 'devolvido'; justificativa?: string | null }) => {
      // VITRINE (registro fictício): persiste LOCALMENTE — nada vai ao banco,
      // nem por RPC nem por tabela. Os mocks não são tocados: a decisão é
      // gravada em armazenamento próprio, chaveada pelos ids fictícios.
      if (decisaoDemonstrativa) {
        decidirLocal({
          colaboradorId: avaliadoId,
          cicloId,
          decisao: v.decisao,
          justificativa: v.justificativa ?? null,
          versaoAvaliacao: aprovacao?.versaoAvaliacao ?? '',
          por: user?.email ?? null,
        });
        // Mesmo formato de retorno da RPC oficial (o `onSuccess` distingue a
        // demonstração pela própria flag `decisaoDemonstrativa`).
        return Promise.resolve({
          ok: true,
          aprovacao_id: `local:${avaliadoId}|${cicloId}`,
          decisao: v.decisao,
          status: v.decisao,
          versao_avaliacao: aprovacao?.versaoAvaliacao ?? '',
          idempotente: false,
        });
      }
      const idOperacao = (chaveAprovacaoRef.current as ChaveIdempotente).para(`${avaliadoId}|${cicloId}|${v.decisao}`);
      return servico.decidirAprovacaoGestor({
        colaboradorId: avaliadoId,
        cicloId,
        decisao: v.decisao,
        justificativa: v.justificativa ?? null,
        idOperacao,
      });
    },
    onSuccess: (_resposta: unknown, v) => {
      const rotulo = v.decisao === 'devolvido' ? 'Devolver para correção' : 'Aprovar avaliação';
      if (decisaoDemonstrativa) {
        // Identificação CLARA: a decisão é da DEMONSTRAÇÃO, salva localmente.
        qc.invalidateQueries({ queryKey: [CHAVE_QUERY_DEMO] });
        qc.invalidateQueries({ queryKey: ['historico_feedback', feedbackId] });
        toast.success(`Demonstração: “${rotulo}” salva localmente (nada foi enviado ao banco).`);
        setDevolucaoAberta(false);
        setJustificativaDevolucao('');
        return;
      }
      chaveAprovacaoRef.current?.confirmar();
      // Fila, contador, versão e lista passam a refletir a MESMA decisão.
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['pode_aprovar_colaborador'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      qc.invalidateQueries({ queryKey: ['historico_feedback', feedbackId] });
      setDevolucaoAberta(false);
      setJustificativaDevolucao('');
      toast.success(
        v.decisao === 'devolvido' ? 'Avaliação devolvida para correção.' : 'Avaliação aprovada pelo gestor!'
      );
    },
    onError: (erro: unknown) => {
      toast.error(`Decisão NÃO registrada: ${mensagemDeErro(erro)}`);
    },
  });

  const minimaDevolucao = !validarJustificativaDevolucao(justificativaDevolucao).pode;

  /* ─── Escritas (RPC transacional/local; nada otimista) ─────────────────── */
  const finalizar = useMutation({
    mutationFn: async (v: { acao: AcaoStatusRodape; observacao: string | null; chave: string }) => {
      if (!destino.servico) {
        throw new Error(destino.motivo ?? 'Serviço de persistência indisponível para este registro.');
      }
      const resposta = await servico.finalizarFeedback({
        feedbackId,
        acao: v.acao,
        motivo: v.observacao,
        idOperacao: v.chave,
      });
      /**
       * CONFIRMAÇÃO ANTES DO TOAST: `ok:true` + status esperado. Resposta vazia,
       * `ok:false` ou status divergente não produzem sucesso.
       */
      return confirmarFinalizacao(resposta, v.acao, destino.origem);
    },
    onSuccess: (confirmado, v) => {
      // Confirmação do serviço: operação fechada (a próxima recebe chave nova).
      chavesRef.current?.get(v.acao)?.confirmar();

      /**
       * CACHE ÚNICO DO FLUXO. Inclui a lista, consolidações, versões,
       * aprovações, Potencial, histórico, trilha e a raiz do Nine-Box. Demonstrativo
       * também invalida o estado local de aprovação.
       */
      [
        ['feedbacks_360'],
        ['feedbacks_360_consolidacoes'],
        ['feedbacks_360_aprovacoes_gestor'],
        ['feedbacks_360_validacoes_potencial'],
        ['vw_feedbacks_360_versao'],
        ['historico_feedback'],
        ['performance-audit-logs'],
        ['pode_aprovar_colaborador'],
        ['ninebox'],
        ['ninebox_360'],
        ['ninebox_consolidacoes'],
      ].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      if (destino.origem === 'demo') {
        qc.invalidateQueries({ queryKey: [CHAVE_QUERY_DEMO] });
      }

      setMotivoAberto(null);
      setMotivo('');
      const repetida = Boolean(confirmado.idempotente);
      toast.success(mensagemFinalizacao(destino.origem, v.acao, repetida, 'sucesso'));
    },
    onError: (erro: unknown) => {
      // Nada de sucesso falso: o motivo REAL vai para o aviso. A chave fica.
      toast.error(`Não foi possível atualizar a avaliação: ${mensagemDeErro(erro)}`);
    },
  });

  const validarPotencial = useMutation({
    mutationFn: () =>
      servico.validarPotencialAvaliacao({
        feedbackId,
        idOperacao: chaveDe('concluir', 'validacao-potencial'),
      }),
    onSuccess: () => {
      chavesRef.current?.get('concluir')?.confirmar();
      qc.invalidateQueries({ queryKey: ['feedbacks_360_validacoes_potencial'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      // A fila/Nine-Box releem a consolidação e as decisões na MESMA rodada.
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['pode_aprovar_colaborador'] });
      // VITRINE: a validação local entra no MESMO estado que a fila/Nine-Box leem.
      qc.invalidateQueries({ queryKey: [CHAVE_QUERY_DEMO] });
      toast.success(
        modoDemoLocal
          ? 'Demonstração: Potencial validado localmente (nada foi enviado ao banco).'
          : 'Potencial validado pelo RH.'
      );
    },
    onError: (erro: unknown) => {
      toast.error(`Potencial não validado: ${mensagemDeErro(erro)}`);
    },
  });

  /* ─── Envios (validam o texto ANTES de chamar a RPC) ────────────────────── */
  const emAndamento = finalizar.isPending || validarPotencial.isPending || decidirAprovacao.isPending;

  function concluir() {
    if (!conclusao.podeConcluir) {
      toast.error('A avaliação ainda não reúne os dados mínimos para ser concluída.');
      return;
    }
    finalizar.mutate({ acao: 'concluir', observacao: null, chave: chaveDe('concluir', '') });
  }

  const minimaCancelamento = !validarCancelamento({ motivo }).podeCancelar;
  function confirmarCancelamento() {
    const texto = motivo.trim();
    if (texto.length < MIN_CARACTERES_MOTIVO) {
      toast.error(`O motivo do cancelamento deve ter ao menos ${MIN_CARACTERES_MOTIVO} caracteres.`);
      return;
    }
    finalizar.mutate({ acao: 'cancelar', observacao: texto, chave: chaveDe('cancelar', texto) });
  }

  const minimaReabertura = !validarReabertura({ justificativa: motivo }).podeReabrir;
  function confirmarReabertura() {
    const texto = motivo.trim();
    if (texto.length < MIN_CARACTERES_JUSTIFICATIVA) {
      toast.error(`A justificativa deve ter ao menos ${MIN_CARACTERES_JUSTIFICATIVA} caracteres.`);
      return;
    }
    finalizar.mutate({ acao: 'reabrir', observacao: texto, chave: chaveDe('reabrir', texto) });
  }

  /* ── REGRA ÚNICA DE AÇÕES POR ETAPA (nunca todas ao mesmo tempo) ──────────
     O rodapé é o mesmo; o CONJUNTO de ações vem da etapa explícita:
       • `avaliacoes`        → só ações do STATUS (pendente: Concluir/Cancelar);
       • `aguardando_gestor` → só Aprovar/Devolver (gestor responsável);
       • `rh`                → só Validar Potencial (aprov. vigente + papel RH).
     Conclusão do feedback ≠ aprovação do gestor: são operações distintas e
     nunca dividem a mesma etapa. O status do registro não autoriza ninguém — a
     autorização continua no servidor. */
  const mostrarAcoesStatus = contexto === 'avaliacoes';
  const mostrarValidacaoRh = contexto === 'rh';
  /** Ações do STATUS que PERTENCEM a esta etapa (a tabela decide o resto). */
  const acoesDaEtapa =
    mostrarAcoesStatus && modoRealOuPrevia
      ? acoes.filter((a: AcaoDisponivel) => a.acao !== 'reabrir' && a.disponivel)
      : [];
  const botoesDecisaoGestor =
    contexto === 'aguardando_gestor' &&
    (capacidades.gestor || podeDecidirPorPapel || aprovacao?.autorizadoServidor === true);
  const botoesValidacaoRh = mostrarValidacaoRh && modoRealOuPrevia && podeValidarAgora;
  const seloVisivel = true;
  const temAcoes = acoesDaEtapa.length > 0 || botoesDecisaoGestor || botoesValidacaoRh;

  /* Sem selo e sem ação da etapa, o bloco NÃO existe (evita rodapé vazio e
     rodapé exibindo ação de outra etapa). */
  if (!modoRealOuPrevia && !aprovacao) return null;
  if (!seloVisivel && !temAcoes) return null;

  return (
    <>
      <Separator className="bg-border/50" />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* Selo do estado — ordem de autoridade: (1) APROVAÇÃO formal quando
            existe; (2) situação do Potencial para o RH (mesma leitura de antes);
            (3) status canônico do registro. Fica à ESQUERDA, na mesma linha de
            base das ações. */}
        {seloVisivel && (
          <span
            role="status"
            className={cn(
              'inline-flex h-6 w-fit items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
              aprovacao ? aprovacao.tom : mostrarSituacao ? TOM_SITUACAO[situacao] : statusRegistro.tom
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            {aprovacao
              ? aprovacao.rotulo
              : mostrarSituacao
                ? ROTULO_SITUACAO_POTENCIAL[situacao]
                : statusRegistro.rotulo}
          </span>
        )}

        {temAcoes && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {/* DECISÃO DO GESTOR RESPONSÁVEL — reusa os MESMOS controles
                aprovados da fila (Aprovar / Devolver + justificativa). */}
            {botoesDecisaoGestor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={emAndamento || Boolean(motivoDecisao)}
                  title={
                    motivoDecisao ??
                    (decisaoDemonstrativa ? 'Operação demonstrativa — nada é gravado no banco' : undefined)
                  }
                  onClick={() => {
                    setJustificativaDevolucao('');
                    setDevolucaoAberta(true);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Devolver para correção
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-success/45 bg-success/15 text-xs text-success hover:bg-success/25 hover:text-success"
                  disabled={emAndamento || Boolean(motivoDecisao)}
                  title={
                    motivoDecisao ??
                    (decisaoDemonstrativa ? 'Operação demonstrativa — nada é gravado no banco' : undefined)
                  }
                  onClick={() => decidirAprovacao.mutate({ decisao: 'aprovado', justificativa: null })}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Aprovar avaliação
                </Button>
              </>
            )}
            {/* Ações do STATUS — SOMENTE na etapa `avaliacoes` e SOMENTE as que a
              tabela de transições autoriza para o status atual (pendente →
              Concluir/Cancelar; concluído/cancelado → nenhuma). */}
            {acoesDaEtapa.map((a: AcaoDisponivel) => {
              const estilo = ESTILO_ACAO[a.acao as AcaoStatusRodape];
              const Icone = estilo.icone;
              const bloqueio = !a.disponivel
                ? a.motivoBloqueio
                : a.acao === 'concluir' && !conclusao.podeConcluir
                  ? 'A avaliação ainda não reúne os dados mínimos para ser concluída.'
                  : null;

              return (
                <Button
                  key={a.acao}
                  variant={estilo.variante}
                  size="sm"
                  className={cn('h-8 gap-1.5 text-xs', estilo.destrutiva && 'text-destructive hover:text-destructive')}
                  disabled={emAndamento || Boolean(bloqueio)}
                  title={bloqueio ?? undefined}
                  onClick={() => {
                    if (a.acao === 'concluir') {
                      concluir();
                      return;
                    }
                    setMotivo('');
                    setMotivoAberto(a.acao as 'cancelar' | 'reabrir');
                  }}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {a.rotulo}
                </Button>
              );
            })}

            {botoesValidacaoRh && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={emAndamento || !aprovacao?.podeValidarPotencial}
                title={
                  aprovacao?.podeValidarPotencial
                    ? undefined
                    : 'Fluxo atual: a aprovação do gestor já classifica; a validação posterior do RH não é necessária.'
                }
                onClick={() => validarPotencial.mutate()}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Validar Potencial
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Diálogo de justificativa — cancelamento (motivo) ou reabertura.
          ANIMAÇÃO: a MESMA da janela "Pendências" (`CascadeDialogFrame`, a
          moldura compartilhada de `ui/cascade-dialog`): abertura em cascata e
          fechamento completo — sem coreografia nova. */}
      <CascadeDialogFrame
        open={motivoAberto !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setMotivoAberto(null);
            setMotivo('');
          }
        }}
        blocks={3}
        className="max-w-md border-border rounded-none sm:rounded-lg"
        contentClassName="grid gap-3 p-5"
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {motivoAberto === 'cancelar' ? 'Cancelar avaliação' : 'Reabrir avaliação'}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {item.avaliado} · {item.tipoRotulo} · {item.data}
            </DialogDescription>
          </DialogHeader>
        </motion.div>

        <motion.div variants={cascadeItemVariants} className="space-y-1.5">
          <Label
            htmlFor={`motivo-${feedbackId}`}
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {motivoAberto === 'cancelar' ? 'Motivo do cancelamento' : 'Justificativa da reabertura'}
          </Label>
          <Textarea
            id={`motivo-${feedbackId}`}
            value={motivo}
            rows={3}
            disabled={emAndamento}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={
              motivoAberto === 'cancelar'
                ? 'Explique por que esta avaliação está sendo cancelada'
                : 'Explique por que esta avaliação precisa ser reaberta'
            }
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {motivoAberto === 'cancelar'
              ? 'O registro é PRESERVADO: o cancelamento entra na trilha de auditoria e nada é apagado.'
              : `A avaliação volta para "pendente" e pode exigir nova validação de Potencial (mínimo de ${MIN_CARACTERES_JUSTIFICATIVA} caracteres).`}
          </p>
        </motion.div>

        <motion.div variants={cascadeItemVariants}>
          <DialogFooter className="items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={emAndamento}
              onClick={() => {
                setMotivoAberto(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={motivoAberto === 'cancelar' ? 'destructive' : 'default'}
              size="sm"
              className="h-8 text-xs"
              disabled={emAndamento || (motivoAberto === 'cancelar' ? minimaCancelamento : minimaReabertura)}
              onClick={motivoAberto === 'cancelar' ? confirmarCancelamento : confirmarReabertura}
            >
              {emAndamento
                ? 'Salvando…'
                : motivoAberto === 'cancelar'
                  ? 'Confirmar cancelamento'
                  : 'Confirmar reabertura'}
            </Button>
          </DialogFooter>
        </motion.div>
      </CascadeDialogFrame>

      {/* DECISÃO DA APROVAÇÃO — devolução exige justificativa (mesmo mínimo da
          RPC e do diálogo aprovado na fila "Aguardando gestor"). ANIMAÇÃO: a
          MESMA de Pendências (moldura compartilhada). */}
      <CascadeDialogFrame
        open={devolucaoAberta}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setDevolucaoAberta(false);
            setJustificativaDevolucao('');
          }
        }}
        blocks={3}
        className="max-w-md border-border rounded-none sm:rounded-lg"
        contentClassName="grid gap-3 p-5"
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="font-display text-base">Devolver para correção</DialogTitle>
            <DialogDescription className="text-[11px]">
              {item.avaliado} · {item.tipoRotulo} · {item.data}
            </DialogDescription>
          </DialogHeader>
        </motion.div>

        <motion.div variants={cascadeItemVariants} className="space-y-1.5">
          <Label
            htmlFor={`devolucao-${feedbackId}`}
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Justificativa obrigatória
          </Label>
          <Textarea
            id={`devolucao-${feedbackId}`}
            value={justificativaDevolucao}
            rows={3}
            disabled={emAndamento}
            onChange={(e) => setJustificativaDevolucao(e.target.value)}
            placeholder="Explique o que precisa ser corrigido antes da aprovação"
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            A avaliação volta para o RH corrigir e reenviar (mínimo de {MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO}{' '}
            caracteres). O histórico é preservado.
          </p>
        </motion.div>

        <motion.div variants={cascadeItemVariants}>
          <DialogFooter className="items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={emAndamento}
              onClick={() => {
                setDevolucaoAberta(false);
                setJustificativaDevolucao('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={emAndamento || minimaDevolucao}
              onClick={() => {
                if (minimaDevolucao) return;
                decidirAprovacao.mutate({ decisao: 'devolvido', justificativa: justificativaDevolucao.trim() });
              }}
            >
              {emAndamento ? 'Enviando…' : 'Confirmar devolução'}
            </Button>
          </DialogFooter>
        </motion.div>
      </CascadeDialogFrame>
    </>
  );
}
