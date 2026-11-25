/**
 * ============================================================================
 * TURNOS & ESCALAS — BARRA DE FILTROS DO CALENDÁRIO.
 * ============================================================================
 *
 * Faixa horizontal acima da grade, com os três filtros principais visíveis
 * (busca por nome, departamento, turno) e os secundários dentro do popover
 * "Mais filtros" (status da escala e "só quem tem escala no período"). Todos
 * são COMBINADOS — o estado vive na página (`FiltrosEscalas`) e por isso
 * sobrevive à troca entre Semana, Mês e Lista.
 *
 * Componentes do próprio sistema, nenhum controle novo: `SearchInput` (input
 * com lupa + limpar), `Select` do Radix (mesmo trigger do resto do app) e
 * `Popover` para os filtros avançados. O popover abre/fecha pela animação
 * padrão de `ui/popover.tsx`.
 *
 * ── OS SELECTS SÃO OS MESMOS DO RESTO DO SaaS ──────────────────────────────
 * Antes esta barra usava o `SelectTrigger` CRU (`SelectValue` solto, altura de
 * 36 px, raio menor que o do campo de busca ao lado): o menu era o do DS, mas o
 * gatilho não — "Todos os departamentos" destoava de todas as outras telas.
 * Agora o gatilho é o MESMO do histórico de Horas Extras — ícone + rótulo
 * pequeno + valor —, reaproveitando as classes de `horasExtrasComum`
 * (`CLASSE_CONTROLE_FILTRO`, `MEDIDA_FILTRO_*`) e o `ConteudoFiltro`. Não há
 * estilo de dropdown exclusivo de Turnos: mudou a receita lá, muda aqui.
 * ============================================================================
 */
import { Building2, CheckCircle2, Clock, ListFilter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ConteudoFiltro } from '@/components/horas-extras/FiltroSelectConteudo';
import {
  CLASSE_CONTROLE_FILTRO,
  MEDIDA_FILTRO_DEPARTAMENTO,
  MEDIDA_FILTRO_ORDEM as MEDIDA_FILTRO_TURNO,
} from '@/components/horas-extras/horasExtrasComum';
import {
  contarFiltrosAvancados,
  FILTROS_ESCALAS_INICIAIS,
  type FiltrosEscalas,
  type TurnoRegistro,
} from './turnosMetricas';

export interface BarraFiltrosEscalasProps {
  filtros: FiltrosEscalas;
  onFiltros: (filtros: FiltrosEscalas) => void;
  departamentos: readonly string[];
  turnos: readonly TurnoRegistro[];
  status: readonly string[];
  /** Quantos colaboradores sobraram depois dos filtros (feedback do recorte). */
  totalLinhas: number;
}

/** Campo de busca com a mesma régua dos selects (altura/raio/tinta/fonte). */
const CLASSE_BUSCA =
  'min-w-[200px] flex-[3_1_220px] [&_input]:h-[38px] [&_input]:rounded-[10px] [&_input]:border-border [&_input]:bg-secondary/40 [&_input]:text-[11px] [&_input]:placeholder:text-[11px]';

/**
 * Botão "Mais filtros" na régua dos selects (38 px / raio 10 px / tinta
 * `secondary`), para os quatro controles da barra terminarem na mesma linha.
 * No hover ele acende a borda lime e ganha o glow suave da marca — é o sinal
 * de que existe um painel atrás dele, sem virar um botão primário.
 */
const CLASSE_MAIS_FILTROS =
  'h-[38px] shrink-0 gap-[8px] rounded-[10px] border-border bg-secondary/40 px-[12px] text-[11px] font-medium transition-all duration-200 hover:border-primary/50 hover:bg-secondary/70 hover:shadow-glow';

/**
 * Select DENTRO do painel "Mais filtros": mesma régua do controle da barra
 * (`CLASSE_CONTROLE_FILTRO`), mas em LARGURA TOTAL e 40 px de altura.
 *
 * Não dá para reusar a constante da barra e só acrescentar `w-full`: ela traz
 * `sm:w-auto`/`sm:grow`, que existem para os filtros dividirem a linha da barra.
 * Aqui a linha é uma só coluna do painel, então o controle ocupa tudo — o
 * gatilho base do `SelectTrigger` já é `w-full`.
 */
const CLASSE_SELECT_PAINEL =
  'h-[32px] justify-between gap-[10px] rounded-[10px] border-border bg-secondary/40 px-[12px] text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-secondary/70 [&>svg]:shrink-0';

