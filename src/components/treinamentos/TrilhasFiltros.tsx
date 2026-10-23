import { motion } from 'framer-motion';
import { Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { NIVEIS_TRILHA } from './trilhasDerivacoes';

/**
 * Barra de filtros da aba Trilhas: busca (40%), Categoria, Nível, Status e
 * "Limpar filtros".
 *
 * HONESTIDADE DAS OPÇÕES:
 * - Nível usa os três valores reais aceitos por `trilhas_aprendizado.nivel`.
 * - Categoria NÃO existe na tabela de trilhas: o select fica desabilitado e
 *   explica o motivo — nada de categoria inventada.
 * - Status usa `ativo` (o único estado real). Quando a origem não devolve a
 *   coluna, o select também fica desabilitado em vez de afirmar "Ativa".
 */

interface Opcao {
  value: string;
  label: string;
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  title,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: readonly Opcao[];
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          aria-label={label}
          className="h-11 w-full rounded-xl border-border/60 bg-card px-3 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
            <span className="text-[9.5px] uppercase leading-none tracking-[0.08em] text-muted-foreground">{label}</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent side="bottom" align="start">
          {options.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface TrilhasFiltrosProps {
  busca: string;
  onBusca: (valor: string) => void;
  nivel: string;
  onNivel: (valor: string) => void;
  status: string;
  onStatus: (valor: string) => void;
  statusOpcoes: readonly Opcao[];
  filtroAtivo: boolean;
  onLimpar: () => void;
}

const OPCOES_NIVEL: readonly Opcao[] = [{ value: 'todos', label: 'Todos' }, ...NIVEIS_TRILHA];

export function TrilhasFiltros({
  busca,
  onBusca,
  nivel,
  onNivel,
  status,
  onStatus,
  statusOpcoes,
  filtroAtivo,
  onLimpar,
}: TrilhasFiltrosProps) {
  const statusIndisponivel = statusOpcoes.length === 0;

  return (
    <EntradaPresenca>
      <motion.div {...entradaCard(5)} className="flex flex-col gap-2 min-[1100px]:flex-row min-[1100px]:items-center">
        <div className="relative min-w-0 min-[1100px]:w-[38%]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
            placeholder="Buscar trilhas por nome, categoria ou palavra-chave..."
            aria-label="Buscar trilhas"
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
          <FiltroSelect
            label="Categoria"
            value="todas"
            onChange={() => undefined}
            options={[{ value: 'todas', label: 'Todas' }]}
            disabled
            title="A tabela trilhas_aprendizado não possui coluna de categoria. Nada de categoria fictícia."
          />
          <FiltroSelect label="Nível" value={nivel} onChange={onNivel} options={OPCOES_NIVEL} />
          <FiltroSelect
            label="Status"
            value={statusIndisponivel ? 'todos' : status}
            onChange={onStatus}
            options={
              statusIndisponivel
                ? [{ value: 'todos', label: 'Todos' }]
                : [{ value: 'todos', label: 'Todos' }, ...statusOpcoes]
            }
            disabled={statusIndisponivel}
            title={
              statusIndisponivel
                ? 'Nenhuma trilha da origem atual trouxe a coluna ativo — o filtro fica indisponível até o dado existir.'
                : 'Situação real da trilha (coluna ativo)'
            }
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onLimpar}
          aria-label="Limpar filtros"
          className={cn(
            'h-11 w-full gap-2 rounded-xl px-3.5 text-[12px] font-medium transition-colors min-[1100px]:w-[132px] min-[1100px]:shrink-0',
            filtroAtivo
              ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
              : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          <Eraser className="h-4 w-4" />
          Limpar filtros
        </Button>
      </motion.div>
    </EntradaPresenca>
  );
}
