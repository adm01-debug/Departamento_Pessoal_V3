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
import { Ban, CheckCircle2, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { avaliacaoService } from '@/services/avaliacaoService';

import { modoRealAtivo } from './nineBoxModo';
import { idFicticio } from './escritaOperacional';
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
  podeValidarPotencial,
  situacaoPotencial,
  type AcaoDisponivel,
  type PapelApp,
  type SituacaoPotencial,
  type ValidacaoPotencialLida,
} from './acoesFeedback';
import { tipoFeedback, type FeedbackDerivado } from './feedbacksComum';
import {
  MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO,
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
}: {
  item: FeedbackDerivado;
  previa?: PreviewAcoes;
  /** Estado da APROVAÇÃO FORMAL — a MESMA instância da fila "Aguardando gestor". */
  estadoAprovacao?: EstadoAprovacao | null;
}) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const f = (item?.feedback ?? {}) as Record<string, unknown>;

  const feedbackId = String(f?.id ?? '').trim();
  const empresaId = String(f?.empresa_id ?? '').trim();
  const cicloId = String(f?.ciclo_id ?? '').trim();
  const statusAtual = normalizarStatus(f?.status);

  /* ─── Prévia local (DEV) × operação real ─────────────────────────────────── */
  const emPrevia = import.meta.env.DEV && !!previa;
  /**
   * REGISTRO REAL × FICTÍCIO. O rodapé operacional aparece quando o feedback é
   * um REGISTRO REAL (UUID, não `mock-*`) e foi aberto por quem opera o módulo
   * (`admin`/`rh`). Antes exigia `modoRealAtivo()` (flag de ambiente), então com
   * a tela aprovada em demonstração o RH não via Concluir/Cancelar/Reabrir nem
   * Validar Potencial. Os dados fictícios continuam SEM ações — e nunca são
   * gravados: a guarda de escrita recusa `mock-*`.
   */
  const registroReal = feedbackId !== '' && !idFicticio(feedbackId);
  // Sem checagem de papel AQUI: quem já filtra por papel são os próprios botões
  // (`acoesDisponiveis` por perfil e `podeValidarAgora` só para RH). O servidor
  // revalida na RPC de qualquer forma.
  const modoRealOuPrevia = modoRealAtivo() || emPrevia || registroReal;
  const servico: ServicoAcoes = previa?.servico ?? avaliacaoService;

  /* ─── Papel do operador (o servidor revalida de qualquer forma) ─────────── */
  const roles = useMemo(() => (user?.roles ?? []).map((r) => String(r).toLowerCase().trim()), [user]);
  const temRh = roles.includes('rh');
  const papelReal: PapelApp =
    isAdmin || roles.includes('admin')
      ? 'admin'
      : temRh
        ? 'rh'
        : roles.includes('gestor')
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
    modoRealOuPrevia && !emPrevia && !!empresaId && !!avaliadoId && papelStatus === 'gestor';
  const { data: vinculos = [] } = useQuery({
    queryKey: ['colaboradores_vinculos', empresaId],
    queryFn: () => servico.listarVinculos(empresaId),
    enabled: consultaVinculosAtiva,
    retry: false,
  });
  const responsavel =
    emPrevia && previa?.responsavel !== undefined
      ? previa.responsavel === true
      : ehGestorResponsavel({ avaliadoId, vinculos, usuarioId: user?.id });

  /* ─── Elegibilidade dos controles ───────────────────────────────────────── */
  const acoes = acoesDisponiveis({ statusAtual: f?.status, papel: papelStatus, responsavel });
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
    // Com o estado da aprovação disponível, o RH só valida DEPOIS do aval do
    // gestor vigente (mesma etapa da fila); sem o estado, a regra do servidor
    // segue valendo sozinha.
    (!aprovacao || aprovacao.podeValidarPotencial);
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
   * existem para demonstrar o fluxo, mas NADA é gravado (nenhuma RPC é chamada)
   * e a operação é anunciada como demonstração. Exige papel de gestão
   * (`admin`/`gestor`) — o RH puro não aprova nem na vitrine.
   */
  const papelDeGestao = papelStatus === 'admin' || papelStatus === 'gestor';
  const decisaoDemonstrativa = aprovacaoPendente && !registroReal;
  const podeDecidirAprovacao = aprovacaoPendente && (registroReal ? responsavel === true : papelDeGestao);
  const chaveAprovacaoRef = useRef<ChaveIdempotente | null>(null);
  if (chaveAprovacaoRef.current == null) chaveAprovacaoRef.current = criarChaveIdempotente();

  const decidirAprovacao = useMutation({
    mutationFn: (v: { decisao: 'aprovado' | 'devolvido'; justificativa?: string | null }) => {
      // VITRINE (registro fictício): NADA vai ao banco — nem RPC, nem rede.
      if (decisaoDemonstrativa) {
        return Promise.resolve({ ok: true, demonstrativo: true, decisao: v.decisao });
      }
      const idOperacao = (chaveAprovacaoRef.current as ChaveIdempotente).para(
        `${avaliadoId}|${cicloId}|${v.decisao}`
      );
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
        // Identificação CLARA da operação demonstrativa (nada foi gravado).
        toast.info(`Demonstração: “${rotulo}” NÃO foi gravada — registro fictício (nada foi enviado ao banco).`);
        setDevolucaoAberta(false);
        setJustificativaDevolucao('');
        return;
      }
      chaveAprovacaoRef.current?.confirmar();
      // Fila, contador, versão e lista passam a refletir a MESMA decisão.
      qc.invalidateQueries({ queryKey: ['feedbacks_360_aprovacoes_gestor'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_consolidacoes'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      setDevolucaoAberta(false);
      setJustificativaDevolucao('');
      toast.success(v.decisao === 'devolvido' ? 'Avaliação devolvida para correção.' : 'Avaliação aprovada pelo gestor!');
    },
    onError: (erro: unknown) => {
      toast.error(`Decisão NÃO registrada: ${mensagemDeErro(erro)}`);
    },
  });

  const minimaDevolucao = !validarJustificativaDevolucao(justificativaDevolucao).pode;

  /* ─── Escritas (RPC transacional; nada otimista) ────────────────────────── */
  const finalizar = useMutation({
    mutationFn: (v: { acao: AcaoStatusRodape; observacao: string | null; chave: string }) =>
      servico.finalizarFeedback({
        feedbackId,
        acao: v.acao,
        motivo: v.observacao,
        idOperacao: v.chave,
      }),
    onSuccess: (resposta: { idempotente?: boolean } | null, v) => {
      // Confirmação do SERVIDOR: operação fechada (a próxima recebe chave nova).
      chavesRef.current?.get(v.acao)?.confirmar();
      // Consultas/caches afetados: lista da aba + Potencial + versão canônica.
      qc.invalidateQueries({ queryKey: ['feedbacks_360'] });
      qc.invalidateQueries({ queryKey: ['feedbacks_360_validacoes_potencial'] });
      qc.invalidateQueries({ queryKey: ['vw_feedbacks_360_versao'] });
      setMotivoAberto(null);
      setMotivo('');
      const repetida = Boolean(resposta?.idempotente);
      const mensagens: Record<AcaoStatusRodape, string> = {
        concluir: repetida ? 'Avaliação já estava concluída.' : 'Avaliação concluída!',
        cancelar: repetida ? 'Cancelamento já registrado.' : 'Avaliação cancelada (registro preservado).',
        reabrir: repetida ? 'Reabertura já registrada.' : 'Avaliação reaberta — voltou para pendente.',
      };
      toast.success(mensagens[v.acao]);
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
      toast.success('Potencial validado pelo RH.');
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

  /* Sem modo real, sem prévia local (DEV) e SEM estado de aprovação a mostrar, o
     bloco não existe — a experiência visual atual fica preservada e nenhuma
     escrita é disparada. Havendo SOLICITAÇÃO DE APROVAÇÃO, o selo do estado
     aparece em qualquer modo (é ESTADO, não escrita): era exatamente aqui que o
     modal discordava da fila "Aguardando gestor". */
  if (!modoRealOuPrevia && !aprovacao) return null;

  return (
    <>
      <Separator className="bg-border/50" />

      <div className="flex flex-col gap-3">
        {/* Selo do estado — MESMO controle, uma única regra: quando existe
            aprovação formal, ele mostra o estado da APROVAÇÃO; sem ela (e para
            o RH), segue mostrando a situação do Potencial. */}
        {(aprovacao || mostrarSituacao) && (
          <span
            role="status"
            className={cn(
              'inline-flex h-6 w-fit items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
              aprovacao ? aprovacao.tom : TOM_SITUACAO[situacao]
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            {aprovacao ? aprovacao.rotulo : ROTULO_SITUACAO_POTENCIAL[situacao]}
          </span>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {/* DECISÃO DO GESTOR RESPONSÁVEL — reusa os MESMOS controles aprovados
              da fila (Aprovar / Devolver + diálogo de justificativa). */}
          {podeDecidirAprovacao && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={emAndamento}
                title={decisaoDemonstrativa ? 'Operação demonstrativa — nada é gravado no banco' : undefined}
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
                disabled={emAndamento}
                title={decisaoDemonstrativa ? 'Operação demonstrativa — nada é gravado no banco' : undefined}
                onClick={() => decidirAprovacao.mutate({ decisao: 'aprovado', justificativa: null })}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Aprovar avaliação
              </Button>
            </>
          )}
          {/* Ações de CONCLUSÃO/CANCELAMENTO/REABERTURA seguem exigindo o MODO
              OPERÁVEL (registro real ou prévia): um registro fictício exibe
              apenas o estado, nunca um controle de escrita. */}
          {modoRealOuPrevia &&
            acoes.map((a: AcaoDisponivel) => {
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

          {modoRealOuPrevia && podeValidarAgora && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={emAndamento}
              onClick={() => validarPotencial.mutate()}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Validar Potencial
            </Button>
          )}
        </div>
      </div>

      {/* Diálogo de justificativa — cancelamento (motivo) ou reabertura. */}
      <Dialog
        open={motivoAberto !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setMotivoAberto(null);
            setMotivo('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {motivoAberto === 'cancelar' ? 'Cancelar avaliação' : 'Reabrir avaliação'}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {item.avaliado} · {item.tipoRotulo} · {item.data}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
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
          </div>

          <DialogFooter className="gap-2">
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
        </DialogContent>
      </Dialog>

      {/* DECISÃO DA APROVAÇÃO — devolução exige justificativa (mesmo mínimo da
          RPC e do diálogo aprovado na fila "Aguardando gestor"). */}
      <Dialog
        open={devolucaoAberta}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setDevolucaoAberta(false);
            setJustificativaDevolucao('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Devolver para correção</DialogTitle>
            <DialogDescription className="text-[11px]">
              {item.avaliado} · {item.tipoRotulo} · {item.data}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
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
          </div>

          <DialogFooter className="gap-2">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
