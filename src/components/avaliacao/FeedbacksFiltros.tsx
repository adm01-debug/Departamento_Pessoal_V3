import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, FilterX, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entradaCard } from './entradaCards';
import { ColoredFilterChip } from './ColoredFilterChip';
import { PALETAS_CHIP } from './chipFiltroComum';
import { TIPOS_FEEDBACK } from './criacaoFeedback';
import {
  ORDEM_FEEDBACK_OPCOES,
  ROTULO_TIPO_FEEDBACK,
  SEGMENTOS,
  TEMA_CHIP_FEEDBACKS,
  type ContagemSegmentos,
  type CriterioOrdemFeedback,
  type SegmentoFeedback,
  type TipoFeedback,
} from './feedbacksComum';

/**
 * ============================================================================
 * BUSCA, FILTROS, SEGMENTAÇÃO E ORDENAÇÃO — aba "Feedbacks".
 *
 * Tudo aqui é client-side sobre a lista JÁ carregada pela `AvaliacaoPage`
 * (nenhuma consulta nova). Os selects são montados a partir dos valores
 * REALMENTE presentes nos registros (avaliadores) — o dropdown de TIPO usa as
 * QUATRO categorias oficiais do 360° (fixas), então categoria sem registro
 * continua selecionável e cai no estado vazio existente. Nenhuma opção fixa
 * copiada da referência.
 *
 * · linha 1 → busca + Tipo + Avaliador + "Mais filtros" (pendentes) +
 *   "Limpar filtros" (só com filtro ativo) + "Ordenar por";
 * · linha 2 → chips de segmentação, cada um com o contador derivado do dado.
 *
 * GEOMETRIA: alturas uniformes (`h-9`) para campo, selects e botões da linha 1
 * (mesma régua de `MetasFiltros`) e chips de `h-7` na linha 2.
 * ============================================================================
 */

/** Sentinela dos selects: Radix não aceita `value=""` em `SelectItem`. */
const TODOS = '__todos';

/**
 * IDENTIDADE CROMÁTICA dos quatro chips de categoria.
 *
 * Cada chip carrega a SUA família de cor nos DOIS estados (inativo e ativo); a
 * diferença entre eles é só de INTENSIDADE, nunca de matiz. As cores e a
 * anatomia agora vêm do Design System compartilhado: `TEMA_CHIP_FEEDBACKS`
 * (`feedbacksComum`) + o componente único `ColoredFilterChip` — o MESMO da
 * Auditoria. Nenhuma pele local.
 */

interface FeedbacksFiltrosProps {
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  busca: string;
  onBusca: (valor: string) => void;
  /** Tipo selecionado (`''` = todos). */
  tipo: string;
  onTipo: (valor: string) => void;
  /** Tipos presentes na lista (usado pelos contadores; o dropdown usa as 4 oficiais). */
  tipos: TipoFeedback[];
  avaliador: string;
  onAvaliador: (valor: string) => void;
  avaliadores: string[];
  somentePendentes: boolean;
  onSomentePendentes: (valor: boolean) => void;
  ordem: CriterioOrdemFeedback;
  onOrdem: (valor: CriterioOrdemFeedback) => void;
  segmento: SegmentoFeedback;
  onSegmento: (valor: SegmentoFeedback) => void;
  contagem: ContagemSegmentos;
  /** Quantidade de filtros ativos além da busca (badge de "Mais filtros"). */
  filtrosAtivos: number;
  onLimpar: () => void;
  /* ── Fila de aprovação do gestor (chip na MESMA linha dos segmentos) ───────
     Opcionais: sem eles a linha é exatamente a de antes. */
  /** Contador DINÂMICO das avaliações aguardando o gestor. */
  aguardandoGestor?: number;
  /** O recorte exibido é a fila de aprovação (e não um segmento de tipo). */
  visaoAguardando?: boolean;
  /**
   * Troca entre a listagem normal (`false`) e a fila de aprovação (`true`).
   * Qualquer chip de segmento (inclusive "Todos") devolve a listagem normal.
   */
  onVisaoAguardando?: (ativo: boolean) => void;
}

