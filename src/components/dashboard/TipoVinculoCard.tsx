import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { entradaConteudoGlobal } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { ANIMACAO_DONUT_CARD } from './donutMotion';
import { DonutChart } from './DonutChart';
import { CORES_TIPO_VINCULO, VINCULO_LEGENDA, atrasoLegenda } from './estruturaAnimacoes';

const MotionCard = motion.create(Card);

/**
 * ============================================================================
 * CARD "TIPO DE VÍNCULO" — CICLO DE VIDA POR RENDERIZAÇÃO CONDICIONAL.
 *
 * Mesmo contrato do "Mapa da Estrutura" (`MapaEstruturaCard.tsx`):
 *
 *   if (!entradaConcluida || isLoading || !dados || total === 0)
 *                                       → casca do card + placeholders
 *                                         (anel de 104px/13px + 5 linhas);
 *   return (…)                          → `DonutChart` + lista animada.
 *
 * O portão tem DUAS condições:
 *
 *   1. `entradaConcluida` — a entrada do PRÓPRIO card (fade + subida de
 *      `entradaConteudoGlobal`) já terminou. Vem de
 *      `useEntradaCardConcluida`, que ouve o `onAnimationComplete` real do
 *      `MotionCard` da casca (ver o hook);
 *   2. os dados existem (e o total não é zero).
 *
 * O gráfico NÃO é instanciado em background: ele só entra no DOM depois que o
 * card está visível e as requisições terminaram, então a API interna de
 * animação (o `strokeDasharray` do `motion.circle`) desenha os arcos do zero,
 * 100% visível — 1,8 s por segmento, 0,2 s de atraso inicial, 0,15 s entre
 * segmentos (`ANIMACAO_DONUT_CARD`, o MESMO preset do card "Departamentos" do
 * Dashboard principal). Sem (1), os arcos eram desenhados junto com a entrada
 * do card e o traçado terminava escondido atrás do fade.
 *
 * As legendas (`motion.li`) também nascem junto com o bloco: a cascata de
 * `VINCULO_LEGENDA` (400 ms por linha, atrasos 100/300/500/700/900 ms) parte
 * do marco zero, contada a partir do fim da entrada do card.
 *
 * A casca (`TipoVinculoCardShell`) é o mesmo componente nos dois ramos, então
 * o `<Card>` não remonta quando o portão abre — só o `children` troca.
 * ============================================================================
 */

/** Uma linha da distribuição por regime de contratação. */
export interface VinculoItem {
  nome: string;
  value: number;
}

interface TipoVinculoCardProps {
  /** Fatias do gráfico. `null`/`undefined`/vazio = não há o que desenhar. */
  dados: readonly VinculoItem[] | null | undefined;
  /** Estado REAL das requisições que trazem o quadro (origem dos vínculos). */
  isLoading: boolean;
  /** Posição do card na cascata da linha (vira slot em `entradaConteudoGlobal`). */
  slotCascata: number;
}

/** Casca do card — idêntica nos dois ramos (cabeçalho, borda, linha do conteúdo). */
function TipoVinculoCardShell({
  slotCascata,
  aoConcluirEntrada,
  children,
}: {
  slotCascata: number;
  /** Avisa que a ENTRADA do card (fade + subida) terminou — o portão do conteúdo. */
  aoConcluirEntrada: () => void;
  children: ReactNode;
}) {
  return (
    <MotionCard
      data-entrada="cascata"
      custom={slotCascata}
      initial="hidden"
      animate="visible"
      variants={entradaConteudoGlobal}
      // Fim da entrada deste card = evento real do Framer Motion (mesmo nó que
      // anima `hidden → visible`), não uma estimativa de tempo.
      onAnimationComplete={aoConcluirEntrada}
      className="border border-border/30 rounded-2xl overflow-hidden"
    >
      {/* Ícone fora do CardTitle (mesmo ajuste dos outros cards desta linha). Tom
          `xp` (roxo): no dark mode `--accent` é um cinza quase idêntico ao fundo
          do card — o badge ficava praticamente invisível — e o padrão do resto
          do sistema é o badge "chapado" (`bg-{cor}/10 text-{cor}`). */}
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <div className="h-7 w-7 rounded-lg bg-[hsl(var(--xp))]/10 text-[hsl(var(--xp))] flex items-center justify-center shrink-0">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-sm font-display">Tipo de Vínculo</CardTitle>
          <p className="text-[11px] text-muted-foreground">Distribuição por regime de contratação</p>
        </div>
      </CardHeader>
      {children}
    </MotionCard>
  );
}

