import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { Calendar, MessageSquare, Target, TrendingDown, TrendingUp, User, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { EstrelasNota } from './EstrelasNota';
import { tomTipoFeedback } from './feedbacksComum';
import {
  TEXTO_NAO_INFORMADO,
  normalizarFeedback,
  textoDoCampo,
  textoNota,
  type FeedbackCanonico,
} from './feedbackCanonico';
import type { FeedbackDerivado } from './feedbacksComum';
import type { EstadoAprovacao } from './aprovacaoGestor';
import { FeedbackAcoesRodape, type ContextoAcoes, type PreviewAcoes, type ServicoAcoes } from './FeedbackAcoesRodape';

/**
 * ============================================================================
 * DIALOG DE DETALHE DO FEEDBACK — ação "Ver avaliação".
 *
 * PADRONIZAÇÃO: o modal é o MESMO para qualquer ciclo/tipo/status e lê o modelo
 * canônico (`FeedbackCanonico`). As seções NÃO desaparecem quando o campo está
 * vazio — elas mostram o estado padronizado ("Não informado"), e o mesmo
 * acontece com o PDI e com o Gestor responsável.
 *
 * CAMPOS E ORIGENS (nada é inventado):
 *   • Avaliado por        → `feedbacks_360.avaliador` (relação) / `avaliador_id`;
 *   • Gestor responsável  → vínculo do colaborador (`supervisor_id`) via fila;
 *   • Datas               → `created_at` + `data_fim` do ciclo + `potencial`;
 *   • Conteúdo            → `pontos_fortes`, `pontos_melhoria`, `comentarios`;
 *   • PDI                 → `competencia_foco` do PDI do avaliado;
 *   • Ações               → `FeedbackAcoesRodape` com `getFeedbackActions`.
 *
 * A moldura é a compartilhada (`CascadeDialogFrame`), a MESMA animação de
 * abertura/fechamento da janela "Pendências".
 * ============================================================================
 */

export interface FeedbackDetalheDialogProps {
  /**
   * Modelo canônico (caminho normal da aba) OU registro apenas derivado
   * (chamadores antigos, prévia DEV). O diálogo normaliza o segundo formato.
   */
  item: FeedbackCanonico | FeedbackDerivado | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Ação real: filtra a timeline por este colaborador. */
  onFiltrarAvaliado?: (nome: string) => void;
  /**
   * SOMENTE PRÉVIA LOCAL (DEV): serviço e papel simulados repassados ao rodapé.
   * Sem efeito em produção — ver `PreviewAcoes` em `FeedbackAcoesRodape.tsx`.
   */
  previa?: PreviewAcoes;
  /**
   * ESTADO DA APROVAÇÃO FORMAL do gestor para esta avaliação — a MESMA instância
   * derivada pela fila "Aguardando gestor" (`aprovacaoGestor.estadoAprovacao`).
   */
  estadoAprovacao?: EstadoAprovacao | null;
  /**
   * VITRINE: serviço com persistência LOCAL repassado ao rodapé (os mesmos
   * controles executam a ação sem tocar no Supabase). Ausente = modo real.
   */
  servicoDemo?: ServicoAcoes;
  /**
   * ETAPA em que o modal foi aberto — define as ações de STATUS oferecidas no
   * rodapé (`avaliacoes` | `aguardando_gestor` | `rh`). Devolver/Aprovar são
   * sempre exibidos, em qualquer etapa.
   */
  contexto?: ContextoAcoes;
}

/** Bloco de texto longo (título + parágrafo) — SEMPRE renderizado. */
function Bloco({
  icone,
  titulo,
  texto,
  tinta,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto: unknown;
  tinta: string;
}) {
  const conteudo = String(texto ?? '').trim();

  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
      <p className={cn('flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider', tinta)}>
        {icone}
        {titulo}
      </p>
      <p
        className={cn(
          'text-[12px] leading-relaxed',
          conteudo ? 'text-muted-foreground' : 'italic text-muted-foreground/70'
        )}
      >
        {conteudo || TEXTO_NAO_INFORMADO}
      </p>
    </div>
  );
}

/** Caixa de informação curta (rótulo + valor), com estado vazio padronizado. */
function Caixa({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{rotulo}</p>
      {children}
    </div>
  );
}

