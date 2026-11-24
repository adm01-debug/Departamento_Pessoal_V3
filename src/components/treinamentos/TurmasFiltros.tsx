import { motion } from 'framer-motion';
import { ArrowUpDown, Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { FiltroSelect, type OpcaoFiltro } from './treinamentosFiltrosComum';
import type { OrdenacaoTurma, PeriodoTurma } from './turmasDerivacoes';

/**
 * Barra de filtros do painel de Turmas / Instâncias.
 *
 * Mesmo padrão aprovado de Catálogo/Auditoria: busca à esquerda, selects com
 * rótulo em caixa alta e “Limpar filtros” que só ganha o Lime quando existe
 * filtro ativo. Em container amplo todos os controles ficam numa única linha;
 * abaixo de ~980 px a busca ocupa a linha inteira e os demais viram um grid.
 *
 * MOVIMENTO: `entradaCard` — a MESMA cascata dos KPI Cards do Dashboard
 * Executivo, uma vez por montagem. Alterar filtro não reanima.
 */
export interface TurmasFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  status: string;
  onStatus: (valor: string) => void;
  modalidade: string;
  onModalidade: (valor: string) => void;
  periodo: PeriodoTurma;
  onPeriodo: (valor: PeriodoTurma) => void;
  ordenacao: OrdenacaoTurma;
  onOrdenacao: (valor: OrdenacaoTurma) => void;
  statusOpcoes: readonly OpcaoFiltro[];
  modalidadeOpcoes: readonly OpcaoFiltro[];
  periodoOpcoes: readonly OpcaoFiltro[];
  ordenacaoOpcoes: readonly OpcaoFiltro[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

const CLASSE_SELECT = 'min-w-0 @[980px]:w-[132px] @[980px]:shrink-0';

export function TurmasFiltros({
  busca,
  onBusca,
  status,
  onStatus,
  modalidade,
  onModalidade,
  periodo,
  onPeriodo,
  ordenacao,
  onOrdenacao,
  statusOpcoes,
  modalidadeOpcoes,
  periodoOpcoes,
  ordenacaoOpcoes,
  filtroAtivo,
  onLimpar,
}: TurmasFiltrosProps) {
  return (
    <EntradaPresenca>
      <div className="flex flex-col gap-2 @[980px]:flex-row @[980px]:items-end">
        <motion.div {...entradaCard(5)} className="relative min-w-0 @[980px]:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar por curso, turma ou instrutor..."
            aria-label="Buscar turmas"
            className="h-11 rounded-xl border-border/60 bg-card pl-10 pr-9 text-[12.5px]"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>

        <motion.div
          {...entradaCard(6)}
          className="grid min-w-0 grid-cols-2 gap-2 @[980px]:flex @[980px]:shrink-0 @[980px]:items-end"
        >
          <FiltroSelect
            label="Status"
            value={status}
            onChange={onStatus}
            options={statusOpcoes}
            className={CLASSE_SELECT}
          />
          <FiltroSelect
            label="Modalidade"
            value={modalidade}
            onChange={onModalidade}
            options={modalidadeOpcoes}
            className={CLASSE_SELECT}
          />
          <FiltroSelect
            label="Período"
            value={periodo}
            onChange={(valor) => onPeriodo(valor as PeriodoTurma)}
            options={periodoOpcoes}
            className={CLASSE_SELECT}
          />
          <FiltroSelect
            label="Ordenar por"
            value={ordenacao}
            onChange={(valor) => onOrdenacao(valor as OrdenacaoTurma)}
            options={ordenacaoOpcoes}
            icone={ArrowUpDown}
            className="min-w-0 @[980px]:w-[152px] @[980px]:shrink-0"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onLimpar}
            aria-label="Limpar filtros"
            className={cn(
              'col-span-2 h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors @[560px]:col-span-1 @[980px]:w-auto @[980px]:shrink-0',
              filtroAtivo
                ? 'border-primary/60 bg-primary/10 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.16)] hover:bg-primary/15 hover:text-primary'
                : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            <Eraser className="h-4 w-4" />
            Limpar filtros
          </Button>
        </motion.div>
      </div>
    </EntradaPresenca>
  );
}
