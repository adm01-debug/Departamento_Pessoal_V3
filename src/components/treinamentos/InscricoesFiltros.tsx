import { motion } from 'framer-motion';
import { CalendarDays, Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { FiltroSelect } from './treinamentosFiltrosComum';
import { PERIODO_OPCOES, type PeriodoTreinamento } from './treinamentosDerivacoes';
import type { OpcaoInscricao } from './inscricoesDerivacoes';

/**
 * Barra de filtros da aba Inscrições — mesma linguagem de Catálogo,
 * Certificados e Turmas. Em container amplo (>= 1020 px) tudo fica em UMA
 * linha: busca flexível + quatro selects + Limpar. Abaixo disso a busca ocupa
 * a linha inteira e os controles viram grid de 2 colunas, sem sobreposição.
 *
 * Movimento: cascata dos KPI Cards do Dashboard (`entradaCard`), uma vez por
 * montagem; filtrar não reanima a barra.
 */
export interface InscricoesFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  status: string;
  onStatus: (valor: string) => void;
  curso: string;
  onCurso: (valor: string) => void;
  departamento: string;
  onDepartamento: (valor: string) => void;
  periodo: PeriodoTreinamento;
  onPeriodo: (valor: PeriodoTreinamento) => void;
  statusOpcoes: readonly OpcaoInscricao[];
  cursoOpcoes: readonly OpcaoInscricao[];
  departamentoOpcoes: readonly OpcaoInscricao[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

export function InscricoesFiltros({
  busca,
  onBusca,
  status,
  onStatus,
  curso,
  onCurso,
  departamento,
  onDepartamento,
  periodo,
  onPeriodo,
  statusOpcoes,
  cursoOpcoes,
  departamentoOpcoes,
  filtroAtivo,
  onLimpar,
}: InscricoesFiltrosProps) {
  return (
    <EntradaPresenca>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end">
        <motion.div {...entradaCard(5)} className="relative min-w-0 xl:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar por colaborador ou curso..."
            aria-label="Buscar inscrições por colaborador ou curso"
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
          className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:shrink-0 xl:items-end"
        >
          <FiltroSelect
            label="Status"
            value={status}
            onChange={onStatus}
            options={statusOpcoes}
            className="min-w-0 xl:w-[108px] xl:shrink-0"
          />
          <FiltroSelect
            label="Curso"
            value={curso}
            onChange={onCurso}
            options={cursoOpcoes}
            className="min-w-0 xl:w-[158px] xl:shrink-0"
          />
          <FiltroSelect
            label="Departamento"
            value={departamento}
            onChange={onDepartamento}
            options={departamentoOpcoes}
            className="min-w-0 xl:w-[144px] xl:shrink-0"
          />
          <FiltroSelect
            label="Período"
            value={periodo}
            onChange={(valor) => onPeriodo(valor as PeriodoTreinamento)}
            options={PERIODO_OPCOES}
            icone={CalendarDays}
            className="min-w-0 xl:w-[116px] xl:shrink-0"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onLimpar}
            aria-label="Limpar filtros"
            className={cn(
              'col-span-2 h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors sm:col-span-2 xl:col-span-1 xl:w-auto xl:shrink-0',
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
