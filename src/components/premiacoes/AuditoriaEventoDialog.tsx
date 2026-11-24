import { motion } from 'framer-motion';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { EventoAuditoria } from './auditoriaComum';

function Valor({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-xs font-medium tabular-nums">{valor === null ? '—' : formatCurrency(valor)}</dd>
    </div>
  );
}

function Snapshot({ titulo, dados }: { titulo: string; dados: Record<string, unknown> | null }) {
  const entradas = dados ? Object.entries(dados) : [];
  return (
    <section className="space-y-1.5">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{titulo}</h4>
      {entradas.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">Não registrado neste evento.</p>
      ) : (
        <pre className="max-h-44 overflow-auto rounded-md border border-border/40 bg-muted/20 p-2 text-[10px] leading-relaxed text-muted-foreground">
          {JSON.stringify(dados, null, 2)}
        </pre>
      )}
    </section>
  );
}

/**
 * ============================================================================
 * AUDITORIA (Hub de Premiações) — DETALHE DO EVENTO.
 *
 * ANIMAÇÃO: a MESMA janela do popup "Pendências" do sistema. A referência
 * (`PendenciasDialog`) usa `AnimatedCascadeDialog`, cuja moldura animada é
 * `CascadeDialogFrame` (`ui/cascade-dialog.tsx`) — o componente compartilhado
 * (véu + casca que abre "de dentro para fora" + cascata dos blocos) que já é
 * consumido por outras janelas grandes, inclusive a "Ver detalhes" da Auditoria
 * de Desempenho. Nada de animação nova: os variants/durações vêm de
 * `ui/cascade-motion.ts`.
 *
 * CONTEÚDO/LAYOUT: inalterados. A caixa mantém `max-w-2xl`, `max-h-[88vh]`,
 * rolagem interna, `bg-card`, `border-border/60` e `sm:rounded-xl`; o corpo
 * mantém `p-5` + `grid gap-3`, e cada bloco continua com as MESMAS classes.
 * ============================================================================
 */
export function AuditoriaEventoDialog({
  evento,
  aberto,
  onOpenChange,
  retornarFocoPara,
}: {
  evento: EventoAuditoria | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Botão "Ver detalhes" que abriu a janela — recebe o foco de volta no fim da saída. */
  retornarFocoPara?: HTMLElement | null;
}) {
  if (!evento) return null;
  const diferenca =
    evento.valorAnterior !== null && evento.valorPosterior !== null
      ? evento.valorPosterior - evento.valorAnterior
      : null;

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      // Cabeçalho + 2 linhas de cards + bloco de auditoria + rodapé = 5 blocos.
      // É a mesma contagem que define quando a casca começa a fechar.
      blocks={5}
      className="max-h-[88vh] max-w-2xl overflow-y-auto border-border/60 bg-card rounded-none sm:rounded-xl"
      contentClassName="grid gap-3 p-5"
      onCloseAutoFocus={
        retornarFocoPara
          ? (event) => {
              // Impede o Radix de mandar o foco ao body: devolve ao botão de origem
              // DEPOIS que a saída termina (o Content só desmonta no fim da cascata).
              event.preventDefault();
              retornarFocoPara.focus({ preventScroll: true });
            }
          : undefined
      }
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader className="space-y-2 pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/60 bg-muted/30 text-[9px] uppercase tracking-wider">
              {evento.categoriaRotulo}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{formatDateTime(evento.dataIso)}</span>
          </div>
          <DialogTitle className="text-base">{evento.titulo}</DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed">{evento.descricao}</DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants} className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-lg border border-border/40 bg-background/40 p-3">
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Identificação</h4>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-[10px] text-muted-foreground">Entidade</dt>
              <dd>
                {evento.entidade.rotulo}
                {evento.entidade.nome ? ` · ${evento.entidade.nome}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">Responsável</dt>
              <dd>{evento.responsavel.nome ?? 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">Status</dt>
              <dd>{evento.status ?? 'Não informado'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/40 bg-background/40 p-3">
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Informações financeiras
          </h4>
          <dl className="grid grid-cols-2 gap-2">
            <Valor rotulo="Valor" valor={evento.valor} />
            <Valor rotulo="Anterior" valor={evento.valorAnterior} />
            <Valor rotulo="Posterior" valor={evento.valorPosterior} />
            {diferenca !== null && <Valor rotulo="Diferença" valor={diferenca} />}
          </dl>
          {evento.valorLegenda && <p className="mt-2 text-[10px] text-muted-foreground">{evento.valorLegenda}</p>}
        </section>
      </motion.div>

      <motion.section
        variants={cascadeItemVariants}
        className="rounded-lg border border-border/40 bg-background/40 p-3"
      >
        <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Auditoria</h4>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[10px] text-muted-foreground">Operação</dt>
            <dd>{evento.acao}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Registrado em</dt>
            <dd>{formatDateTime(evento.dataIso)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] text-muted-foreground">Justificativa</dt>
            <dd className="whitespace-pre-wrap">{evento.justificativa ?? 'Não informada'}</dd>
          </div>
        </dl>
      </motion.section>

      <motion.div variants={cascadeItemVariants} className="grid gap-3 sm:grid-cols-2">
        <Snapshot titulo="Dados anteriores" dados={evento.dadosAnteriores} />
        <Snapshot titulo="Dados posteriores" dados={evento.dadosNovos} />
      </motion.div>

      <motion.div
        variants={cascadeItemVariants}
        className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3"
      >
        <p className="max-w-[70%] truncate text-[10px] text-muted-foreground" title={evento.id}>
          ID do evento: {evento.id}
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </motion.div>
    </CascadeDialogFrame>
  );
}