export function TipoVinculoCard({ dados, isLoading, slotCascata }: TipoVinculoCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(slotCascata);

  const total = (dados ?? []).reduce((acc, v) => acc + v.value, 0);

  // CORTA-FOGO. Sem entrada concluída, sem dados (ou total zero) NÃO existe
  // gráfico montado: apenas a casca com o anel de mesmo diâmetro/espessura e 5
  // linhas na altura das legendas — mesma geometria, zero animação de entrada.
  if (!entradaConcluida || isLoading || !dados || total === 0) {
    return (
      <TipoVinculoCardShell slotCascata={slotCascata} aoConcluirEntrada={aoConcluirEntrada}>
        <CardContent className="p-3 pt-1 flex items-center gap-3">
          <div
            aria-hidden
            className="h-[104px] w-[104px] shrink-0 rounded-full border-[13px] border-muted/40 animate-pulse"
          />
          <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 rounded-full bg-muted/50 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </TipoVinculoCardShell>
    );
  }

  // A PARTIR DAQUI o conteúdo existe: entrada do card concluída e dados na mão
  // → montagem = arco do zero + cascata da legenda a partir de 0 ms.
  return (
    <TipoVinculoCardShell slotCascata={slotCascata} aoConcluirEntrada={aoConcluirEntrada}>
      <CardContent className="p-3 pt-1 flex items-center gap-3">
        <DonutChart
          segments={dados.map((v, i) => ({
            label: v.nome,
            value: v.value,
            color: CORES_TIPO_VINCULO[i % CORES_TIPO_VINCULO.length],
          }))}
          size={104}
          strokeWidth={13}
          showLegend={false}
          // MESMO preset do card "Departamentos" do Dashboard principal:
          // 1,8 s por segmento, 0,2 s de atraso, 0,15 s entre segmentos.
          {...ANIMACAO_DONUT_CARD}
          className="shrink-0"
        />
        {/* `divide-y`: uma linha fina separando cada item da legenda. Percentual
            antes da contagem — só a contagem não diz a fatia relativa. */}
        <ul className="min-w-0 flex-1 divide-y divide-border/70">
          {dados.map((v, i) => (
            // `motion.li` renderiza o MESMO `<li>` (o `divide-y` continua
            // funcionando): muda só a entrada — slide-in de 20px + fade, 400 ms,
            // com atraso EXPLÍCITO por linha (`atrasoLegenda`).
            <motion.li
              key={v.nome}
              initial={movimentoReduzido ? false : { opacity: 0, x: VINCULO_LEGENDA.deslocamentoX }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: movimentoReduzido ? 0 : VINCULO_LEGENDA.duracaoS,
                delay: movimentoReduzido ? 0 : atrasoLegenda(i),
                ease: VINCULO_LEGENDA.curva,
              }}
              className="flex items-center gap-1.5 py-1.5 text-[11px] first:pt-0 last:pb-0"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CORES_TIPO_VINCULO[i % CORES_TIPO_VINCULO.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.nome}</span>
              <span className="font-display font-medium">
                {Math.round((v.value / total) * 100)}%{' '}
                <span className="text-muted-foreground font-normal">({v.value})</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </CardContent>
    </TipoVinculoCardShell>
  );
}
