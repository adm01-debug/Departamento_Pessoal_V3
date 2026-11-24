/**
 * ============================================================================
 * BUSCA E FILTROS DA CENTRAL DE AJUSTES — faixa que abre a COLUNA DIREITA,
 * logo acima do painel "Detalhes da Solicitação".
 *
 * ── POR QUE ESTA FAIXA VIVE NA DIREITA ─────────────────────────────────────
 * A composição aprovada é retangular e dividida em duas colunas (~70/30):
 *
 *   LINHA 1   [ ícone · Central de Ajustes ]        [ 🔍 busca ] [ Filtros ]
 *   LINHA 2   [ quatro KPIs ]                       ┌───────────────┐
 *   LINHA 3   [ chips de status · período ]          │ Detalhes da   │
 *   LINHA 4   [ tabela de solicitações ]             │ Solicitação   │
 *   LINHA 5   [ barra de paginação ]                 └───────────────┘
 *
 * A busca NÃO pertence ao cabeçalho do módulo: ela é o primeiro item da coluna
 * do painel, alinhada horizontalmente ao título (o cabeçalho é a linha 1 da
 * coluna esquerda). O `PontoAdjustmentRequests` coloca os dois na MESMA linha
 * do grid — nada de posicionamento absoluto nem margem compensatória.
 *
 * ── O QUE O BOTÃO "FILTROS" FAZ ────────────────────────────────────────────
 * Abre um `Popover` com os filtros que não cabem na barra de chips (período e
 * nível do parecer de risco) e o "Limpar filtros". Os dois controles escrevem no
 * MESMO estado do componente pai (`PontoAdjustmentRequests`) do seletor de
 * período da coluna esquerda — não existe uma segunda verdade de filtro.
 * O contador no botão mostra quantos filtros estão fora do padrão, para a faixa
 * nunca esconder um recorte ativo.
 *
 * ── MEDIDAS ────────────────────────────────────────────────────────────────
 * Os dois controles têm 30 px de altura (a régua compacta do cabeçalho) e o
 * wrapper mantém `min-h-[36px]`, a mesma altura da faixa do título: as duas
 * colunas começam exatamente na mesma linha de base. A busca é `flex-1` — ocupa
 * todo o espaço que sobra à esquerda do botão.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { CalendarDays, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { PERIODOS_AJUSTES, RISCOS_FILTRO, type FiltroRiscoAjuste, type PeriodoAjustes } from './centralAjustes';

interface CentralAjustesBuscaFiltrosProps {
  busca: string;
  onBusca: (texto: string) => void;
  periodo: PeriodoAjustes;
  onPeriodo: (periodo: PeriodoAjustes) => void;
  risco: FiltroRiscoAjuste;
  onRisco: (risco: FiltroRiscoAjuste) => void;
  /** Quantos filtros estão fora do padrão (contador do botão "Filtros"). */
  filtrosAtivos: number;
  onLimpar: () => void;
  /** Posição na fila de entrada da página (a faixa é o slot 0 da coluna). */
  index?: number;
}

/** Cor da bolinha de cada nível de risco — os tokens do status, não do módulo. */
const PONTO_RISCO: Record<FiltroRiscoAjuste, string> = {
  todos: 'bg-muted-foreground/40',
  baixo: 'bg-success',
  medio: 'bg-warning',
  alto: 'bg-destructive',
};

/** Título de seção do popover — a mesma régua do painel de detalhes. */
const TITULO_SECAO = 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground';

export function CentralAjustesBuscaFiltros({
  busca,
  onBusca,
  periodo,
  onPeriodo,
  risco,
  onRisco,
  filtrosAtivos,
  onLimpar,
  index = 0,
}: CentralAjustesBuscaFiltrosProps) {
  return (
    <EntradaPresenca>
      <motion.div
        {...entradaCard(index)}
        role="search"
        aria-label="Buscar e filtrar solicitações"
        className="flex min-h-[36px] items-center gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-[10px] h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Buscar colaborador"
            placeholder="Buscar colaborador..."
            className="h-[30px] w-full rounded-[10px] pl-[30px] text-[11px]"
            value={busca}
            onChange={(evento) => onBusca(evento.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-[30px] shrink-0 gap-[7px] rounded-[10px] px-[12px] text-[11px] font-semibold"
            >
              <SlidersHorizontal className="h-[14px] w-[14px]" aria-hidden />
              Filtros
              {filtrosAtivos > 0 && (
                <Badge variant="default" size="sm" className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums">
                  {filtrosAtivos}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-[252px] space-y-3 p-3">
            <div className="space-y-1.5">
              <p className={TITULO_SECAO}>Período</p>
              <Select value={periodo} onValueChange={(valor) => onPeriodo(valor as PeriodoAjustes)}>
                <SelectTrigger
                  aria-label="Período das solicitações (filtros)"
                  className="h-8 w-full gap-2 whitespace-nowrap rounded-lg border-border/60 bg-background/70 px-3 text-[11px] font-medium"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <SelectValue className="whitespace-nowrap" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_AJUSTES.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className={TITULO_SECAO}>Risco IA</p>
              <div className="grid grid-cols-2 gap-1.5">
                {RISCOS_FILTRO.map((opcao) => {
                  const ativo = risco === opcao.valor;
                  return (
                    <Button
                      key={opcao.valor}
                      type="button"
                      size="sm"
                      variant={ativo ? 'secondary' : 'ghost'}
                      aria-pressed={ativo}
                      onClick={() => onRisco(opcao.valor)}
                      className={cn(
                        'h-7 justify-start gap-1.5 px-2 text-[11px]',
                        ativo ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PONTO_RISCO[opcao.valor])} aria-hidden />
                      {opcao.rotulo}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-full gap-1.5 text-[11px] text-muted-foreground"
              onClick={onLimpar}
              disabled={filtrosAtivos === 0}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Limpar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </motion.div>
    </EntradaPresenca>
  );
}
