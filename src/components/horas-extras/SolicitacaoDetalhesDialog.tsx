/**
 * ============================================================================
 * DIÁLOGO "VER DETALHES" — leitura completa de uma solicitação.
 *
 * SOMENTE LEITURA: este diálogo não busca, não grava e não recalcula nada —
 * mostra o registro que a página já tem em memória (o mesmo objeto da tabela e
 * do cartão de aprovação). As duas ações opcionais apenas REPASSAM o registro
 * aos handlers da página, que chamam `aprovar`/`rejeitar` do serviço; depois de
 * decidir, a página fecha o diálogo para não exibir um estado defasado.
 *
 * ANIMAÇÃO — a MESMA janela do popup "Pendências" do sistema (a referência
 * pedida), exatamente como a modal "Nova solicitação" ao lado: `PendenciasDialog`
 * abre por `AnimatedCascadeDialog`, cuja moldura é `CascadeDialogFrame`
 * (`ui/cascade-dialog.tsx`). Aqui ela é usada DIRETAMENTE porque esta janela
 * tem layout próprio (cabeçalho + identificação + dados + motivo + rodapé),
 * igual às outras janelas grandes do sistema. Nenhum número é recriado: o véu
 * (`cascadeOverlayVariants`), a casca que abre "de dentro para fora"
 * (`cascadeShellVariants`) e a cascata dos blocos (`cascadeItemVariants`) vêm
 * de `ui/cascade-motion.ts`.
 *
 *   • Abertura: véu escurecendo + caixa nascendo pequena e crescendo até o
 *     tamanho final (0,9 s, `easeInOut`) e, SÓ DEPOIS que ela termina, os
 *     blocos entram de baixo (`y: 8`) — cabeçalho primeiro, rodapé por último.
 *   • Fechamento: a cascata some de trás para frente e a caixa só então encolhe
 *     (altura, depois largura). O conteúdo permanece MONTADO até o fim da
 *     transição (`forceMount` + `AnimatePresence` da moldura), então não há
 *     piscada nem salto de layout.
 *
 * GEOMETRIA PRESERVADA sobre a casca compartilhada: `sm:max-w-[560px]`,
 * `rounded-none sm:rounded-lg` e o corpo `grid gap-3 p-5` são os do antigo
 * `DialogContent`. O X continua no mesmo canto (é o da própria moldura) e o
 * Radix continua ligando `aria-labelledby`/`aria-describedby` ao conteúdo —
 * foco, Esc e devolução de foco ao fechar seguem intocados.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import {
  dataDaRealizacao,
  dataDaSolicitacao,
  departamentoDoColaborador,
  formatarHoras,
  nomeDoColaborador,
  rotuloStatus,
  seloStatus,
  statusDe,
  type SolicitacaoHoraExtra,
} from './horasExtrasComum';

export interface SolicitacaoDetalhesDialogProps {
  /** Registro em leitura; `null` mantém o diálogo fechado. */
  solicitacao: SolicitacaoHoraExtra | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAprovar?: (s: SolicitacaoHoraExtra) => void;
  onRejeitar?: (s: SolicitacaoHoraExtra) => void;
}

/**
 * Blocos que cascateiam — a contagem alimenta o `delay` com que a casca começa a
 * encolher na saída (um bloco por seção, na ordem em que aparecem):
 * 1 cabeçalho · 2 identificação · 3 dados · 4 motivo · 5 rodapé.
 */
const BLOCOS_CASCATA = 5;

/**
 * A solicitação já decidida ganha o bloco "Decisão" antes do rodapé — ele entra
 * na fila, então a cascata passa a ter seis blocos.
 */
const BLOCOS_CASCATA_COM_DECISAO = BLOCOS_CASCATA + 1;

/** Linha rótulo/valor do bloco de dados. */
function Fato({ rotulo, valor, className }: { rotulo: string; valor: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-foreground" title={valor}>
        {valor}
      </p>
    </div>
  );
}