export function FeedbackDetalheDialog({
  item: entrada,
  aberto,
  onOpenChange,
  onFiltrarAvaliado,
  previa,
  estadoAprovacao,
  servicoDemo,
  contexto = 'avaliacoes',
}: FeedbackDetalheDialogProps) {
  if (!entrada) return null;

  /**
   * ACEITA OS DOIS FORMATOS: o modelo canônico (caminho normal da aba) ou um
   * registro apenas derivado (chamadores antigos/testes). O diálogo normaliza
   * sozinho para nunca depender de campos que o chamador "deveria" ter montado.
   */
  const item: FeedbackCanonico = Array.isArray((entrada as FeedbackCanonico).acoes)
    ? (entrada as FeedbackCanonico)
    : normalizarFeedback(entrada as FeedbackDerivado);

  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');
  const temNota = item.desempenho.estado === 'informado' && item.desempenho.valor !== null;

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={6}
      className="max-w-2xl border-border rounded-none sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      {/* ── Cabeçalho: colaborador · tipo · status · nota · estrelas · faixa ── */}
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {iniciais(item.avaliado)}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate font-display text-base">{item.avaliado}</DialogTitle>
              <DialogDescription className="truncate text-[11px]">
                {local || 'Sem cargo e departamento cadastrados'}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
                    tomTipoFeedback(item.feedback?.tipo)
                  )}
                >
                  {textoDoCampo(item.tipoCampo)}
                </span>
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
                    item.status.tom
                  )}
                >
                  {item.status.rotulo}
                </span>
                <span className="inline-flex h-6 items-center rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {textoDoCampo(item.cicloNome)}
                </span>
                {item.pdi.estado === 'informado' && (
                  <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Target className="h-3 w-3 shrink-0" />
                    Foco no PDI: {textoDoCampo(item.pdi)}
                  </span>
                )}
              </div>
            </div>

            {/* Nota — número + estrelas + faixa textual (ou o estado vazio). */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  'font-display text-2xl font-semibold leading-none tabular-nums',
                  temNota ? item.faixa.tinta : 'text-muted-foreground'
                )}
              >
                {textoNota(item.desempenho, '—')}
              </span>
              {temNota && <EstrelasNota nota={item.nota} tinta={item.faixa.tinta} tamanho="h-4 w-4" />}
              {temNota ? (
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    item.faixa.badge
                  )}
                >
                  {item.faixa.rotulo}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sem nota</span>
              )}
            </div>
          </div>
        </DialogHeader>
      </motion.div>

      {/* ── Responsáveis e datas — campos reais, origens distintas ──────────── */}
      <motion.div variants={cascadeItemVariants} className="grid gap-3 sm:grid-cols-3">
        <Caixa rotulo="Avaliado por">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {iniciais(item.avaliadorCampo.estado === 'informado' ? item.avaliadorCampo.valor : TEXTO_NAO_INFORMADO)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium leading-tight">
                {textoDoCampo(item.avaliadorCampo)}
              </span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                {textoDoCampo(item.tipoCampo)}
              </span>
            </span>
          </div>
        </Caixa>

        <Caixa rotulo="Gestor responsável">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
              <UserCheck className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'block truncate text-[12px] font-medium leading-tight',
                  item.gestorResponsavel.estado !== 'informado' && 'text-muted-foreground'
                )}
                title={
                  item.gestorResponsavel.estado === 'informado'
                    ? textoDoCampo(item.gestorResponsavel)
                    : 'Gestor responsável não identificado (colaborador sem supervisor_id)'
                }
              >
                {textoDoCampo(item.gestorResponsavel, 'Não identificado')}
              </span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                Aprovação da avaliação
              </span>
            </span>
          </div>
        </Caixa>

        <Caixa rotulo="Datas">
          <p className="flex items-center gap-1.5 text-[12px]">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {textoDoCampo(item.dataCampo)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Prazo do ciclo: {item.prazo}
            {item.potencial.estado === 'informado' ? ` · Potencial ${textoNota(item.potencial)}/5` : ''}
          </p>
        </Caixa>
      </motion.div>

      {/* ── Conteúdo — as TRÊS seções existem em qualquer registro ──────────── */}
      <motion.div variants={cascadeItemVariants} className="space-y-2">
        <Bloco
          icone={<TrendingUp className="h-3.5 w-3.5" />}
          titulo="Pontos fortes"
          texto={item.conteudo.pontosFortes.valor}
          tinta="text-success"
        />
        <Bloco
          icone={<TrendingDown className="h-3.5 w-3.5" />}
          titulo="Pontos de melhoria"
          texto={item.conteudo.pontosMelhoria.valor}
          tinta="text-warning"
        />
        <Bloco
          icone={<MessageSquare className="h-3.5 w-3.5" />}
          titulo="Comentários"
          texto={item.conteudo.comentarios.valor}
          tinta="text-muted-foreground"
        />
      </motion.div>

      {/* ── Informações complementares: PDI (sempre presente) ───────────────── */}
      <motion.div variants={cascadeItemVariants}>
        <Caixa rotulo="Informações complementares · PDI">
          <p className="flex items-center gap-1.5 text-[12px]">
            <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {item.pdi.estado === 'informado'
              ? `Competência em foco: ${textoDoCampo(item.pdi)}`
              : 'Nenhum PDI vinculado a este colaborador.'}
          </p>
        </Caixa>
      </motion.div>

      {/* ── "Ver só deste colaborador" — posição FIXA em todos os contextos ─── */}
      <motion.div variants={cascadeItemVariants} className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!onFiltrarAvaliado}
          title={onFiltrarAvaliado ? undefined : 'Filtro por colaborador indisponível nesta tela.'}
          onClick={() => {
            if (!onFiltrarAvaliado) return;
            onFiltrarAvaliado(item.avaliado);
            onOpenChange(false);
          }}
        >
          <User className="h-3.5 w-3.5" />
          Ver só deste colaborador
        </Button>
      </motion.div>

      {/* ── Rodapé operacional — badge à esquerda, Devolver/Aprovar à direita ── */}
      <motion.div variants={cascadeItemVariants}>
        <FeedbackAcoesRodape
          item={item}
          previa={previa}
          estadoAprovacao={estadoAprovacao}
          servicoDemo={servicoDemo}
          contexto={contexto}
        />
      </motion.div>
    </CascadeDialogFrame>
  );
}
