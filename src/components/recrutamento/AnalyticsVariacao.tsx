import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { TendenciaKpi } from './analyticsComum';
import { cn } from '@/lib/utils';

/**
 * VARIAÇÃO "vs. PERÍODO ANTERIOR" — a leitura de movimento dos cards de KPI.
 *
 * O número grande do card é a foto da base inteira; este bloco é a única
 * leitura de MOVIMENTO da tela. Ele vem sempre no fim da linha do número, com
 * `ml-auto`, para as variações dos quatro cards caírem na mesma vertical.
 *
 * SEM LARGURA FIXA: a coluna já foi `2xl:w-[92px]` para alinhar a legenda na
 * vertical, mas a coluna fixa somada ao ícone de 55px espremia a linha do
 * número e, no card de maior variação ("−3,7 p.p."), ela quebrava para a linha
 * de baixo — o card inteiro crescia para 122px (medido em 1600 de viewport)
 * enquanto os outros três ficavam em 89px. Largura pelo conteúdo, com o bloco
 * ancorado à direita, mantém os quatro com a MESMA altura.
 *
 * A LEGENDA "vs. período anterior" só aparece em `2xl`: nos ~155px de coluna
 * de texto que o card tem em 1440 ela não cabe ao lado de "5,3%" mais
 * "−3,7 p.p." (62 + 100 > 155) e o bloco descia para a linha de baixo, levando
 * os quatro cards a 119px. A partir de 1536 de viewport sobra espaço e ela
 * entra na segunda linha do bloco, como na referência.
 *
 * O texto é o curto (`+12,5%`, `-3 dias`, `=`) e o rótulo completo da régua
 * (janela de 45 dias, o que foi comparado) fica no `title` do bloco — escrito
 * por extenso ele quebraria em três linhas.
 *
 * `null` NÃO vira "0%": sem base dos dois lados da comparação o componente não
 * renderiza nada (ver `analyticsComum.construirIndicadores`). Inventar variação
 * seria inventar dado.
 */
export function VariacaoKpi({ tendencia }: { tendencia: TendenciaKpi | null }) {
  if (!tendencia) return null;

  const Icone = tendencia.neutra ? Minus : tendencia.positiva ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="ml-auto flex shrink-0 flex-col items-end justify-center gap-0.5 text-right" title={tendencia.label}>
      <p
        className={cn(
          'inline-flex items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold leading-none',
          tendencia.neutra ? 'text-muted-foreground' : tendencia.positiva ? 'text-success' : 'text-destructive-vivid'
        )}
      >
        <Icone className="h-3 w-3 shrink-0" aria-hidden />
        {tendencia.texto}
      </p>
      <p className="hidden whitespace-nowrap text-[8.5px] leading-none text-muted-foreground/80 2xl:block">
        vs. período anterior
      </p>
    </div>
  );
}
