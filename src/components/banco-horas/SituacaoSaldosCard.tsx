/**
 * ============================================================================
 * CARD "SITUAÇÃO DOS SALDOS" — a FOTO da equipe em rosca.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ (ícone) Situação dos saldos                   │
 *   │         Saldo atual de 8 colaboradores        │
 *   ├──────────────────────────────────────────────┤
 *   │      ╭───────╮   ● Positivos   5   63%       │
 *   │      │   8   │   ● Negativos   2   25%       │
 *   │      │ Total │   ● Zerados     1   12%       │
 *   │      ╰───────╯                               │
 *   │  ─────────────────────────────────────────   │
 *   │  Saldo atual somado                +12h30    │
 *   └──────────────────────────────────────────────┘
 *
 * ── O QUE ESTA ROSCA MEDE (e o que ela NÃO mede) ────────────────────────────
 * Cada colaborador entra UMA vez, pelo `saldo_atual` do lançamento mais recente
 * dele (`saldosPorColaborador` + `resumirSituacaoSaldos`): a composição do
 * saldo de HOJE, independente do período escolhido no extrato. Créditos e
 * débitos do recorte aparecem no card de barras ao lado — misturar os dois
 * conceitos numa rosca só produziria número sem significado.
 *
 * ── MOVIMENTO ───────────────────────────────────────────────────────────────
 * O `DonutChart` é a rosca de TODO o sistema (`dashboard/DonutChart.tsx`), com o
 * preset `ANIMACAO_DONUT_CARD` (1,8 s por segmento) — o mesmo do Dashboard
 * Executivo. O portão de CICLO DE VIDA é o de `TipoVinculoCard`: o arco só é
 * montado quando (1) a entrada deste card terminou (`useEntradaCardConcluida`,
 * que ouve o `onAnimationComplete` real) e (2) existem dados. Sem isso o
 * traçado rodaria escondido atrás do fade do próprio card.
 * A legenda entra em cascata (slide de 20 px + fade), curva e atrasos de
 * `VINCULO_LEGENDA`/`atrasoLegenda` — a MESMA coreografia do "Tipo de Vínculo".
 * Com `prefers-reduced-motion`, tudo aparece pronto.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { PieChart } from 'lucide-react';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { ANIMACAO_DONUT_CARD } from '@/components/dashboard/donutMotion';
import { VINCULO_LEGENDA, atrasoLegenda } from '@/components/dashboard/estruturaAnimacoes';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { formatarHorasBanco, type SituacaoSaldos } from './bancoHorasComum';
import { CartaoSecaoBancoHoras } from './CartaoSecaoBancoHoras';

/** Paleta das três fatias — tokens do Design System, nunca hex solto. */
const CORES_SITUACAO = {
  positivos: 'hsl(var(--success))',
  negativos: 'hsl(var(--destructive))',
  zerados: 'hsl(var(--muted-foreground))',
} as const;

