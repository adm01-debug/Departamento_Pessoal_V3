import { motion } from 'framer-motion';
import { Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { FiltroSelect, type OpcaoFiltro } from './treinamentosFiltrosComum';
import type { ObrigatoriedadeFiltro, OrdenacaoCatalogo } from './treinamentosDerivacoes';

/**
 * Barra de filtros do Catálogo.
 *
 * - Busca em nome, categoria e palavra-chave (descrição/modalidade/NR) sobre os
 *   cursos JÁ carregados — nenhuma consulta nova ao backend.
 * - Categoria, Modalidade e Obrigatoriedade derivadas dos dados reais.
 * - Ordenação apenas entre critérios sustentados pelos campos do catálogo.
 * - “Limpar filtros” só ganha o destaque Lime quando existe filtro ativo.
 *
 * MOVIMENTO: cada controle entra na MESMA cascata dos KPI Cards do Dashboard
 * (`entradaCard`), uma única vez por montagem — mudar um filtro não reanima.
 */

export interface TreinamentosCatalogoFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  categoria: string;
  onCategoria: (valor: string) => void;
  modalidade: string;
  onModalidade: (valor: string) => void;
  obrigatoriedade: ObrigatoriedadeFiltro;
  onObrigatoriedade: (valor: ObrigatoriedadeFiltro) => void;
  ordenacao: OrdenacaoCatalogo;
  onOrdenacao: (valor: OrdenacaoCatalogo) => void;
  categoriaOpcoes: readonly OpcaoFiltro[];
  modalidadeOpcoes: readonly OpcaoFiltro[];
  obrigatoriedadeOpcoes: readonly OpcaoFiltro[];
  ordenacaoOpcoes: readonly OpcaoFiltro[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

export function TreinamentosCatalogoFiltros({
  busca,
  onBusca,
  categoria,
  onCategoria,
  modalidade,
  onModalidade,
  obrigatoriedade,
  onObrigatoriedade,
  ordenacao,
  onOrdenacao,
  categoriaOpcoes,
  modalidadeOpcoes,
  obrigatoriedadeOpcoes,
  ordenacaoOpcoes,
  filtroAtivo,
  onLimpar,
}: TreinamentosCatalogoFiltrosProps) {
  return (
    <EntradaPresenca>
      <div className="flex flex-col gap-2 @[900px]:flex-row @[900px]:items-end">
        <motion.div {...entradaCard(5)} className="relative min-w-0 @[900px]:w-[40%] @[900px]:shrink-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar cursos por nome, categoria ou palavra-chave..."
            aria-label="Buscar cursos"
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

        <motion.div {...entradaCard(6)} className="grid min-w-0 flex-1 grid-cols-2 gap-2 @[720px]:grid-cols-4">
          <FiltroSelect label="Categoria" value={categoria} onChange={onCategoria} options={categoriaOpcoes} />
          <FiltroSelect label="Modalidade" value={modalidade} onChange={onModalidade} options={modalidadeOpcoes} />
          <FiltroSelect
            label="Obrigatoriedade"
            value={obrigatoriedade}
            onChange={(valor) => onObrigatoriedade(valor as ObrigatoriedadeFiltro)}
            options={obrigatoriedadeOpcoes}
          />
          <FiltroSelect
            label="Ordenar por"
            value={ordenacao}
            onChange={(valor) => onOrdenacao(valor as OrdenacaoCatalogo)}
            options={ordenacaoOpcoes}
          />
        </motion.div>

        <motion.div {...entradaCard(7)} className="min-w-0 self-end @[900px]:shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onLimpar}
            aria-label="Limpar filtros"
            className={cn(
              'h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors @[560px]:w-auto',
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
