import { Award } from 'lucide-react';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { CASCADE_SAIDA_RAPIDA } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { PELE_QUADRANTE, QUADRANTE_POR_CHAVE, type PontoNineBox } from './nineBoxComum';

/**
 * ============================================================================
 * JANELA "TALENTOS EM DESTAQUE" — o destino do botão "Ver todos" do widget
 * lateral do Nine-Box.
 *
 * ── ANIMAÇÃO: A MESMA JANELA "PENDÊNCIAS" (por construção) ──────────────────
 * A janela NÃO replica a coreografia: ela usa o MESMO componente do popup
 * "Pendências" (`PendenciasDialog` → `AnimatedCascadeDialog` →
 * `CascadeDialogFrame` → `ui/cascade-motion.ts`). Consequência direta: véu
 * (`bg-black/60` + `backdrop-blur-sm`), caixa que nasce quadrada e estica em
 * três fases (0,9 s, origem `top center`) e cascata bloco a bloco com 0,12 s de
 * intervalo são exatamente os de "Pendências" — mudar um número em
 * `cascade-motion.ts` move as duas juntas. Nenhum arquivo compartilhado foi
 * tocado para CRIAR esta janela.
 *
 * ── ÚNICA DIFERENÇA: A SAÍDA É RÁPIDA (`CASCADE_SAIDA_RAPIDA`) ──────────────
 * Aqui cada talento é um BLOCO da cascata, então a janela abre com
 * `talentos + 1` blocos. A saída padrão é SEQUENCIAL (`0,12 s` entre blocos, e a
 * caixa só encolhe depois do último): com 7 talentos o X levava **1,67 s** para
 * a janela desaparecer (3,2 s com 20) — o usuário relata "demora muito pra
 * fechar", e com razão. Esta janela passa `perfilSaida={CASCADE_SAIDA_RAPIDA}`:
 * a lista dissolve praticamente de uma vez (`0,08 s` de espalhamento total) e a
 * caixa encolhe em `0,26 s` — **0,62 s** de fechamento, constante de 3 a 40
 * linhas. A ABERTURA continua idêntica à de "Pendências" (cascata linha a
 * linha, 0,4 s por bloco, 0,12 s de intervalo): nada do desenho aprovado mudou,
 * só o tempo de sair.
 *
 * Assim como na referência, cada talento é um BLOCO da cascata (`items`), então
 * a lista entra linha a linha, e o corpo rola por dentro (`max-h-[65vh]`) sem
 * esticar a janela quando o recorte tem muita gente.
 *
 * ── CONTEÚDO: O MESMO DO CARD, SÓ QUE COMPLETO ──────────────────────────────
 * O card mostra os 3 primeiros do ranking; aqui aparecem TODOS os classificados
 * do recorte atual (já filtrados por busca/departamento/cargo/PDI/atenção na
 * aba). Cada linha traz só o que o card já exibe — avatar, nome, cargo ·
 * departamento, quadrante e as duas notas — nada é inventado (sem posição de
 * ranking, sem ação, sem edição).
 * ============================================================================
 */

interface NineBoxTalentosDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Ranking completo do recorte (`rankingPontos`: do maior somatório ao menor). */
  ranking: PontoNineBox[];
}

export function NineBoxTalentosDialog({ aberto, onOpenChange, ranking }: NineBoxTalentosDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={aberto}
      onOpenChange={onOpenChange}
      title="Talentos em destaque"
      titleIcon={Award}
      titleIconClassName="h-5 w-5 text-warning"
      emptyMessage="Nenhum colaborador classificado neste recorte."
      perfilSaida={CASCADE_SAIDA_RAPIDA}
      items={ranking.map((p) => (
        <div key={p.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/30 p-3">
          {/* Avatar — mesmo tratamento do card e da janela do quadrante. */}
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-border/60">
            {p.foto ? (
              <img src={p.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                {iniciais(p.nome)}
              </span>
            )}
          </span>

          {/* Identificação — nome e, logo abaixo, cargo · departamento. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{p.nome}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {[p.cargo, p.departamento].filter(Boolean).join(' · ') || 'Sem cargo e departamento cadastrados'}
            </p>
          </div>

          {/* Classificação — a mesma pele de quadrante usada na matriz e no card. */}
          {p.quadrante && (
            <span
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                PELE_QUADRANTE[p.quadrante].tinta,
                PELE_QUADRANTE[p.quadrante].borda
              )}
            >
              {QUADRANTE_POR_CHAVE[p.quadrante].nome}
            </span>
          )}

          {/* Métricas — as duas notas reais, em coluna alinhada à direita. */}
          <div className="grid shrink-0 grid-cols-[auto_1.25rem] items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight">
            <span className="text-muted-foreground">Desempenho</span>
            <span className="text-right font-semibold tabular-nums text-foreground">{p.nota ?? '—'}</span>
            <span className="text-muted-foreground">Potencial</span>
            <span className="text-right font-semibold tabular-nums text-foreground">{p.potencial ?? '—'}</span>
          </div>
        </div>
      ))}
    />
  );
}