export function SolicitacaoDetalhesDialog({
  solicitacao,
  open,
  onOpenChange,
  onAprovar,
  onRejeitar,
}: SolicitacaoDetalhesDialogProps) {
  /**
   * LATCH DO ÚLTIMO REGISTRO — a moldura mantém o conteúdo MONTADO durante a
   * saída (`forceMount` + `AnimatePresence`), mas a página zera `solicitacao`
   * no mesmo clique em que fecha. Sem guardar o último registro não nulo, a
   * caixa encolheria VAZIA e os textos piscariam antes de sumir. É o mesmo
   * ajuste-na-renderização (padrão do React para reagir a prop, o mesmo de
   * `NovaVagaDialog`) usado em `NovaSolicitacaoDialog` para o rascunho: nenhum
   * efeito colateral, só a memória do que estava na tela.
   */
  const [registro, setRegistro] = useState(solicitacao);
  if (solicitacao && solicitacao !== registro) setRegistro(solicitacao);

  const pendente = registro ? statusDe(registro.status) === 'pendente' : false;
  const nome = registro ? nomeDoColaborador(registro) : '';
  const departamento = registro ? departamentoDoColaborador(registro) : null;

  /**
   * O bloco "Decisão" só existe depois do veredito. A condição sai do REGISTRO
   * (e não da prop) para não mudar no meio da animação de saída — `blocks` é o
   * que define o `delay` do encolhimento da casca.
   */
  const mostrarDecisao = Boolean(
    registro && !pendente && (registro.observacoes_aprovador?.trim() || registro.aprovado_em)
  );

  return (
    <CascadeDialogFrame
      // `open` continua sendo a única fonte de verdade da abertura: quando a
      // página zera o registro, a moldura toca a animação de SAÍDA (com o
      // conteúdo latcheado acima) e só então desmonta a janela.
      open={open && Boolean(solicitacao)}
      onOpenChange={onOpenChange}
      blocks={mostrarDecisao ? BLOCOS_CASCATA_COM_DECISAO : BLOCOS_CASCATA}
      // Geometria da janela PRESERVADA sobre a casca compartilhada: o raio
      // (`rounded-none` no mobile, `sm:rounded-lg` daí para cima), a largura
      // (`sm:max-w-[560px]`) e a cor da borda são os do antigo `DialogContent`.
      className="border-border sm:max-w-[560px] rounded-none sm:rounded-lg"
      // Mesmo corpo do `DialogContent`: coluna de 3 (12 px) com 5 (20 px) de respiro.
      contentClassName="grid gap-3 p-5"
    >
      {registro && (
        <>
          {/* BLOCO 1 — cabeçalho. Os componentes são os mesmos de antes
              (`DialogHeader`/`DialogTitle`/`DialogDescription`), então o Radix
              continua ligando `aria-labelledby`/`aria-describedby` à janela: a
              animação entra por fora, sem trocar a semântica. */}
          <motion.div variants={cascadeItemVariants}>
            <DialogHeader>
              <DialogTitle>Detalhes da solicitação</DialogTitle>
              <DialogDescription>Registrada em {dataDaSolicitacao(registro)}</DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* BLOCO 2 — identificação: avatar, nome, departamento e selo de status. */}
          <motion.div variants={cascadeItemVariants}>
            <div className="flex items-start gap-3">
              <UserAvatar name={nome} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground" title={nome}>
                  {nome}
                </p>
                <p className="truncate text-xs text-muted-foreground">{departamento ?? 'Departamento não informado'}</p>
              </div>
              <Badge variant="outline" className={cn('shrink-0', seloStatus(registro.status))}>
                {rotuloStatus(registro.status)}
              </Badge>
            </div>
          </motion.div>

          {/* BLOCO 3 — o bloco de dados (realização, horas, solicitação, status). */}
          <motion.div variants={cascadeItemVariants}>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <Fato rotulo="Data da realização" valor={dataDaRealizacao(registro)} />
              <Fato rotulo="Horas solicitadas" valor={formatarHoras(registro.horas_solicitadas)} />
              <Fato rotulo="Data da solicitação" valor={dataDaSolicitacao(registro)} />
              <Fato rotulo="Status" valor={rotuloStatus(registro.status)} />
            </div>
          </motion.div>

          {/* BLOCO 4 — motivo informado na solicitação. */}
          <motion.div variants={cascadeItemVariants}>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Motivo</p>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground">
                {registro.motivo?.trim() || 'Motivo não informado'}
              </p>
            </div>
          </motion.div>

          {/* BLOCO 5 (só depois do veredito) — a decisão registrada. */}
          {mostrarDecisao && (
            <motion.div variants={cascadeItemVariants}>
              <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Decisão</p>
                {registro.observacoes_aprovador?.trim() && (
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground">
                    {registro.observacoes_aprovador.trim()}
                  </p>
                )}
                {registro.aprovado_em && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Decidida em {formatDate(registro.aprovado_em)}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ÚLTIMO BLOCO — rodapé: "Fechar" e, enquanto pendente, a decisão. */}
          <motion.div variants={cascadeItemVariants}>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {pendente && (onAprovar || onRejeitar) && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {/* Os DOIS botões são o MESMO `Button variant="outline"` com o
                      MESMO ícone, tamanho, raio, padding e peso de fonte — a
                      única diferença é a cor semântica: `danger` no veredito
                      negativo e `success` no positivo. Nada de lime (`primary`)
                      aqui: lime é cor de AÇÃO, não de VEREDITO nos cartões e
                      nesta janela. O hover escurece o fundo translúcido em
                      ambos (não existe token `success-hover`, então o texto
                      permanece em `--success`). */}
                  {onRejeitar && (
                    <Button
                      variant="outline"
                      className="border-danger/45 bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger-hover"
                      onClick={() => onRejeitar(registro)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                  )}
                  {onAprovar && (
                    <Button
                      variant="outline"
                      className="border-success/45 bg-success/10 text-success hover:bg-success/20 hover:text-success"
                      onClick={() => onAprovar(registro)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                  )}
                </div>
              )}
            </DialogFooter>
          </motion.div>
        </>
      )}
    </CascadeDialogFrame>
  );
}
