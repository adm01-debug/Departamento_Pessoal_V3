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
import { Ban, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';

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
  podeValidarPotencial,
  situacaoPotencial,
  type AcaoDisponivel,
  type PapelApp,
  type SituacaoPotencial,
  type ValidacaoPotencialLida,
} from './acoesFeedback';
import { tipoFeedback, type FeedbackDerivado } from './feedbacksComum';

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
}

export function FeedbackAcoesRodape({ item, previa }: { item: FeedbackDerivado; previa?: PreviewAcoes }) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const f = (item?.feedback ?? {}) as Record<string, unknown>;

  const feedbackId = String(f?.id ?? '').trim();
  const empresaId = String(f?.empresa_id ?? '').trim();
  const cicloId = String(f?.ciclo_id ?? '').trim();
  const statusAtual = normalizarStatus(f?.status);

  /* ─── Prévia local (DEV) × operação real ─────────────────────────────────── */
  const emPrevia = import.meta.env.DEV && !!previa;
  const modoRealOuPrevia = modoRealAtivo() || emPrevia;
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

  /* ─── Elegibilidade dos controles ───────────────────────────────────────── */
  const acoes = acoesDisponiveis({ statusAtual: f?.status, papel: papelStatus });
  const conclusao = validarConclusao(f);
  const potencialValido = notaNaEscala(f?.potencial) !== null;
  const ehAvaliacaoDoGestor = tipoFeedback(f?.tipo) === 'gestor';
  const podeValidarAgora =
    podeValidar && ehAvaliacaoDoGestor && statusAtual === 'concluido' && potencialValido && situacao !== 'validada';
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
  const emAndamento = finalizar.isPending || validarPotencial.isPending;

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

  /* Em demonstração o bloco NÃO existe: experiência atual preservada. */
  /* Sem modo real E sem prévia local (DEV): o bloco não existe — a experiência
     visual atual fica preservada e nenhuma escrita é disparada. */
  if (!modoRealOuPrevia) return null;

  return (
    <>
      <Separator className="bg-border/50" />

      <div className="flex flex-col gap-3">
        {/* Indicador discreto da situação do Potencial (avaliação do gestor). */}
        {mostrarSituacao && (
          <span
            role="status"
            className={cn(
              'inline-flex h-6 w-fit items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
              TOM_SITUACAO[situacao]
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            {ROTULO_SITUACAO_POTENCIAL[situacao]}
          </span>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {acoes.map((a: AcaoDisponivel) => {
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

          {podeValidarAgora && (
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
    </>
  );
}
