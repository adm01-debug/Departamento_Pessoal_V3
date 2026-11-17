import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Mail, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import { CandidatoTimeline } from './CandidatoTimeline';
import { ETAPAS, etapaPorId, estiloAvatar, iniciaisDoNome } from './pipelineEtapas';
import { TONS_PIPELINE } from './pipelineVisual';

/**
 * ============================================================================
 * RECRUTAMENTO — JANELA DE DETALHES DO CANDIDATO (dossiê em faixas)
 *
 * Cabeçalho compacto (avatar · nome · cargo · departamento · etapa · score),
 * faixa de contato, indicador do processo seletivo, histórico em toda a largura
 * e rodapé de ações. A altura acompanha o conteúdo: o casco só cresce até
 * `max-h-[90dvh]` e, passando disso, apenas a faixa do histórico rola — o
 * cabeçalho e o rodapé continuam visíveis. Não há `h-[85vh]`, `flex-1` com
 * `justify-between` nem área vazia para empurrar o rodapé.
 *
 * REGRAS DE NEGÓCIO INTACTAS: nada aqui move etapa por conta própria. "Avançar"
 * chama o MESMO `onAvancar` da página (`avancarEtapa`), o botão só aparece
 * quando existe uma próxima etapa real e o fechamento (X, Fechar, Escape,
 * clique no véu) devolve `onClose`.
 *
 * ANIMAÇÃO: `CascadeDialogFrame` — a moldura animada oficial do sistema
 * (`ui/cascade-motion.ts`, a mesma das janelas de Admissões/Auditoria). O
 * `blocks` é a quantidade de faixas que cascateiam; nenhum número de animação é
 * inventado aqui.
 * ============================================================================
 */

/** Faixas que entram em cascata: cabeçalho, contato, etapas, histórico, rodapé. */
const BLOCOS_CASCATA = 5;

interface CandidatoDetalhesDialogProps {
  /** Controla a janela. Os dados continuam montados durante a saída animada. */
  open: boolean;
  candidatura: CandidaturaComRelacoes | null;
  onClose: () => void;
  /** Mesma função da página — preserva permissões e validação de transição. */
  onAvancar: () => void;
}

/** Nota no padrão pt-BR (`4,9`); ausente/inválida → `null` (nada é exibido). */
function formatarNota(nota: number | null | undefined): string | null {
  if (nota === null || nota === undefined) return null;
  const numero = Number(nota);
  if (!Number.isFinite(numero)) return null;
  return numero.toFixed(1).replace('.', ',');
}

function limpar(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim();
  return texto ? texto : null;
}