export function BarraFiltrosEscalas({
  filtros,
  onFiltros,
  departamentos,
  turnos,
  status,
  totalLinhas,
}: BarraFiltrosEscalasProps) {
  const avancados = contarFiltrosAvancados(filtros);
  const atualizar = (parcial: Partial<FiltrosEscalas>) => onFiltros({ ...filtros, ...parcial });

  // Valor exibido no gatilho: o mesmo critério do recorte (sentinela `todos`).
  const rotuloDepartamento = filtros.departamento === 'todos' ? 'Todos' : filtros.departamento;
  const rotuloTurno =
    filtros.turnoId === 'todos' ? 'Todos' : (turnos.find((turno) => turno.id === filtros.turnoId)?.nome ?? 'Todos');
  const rotuloStatus = filtros.status === 'todos' ? 'Todos' : filtros.status;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-card/40 p-2">
      <SearchInput
        value={filtros.busca}
        onChange={(valor) => atualizar({ busca: valor })}
        placeholder="Buscar colaborador…"
        className={CLASSE_BUSCA}
      />

      <Select value={filtros.departamento} onValueChange={(valor) => atualizar({ departamento: valor })}>
        <SelectTrigger
          aria-label="Filtrar por departamento"
          className={cn(CLASSE_CONTROLE_FILTRO, MEDIDA_FILTRO_DEPARTAMENTO)}
        >
          <ConteudoFiltro icone={Building2} rotulo="Departamento" valor={rotuloDepartamento} />
        </SelectTrigger>
        <SelectContent side="bottom" align="start">
          <SelectItem value="todos">Todos os departamentos</SelectItem>
          {departamentos.map((departamento) => (
            <SelectItem key={departamento} value={departamento}>
              {departamento}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.turnoId} onValueChange={(valor) => atualizar({ turnoId: valor })}>
        <SelectTrigger aria-label="Filtrar por turno" className={cn(CLASSE_CONTROLE_FILTRO, MEDIDA_FILTRO_TURNO)}>
          <ConteudoFiltro icone={Clock} rotulo="Turno" valor={rotuloTurno} />
        </SelectTrigger>
        <SelectContent side="bottom" align="start">
          <SelectItem value="todos">Todos os turnos</SelectItem>
          {turnos.map((turno) => (
            <SelectItem key={turno.id} value={turno.id}>
              {turno.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={CLASSE_MAIS_FILTROS} aria-label="Mais filtros">
            <ListFilter className="h-[14px] w-[14px] shrink-0" aria-hidden />
            Mais filtros
            {avancados > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center px-1">
                {avancados}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        {/*
          PAINEL "MAIS FILTROS" — cabeçalho, duas seções e rodapé, na régua do
          Design System: 20 px de padding (`p-4`), 15 px entre seções
          (`space-y-3`), divisórias discretas (`border-border/40`) e controles
          de 40 px renderizados (`h-[32px]`).

          O dropdown é o `Select` do sistema com o MESMO conteúdo dos filtros da
          barra (`ConteudoFiltro`: ícone + rótulo + valor), só que em largura
          TOTAL — dentro do painel não existe a divisão de espaço da barra, então
          `w-full` (sem `sm:w-auto`) é o certo aqui.

          O checkbox é o `Checkbox` oficial (Radix) dentro de um `<label>`: a
          linha inteira é a área clicável, o texto fica à esquerda e o controle à
          direita, alinhados na vertical.
        */}
        <PopoverContent align="end" className="w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border-border/60 p-4">
          {/* O respiro entre seções vive NESTE div: o `PopoverContent` do DS
              embrulha os filhos num `motion.div`, então `space-y-*` no conteúdo
              alcançaria só o wrapper e as seções ficariam coladas. */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-foreground">Mais filtros</p>
              {avancados > 0 ? (
                <Badge
                  variant="outline"
                  className="h-5 border-primary/40 bg-primary/12 px-2 text-[10px] font-medium text-primary"
                >
                  {avancados} ativo{avancados > 1 ? 's' : ''}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">Nenhum ativo</span>
              )}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <label className="block text-[11px] font-medium text-foreground" id="rotulo-status-escala">
                Status da escala
              </label>
              <Select value={filtros.status} onValueChange={(valor) => atualizar({ status: valor })}>
                <SelectTrigger
                  aria-label="Filtrar por status da escala"
                  aria-labelledby="rotulo-status-escala"
                  className={CLASSE_SELECT_PAINEL}
                >
                  <ConteudoFiltro icone={CheckCircle2} rotulo="Status" valor={rotuloStatus} />
                </SelectTrigger>
                <SelectContent side="bottom" align="start">
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {status.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {valor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-[11px] font-medium text-foreground">Exibição</p>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-secondary/50">
                <span className="min-w-0 text-[11px] text-muted-foreground">Só quem tem escala no período</span>
                <Checkbox
                  checked={filtros.somenteComEscala}
                  onCheckedChange={(valor) => atualizar({ somenteComEscala: valor === true })}
                  aria-label="Só quem tem escala no período"
                  className="shrink-0"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
              <p className="text-[10px] text-muted-foreground">{totalLinhas} colaborador(es)</p>
              <Button
                variant="ghost"
                className="h-[28px] gap-1 rounded-lg px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                onClick={() => onFiltros({ ...FILTROS_ESCALAS_INICIAIS })}
              >
                <X className="h-3 w-3" aria-hidden />
                Limpar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
