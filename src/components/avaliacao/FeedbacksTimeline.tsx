import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPANSAO_ORIGEM, cardEntradaFeedback } from './animacaoFeedbacks';
import { FeedbackCard } from './FeedbackCard';
import { COR_TIPO_FEEDBACK, type FeedbackDerivado, type GrupoMes } from './feedbacksComum';

/**
 * ============================================================================
 * TIMELINE DE FEEDBACKS — coluna principal da aba "Feedbacks".
 *
 * Substitui a tabela anterior: os feedbacks são agrupados por MÊS/ANO
 * (`agruparPorMes`) e cada item vira um card premium (`FeedbackCard`), ligado a
 * um TRILHO vertical com um ponto na cor do tipo do feedback — a leitura da
 * referência, em que o mês é um marco e os feedbacks pendem dele.
 *
 * ── COORDENADOR DA ENTRADA ──────────────────────────────────────────────────
 * A coreografia (expansão do 1º card + cascata de descida dos demais, ver
 * `animacaoFeedbacks.ts`) é disparada por UM único componente: o `<motion.div>`
 * que envolve a lista inteira. Os cards só declaram `custom` + `variants` —
 * nenhum deles tem gatilho próprio. Isso garante:
 *
 *   • GATILHO DE VISIBILIDADE: `useInView` (com `once`) no contêiner — a
 *     sequência começa quando a lista entra na viewport, e não durante a
 *     transição de página com os cards fora da tela;
 *   • UMA VEZ POR APRESENTAÇÃO: `once: true` + `key` estável por card. Hover,
 *     tooltip, scroll de ida e volta, re-render e mudança de dimensões NÃO
 *     reanimam. Novo conjunto de registros (filtro/ordenação/busca) muda a
 *     `key` do coordenador (`assinatura`), que remonta e roda a sequência UMA
 *     vez para a nova apresentação — sem duplicar movimento e sem deixar
 *     registro invisível;
 *   • MOVIMENTO REDUZIDO: com a preferência ligada o coordenador já nasce no
 *     estado final (`initial="visible"`), exatamente como o resto do módulo
 *     faz — nenhuma configuração global é alterada.
 *
 * O ponto do trilho fica FORA do elemento animado: o trilho é guia fixo, então
 * só o card se move.
 * ============================================================================
 *
 * ── ALINHAMENTO COM A COLUNA LATERAL (fonte única) ──────────────────────────
 * A coluna lateral (widgets) precisa começar na MESMA altura do PRIMEIRO CARD
 * de feedback — não do marco do mês, que fica acima dele. O deslocamento é
 * exatamente a altura do marco mais o vão até o primeiro card:
 *
 *   • marco: altura FIXA em `ALTURA_MARCO_MES` — o rótulo do mês é
 *     `whitespace-nowrap`, então nunca quebra e a altura não muda com o mês
 *     apresentado nem com o dado (é o que mantém o alinhamento estável);
 *   • vão:   o `space-y-3` da seção = `VAO_MARCO_CARDS`.
 *
 * Estes dois números são a ÚNICA fonte do alinhamento: o marco usa
 * `ALTURA_MARCO_MES` como altura e a `FeedbacksTab` usa `DESLOCAMENTO_LATERAL`
 * como padding superior da coluna lateral (apenas no layout de duas colunas —
 * empilhado, a compensação não se aplica). Alterar um sem o outro desalinha.
 */
export const ALTURA_MARCO_MES = 18;
export const VAO_MARCO_CARDS = 12;
export const DESLOCAMENTO_LATERAL = ALTURA_MARCO_MES + VAO_MARCO_CARDS;

/** Fração mínima visível do contêiner para a sequência começar. */
const FRACAO_PARA_INICIAR = 0.08;

interface FeedbacksTimelineProps {
  /** Grupos já ordenados (mais recente primeiro). */
  grupos: GrupoMes[];
  /**
   * Chave da APRESENTAÇÃO (ver o bloco do coordenador): muda quando o usuário
   * troca ciclo/filtro/segmentação/ordenação, e então a sequência roda uma vez
   * para o novo recorte. NÃO deve vir dos ids do resultado.
   */
  apresentacao?: string;
  /** Movimento reduzido (ver `useMovimentoReduzido`). */
  reduzirMovimento?: boolean;
  onVerDetalhes?: (item: FeedbackDerivado) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  onFiltrarAvaliado?: (nome: string) => void;
  /** Chamado pelo estado vazio. */
  onLimpar?: () => void;
}

