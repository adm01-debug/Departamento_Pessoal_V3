import { motion } from 'framer-motion';
import { Eraser, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { FiltroSelect, type OpcaoFiltro } from './treinamentosFiltrosComum';
import { PERIODO_OPCOES, type PeriodoTreinamento } from './treinamentosDerivacoes';

/**
 * Barra de filtros da aba Treinamentos.
 *
 * Busca em nome/descrição/categoria (sem acento, sem caixa), status e categoria
 * vindos dos DADOS reais, período calculado sobre a data do treinamento e
 * "Limpar filtros" com destaque Lime apenas quando há filtro ativo.
 *
 * Quando a tabela não fornece categoria (sem vínculo com o catálogo), o select
 * fica desabilitado e explica o motivo — nada de opções inventadas.
 */

type Opcao = OpcaoFiltro;

export interface TreinamentosFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  status: string;
  onStatus: (valor: string) => void;
  categoria: string;
  onCategoria: (valor: string) => void;
  periodo: PeriodoTreinamento;
  onPeriodo: (valor: PeriodoTreinamento) => void;
  statusOpcoes: readonly Opcao[];
  categoriaOpcoes: readonly Opcao[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

export function TreinamentosFiltros({
  busca,
  onBusca,
  status,
  onStatus,
  categoria,
  onCategoria,
  periodo,
  onPeriodo,
  statusOpcoes,
  categoriaOpcoes,
  filtroAtivo,
  onLimpar,
}: TreinamentosFiltrosProps) {
  const semCategoria = categoriaOpcoes.length === 0;

  return (
    <EntradaPresenca>
      <motion.div {...entradaCard(5)} className="flex flex-col gap-2 min-[1200px]:flex-row min-[1200px]:items-center">
        <div className="relative min-w-0 min-[1200px]:w-[42%]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar treinamentos por nome, descrição ou categoria..."
            aria-label="Buscar treinamentos"
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
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
          <FiltroSelect label="Status" value={status} onChange={onStatus} options={statusOpcoes} />
          <FiltroSelect
            label="Categoria"
            value={categoria}
            onChange={onCategoria}
            options={categoriaOpcoes.length > 0 ? categoriaOpcoes : [{ value: 'todos', label: 'Todas' }]}
            disabled={semCategoria}
            title={semCategoria ? 'O treinamento não possui vínculo de categoria com o catálogo de cursos.' : undefined}
          />
          <FiltroSelect
            label="Período"
            value={periodo}
            onChange={(valor) => onPeriodo(valor as PeriodoTreinamento)}
            options={PERIODO_OPCOES}
          />
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="min-[1200px]:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLimpar}
                  aria-label="Limpar filtros"
                  className={cn(
                    'h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors sm:w-auto',
                    filtroAtivo
                      ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                      : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  <Eraser className="h-4 w-4" />
                  Limpar filtros
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {filtroAtivo ? 'Limpar busca, status, categoria e período' : 'Nenhum filtro ativo'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </EntradaPresenca>
  );
}
