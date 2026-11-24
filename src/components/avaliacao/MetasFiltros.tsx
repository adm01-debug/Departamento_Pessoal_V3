import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterX, SlidersHorizontal } from 'lucide-react';
import { entradaCard } from './entradaCards';
import { ColoredFilterChip } from './ColoredFilterChip';
import {
  FILTROS_STATUS,
  ORDEM_OPCOES,
  TEMA_CHIP_METAS,
  rotuloTipo,
  type ContagemMetas,
  type CriterioOrdem,
  type FiltroStatus,
} from './metasComum';

/**
 * ============================================================================
 * BARRA DE BUSCA, FILTROS, ORDENAÇÃO E FILTROS RÁPIDOS — Metas & OKRs.
 *
 * Tudo aqui é client-side sobre a lista JÁ carregada por `AvaliacaoPage`
 * (nenhuma consulta nova ao Supabase). Os selects são montados a partir dos
 * valores REALMENTE presentes nos registros (tipos, responsáveis e ciclos) —
 * nenhuma opção fixa copiada da referência.
 *
 * · linha 1 → busca + Tipo + Responsável + "Mais filtros" (ciclo) +
 *   "Limpar filtros" (aparece só com filtro ativo) + "Ordenar por";
 * · linha 2 → pílulas de status com o contador derivado das metas em tela.
 *
 * "LIMPAR FILTROS": botão CONTEXTUAL — só existe quando algum filtro está
 * diferente do padrão. A visibilidade é DERIVADA dos próprios props
 * (`temFiltroAtivo`), sem estado espelho nem prop extra: busca não vazia,
 * Tipo/Responsável/Ciclo escolhidos ou categoria rápida fora de "Todas".
 * A ORDENAÇÃO não conta como filtro (ela ordena, não recorta a lista) e por
 * isso não acende o botão. A ação em si é a `onLimpar` da aba, que restaura
 * todos os critérios e volta para a 1ª página.
 *
 * Alturas uniformes (`h-9`, o padrão dos `Input`/`SelectTrigger` do Design
 * System) para não haver desalinhamento entre campo, select e botão.
 * ============================================================================
 */

/** Sentinela dos selects: Radix não aceita `value=""` em `SelectItem`. */
const TODOS = '__todos';

interface MetasFiltrosProps {
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  busca: string;
  onBusca: (valor: string) => void;
  tipo: string;
  onTipo: (valor: string) => void;
  tipos: string[];
  responsavel: string;
  onResponsavel: (valor: string) => void;
  responsaveis: string[];
  cicloId: string;
  onCicloId: (valor: string) => void;
  ciclos: { id: string; nome: string }[];
  ordem: CriterioOrdem;
  onOrdem: (valor: CriterioOrdem) => void;
  status: FiltroStatus;
  onStatus: (valor: FiltroStatus) => void;
  contagem: ContagemMetas;
  /** Quantidade de filtros além da busca (para o badge de "Mais filtros"). */
  filtrosAtivos: number;
  onLimpar: () => void;
}

export function MetasFiltros({
  indice = 1,
  busca,
  onBusca,
  tipo,
  onTipo,
  tipos,
  responsavel,
  onResponsavel,
  responsaveis,
  cicloId,
  onCicloId,
  ciclos,
  ordem,
  onOrdem,
  status,
  onStatus,
  contagem,
  filtrosAtivos,
  onLimpar,
}: MetasFiltrosProps) {
  /**
   * Existe filtro fora do padrão? Derivado SOMENTE dos props já recebidos —
   * nenhum estado novo/espelho. `ordem` fica de fora de propósito: ordenar não
   * recorta a lista, então não é filtro ativo.
   */
  const temFiltroAtivo =
    busca.trim() !== '' || tipo !== '' || responsavel !== '' || cicloId !== '' || status !== 'todas';

  return (
    <motion.div {...entradaCard(indice)} className="space-y-2">
      {/* ── Linha 1: busca + filtros + ordenação ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onChange={onBusca}
          placeholder="Buscar metas ou OKRs..."
          className="min-w-[220px] flex-1"
        />

        <Select value={tipo || TODOS} onValueChange={(v) => onTipo(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Tipo" className="h-9 w-full rounded-lg sm:w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>
                {rotuloTipo(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={responsavel || TODOS} onValueChange={(v) => onResponsavel(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Responsável" className="h-9 w-full rounded-lg sm:w-[190px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* "Mais filtros" — hoje guarda o filtro por CICLO, que existe de fato
            em `metas_okrs.ciclo_id`. O badge conta os filtros ativos além da
            busca; sem filtro nenhum, o botão fica neutro. */}
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
          <PopoverContent align="start" className="w-64 space-y-3 p-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Ciclo de avaliação
              </p>
              <Select value={cicloId || TODOS} onValueChange={(v) => onCicloId(v === TODOS ? '' : v)}>
                <SelectTrigger aria-label="Ciclo" className="h-9 rounded-lg">
                  <SelectValue placeholder="Todos os ciclos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos os ciclos</SelectItem>
                  {ciclos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {/* "Limpar filtros" — CONTEXTUAL: só existe com filtro ativo, na mesma
            linha e imediatamente à direita de "Mais filtros". Verde-lima oficial
            (`--primary`) translúcido, mesma altura (`h-9`) dos vizinhos. */}
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
          <Select value={ordem} onValueChange={(v) => onOrdem(v as CriterioOrdem)}>
            <SelectTrigger aria-label="Ordenar por" className="h-9 w-full rounded-lg sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDEM_OPCOES.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Linha 2: chips coloridos de status com contador ──────────────────
          MESMA anatomia e MESMA animação de glow dos chips da Auditoria: o
          desenho vive no componente único `ColoredFilterChip`; aqui só entra a
          cor de cada status (`TEMA_CHIP_METAS`). */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por situação">
        {FILTROS_STATUS.map((f) => (
          <ColoredFilterChip
            key={f.valor}
            label={f.rotulo}
            count={contagem[f.valor]}
            tema={TEMA_CHIP_METAS[f.valor]}
            selected={status === f.valor}
            onClick={() => onStatus(f.valor)}
          />
        ))}
      </div>
    </motion.div>
  );
}