export function FeedbacksTimeline({
  grupos,
  apresentacao,
  reduzirMovimento = false,
  onVerDetalhes,
  onFiltrarAvaliador,
  onFiltrarAvaliado,
  onLimpar,
}: FeedbacksTimelineProps) {
  const alvo = useRef<HTMLDivElement>(null);
  /** Gatilho ÚNICO da sequência: dispara quando a lista aparece e só uma vez. */
  const emVista = useInView(alvo, { once: true, amount: FRACAO_PARA_INICIAR });

  // O índice da cascata é RELATIVO à lista (0 = primeiro card exibido, o que
  // recebe a expansão) e continua de um mês para o seguinte sem reiniciar.
  let contador = 0;
  const comIndice = grupos.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.map((item) => ({ item, indice: contador++ })),
  }));

  /**
   * Identidade da APRESENTAÇÃO, vinda do chamador: só o que o USUÁRIO escolhe
   * (ciclo, segmentação, tipo, avaliador, ordenação, pendentes). Ela NÃO é
   * derivada dos ids do resultado de propósito — a lista de feedbacks só existe
   * depois que as consultas resolvem, e uma chave por ids remontaria o
   * coordenador no meio da sequência (a animação reiniciava ~0,5 s depois de
   * começar, visível como repetição). Com a chave do chamador, a sequência roda
   * UMA vez por apresentação e nunca por chegada de dado.
   */
  const assinatura = apresentacao ?? 'lista';

  if (grupos.length === 0) {
    return (
      <motion.div
        initial={reduzirMovimento ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 px-6 py-12 text-center"
      >
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
        <p className="text-[13px] font-medium">Nenhum feedback encontrado</p>
        <p className="max-w-md text-[11px] text-muted-foreground">
          Ajuste a busca, os filtros ou a segmentação para ver outros registros.
        </p>
        {onLimpar && (
          <Button variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={onLimpar}>
            Limpar filtros
          </Button>
        )}
      </motion.div>
    );
  }

  // A `key` vive no COORDENADOR (componente abaixo), e não no `<div>` raiz: com
  // ela ali, um novo conjunto REMONTA o coordenador e o `useInView` se registra
  // no nó novo — sem isso o observador continuaria preso ao nó antigo e a
  // segunda apresentação apareceria pronta, sem sequência.
  return (
    <ListaCoordenada
      key={assinatura}
      grupos={comIndice}
      reduzirMovimento={reduzirMovimento}
      onVerDetalhes={onVerDetalhes}
      onFiltrarAvaliador={onFiltrarAvaliador}
      onFiltrarAvaliado={onFiltrarAvaliado}
    />
  );
}

/** Item já posicionado na cascata (índice RELATIVO à lista inteira). */
type ItemPosicionado = { item: FeedbackDerivado; indice: number };

/**
 * COORDENADOR da entrada: um único `motion.div` com um único gatilho
 * (`useInView`) manda no estado (`hidden` → `visible`) de TODOS os cards. Os
 * cards não têm `initial`/`animate` próprios — só `custom` + `variants` —, então
 * não existe animação independente nem disparo duplicado.
 */
function ListaCoordenada({
  grupos,
  reduzirMovimento,
  onVerDetalhes,
  onFiltrarAvaliador,
  onFiltrarAvaliado,
}: {
  grupos: (Omit<GrupoMes, 'itens'> & { itens: ItemPosicionado[] })[];
  reduzirMovimento: boolean;
  onVerDetalhes?: (item: FeedbackDerivado) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  onFiltrarAvaliado?: (nome: string) => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  /** Gatilho ÚNICO: dispara quando a lista entra na viewport, e só uma vez. */
  const emVistaIO = useInView(alvo, { once: true, amount: FRACAO_PARA_INICIAR });
  const [jaVisivel, setJaVisivel] = useState(false);

  /**
   * Atalho para o caso comum (a lista JÁ está na tela quando a aba monta): o
   * primeiro callback do `IntersectionObserver` só chega depois do primeiro
   * frame pintado, e num primeiro render pesado isso deixou os cards invisíveis
   * por ~0,4 s antes de a sequência começar. A checagem abaixo roda no layout
   * effect (antes da pintura), então a sequência começa no PRIMEIRO quadro —
   * sem nunca disparar fora da viewport (fora dela, quem manda segue sendo o
   * observer).
   */
  useLayoutEffect(() => {
    const el = alvo.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) setJaVisivel(true);
  }, []);

  const emVista = jaVisivel || emVistaIO;

  return (
    <motion.div
      ref={alvo}
      className="space-y-6"
      initial={reduzirMovimento ? 'visible' : 'hidden'}
      animate={reduzirMovimento || emVista ? 'visible' : 'hidden'}
    >
      {grupos.map((grupo) => (
        <section key={grupo.chave} className="space-y-3">
          {/* Marco do mês com ALTURA FIXA (ver `ALTURA_MARCO_MES`): é o que
              garante que a coluna lateral possa se alinhar ao primeiro card. */}
          <header className="flex items-center gap-2" style={{ height: ALTURA_MARCO_MES }}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <h3 className="whitespace-nowrap font-display text-[12px] font-semibold uppercase tracking-wider">
              {grupo.rotulo}
            </h3>
            <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
              {grupo.itens.length} {grupo.itens.length === 1 ? 'feedback' : 'feedbacks'}
            </span>
            <span className="h-px flex-1 bg-border/40" aria-hidden="true" />
          </header>

          {/* Trilho + cards do mês */}
          <div className="relative space-y-3 pl-4">
            <span className="absolute left-0 top-0 h-full w-px bg-border/40" aria-hidden="true" />

            {grupo.itens.map(({ item, indice }) => (
              <div key={item.feedback?.id ?? `${grupo.chave}-${indice}`} className="relative">
                {/* O PONTO do trilho fica FORA do elemento animado: ele é guia
                    fixo, então quem se move/escala/recorta é só o card. */}
                <span
                  className={cn(
                    'absolute -left-4 top-5 h-2 w-2 rounded-full ring-4 ring-background',
                    COR_TIPO_FEEDBACK[item.tipo]
                  )}
                  aria-hidden="true"
                />
                <motion.div
                  {...cardEntradaFeedback(indice)}
                  style={indice === 0 ? EXPANSAO_ORIGEM : undefined}
                >
                  <FeedbackCard
                    item={item}
                    onVerDetalhes={onVerDetalhes}
                    onFiltrarAvaliador={onFiltrarAvaliador}
                    onFiltrarAvaliado={onFiltrarAvaliado}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </motion.div>
  );
}
