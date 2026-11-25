/**
 * @fileoverview Card "Pendências de Ponto" do Controle de Ponto (2ª linha, 2ª coluna).
 *
 * Reúne as pendências que travam o fechamento da folha de ponto e que o sistema
 * realmente sabe medir:
 *  - marcação incompleta (registro com entrada e sem a saída final);
 *  - solicitação de ajuste aguardando decisão do RH;
 *  - colaborador ativo sem nenhuma batida no dia.
 *
 * Nada aqui é número fixo de vitrine: os três valores chegam por prop, vindos
 * de `useRegistrosPontoEmpresa` / `useSolicitacoesAjustePontoPendentes` /
 * `batidas_ponto` do dia. Categorias que a referência mostra e o sistema NÃO
 * mede (ex.: "falhas de processamento") não são exibidas — não há contagem real
 * para elas.
 *
 * Apresentação: uma linha compacta por categoria (badge circular com a
 * contagem, nome + descrição curta, chevron que leva à aba de gestão).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { VERMELHO_FUNDO, VERMELHO_TEXTO } from './vermelhoVibrante';

interface PontoPendenciasCardProps {
  /** Registros com entrada registrada e sem a última saída. */
  jornadasAbertas?: number;
  /** `solicitacoes_ajuste_ponto` com status `pendente`. */
  ajustesPendentes?: number;
  /** Colaboradores ativos sem nenhuma batida hoje. */
  colaboradoresSemRegistro?: number;
  /** Leva o usuário para a aba de gestão (onde as pendências são tratadas). */
  onRevisar?: () => void;
}

export function PontoPendenciasCard({
  jornadasAbertas = 0,
  ajustesPendentes = 0,
  colaboradoresSemRegistro = 0,
  onRevisar,
}: PontoPendenciasCardProps) {
  const total = jornadasAbertas + ajustesPendentes + colaboradoresSemRegistro;

  const itens = [
    {
      rotulo: 'Marcações incompletas',
      descricao: 'entradas ou saídas sem correspondência',
      valor: jornadasAbertas,
      circulo: 'bg-warning/15 text-warning',
    },
    {
      rotulo: 'Solicitações de ajuste',
      descricao: 'aguardando análise do RH',
      valor: ajustesPendentes,
      circulo: `${VERMELHO_FUNDO} ${VERMELHO_TEXTO}`,
    },
    {
      rotulo: 'Sem batida hoje',
      descricao: 'colaboradores ativos sem registro',
      valor: colaboradoresSemRegistro,
      circulo: 'bg-info/15 text-info',
    },
  ];

  return (
    <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3 flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-lg',
                total > 0 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Pendências de Ponto
            </p>
            <Badge variant={total > 0 ? 'warning' : 'success'} size="sm" className="shrink-0 font-body tabular-nums">
              {total > 0 ? total : 'Em dia'}
            </Badge>
          </div>

          {total === 0 ? (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-2.5 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <p className="text-[11px] font-body text-muted-foreground">Nenhuma pendência aberta na competência.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-1">
              {itens.map(({ rotulo, descricao, valor, circulo }) => (
                <button
                  key={rotulo}
                  type="button"
                  onClick={onRevisar}
                  disabled={!onRevisar}
                  className="group flex w-full min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2 py-1.5 text-left transition-colors hover:bg-accent/40 disabled:cursor-default disabled:hover:bg-background/50"
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-[11px] font-semibold tabular-nums',
                      circulo
                    )}
                  >
                    {valor}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-body font-medium leading-tight">{rotulo}</span>
                    <span className="block truncate text-[9px] leading-tight text-muted-foreground">{descricao}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}

          {onRevisar && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 rounded-lg gap-1.5 font-body text-[11px]"
              onClick={onRevisar}
            >
              Revisar pendências
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
