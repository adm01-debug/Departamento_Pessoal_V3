/**
 * ============================================================================
 * ABA PAGAMENTOS — DIÁLOGOS DE ESCRITA E LEITURA.
 *
 * Os TRÊS diálogos da aba, com as MESMAS chamadas de serviço do quadro de
 * aprovação anterior (`premiacoesService.atualizarStatusPagamento`,
 * `reconciliarFolha`, `autoConciliarComFolha` — disparadas por `PagamentosTab`):
 *
 *   1. APROVAÇÃO / REJEIÇÃO / REINÍCIO — um único diálogo de confirmação, com o
 *      comentário opcional que vai para o histórico do pagamento (o "Último
 *      comentário" que o quadro antigo exibia). Título e rótulo do botão dizem
 *      exatamente o que vai acontecer.
 *   2. CONCILIAÇÃO COM A FOLHA — valor real lido da folha + justificativa; quem
 *      decide entre `conciliado` e `divergente` é o SERVIÇO (compara com o valor
 *      aprovado) — nenhuma regra é duplicada aqui.
 *   3. DETALHES — leitura do registro: valores, status, conciliação e o histórico
 *      completo de mudanças (a trilha que já era gravada no banco).
 *
 * São componentes de APRESENTAÇÃO controlados: o estado das ações e a invalidação
 * das queries ficam em `PagamentosTab`.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, History, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { type PagamentoHub } from './premiacoesComum';
import { rotuloStatusPagamento, valorDoPagamento } from './pagamentosComum';

/** Ação de escrita carregada no diálogo de confirmação. */
export interface AcaoPendente {
  pagamento: PagamentoHub;
  /** Status de destino real (`revisando`, `rejeitado`, `calculado`, ...). */
  nextStatus: string;
}

interface PagamentosDialogsProps {
  aprovacao: AcaoPendente | null;
  onFecharAprovacao: () => void;
  onConfirmarAprovacao: (comentario: string) => void;
  conciliacao: PagamentoHub | null;
  onFecharConciliacao: () => void;
  onConfirmarConciliacao: (valorFolha: string, justificativa: string) => void;
  detalhes: PagamentoHub | null;
  onFecharDetalhes: () => void;
  /** Enquanto o serviço grava, os botões de confirmação ficam desabilitados. */
  salvando?: boolean;
}

/** Título/rótulo do diálogo conforme o destino REAL da escrita. */
function textosAcao(nextStatus: string | undefined) {
  if (nextStatus === 'rejeitado') {
    return {
      titulo: 'Confirmar Rejeição',
      descricao: 'Justifique o motivo da rejeição deste pagamento.',
      botao: 'Rejeitar Pagamento',
      destrutivo: true,
    };
  }
  if (nextStatus === 'calculado') {
    return {
      titulo: 'Reiniciar Fluxo',
      descricao: 'O pagamento volta ao primeiro estágio da cadeia (Aguardando gestor).',
      botao: 'Reiniciar Fluxo',
      destrutivo: false,
    };
  }
  return {
    titulo: 'Confirmar Aprovação',
    descricao: 'Adicione um comentário opcional para este estágio da aprovação.',
    botao: 'Aprovar e Avançar',
    destrutivo: false,
  };
}

