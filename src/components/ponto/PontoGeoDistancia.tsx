/**
 * ============================================================================
 * DISTRIBUIÇÃO POR DISTÂNCIA — barras verticais por faixa de distância.
 *
 * Reaproveita a coreografia do card "2. Visualize o impacto" (Premiações), que
 * é a régua do sistema para barras verticais: `useCrescimentoBarras` +
 * `estiloCrescimentoBarra` de `components/ui/crescimentoBarras.ts` — cada barra
 * cresce de baixo para cima por `scaleY` (900 ms, 100 ms entre barras,
 * ease-in-out senoidal) e NÃO reinicia em hover/re-render, porque o progresso
 * mora numa variável CSS do contêiner.
 *
 * Os dados vêm prontos de `faixasDeDistancia()` (`utils/pontoGeofencing`): a
 * última faixa é sempre "além do raio" e pinta em vermelho — é o que o RH
 * precisa ver primeiro. Nada é recalculado aqui.
 *
 * ── APARÊNCIA (a mesma das colunas do "Visualize o impacto") ───────────────
 * A coluna é VAZADA, como no card de referência: contorno fino (1,5 px) na cor
 * cheia do token + preenchimento da MESMA cor a 20% — o par `stroke`/
 * `fillOpacity: 0.2` do `Cell` do simulador, transposto para CSS (borda +
 * fundo). Cantos superiores de 6 px e base reta apoiada na linha do zero.
 * O valor da faixa fica ACIMA da coluna, numa faixa fixa de 18 px no topo do
 * plot: o respiro é sempre o mesmo e o número nunca escapa da área do gráfico
 * — a grade e o eixo Y começam exatamente abaixo dessa faixa.
 *
 * ── DICA (tooltip) ─────────────────────────────────────────────────────────
 * A dica (faixa · quantidade · percentual) é ancorada na COLUNA ATIVA — não em
 * uma coordenada fixa. `indiceAtivo` guarda só qual coluna está sob o ponteiro;
 * a posição é medida no DOM dentro de um `useLayoutEffect` (coluna, barra e área
 * do plot via `getBoundingClientRect`) e aplicada por `style` antes do primeiro
 * quadro pintado. Assim a caixa acompanha a coluna, fica CENTRADA
 * nela, sobe um pouco acima do topo da barra e nunca escapa dos limites do
 * gráfico (clamp nos dois eixos) — mesmo idioma já usado pela dica do "Fluxo de
 * Entradas por Horário" (`GestaoPontoAnalytics` + `PontoFluxoEntradasDica`).
 *
 * ENTRADA/SAÍDA: fade + 4 px de subida (150 ms, `easeOut` — a mesma régua de
 * `--transition-duration-tooltip`), com `AnimatePresence` para a caixa sair
 * suavemente ao tirar o mouse. A posição NÃO é interpolada: o deslocamento é de
 * entrada, não um voo até o cursor — por isso as colunas nunca se mexem.
 * ============================================================================
 */
import { useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { estiloCrescimentoBarra, useCrescimentoBarras } from '@/components/ui/crescimentoBarras';
import type { FaixaDistancia } from '@/utils/pontoGeofencing';

export interface PontoGeoDistanciaProps {
  faixas: FaixaDistancia[];
  /** Total de registros do período (denominador do percentual da dica). */
  total: number;
  /** Movimento reduzido (`useMovimentoReduzido`). */
  reduzido: boolean;
  className?: string;
}

/**
 * Cor de cada faixa — CONTORNO e PREENCHIMENTO saem do MESMO token, como no
 * `Cell` do "Visualize o impacto" (`stroke={contorno}` + `fillOpacity={0.2}`):
 * borda de 1,5 px na cor cheia e fundo da mesma cor a 20%. A última posição é a
 * faixa além do raio (`--destructive-vivid`), que é justamente a que precisa
 * saltar aos olhos. No hover o preenchimento sobe para 30% — sem sombra, sem
 * brilho e sem trocar a matiz da faixa.
 */
const CORES_FAIXA = [
  'border-success bg-success/20 group-hover:bg-success/30', // 0 – 50 m
  'border-primary bg-primary/20 group-hover:bg-primary/30', // 50 – 100 m
  'border-info bg-info/20 group-hover:bg-info/30', // 100 – 150 m
  'border-xp bg-xp/20 group-hover:bg-xp/30', // 150 – 200 m
  'border-destructive-vivid bg-destructive-vivid/20 group-hover:bg-destructive-vivid/30', // além do raio
] as const;

/** Topo do eixo Y: múltiplo de 4 logo acima do maior valor (4/8/12/16 …). */
function topoDoEixo(maiorValor: number): number {
  const base = Math.max(0, Math.ceil(maiorValor));
  return Math.max(4, Math.ceil((base + 1) / 4) * 4);
}

/**
 * Conteúdo da dica — MESMAS informações de antes (faixa, registros e
 * percentual do total), no mesmo acabamento dos outros tooltips do sistema
 * (`bg-popover`, `border-border/60`, textos de 10px).
 *
 * A entrada é fade + 4 px de subida em 150 ms (`easeOut`), a régua dos tooltips
 * de gráfico do projeto; a SAÍDA repete o fade pelo `AnimatePresence` do pai. A
 * posição é escrita pelo gráfico (`left`/`top`) — aqui não há coordenada fixa.
 */
function DicaFaixa({
  faixa,
  reduzido,
  posicao,
  elementoRef,
}: {
  faixa: FaixaDistancia;
  reduzido: boolean;
  posicao: { esquerda: number; topo: number };
  elementoRef: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={elementoRef}
      role="tooltip"
      initial={reduzido ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduzido ? { opacity: 0 } : { opacity: 0, y: 4 }}
      transition={{ duration: reduzido ? 0 : 0.15, ease: 'easeOut' }}
      // Posição vem do gráfico (medida na coluna ativa). `pointer-events-none`:
      // a caixa nunca intercepta o ponteiro — o hover continua sendo da coluna,
      // que é quem sabe qual barra está ativa.
      style={{ left: posicao.esquerda, top: posicao.topo }}
      className="pointer-events-none absolute left-0 top-0 z-10 w-[136px] rounded-lg border border-border/60 bg-popover px-2 py-1.5 shadow-[0_12px_28px_-14px_hsl(0_0%_0%/0.8)]"
    >
      <p className="text-[10px] font-semibold leading-none text-foreground">{faixa.rotulo}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] leading-none text-muted-foreground">
        <span>Registros</span>
        <span className="font-semibold tabular-nums text-foreground">{faixa.quantidade}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] leading-none text-muted-foreground">
        <span>Do total</span>
        <span
          className={cn('font-semibold tabular-nums', faixa.foraDoRaio ? 'text-destructive-vivid' : 'text-primary')}
        >
          {Math.round(faixa.percentual)}%
        </span>
      </div>
    </motion.div>
  );
}

