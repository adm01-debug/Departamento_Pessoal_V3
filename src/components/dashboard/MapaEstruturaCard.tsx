import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Building2, IdCard, Layers, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { entradaConteudoGlobal } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { ESTRUTURA_MAPA_CARD } from './estruturaAnimacoes';

const MotionCard = motion.create(Card);

/**
 * ============================================================================
 * CARD "MAPA DA ESTRUTURA" — CICLO DE VIDA POR RENDERIZAÇÃO CONDICIONAL.
 *
 * O card tem DOIS `return` e o conteúdo animado só existe no segundo:
 *
 *   if (!entradaConcluida || isLoading || !dados)
 *                             → casca do card + placeholders estáticos (sem
 *                               `motion.*` nenhum, nada para "queimar");
 *   return (…)                → as 5 estatísticas animadas, montadas do zero.
 *
 * O portão tem DUAS condições, nesta ordem de importância:
 *
 *   1. `entradaConcluida` — a entrada do PRÓPRIO card (fade + subida de
 *      `entradaConteudoGlobal`) já terminou. Vem de
 *      `useEntradaCardConcluida`, que ouve o `onAnimationComplete` real do
 *      `MotionCard` da casca (ver o hook);
 *   2. `isLoading`/`dados` — os números existem.
 *
 * Sem (1) as estatísticas montavam junto com o card e a cascata interna rodava
 * ESCONDIDA atrás do fade da entrada: quando o card ficava visível, os 900 ms
 * já tinham passado. Agora a montagem — que é o gatilho, sem `setTimeout` e
 * sem `animate` condicional — acontece depois da entrada, então cada
 * `motion.div` parte do próprio `initial` (`opacity: 0` +
 * `y: ESTRUTURA_MAPA_CARD.deslocamentoY`) na cascata de `ESTRUTURA_MAPA_CARD`
 * (500 ms por card, 140 ms entre um card e o próximo) e é vista.
 *
 * Se os dados chegarem DEPOIS do fim da entrada, o conteúdo anima na chegada
 * deles (item 2 do portão) — nunca uma animação vazia. Se os dados forem
 * atualizados depois, o card não remonta (a régua não recomeça).
 *
 * A casca (`EstruturaCardShell`) é o MESMO componente nos dois ramos, então o
 * `<Card>` não remonta quando o portão abre — o que troca é só o `children`.
 * ============================================================================
 */

/** Números exibidos nas 5 estatísticas do card. */
export interface MapaEstruturaDados {
  departamentos: number;
  times: number;
  cargos: number;
  liderancas: number;
  niveis: number;
}

interface MapaEstruturaCardProps {
  /** Dados do card. `null`/`undefined` = não há o que desenhar ainda. */
  dados: MapaEstruturaDados | null | undefined;
  /**
   * Estado REAL das requisições que trazem esses números (departamentos,
   * cargos e quadro de colaboradores — origem de times e vínculos).
   */
  isLoading: boolean;
  /** Posição do card na cascata da linha (vira slot em `entradaConteudoGlobal`). */
  slotCascata: number;
}

/** Casca do card — idêntica nos dois ramos (cabeçalho, borda, grid do conteúdo). */
function EstruturaCardShell({
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
      className="lg:col-span-4 border border-border/30 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Ícone sólido, arredondado (era `rounded-lg`, mais quadrado) + fora do
          CardTitle, ao lado do bloco título+subtítulo. */}
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-sm font-display">Mapa da Estrutura</CardTitle>
          <p className="text-[11px] text-muted-foreground">Visão consolidada da organização</p>
        </div>
      </CardHeader>
      {children}
    </MotionCard>
  );
}

export function MapaEstruturaCard({ dados, isLoading, slotCascata }: MapaEstruturaCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(slotCascata);

  // CORTA-FOGO. Enquanto a entrada do card não termina OU os dados não chegam,
  // SÓ a casca com placeholders entra no DOM: nenhum `motion.div` das
  // estatísticas é montado (nada de animação rodando escondida atrás do fade).
  if (!entradaConcluida || isLoading || !dados) {
    return (
      <EstruturaCardShell slotCascata={slotCascata} aoConcluirEntrada={aoConcluirEntrada}>
        <CardContent className="p-3 pt-2 flex-1 grid grid-cols-5 gap-2.5">
          {/* Mesma casca das 5 estatísticas (borda, padding, badge do ícone,
              altura do número, rótulo e tarja), sem valor e sem animação. */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="rounded-xl border border-border/30 bg-background/50 p-3 flex flex-col justify-center min-w-0"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-muted/60 animate-pulse" />
                <div className="h-6 w-10 rounded-md bg-muted/60 animate-pulse" />
              </div>
              <div className="mt-2.5 h-3 w-4/5 rounded-full bg-muted/50 animate-pulse" />
              <div className="mt-1.5 h-0.5 w-6 rounded-full bg-primary/40" />
            </div>
          ))}
        </CardContent>
      </EstruturaCardShell>
    );
  }

  const estatisticas = [
    { label: 'Departamentos', value: dados.departamentos, icon: Building2 },
    { label: 'Times', value: dados.times, icon: Users },
    { label: 'Cargos', value: dados.cargos, icon: IdCard },
    { label: 'Lideranças', value: dados.liderancas, icon: UserCheck },
    { label: 'Níveis hierárquicos', value: dados.niveis, icon: Layers },
  ];

  // A PARTIR DAQUI o conteúdo existe: entrada do card concluída e dados na mão
  // → montagem = início da cascata, do zero.
  return (
    <EstruturaCardShell slotCascata={slotCascata} aoConcluirEntrada={aoConcluirEntrada}>
      <CardContent className="p-3 pt-2 flex-1 grid grid-cols-5 gap-2.5">
        {estatisticas.map((item, i) => (
          <motion.div
            key={item.label}
            // `initial` fixo: a montagem já é o gatilho, então o alvo é sempre
            // o estado final. Movimento reduzido nasce pronto.
            initial={movimentoReduzido ? false : { opacity: 0, y: ESTRUTURA_MAPA_CARD.deslocamentoY }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: movimentoReduzido ? 0 : ESTRUTURA_MAPA_CARD.duracaoS,
              delay: movimentoReduzido ? 0 : i * ESTRUTURA_MAPA_CARD.intervaloS,
              ease: ESTRUTURA_MAPA_CARD.curva,
            }}
            className="rounded-xl border border-border/30 bg-background/50 p-3 flex flex-col justify-center min-w-0"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-display font-bold leading-none truncate">{item.value}</p>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground leading-tight">{item.label}</p>
            <div className="mt-1.5 h-0.5 w-6 rounded-full bg-primary" />
          </motion.div>
        ))}
      </CardContent>
    </EstruturaCardShell>
  );
}