export function PagamentosDialogs({
  aprovacao,
  onFecharAprovacao,
  onConfirmarAprovacao,
  conciliacao,
  onFecharConciliacao,
  onConfirmarConciliacao,
  detalhes,
  onFecharDetalhes,
  salvando = false,
}: PagamentosDialogsProps) {
  const [comentario, setComentario] = useState('');
  const [valorFolha, setValorFolha] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const textos = textosAcao(aprovacao?.nextStatus);

  const fecharAprovacao = () => {
    setComentario('');
    onFecharAprovacao();
  };

  const fecharConciliacao = () => {
    setValorFolha('');
    setJustificativa('');
    onFecharConciliacao();
  };

  return (
    <>
      {/* 1 · Aprovar / rejeitar / reiniciar — MESMA moldura de "Pendências"
          (`CascadeDialogFrame`): véu com blur, caixa de dentro para fora,
          cascata dos três blocos e saída na ordem inversa. */}
      <CascadeDialogFrame
        open={!!aprovacao}
        onOpenChange={(aberto) => !aberto && fecharAprovacao()}
        blocks={3}
        className="sm:max-w-[425px]"
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {textos.destrutivo ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {textos.titulo}
            </DialogTitle>
            <DialogDescription>{textos.descricao}</DialogDescription>
          </DialogHeader>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <div className="py-4">
            <div className="mb-4 rounded-2xl bg-muted/30 p-4">
              <p className="text-xs font-medium">{aprovacao?.pagamento.colaborador?.nome_completo}</p>
              <p className="text-[10px] text-muted-foreground">{aprovacao?.pagamento.campanha?.nome}</p>
              <p className="mt-2 text-sm font-medium text-primary">
                {aprovacao ? formatCurrency(valorDoPagamento(aprovacao.pagamento)) : '—'}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Próximo estágio: {aprovacao ? rotuloStatusPagamento(aprovacao.nextStatus) : '—'}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="comentario-aprovacao">
                Comentário / Justificativa
              </label>
              <Textarea
                id="comentario-aprovacao"
                placeholder="Escreva aqui..."
                className="h-24 resize-none rounded-xl text-xs"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>
          </div>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <DialogFooter>
            <Button variant="outline" onClick={fecharAprovacao} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirmarAprovacao(comentario)}
              disabled={salvando}
              className={`rounded-xl px-8 ${
                textos.destrutivo ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'
              }`}
            >
              {textos.botao}
            </Button>
          </DialogFooter>
        </motion.div>
      </CascadeDialogFrame>

      {/* 2 · Conciliação com a folha — mesma moldura compartilhada. */}
      <CascadeDialogFrame
        open={!!conciliacao}
        onOpenChange={(aberto) => !aberto && fecharConciliacao()}
        blocks={3}
        className="sm:max-w-[425px]"
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Conciliação com a Folha
            </DialogTitle>
            <DialogDescription>
              Compare o valor aprovado com o lançamento real na folha de pagamento.
            </DialogDescription>
          </DialogHeader>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 rounded-2xl border border-border/10 bg-muted/30 p-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Colaborador:</span>
                <span className="font-medium">{conciliacao?.colaborador?.nome_completo}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Valor Aprovado:</span>
                <span className="text-numeric font-medium">
                  {formatCurrency(Number(conciliacao?.valor_aprovado ?? conciliacao?.valor_calculado ?? 0))}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="valor-folha">
                Valor Real na Folha
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <input
                  id="valor-folha"
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-border/50 bg-background py-2 pl-8 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus-visible:outline-hidden"
                  placeholder="0,00"
                  value={valorFolha}
                  onChange={(e) => setValorFolha(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label
                className="text-xs font-medium uppercase text-muted-foreground"
                htmlFor="justificativa-conciliacao"
              >
                Justificativa (obrigatória se houver divergência)
              </label>
              <Textarea
                id="justificativa-conciliacao"
                placeholder="Ex: Diferença de impostos retidos..."
                className="resize-none rounded-xl text-xs"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          </div>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <DialogFooter>
            <Button variant="outline" onClick={fecharConciliacao} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirmarConciliacao(valorFolha, justificativa)}
              disabled={salvando || !valorFolha}
              className="rounded-xl px-8"
            >
              Salvar Conciliação
            </Button>
          </DialogFooter>
        </motion.div>
      </CascadeDialogFrame>

      {/* 3 · Detalhes (leitura) — mesma moldura compartilhada. */}
      <CascadeDialogFrame
        open={!!detalhes}
        onOpenChange={(aberto) => !aberto && onFecharDetalhes()}
        blocks={3}
        className="sm:max-w-[520px]"
      >
        <motion.div variants={cascadeItemVariants}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Detalhes do pagamento
            </DialogTitle>
            <DialogDescription>
              {detalhes?.colaborador?.nome_completo} · {detalhes?.campanha?.nome}
            </DialogDescription>
          </DialogHeader>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <div className="grid gap-3 py-3 text-xs">
            <dl className="grid grid-cols-2 gap-2 rounded-2xl border border-border/20 bg-muted/20 p-4">
              <dt className="text-muted-foreground">Valor calculado</dt>
              <dd className="text-numeric text-right">{formatCurrency(Number(detalhes?.valor_calculado ?? 0))}</dd>
              <dt className="text-muted-foreground">Valor aprovado</dt>
              <dd className="text-numeric text-right">
                {detalhes?.valor_aprovado ? formatCurrency(Number(detalhes.valor_aprovado)) : '—'}
              </dd>
              <dt className="text-muted-foreground">Valor na folha</dt>
              <dd className="text-numeric text-right">
                {detalhes?.valor_folha_real ? formatCurrency(Number(detalhes.valor_folha_real)) : '—'}
              </dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right font-medium">{rotuloStatusPagamento(detalhes?.status)}</dd>
              <dt className="text-muted-foreground">Conciliação</dt>
              <dd className="text-right font-medium">{detalhes?.status_conciliacao ?? 'pendente'}</dd>
              {detalhes?.data_pagamento && (
                <>
                  <dt className="text-muted-foreground">Pago em</dt>
                  <dd className="text-right font-medium">{formatDateTime(detalhes.data_pagamento)}</dd>
                </>
              )}
            </dl>

            {detalhes?.justificativa_divergencia && (
              <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-[11px] text-warning">
                {detalhes.justificativa_divergencia}
              </p>
            )}

            {detalhes?.observacoes && (
              <p className="text-[11px] italic text-muted-foreground">{detalhes.observacoes}</p>
            )}

            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Histórico de mudanças
              </p>
              {Array.isArray(detalhes?.historico_mudancas) && detalhes.historico_mudancas.length > 0 ? (
                <ol className="space-y-2">
                  {(detalhes.historico_mudancas as { status?: string; comentario?: string; data?: string }[]).map(
                    (item, i) => (
                      <li key={i} className="rounded-xl border border-border/20 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{rotuloStatusPagamento(item.status)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(item.data)}</span>
                        </div>
                        {item.comentario && <p className="mt-1 text-[11px] text-muted-foreground">{item.comentario}</p>}
                      </li>
                    ),
                  )}
                </ol>
              ) : (
                <p className="text-[11px] text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
              )}
            </div>
          </div>
        </motion.div>
        <motion.div variants={cascadeItemVariants}>
          <DialogFooter>
            <Button variant="outline" onClick={onFecharDetalhes} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </motion.div>
      </CascadeDialogFrame>
    </>
  );
}