export function FeedbacksFiltros({
  indice = 1,
  busca,
  onBusca,
  tipo,
  onTipo,
  avaliador,
  onAvaliador,
  avaliadores,
  somentePendentes,
  onSomentePendentes,
  ordem,
  onOrdem,
  segmento,
  onSegmento,
  contagem,
  filtrosAtivos,
  onLimpar,
  aguardandoGestor,
  visaoAguardando = false,
  onVisaoAguardando,
}: FeedbacksFiltrosProps) {
  /**
   * Existe filtro fora do padrão? Derivado SOMENTE dos props — a ORDENAÇÃO e o
   * chip de segmentação não entram (ordenar não recorta a lista e a segmentação
   * tem a própria linha de chips).
   */
  const temFiltroAtivo = busca.trim() !== '' || tipo !== '' || avaliador !== '' || somentePendentes;

  return (
    <motion.div {...entradaCard(indice)} className="space-y-2">
      {/* ── Linha 1: busca + filtros + ordenação ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onChange={onBusca}
          placeholder="Buscar por colaborador, avaliador ou palavra-chave..."
          className="min-w-[220px] flex-1"
        />

        <Select value={tipo || TODOS} onValueChange={(v) => onTipo(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Tipo" className="h-9 w-full rounded-lg sm:w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {/* As QUATRO categorias oficiais do 360°, sempre disponíveis — mesmo
                com zero registros (a opção vazia é mostrada pelo estado vazio). */}
            {TIPOS_FEEDBACK.map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_TIPO_FEEDBACK[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={avaliador || TODOS} onValueChange={(v) => onAvaliador(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Avaliador" className="h-9 w-full rounded-lg sm:w-[190px]">
            <SelectValue placeholder="Avaliador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os avaliadores</SelectItem>
            {avaliadores.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* "Mais filtros" — hoje só o recorte de PENDENTES (campo real de
            `feedbacks_360.status`). O badge conta os filtros ativos além da busca. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-lg border-border/40 px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {filtrosAtivos > 0 && (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                  {filtrosAtivos}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-2 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Situação</p>
            <button
              type="button"
              aria-pressed={somentePendentes}
              onClick={() => onSomentePendentes(!somentePendentes)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition-colors',
                somentePendentes
                  ? 'border-warning/50 bg-warning/10 text-warning'
                  : 'border-border/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              )}
            >
              Somente pendentes
              {somentePendentes && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          </PopoverContent>
        </Popover>

        {/* Contextual: mesma pele das demais ações primárias do módulo. */}
        {temFiltroAtivo && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLimpar}
            className="h-9 shrink-0 gap-1.5 rounded-lg border-primary/40 bg-primary/10 px-2.5 text-[13px] font-normal text-primary transition-colors duration-200 hover:border-primary/60 hover:bg-primary/20 hover:text-primary"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}

        {/* Ordenação — critérios suportados pelos campos reais. */}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">Ordenar por</span>
          <Select value={ordem} onValueChange={(v) => onOrdem(v as CriterioOrdemFeedback)}>
            <SelectTrigger aria-label="Ordenar por" className="h-9 w-full rounded-lg sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDEM_FEEDBACK_OPCOES.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Linha 2: chips coloridos de segmentação com contador ───────────
          MESMA anatomia e MESMA animação de glow dos chips da Auditoria: o
          desenho vive no componente único `ColoredFilterChip`; aqui só entra a
          cor de cada categoria (`TEMA_CHIP_FEEDBACKS`). */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Segmentar por tipo de feedback">
        {SEGMENTOS.map((s) => (
          <ColoredFilterChip
            key={s.valor}
            label={s.rotulo}
            count={contagem[s.valor]}
            tema={TEMA_CHIP_FEEDBACKS[s.valor]}
            selected={!visaoAguardando && segmento === s.valor}
            onClick={() => {
              onSegmento(s.valor);
              onVisaoAguardando?.(false);
            }}
          />
        ))}

        {/* ── Fila de aprovação do gestor ─────────────────────────────────────
            MESMO componente, MESMA anatomia e MESMO glow dos segmentos, na
            MESMA linha e imediatamente após "Autoavaliação". Só a tinta muda:
            âmbar (`PALETAS_CHIP.amber`), a que o fluxo já usa para "exige
            atenção". O contador é DINÂMICO (vem de `contarAguardandoGestor`). */}
        <ColoredFilterChip
          label="Aguardando gestor"
          count={aguardandoGestor ?? 0}
          tema={PALETAS_CHIP.amber}
          selected={visaoAguardando}
          onClick={() => onVisaoAguardando?.(!visaoAguardando)}
        />
      </div>
    </motion.div>
  );
}