export function PontoGeoDistancia({ faixas, total, reduzido, className }: PontoGeoDistanciaProps) {
  const refGrafico = useRef<HTMLDivElement | null>(null);
  const emVista = useInView(refGrafico, { once: true, amount: 0.35 });
  const refBarras = useCrescimentoBarras({ total: faixas.length, ativo: emVista, reduzir: reduzido });
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);
  const refDica = useRef<HTMLDivElement | null>(null);
  /** Coluna sob o ponteiro — é dela que sai a geometria da dica. */
  const refColunaAtiva = useRef<HTMLDivElement | null>(null);
  /**
   * Tamanho da caixa medido uma vez (a largura é fixa e o conteúdo tem sempre
   * as mesmas três linhas). Guardado em ref porque durante a ANIMAÇÃO DE SAÍDA
   * o `ref` da caixa pode ser zerado pelo nó que está saindo — a posição, que
   * vai por `style`/estado, continua correta em qualquer nó.
   */
  const tamanhoDicaRef = useRef({ largura: 0, altura: 0 });
  const [posicao, setPosicao] = useState({ esquerda: 0, topo: 0 });

  const topo = useMemo(() => topoDoEixo(Math.max(0, ...faixas.map((faixa) => faixa.quantidade))), [faixas]);
  const rotulosEixo = useMemo(
    () => [topo, Math.round(topo * 0.75), Math.round(topo * 0.5), Math.round(topo * 0.25), 0],
    [topo]
  );
  const faixaAtiva = indiceAtivo === null ? null : (faixas[indiceAtivo] ?? null);

  /**
   * POSIÇÃO DA DICA — medida no DOM, presa dentro do plot.
   *
   * A geometria sai de `getBoundingClientRect` (coluna ativa, barra e área do
   * gráfico), então acompanha a escala rem do sistema e a responsividade sem
   * nenhum número mágico. Roda no `useLayoutEffect`: a caixa já nasce no lugar
   * certo, no quadro em que aparece — nada de saltar de uma posição fixa para
   * a coluna sob o mouse.
   */
  useLayoutEffect(() => {
    const plot = refGrafico.current;
    const coluna = refColunaAtiva.current;
    if (!plot || !coluna) return;

    // A caixa já está no DOM neste ponto (o efeito roda depois do commit e
    // antes do primeiro quadro pintado): mede uma vez e reaproveita.
    const dica = refDica.current;
    if (dica) {
      const caixaDica = dica.getBoundingClientRect();
      tamanhoDicaRef.current = { largura: caixaDica.width, altura: caixaDica.height };
    }
    const { largura: larguraDica, altura: alturaDica } = tamanhoDicaRef.current;

    const caixaPlot = plot.getBoundingClientRect();
    const caixaColuna = coluna.getBoundingClientRect();
    const caixaBarra = (coluna.querySelector<HTMLElement>('[data-barra]') ?? coluna).getBoundingClientRect();

    /** Folga entre a caixa e o topo da barra. */
    const FOLGA = 6;

    // Horizontal: centro da coluna, preso às duas bordas do gráfico.
    const centro = caixaColuna.left + caixaColuna.width / 2 - caixaPlot.left;
    const esquerda = Math.min(Math.max(centro - larguraDica / 2, 0), Math.max(0, caixaPlot.width - larguraDica));

    // Vertical: acima da barra, preso entre o topo do plot e o pé da caixa —
    // na coluna mais alta a dica encosta no topo em vez de sair do card.
    const acimaDoTopo = caixaBarra.top - caixaPlot.top - alturaDica - FOLGA;
    const topoDica = Math.min(Math.max(acimaDoTopo, 0), Math.max(0, caixaPlot.height - alturaDica));

    setPosicao((atual) =>
      atual.esquerda === esquerda && atual.topo === topoDica ? atual : { esquerda, topo: topoDica }
    );
  }, [indiceAtivo, faixas]);

  return (
    <Card className={cn('overflow-hidden rounded-2xl border border-border/40 shadow-xs', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/40 bg-muted/30 px-4 py-2.5">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-display">
          <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Distribuição por Distância</span>
        </CardTitle>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{total} registros</span>
      </CardHeader>

      <CardContent className="p-4">
        <p className="mb-3 text-[11px] leading-none text-muted-foreground">
          Quantidade de batidas por faixa de distância
        </p>

        <div className="flex gap-2">
          {/* Eixo Y — cinco rótulos inteiros, derivados do maior valor. O
              `pt-[18px]` pula a faixa dos valores (a mesma altura do rótulo
              acima de cada coluna), então os rótulos continuam alinhados às
              linhas de grade e ao topo/pé das barras. */}
          <div className="flex h-[112px] shrink-0 flex-col justify-between pt-[18px] text-right text-[9px] leading-none tabular-nums text-muted-foreground">
            {rotulosEixo.map((rotulo) => (
              <span key={`eixo-dist-${rotulo}`}>{rotulo}</span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div ref={refGrafico} className="relative h-[112px]">
              {/* Linhas de grade discretas, uma por rótulo do eixo. A área
                  começa abaixo da faixa dos valores (`top-[18px]`) para não
                  cruzar o número que fica acima de cada coluna. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 top-[18px] flex flex-col justify-between"
              >
                {rotulosEixo.map((rotulo) => (
                  <div key={`grade-dist-${rotulo}`} className="h-px w-full bg-border/40" />
                ))}
              </div>

              {/* `refBarras`: o controlador do crescimento escreve as variáveis
                  CSS aqui; as barras leem a de cada índice. */}
              <div
                ref={refBarras}
                className="relative flex h-full items-end gap-1.5"
                onMouseLeave={() => setIndiceAtivo(null)}
              >
                {faixas.map((faixa, indice) => {
                  const altura = topo > 0 ? (faixa.quantidade / topo) * 100 : 0;
                  return (
                    // `group`: o realce da coluna é 100% CSS (`group-hover`);
                    // o índice ativo em JS serve só à dica. `data-coluna` marca
                    // a unidade de hover (a coluna inteira, não a barra).
                    <div
                      key={faixa.chave}
                      data-coluna=""
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                      onMouseEnter={(evento) => {
                        // A geometria da dica sai DESTA coluna (não do mouse):
                        // por isso a ref é gravada junto com o índice ativo.
                        refColunaAtiva.current = evento.currentTarget;
                        setIndiceAtivo(indice);
                      }}
                    >
                      {/* Valor acima da coluna — faixa FIXA de 18 px: o respiro
                          em relação ao topo da barra é sempre o mesmo e o número
                          nunca ultrapassa a área do gráfico (na coluna mais
                          alta é justamente esta faixa que sobra no topo). */}
                      <span className="flex h-[18px] w-full shrink-0 items-center justify-center text-[10.5px] font-semibold leading-none tabular-nums text-foreground">
                        {faixa.quantidade}
                      </span>

                      {/* Área da barra: `flex-1` é o que resta depois da faixa
                          do valor, e a altura em `%` é relativa a ELA — por
                          isso coluna e eixo continuam na mesma escala. */}
                      <div className="flex w-full flex-1 items-end">
                        <div
                          data-barra=""
                          style={{ ...estiloCrescimentoBarra(indice), height: `${altura}%` }}
                          className={cn(
                            'w-full rounded-t-[6px] border-[1.5px] transition-colors',
                            // Faixa sem registro não pinta barra (um contorno
                            // de 1,5 px no eixo viraria uma linha falsa). A
                            // última faixa — "além do raio" — fica vermelha
                            // mesmo quando o raio quebra em mais de 5 colunas.
                            faixa.quantidade > 0 &&
                              cn(
                                'min-h-[4px]',
                                faixa.foraDoRaio
                                  ? CORES_FAIXA[CORES_FAIXA.length - 1]
                                  : CORES_FAIXA[indice % CORES_FAIXA.length]
                              )
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dica: faixa · quantidade · percentual do total. Fica FORA do
                  contêiner das barras (não desloca coluna nenhuma) e
                  `pointer-events-none`: o hover continua sendo da coluna. Só
                  monta quando há coluna ativa; a posição é escrita pelo
                  `useLayoutEffect` acima e a saída é fade pelo `AnimatePresence`. */}
              <AnimatePresence>
                {faixaAtiva && (
                  // Sem `key`: ao passar de uma coluna para outra o MESMO nó
                  // continua montado e só o texto troca no lugar (como no
                  // tooltip de rosca do sistema) — a entrada roda uma vez por
                  // aparição, não a cada coluna. Quem se move é o `left`/`top`
                  // medido no `useLayoutEffect`.
                  <DicaFaixa faixa={faixaAtiva} reduzido={reduzido} posicao={posicao} elementoRef={refDica} />
                )}
              </AnimatePresence>
            </div>

            {/* Eixo X — rótulo compacto da faixa (`0–20`, `> 100`) com o rótulo
                completo (com "m") no `title`, porque seis colunas no card da
                direita não comportam "80 – 100 m" por extenso. */}
            <div className="mt-1.5 flex gap-1.5">
              {faixas.map((faixa) => (
                <span
                  key={`rotulo-${faixa.chave}`}
                  className={cn(
                    'min-w-0 flex-1 truncate text-center text-[9px] tabular-nums',
                    faixa.foraDoRaio ? 'text-destructive-vivid' : 'text-muted-foreground'
                  )}
                  title={faixa.rotulo}
                >
                  {faixa.maximo === null ? `> ${faixa.minimo}` : `${faixa.minimo}–${faixa.maximo}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