export interface SituacaoSaldosCardProps {
  situacao: SituacaoSaldos;
  isLoading: boolean;
  /** Posição na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
}

export function SituacaoSaldosCard({ situacao, isLoading, index = 0 }: SituacaoSaldosCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index);

  const fatias = [
    { chave: 'positivos', label: 'Positivos', value: situacao.positivos, color: CORES_SITUACAO.positivos },
    { chave: 'negativos', label: 'Negativos', value: situacao.negativos, color: CORES_SITUACAO.negativos },
    { chave: 'zerados', label: 'Zerados', value: situacao.zerados, color: CORES_SITUACAO.zerados },
  ] as const;

  const total = situacao.total;
  // O arco só é montado quando o card já entrou E há dados — o portão documentado
  // acima. Enquanto isso, casca com anel do MESMO diâmetro/espessura.
  const desenhar = entradaConcluida && !isLoading && total > 0;
  // Três estados do miolo: anel pulsando (carregando/entrando COM dados), rosca
  // pronta e base vazia. Base vazia não pulsa: não há requisição em andamento,
  // é simplesmente a resposta "nenhum colaborador com lançamento".
  const carregando = isLoading || (total > 0 && !entradaConcluida);

  return (
    <CartaoSecaoBancoHoras
      id="banco-horas-situacao"
      icone={PieChart}
      tom="bg-info/15 text-info"
      titulo="Situação dos saldos"
      /*
        A CONTAGEM VIVE NO SUBTÍTULO — o acessório ("8 colaboradores") repetia o
        número que a rosca já mostra no miolo e custava 108 px da linha do
        título, cortando o nome do card ("Situação do…") na coluna estreita. No
        subtítulo ela cabe inteira e o título aparece completo.
      */
      subtitulo={`Saldo atual de ${total} ${total === 1 ? 'colaborador' : 'colaboradores'}`}
      index={index}
      aoConcluirEntrada={aoConcluirEntrada}
    >
      {/*
        ROSCA GRANDE + LEGENDA FOLGADA — a rosca era 72 px e a proporção com a
        legenda puxava o card para baixo do peso visual dos irmãos. Agora ela é
        desenhada em 140 px (o tamanho PADRÃO do `DonutChart`, calibrado para o
        miolo de duas linhas) e encolhe proporcionalmente por CSS (`w-full` +
        `h-auto` na `<svg>`) quando a coluna fica estreita — o `viewBox`
        acompanha, então anel, espessura e texto central escalam juntos.
        O teto de largura é `100% − 7,5rem` (≈150 px): a rosca fica com TUDO o
        que sobra depois de reservar o espaço da legenda, e os três nomes
        ("Positivos", "Negativos", "Zerados") e as porcentagens aparecem
        INTEIROS em qualquer largura — sem a reticências que uma rosca fixa
        grande criaria em 1280. `rem` (e não `px`) mantém o cálculo preso à
        escala global do design system.
      */}
      <div className="flex items-center gap-[10px]">
        <div className="w-[112px] min-w-[56px] max-w-[calc(100%_-_7.5rem)] shrink-0 [&_svg]:h-auto [&_svg]:w-full">
          {desenhar ? (
            <DonutChart
              segments={fatias.map((fatia) => ({
                label: fatia.label,
                value: fatia.value,
                color: fatia.color,
              }))}
              size={140}
              strokeWidth={17}
              showLegend={false}
              {...ANIMACAO_DONUT_CARD}
            />
          ) : carregando ? (
            <div
              aria-hidden
              className="aspect-square w-full animate-pulse rounded-full border-[17px] border-muted/40"
            />
          ) : (
            /* Base vazia: nada carregado e nada a mostrar — anel estático, sem pulso. */
            <div className="flex aspect-square w-full flex-col items-center justify-center rounded-full border-[17px] border-muted/30">
              <span className="text-[13px] font-semibold leading-none text-muted-foreground">—</span>
              <span className="mt-[3px] text-[10px] leading-none text-muted-foreground">sem saldos</span>
            </div>
          )}
        </div>

        {/* Legenda: ponto de cor + nome + contagem e fatia. `divide-y` dá a
            divisória fina entre as linhas, como no "Tipo de Vínculo"; a lista é
            centralizada na altura da rosca para as três linhas não ficarem
            penduradas no topo. */}
        <ul className="flex min-w-0 flex-1 flex-col justify-center divide-y divide-border/70">
          {fatias.map((fatia, indice) => {
            const percentual = total > 0 ? Math.round((fatia.value / total) * 100) : 0;
            return (
              <motion.li
                key={fatia.chave}
                initial={movimentoReduzido || !desenhar ? false : { opacity: 0, x: VINCULO_LEGENDA.deslocamentoX }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: movimentoReduzido ? 0 : VINCULO_LEGENDA.duracaoS,
                  delay: movimentoReduzido ? 0 : atrasoLegenda(indice),
                  ease: VINCULO_LEGENDA.curva,
                }}
                className="flex items-center gap-[5px] py-[5px] text-[10px] first:pt-0 last:pb-0"
              >
                <span
                  className="h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{ backgroundColor: fatia.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{fatia.label}</span>
                <span className="shrink-0 text-[10.5px] font-medium tabular-nums">
                  {fatia.value} <span className="font-normal text-muted-foreground">({percentual}%)</span>
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Rodapé: o número que fecha a leitura da rosca — a soma dos saldos. */}
      <div className="mt-[7px] flex items-center justify-between gap-[10px] border-t border-border/40 pt-[6px]">
        <p className="text-[11px] text-muted-foreground">Saldo atual somado</p>
        <p
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            situacao.saldoTotal < 0 ? 'text-destructive' : 'text-foreground'
          )}
          title="Soma dos saldos atuais de todos os colaboradores com lançamento"
        >
          {formatarHorasBanco(situacao.saldoTotal)}
        </p>
      </div>
    </CartaoSecaoBancoHoras>
  );
}
