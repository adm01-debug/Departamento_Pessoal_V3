/**
 * @fileoverview Card "Situação da Equipe" do Controle de Ponto (1ª linha, 3ª coluna).
 *
 * Leitura compacta do dia: quatro indicadores em grade 2×2, cada um com
 * identidade cromática própria (verde/azul/âmbar/vermelho), quantidade e
 * participação sobre os colaboradores ativos. Toda a contagem vem de
 * `resumirEquipeDoDia` — a MESMA regra usada pelo card de Pendências e pelo
 * de Fechamento (a última batida do colaborador decide a jornada), então os
 * três cards nunca discordam sobre "quem está em jornada agora".
 *
 * Diagramação de cada indicador (referência aprovada): bloco HORIZONTAL com o
 * quadrado colorido do ícone à esquerda (35px de código ≈ 44px reais), número e
 * descrição empilhados à direita e o percentual solto no canto superior direito
 * (`absolute`, fora do fluxo, para não deslocar o bloco principal). Nada de
 * ícone centralizado acima do número.
 *
 * ESCALA GLOBAL: o projeto renderiza a 125% (`html { font-size: 125% }` +
 * `scripts/postcss-escala-rem.mjs`), então as medidas escritas aqui em `px`/`rem`
 * aparecem 1,25× maiores na tela — os valores abaixo miram o indicador de ~78px
 * e o quadrado do ícone de ~44px da referência.
 *
 * Regra de jornada (ver `utils/pontoEquipe`): está em jornada quem tem batida
 * hoje e não bateu a `saida` final; `emIntervalo` é o subconjunto que saiu para
 * o almoço (`saida_almoco`), exibido separado mas somado em `emJornada`.
 *
 * ENTRADA DOS QUATRO INDICADORES: cada bloco surge "de dentro para fora" —
 * opacidade 0 → 1 e escala 0,9 → 1, a partir do centro do próprio bloco — em
 * cascata na ordem de leitura (Em jornada → Em intervalo → Não iniciaram →
 * Encerraram), 100 ms entre um e o seguinte. A duração e a curva são as da
 * régua global de entrada de card (`CONFIG_ENTRADA_CARD_GLOBAL` = 520 ms,
 * `cubic-bezier(0, 0, 0.58, 1)`), e a cascata só parte quando a entrada do CARD
 * termina (`useEntradaCardConcluida`) — antes disso ela rodaria atrás do fade.
 *
 * É UMA animação por bloco: ícone, número, percentual e descrição entram junto
 * com o card a que pertencem, sem movimento próprio. Escala não afeta layout,
 * então nada desloca os vizinhos; e a animação não se repete em hover (os alvos
 * de `animate` não mudam depois de concluídos).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Coffee, LogOut, UserCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { CONFIG_ENTRADA_CARD_GLOBAL, slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import type { ColaboradorEquipe } from '@/hooks/usePontoDashboard';
import { resumirEquipeDoDia, type BatidaEquipe } from '@/utils/pontoEquipe';

/** Reexportado para quem já tipava as batidas por este componente. */
export type { BatidaEquipe };

/** Posição deste card na fila de entrada (o MESMO número do `custom`). */
const SLOT_ENTRADA_CARD = 6;

/**
 * Entrada dos indicadores internos. Escala inicial 0,9 (faixa pedida: 0,88–0,92
 * — expansão suave, sem zoom); duração e curva vêm da régua global (520 ms,
 * ease-out) e o passo da cascata é 100 ms, um pouco mais curto que os 120 ms do
 * card inteiro porque aqui são quatro blocos pequenos dentro de um card só.
 */
const ENTRADA_INDICADOR_ESCALA = 0.9;
const ENTRADA_INDICADOR_DURACAO_S = CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs / 1000;
const ENTRADA_INDICADOR_INTERVALO_S = 0.1;
const ENTRADA_INDICADOR_CURVA = CONFIG_ENTRADA_CARD_GLOBAL.curva;

interface PontoEquipeStatusCardProps {
  batidasHoje?: BatidaEquipe[];
  colaboradores?: ColaboradorEquipe[];
  /** Atalho real para a aba de gestão (onde a equipe é detalhada). */
  onVerEquipe?: () => void;
}

