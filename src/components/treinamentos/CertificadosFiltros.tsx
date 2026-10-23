import { motion } from 'framer-motion';
import { ArrowUpDown, Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { FiltroSelect, type OpcaoFiltro } from './treinamentosFiltrosComum';
import type { OrdenacaoCertificado, SituacaoCertificado } from './certificadosDerivacoes';
import type { PeriodoTreinamento } from './treinamentosDerivacoes';

/**
 * Barra de filtros da aba Certificados — mesmo padrão de Catálogo/Auditoria.
 * A “Situação” é o MESMO estado das badges de segmentação (o painel passa o
 * mesmo valor para ambos). Em container amplo tudo fica numa linha; abaixo de
 * ~980 px a busca ocupa a linha inteira e os demais viram grid de 2 colunas.
 *
 * MOVIMENTO: cascata dos KPI Cards do Dashboard (`entradaCard`), uma vez por
 * montagem; filtrar não reanima.
 */
export interface CertificadosFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  situacao: SituacaoCertificado;
  onSituacao: (valor: SituacaoCertificado) => void;
  categoria: string;
  onCategoria: (valor: string) => void;
  periodo: PeriodoTreinamento;
  onPeriodo: (valor: PeriodoTreinamento) => void;
  ordenacao: OrdenacaoCertificado;
  onOrdenacao: (valor: OrdenacaoCertificado) => void;
  situacaoOpcoes: readonly OpcaoFiltro[];
  categoriaOpcoes: readonly OpcaoFiltro[];
  periodoOpcoes: readonly OpcaoFiltro[];
  ordenacaoOpcoes: readonly OpcaoFiltro[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

export function CertificadosFiltros({
  busca,
  onBusca,
  situacao,
  onSituacao,
  categoria,
  onCategoria,
  periodo,
  onPeriodo,
  ordenacao,
  onOrdenacao,
  situacaoOpcoes,
  categoriaOpcoes,
  periodoOpcoes,
  ordenacaoOpcoes,
  filtroAtivo,
  onLimpar,
}: CertificadosFiltrosProps) {
  return (
    <EntradaPresenca>
      <div className="flex flex-col gap-2 @[940px]:flex-row @[940px]:items-end">
        <motion.div {...entradaCard(5)} className="relative min-w-0 @[940px]:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar por colaborador, curso ou código..."
            aria-label="Buscar certificados"
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
          className="grid min-w-0 grid-cols-2 gap-2 @[940px]:flex @[940px]:shrink-0 @[940px]:items-end"
        >
          <FiltroSelect
            label="Situação"
            value={situacao}
            onChange={(valor) => onSituacao(valor as SituacaoCertificado)}
            options={situacaoOpcoes}
            className="min-w-0 @[940px]:w-[128px] @[940px]:shrink-0"
          />
          <FiltroSelect
            label="Categoria"
            value={categoria}
            onChange={onCategoria}
            options={categoriaOpcoes}
            className="min-w-0 @[940px]:w-[168px] @[940px]:shrink-0"
          />
          <FiltroSelect
            label="Período de emissão"
            value={periodo}
            onChange={(valor) => onPeriodo(valor as PeriodoTreinamento)}
            options={periodoOpcoes}
            className="min-w-0 @[940px]:w-[146px] @[940px]:shrink-0"
          />
          <FiltroSelect
            label="Ordenar por"
            value={ordenacao}
            onChange={(valor) => onOrdenacao(valor as OrdenacaoCertificado)}
            options={ordenacaoOpcoes}
            icone={ArrowUpDown}
            className="min-w-0 @[940px]:w-[146px] @[940px]:shrink-0"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onLimpar}
            aria-label="Limpar filtros"
            className={cn(
              'col-span-2 h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors @[560px]:col-span-1 @[940px]:w-auto @[940px]:shrink-0',
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