export function CandidatoDetalhesDialog({ open, candidatura, onClose, onAvancar }: CandidatoDetalhesDialogProps) {
  const exibida = candidatura;

  const nome = exibida?.candidato?.nome ?? 'Candidato';
  const etapa = etapaPorId(exibida?.etapa);
  const tom = TONS_PIPELINE[etapa.id];
  const IconeEtapa = etapa.icone;
  const indiceEtapa = ETAPAS.findIndex((item) => item.id === etapa.id);
  const proximaEtapa = indiceEtapa >= 0 ? ETAPAS[indiceEtapa + 1] : undefined;
  const nota = formatarNota(exibida?.nota_geral);
  const email = limpar(exibida?.candidato?.email);
  const telefone = limpar(exibida?.candidato?.telefone);
  const cargo = limpar(exibida?.vaga?.titulo);
  const departamento = limpar(exibida?.vaga?.departamento);
  const temContato = Boolean(email || telefone);

  return (
    <CascadeDialogFrame
      open={open}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
      blocks={BLOCOS_CASCATA}
      className="flex max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-[940px] flex-col rounded-3xl border-border/40 bg-card shadow-2xl"
      contentClassName="flex min-h-0 flex-col"
    >
      {exibida && (
        <div data-candidato-detalhes className="flex min-h-0 flex-col">
          {/* 1 · CABEÇALHO — identificação à esquerda, etapa à direita do nome. */}
          <motion.div
            variants={cascadeItemVariants}
            data-modal-faixa="cabecalho"
            className="shrink-0 border-b border-border/40 px-5 pb-4 pr-12 pt-5 sm:px-6 sm:pb-5 sm:pr-14 sm:pt-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 basis-full items-start gap-3.5 sm:flex-1 sm:basis-0">
                <span
                  aria-hidden
                  style={estiloAvatar(nome)}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-display text-lg font-semibold tracking-tight"
                >
                  {iniciaisDoNome(nome)}
                </span>
                <div className="min-w-0">
                  <DialogPrimitive.Title className="truncate font-display text-[17px] font-semibold leading-tight tracking-tight text-foreground">
                    {nome}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Detalhes do processo seletivo de {nome}
                  </DialogPrimitive.Description>
                  {cargo && (
                    <p className="mt-1 truncate text-[13px] font-medium text-foreground/80" title={cargo}>
                      {cargo}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                    {departamento && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {departamento}
                      </span>
                    )}
                    {nota && (
                      <span className="inline-flex items-center gap-1 tabular-nums" title={`Score ${nota}`}>
                        <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" aria-hidden />
                        Score {nota}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={cn(
                  'ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none sm:ml-0',
                  tom.veu,
                  tom.borda
                )}
              >
                <IconeEtapa className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {etapa.label}
              </span>
            </div>
          </motion.div>

          {/* 2 · CONTATO — faixa horizontal; campos ausentes não são exibidos. */}
          {temContato && (
            <motion.div
              variants={cascadeItemVariants}
              data-modal-faixa="contato"
              className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-border/30 bg-background/50 px-5 py-2.5 text-[12.5px] sm:px-6"
            >
              {email && (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-foreground/85" title={email}>
                    {email}
                  </span>
                </span>
              )}
              {telefone && (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="tabular-nums text-foreground/85">{telefone}</span>
                </span>
              )}
            </motion.div>
          )}

          {/* 3 · ETAPAS DO PROCESSO — 5 segmentos; só a etapa ATUAL recebe cor.
              Não há inferência de etapas concluídas: o registro só informa onde o
              candidato está, então as demais faixas ficam neutras. */}
          <motion.div
            variants={cascadeItemVariants}
            data-modal-faixa="etapas"
            className="shrink-0 border-b border-border/30 px-5 py-3.5 sm:px-6"
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Etapas do processo
              </h3>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Etapa atual
                <span className={cn('font-semibold', tom.tinta)}>{etapa.label}</span>
              </p>
            </div>
            <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Etapas do processo seletivo">
              {ETAPAS.map((item) => {
                const atual = item.id === etapa.id;
                return (
                  <li key={item.id} className="min-w-0" aria-current={atual ? 'step' : undefined}>
                    <span
                      aria-hidden
                      className={cn('block h-1.5 rounded-full transition-colors', !atual && 'bg-border/40')}
                      style={atual ? { background: `hsl(var(--${item.token}))` } : undefined}
                    />
                    <span
                      className={cn(
                        'mt-1.5 block truncate text-center text-[10px] leading-tight sm:text-[11px]',
                        atual ? 'font-semibold text-foreground' : 'text-muted-foreground/70'
                      )}
                    >
                      <span className="sm:hidden">{item.id === 'teste' ? 'Teste' : item.label}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </motion.div>

          {/* 4 · HISTÓRICO — única faixa rolável quando o conteúdo passa do
              limite de altura; ocupa 100% da largura útil do modal. */}
          <motion.div
            variants={cascadeItemVariants}
            data-modal-faixa="historico"
            className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6"
          >
            <CandidatoTimeline candidaturaId={exibida.id} />
          </motion.div>

          {/* 5 · RODAPÉ — imediatamente após o conteúdo; sem `mt-auto`. */}
          <motion.div
            variants={cascadeItemVariants}
            data-modal-faixa="rodape"
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/40 bg-muted/20 px-5 py-3 sm:px-6"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-3 font-medium"
              onClick={onClose}
            >
              Fechar
            </Button>
            {proximaEtapa && (
              <Button size="sm" className="h-8 gap-1.5 rounded-lg px-3 font-semibold" onClick={onAvancar}>
                Avançar para {proximaEtapa.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </CascadeDialogFrame>
  );
}