export function PontoEquipeStatusCard({
  batidasHoje = [],
  colaboradores = [],
  onVerEquipe,
}: PontoEquipeStatusCardProps) {
  const totalAtivos = colaboradores.length;
  // Regra de jornada em `resumirEquipeDoDia` (mesma usada pelos cards de
  // Pendências e Fechamento): a última batida decide quem está em jornada.
  const { comBatida, encerraram, emJornada, emIntervalo, semBatida, cobertura } = resumirEquipeDoDia(
    batidasHoje,
    totalAtivos
  );

  /** Quem está em jornada e NÃO está no intervalo = trabalhando agora. */
  const trabalhando = Math.max(0, emJornada - emIntervalo);
  const percentual = (valor: number) => (totalAtivos > 0 ? Math.round((valor / totalAtivos) * 100) : 0);

  // Quatro indicadores em grade 2×2 — mesma leitura do card de referência
  // (Em jornada / Em intervalo / Não iniciaram / Encerraram). Cada um tem
  // identidade cromática própria: a cor cheia fica no ícone e o MESMO matiz
  // entra translúcido no bloco (~10%) e no quadrado do ícone (~22%), sem fundo
  // sólido saturado. Os rótulos seguem os nomes reais da regra de jornada
  // ("Encerraram", não "Ocorrências") — a referência muda o texto, os dados não.
  //
  // Tema: o app inicia em `system`, então cada matiz tem uma variante escura
  // para o tema claro (`text-[#00A35F]`) — o hex vivo da referência só apareceria
  // com contraste ~1,9:1 sobre fundo branco. No dark valem os hex exatos da
  // referência (#00D97E · #00AFFF · #FFB000 · #FF3658).
  //
  // As classes vão escritas por extenso (nada de template string): o Tailwind
  // só gera a utility que encontra literalmente no código-fonte.
  const indicadores = [
    {
      rotulo: 'Em jornada',
      valor: String(trabalhando),
      pct: percentual(trabalhando),
      icone: UserCheck,
      caixa: 'bg-[#00D97E]/[0.14] text-[#009A5A] dark:bg-[#00D97E]/[0.22] dark:text-[#00D97E]',
      fundo: 'border-[#00D97E]/[0.25] bg-[#00D97E]/[0.08] dark:border-[#00D97E]/[0.20] dark:bg-[#00D97E]/[0.10]',
    },
    {
      rotulo: 'Em intervalo',
      valor: String(emIntervalo),
      pct: percentual(emIntervalo),
      icone: Coffee,
      caixa: 'bg-[#00AFFF]/[0.14] text-[#0072B2] dark:bg-[#00AFFF]/[0.22] dark:text-[#00AFFF]',
      fundo: 'border-[#00AFFF]/[0.25] bg-[#00AFFF]/[0.08] dark:border-[#00AFFF]/[0.20] dark:bg-[#00AFFF]/[0.10]',
    },
    {
      rotulo: 'Não iniciaram',
      valor: String(semBatida),
      pct: percentual(semBatida),
      icone: Clock,
      caixa: 'bg-[#FFB000]/[0.14] text-[#A86B00] dark:bg-[#FFB000]/[0.22] dark:text-[#FFB000]',
      fundo: 'border-[#FFB000]/[0.25] bg-[#FFB000]/[0.08] dark:border-[#FFB000]/[0.20] dark:bg-[#FFB000]/[0.10]',
    },
    {
      rotulo: 'Encerraram',
      valor: String(encerraram),
      pct: percentual(encerraram),
      icone: LogOut,
      caixa: 'bg-[#FF3658]/[0.14] text-[#D51F3F] dark:bg-[#FF3658]/[0.22] dark:text-[#FF3658]',
      fundo: 'border-[#FF3658]/[0.25] bg-[#FF3658]/[0.08] dark:border-[#FF3658]/[0.20] dark:bg-[#FF3658]/[0.10]',
    },
  ];

  // A cascata interna só parte quando a entrada do CARD termina de rodar
  // (`onAnimationComplete`). `reduzirMovimento` revela os quatro blocos direto
  // no estado final — sem espera e sem escala.
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(SLOT_ENTRADA_CARD, slotSequencial);
  const revelarIndicadores = reduzirMovimento || entradaConcluida;

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
        <CardContent className="@container p-3 flex flex-1 flex-col gap-1.5">
          {/* Cabeçalho: ícone do módulo, título e o selo do recorte (hoje). */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-info/15 text-info">
              <Users className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Situação da Equipe
            </p>
            <Badge variant="outline" size="sm" className="shrink-0 font-body">
              Hoje
            </Badge>
          </div>

          {totalAtivos > 0 ? (
            <>
              {/* Resumo em UMA linha (sem seção alta): quantas pessoas estão em
                  jornada e a cobertura das batidas do dia sobre os ativos. */}
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <p className="flex min-w-0 items-baseline gap-1">
                  <span className="font-display text-[13px] font-semibold leading-none tabular-nums">{emJornada}</span>
                  <span className="truncate text-[8px] uppercase tracking-wider text-muted-foreground">
                    em jornada agora
                  </span>
                </p>
                <span className="shrink-0 text-[8px] tabular-nums text-muted-foreground">
                  <span>
                    {comBatida}/{totalAtivos}
                  </span>{' '}
                  · <span>{cobertura}%</span>
                </span>
              </div>

              {/* Quatro indicadores em grade 2×2. Cada bloco é HORIZONTAL:
                  quadrado colorido do ícone à esquerda, número + descrição
                  empilhados à direita (`items-center`) e o percentual solto no
                  canto superior direito (`absolute`), fora do fluxo — assim ele
                  não empurra nem desloca o bloco principal.
                  A grade ocupa a sobra do card (`flex-1`) com duas linhas
                  iguais, e o conteúdo fica centrado no bloco: nada de
                  `justify-between` abrindo buraco entre número e descrição.
                  Abaixo de 16rem de container (320px reais) os blocos passam a
                  ocupar a largura toda, em coluna — aí não há truncamento.

                  ENTRADA: o `motion.div` é o PRÓPRIO bloco (mesmas classes e
                  mesmo nó do DOM de antes) — a expansão é uma só, do card
                  inteiro, com o `transform-origin` padrão do Framer (centro).
                  Não há animação por texto/ícone: eles entram junto. */}
              <div className="grid flex-1 grid-cols-1 content-stretch gap-2 @[16rem]:grid-cols-2">
                {indicadores.map(({ rotulo, valor, pct, icone: Icone, caixa, fundo }, indice) => (
                  <motion.div
                    key={rotulo}
                    data-indicador={rotulo}
                    initial={reduzirMovimento ? false : { opacity: 0, scale: ENTRADA_INDICADOR_ESCALA }}
                    animate={
                      revelarIndicadores ? { opacity: 1, scale: 1 } : { opacity: 0, scale: ENTRADA_INDICADOR_ESCALA }
                    }
                    transition={
                      reduzirMovimento
                        ? { duration: 0 }
                        : {
                            duration: ENTRADA_INDICADOR_DURACAO_S,
                            delay: indice * ENTRADA_INDICADOR_INTERVALO_S,
                            ease: ENTRADA_INDICADOR_CURVA,
                          }
                    }
                    className={cn(
                      'relative flex min-h-[62px] min-w-0 items-center gap-2.5 rounded-[10px] border px-2.5 py-2.5',
                      fundo
                    )}
                  >
                    {/* Ícone grande: 35px de código (43,75px reais), raio de 10px
                        (12,5px reais) e o matiz do indicador translúcido
                        (14% no tema claro, 22% no escuro). */}
                    <span className={cn('grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[10px]', caixa)}>
                      <Icone className="h-[21px] w-[21px]" />
                    </span>

                    {/* Número + descrição formam um único bloco vertical. */}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[19px] font-semibold leading-none tabular-nums">{valor}</p>
                      <p className="mt-1 truncate text-[9px] leading-none text-muted-foreground @[17rem]:text-[10px]">
                        {rotulo}
                      </p>
                    </div>

                    {/* Percentual independente, no canto superior direito. */}
                    <span className="absolute right-2.5 top-2 text-[9px] font-medium leading-none tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </motion.div>
                ))}
              </div>

              {onVerEquipe && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 rounded-lg gap-1.5 font-body text-[11px]"
                  onClick={onVerEquipe}
                >
                  Ver equipe completa
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-2.5 py-4">
              <p className="text-[11px] text-muted-foreground font-body text-center">
                Nenhum colaborador ativo vinculado à empresa.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
