/**
 * @fileoverview Card "Fechamento do Ponto" do Controle de Ponto (2ª linha, 3ª coluna).
 *
 * Mostra o andamento da apuração da competência corrente: a janela de apuração
 * em destaque, o percentual de colaboradores ativos com registro processado no
 * mês e quantos registros seguem com jornada incompleta.
 *
 * "Processado" aqui significa que existe `registros_ponto` do colaborador na
 * competência — é exatamente o que a edge function `processar-ponto` grava ao
 * consolidar as batidas do dia. Diferente de uma barra decorativa, o
 * preenchimento recebe só o valor real calculado; o percentual aparece compacto
 * ao lado dela, porque quem comunica a evolução é a barra.
 *
 * BARRA: gradiente horizontal do verde-lima da marca (`--primary`) até o verde
 * semântico (`--success`), preenchendo da esquerda para a direita com a régua
 * global do sistema (`propsPreenchimentoBarra` → 1,2 s, `ease-out`, ver
 * `ui/progressMotion.ts`). A animação só parte quando a entrada do CARD
 * termina (`useEntradaCardConcluida`) — antes disso o card está em fade e a
 * barra encheria escondida. Depois de concluída ela não se repete: `progresso`
 * vira o percentual real e os valores de `animate` não mudam mais.
 *
 * LAYOUT (referência aprovada — tudo empilhado, sem área morta):
 *   cabeçalho · caixa do período · barra + percentual · linha de processamento
 *   · botão. A ORDEM vem de margens explícitas (`mt-*`), não de `gap`: cada
 *   bloco declara a distância do anterior, então nada fica colado nem solto.
 *
 * ALTURA: o card acompanha a linha da grade (`h-full`), como os vizinhos
 * (Banco de Horas e Pendências). A sobra de altura que o card mais alto da
 * linha impõe NÃO vira buraco: `justify-between` reparte esses poucos pixels
 * entre os quatro intervalos, e cada `mt-*` continua sendo o piso de cada
 * distância. O botão, portanto, não é empurrado para o rodapé — ele fecha o
 * conteúdo com a mesma folga de 15px do resto.
 *
 * ESCALA: o `<html>` do produto é 125% (`src/index.css`) e o plugin
 * `scripts/postcss-escala-rem.mjs` converte as utilities em `px` arbitrário
 * para `rem`. Logo, todo `text-[Npx]`/`h-[Npx]` daqui vale N × 1,25 na tela:
 * a barra de `h-[7px]` mede 8,75px reais e a caixa do período tem 12,5px de
 * respiro real.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarRange, FileCheck2 } from 'lucide-react';
import { propsPreenchimentoBarra } from '@/components/ui/progressMotion';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cardVariants } from '@/components/dashboard/MetricCard';

/** Posição deste card na fila de entrada (o MESMO número do `custom`). */
const SLOT_ENTRADA_CARD = 9;

interface PontoFechamentoCardProps {
  /** Primeiro dia da competência (`YYYY-MM-DD`). */
  inicio: string;
  /** Último dia da competência (`YYYY-MM-DD`). */
  fim: string;
  /** Colaboradores ativos com ao menos um registro na competência. */
  processados?: number;
  /** Colaboradores ativos da empresa (denominador). */
  colaboradores?: number;
  /** Registros com jornada incompleta na competência. */
  pendentes?: number;
  /** Leva o usuário para a aba de gestão (onde o fechamento é conferido). */
  onAcompanhar?: () => void;
}

/** `YYYY-MM-DD` → `dd/MM/yyyy` (lido ao meio-dia para não deslocar o dia em UTC-3). */
function formatarDataCompleta(iso: string): string {
  if (!iso) return '--/--/----';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PontoFechamentoCard({
  inicio,
  fim,
  processados = 0,
  colaboradores = 0,
  pendentes = 0,
  onAcompanhar,
}: PontoFechamentoCardProps) {
  const percentual = colaboradores > 0 ? Math.min(100, Math.round((processados / colaboradores) * 100)) : 0;
  const concluido = colaboradores > 0 && processados >= colaboradores;

  // A barra só começa a encher quando a entrada do card termina de verdade
  // (`onAnimationComplete`), e não no commit da montagem — senão o
  // preenchimento de 1,2 s roda atrás do fade. `reduzirMovimento` nasce com o
  // valor final (sem espera, sem varredura).
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(SLOT_ENTRADA_CARD, slotSequencial);
  const progresso = entradaConcluida || reduzirMovimento ? percentual : 0;

  return (
    <motion.div
      custom={SLOT_ENTRADA_CARD}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onAnimationComplete={aoConcluirEntrada}
      className="h-full"
    >
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3 flex flex-1 flex-col justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
              <FileCheck2 className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Fechamento do Ponto
            </p>
            <Badge variant={concluido ? 'success' : 'outline'} size="sm" className="shrink-0 font-body">
              {concluido ? 'Completo' : 'Em andamento'}
            </Badge>
          </div>

          {/* Período de apuração: ícone em quadrado à esquerda, legenda curta
              em cima e as duas datas embaixo, com a seta entre elas. Respiro
              moderado (12,5px reais) — sem faixa alta nem folga sobrando. */}
          <div className="mt-2.5 flex min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] uppercase leading-none tracking-widest text-muted-foreground">
                Período de apuração
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-none tabular-nums">
                <span className="truncate">{formatarDataCompleta(inicio)}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatarDataCompleta(fim)}</span>
              </div>
            </div>
          </div>

          {/* Evolução do fechamento: a barra toma quase toda a largura e o
              percentual real fica ao lado, os dois centrados na mesma linha.
              O preenchimento é um `motion.div` de `width` 0 → percentual
              (régua global: 1,2 s, `ease-out`) com o gradiente lima → success
              cobrindo EXATAMENTE a parte preenchida — no `Progress` (que anda
              por `translateX`) o gradiente ficaria preso à largura da trilha e
              a fatia visível perderia o verde-lima da ponta. */}
          <div className="mt-3 flex min-w-0 items-center gap-2.5">
            <div
              role="progressbar"
              aria-label="Colaboradores processados na competência"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentual}
              className="relative h-[7px] min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"
            >
              <motion.div
                {...propsPreenchimentoBarra(progresso, { reduzir: reduzirMovimento })}
                className="h-full rounded-full bg-gradient-to-r from-primary to-success"
              />
            </div>
            <span className="shrink-0 font-display text-[12px] font-semibold leading-none tabular-nums">
              {percentual}%
            </span>
          </div>

          {/* Processamento logo abaixo da barra: nada de seção intermediária.
              A linha quebra (`flex-wrap`) em card estreito para o badge de
              pendência descer em vez de picar o texto em "process…". */}
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-body">
            <span className="min-w-0 text-muted-foreground">
              <span className="tabular-nums text-foreground">
                {processados} de {colaboradores}
              </span>{' '}
              colaboradores processados
            </span>
            {pendentes > 0 && (
              <Badge variant="warning" size="sm" className="shrink-0 font-body tabular-nums">
                {pendentes} com pendência
              </Badge>
            )}
          </div>

          {/* Botão na sequência do conteúdo (14px reais acima), não colado no
              rodapé de um container alto: quem define a altura é o conteúdo. */}
          {onAcompanhar && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full h-8 rounded-lg gap-1.5 font-body text-[11px]"
              onClick={onAcompanhar}
            >
              Acompanhar fechamento
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
