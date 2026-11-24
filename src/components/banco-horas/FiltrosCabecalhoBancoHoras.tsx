/**
 * ============================================================================
 * CONTROLES DE RECORTE DO CABEÇALHO — seletor de período + "Mais filtros".
 *
 * A referência aprovada tira o intervalo de datas de cima da tabela e o leva
 * para a MESMA linha do título: à direita ficam, nesta ordem, o período, os
 * filtros avançados e a exportação. Isso libera a faixa acima do extrato para
 * os chips de tipo (uma única linha, ver `FiltrosExtratoBancoHoras.tsx`).
 *
 * ── DOIS GATILHOS, UM ESTADO ───────────────────────────────────────────────
 * `SeletorPeriodoBancoHoras` e `BotaoMaisFiltros` abrem painéis com o MESMO
 * `PeriodoExtrato` vindo da página (elevado em `BancoHorasPage.tsx`): o botão
 * do período é o atalho rápido do dia a dia e o "Mais filtros" reúne o recorte
 * completo (datas + o atalho de saldos negativos + limpar). Nenhum dos dois
 * guarda cópia própria do estado, então eles nunca divergem.
 *
 * ── O PERÍODO É O `Select` DO DESIGN SYSTEM ────────────────────────────────
 * o gatilho deixou de ser um `Popover` com as duas datas dentro e passou a ser
 * o dropdown oficial (`ui/select.tsx`), o mesmo do Controle de Ponto
 * (`ponto/CentralAjustesFiltros.tsx`) e da Auditoria: calendário à esquerda,
 * texto do recorte, chevron do próprio primitive (gira sozinho ao abrir, via
 * `overlayChevronAnimClasses`) e menu portado para o `body` — abre logo abaixo
 * do botão, acima dos cards, e nunca é cortado por `overflow` do card.
 *
 * As opções são as cinco janelas relativas a hoje ("Todo o período", 7/30/90
 * dias, 12 meses) mais "Personalizado". O valor exibido é SEMPRE derivado do
 * `periodo` que a página controla: se as pontas casam com uma janela, aquela
 * opção aparece marcada; se são um intervalo livre (ou o usuário acabou de
 * digitar uma data no "Mais filtros"), o rótulo mostra as próprias datas e a
 * opção destacada é "Personalizado" — o gatilho nunca mente sobre o recorte.
 *
 * ── "PERSONALIZADO" NÃO PERDEU AS DATAS ────────────────────────────────────
 * escolher "Personalizado" abre o painel com os dois `DatePicker` (o MESMO
 * `CamposPeriodo` do "Mais filtros"). Ele é um `Popover` CONTROLADO ancorado no
 * seletor (`PopoverAnchor`, reexportado em `ui/popover.tsx`): um elemento não
 * pode ser gatilho de dois overlays, então o `Select` continua gatilho dele
 * mesmo e o painel só se ancora nele. Nenhuma funcionalidade saiu do lugar —
 * as datas continuam a um clique, e a página continua dona do estado.
 *
 * ── SEM COMPONENTE NOVO DE CALENDÁRIO ──────────────────────────────────────
 * As datas usam o `DatePicker` do Design System (`ui/date-picker.tsx`), o mesmo
 * das outras telas — só recebe a geometria compacta do cabeçalho por
 * `className` (o tailwind-merge do `cn` deixa a última classe vencer).
 * ============================================================================
 */
import { useEffect, useRef, useState } from 'react';
import { subDays, subMonths } from 'date-fns';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDateLocalISO, parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';
import {
  formatarDataBR,
  temFiltroExtratoAtivo,
  temPeriodoAtivo,
  type FiltrosExtrato,
  type PeriodoExtrato,
} from './bancoHorasComum';

/**
 * Geometria comum dos dois gatilhos — 34 px de classe (42,5 px renderizados pela
 * escala global de 125%), como o botão Exportar: os controles do recorte sobem
 * para a faixa confortável de toque (40–44 px) sem virar ação primária.
 *
 * Só a GEOMETRIA e a transição moram aqui; cor/halo são de cada gatilho, porque
 * a hierarquia da faixa depende disso (ver `CLASSE_GATILHO_*` abaixo).
 */
const CLASSE_GATILHO_BASE =
  'h-[34px] shrink-0 gap-[8px] rounded-[10px] px-[13px] text-[12px] font-medium transition-all duration-fast';

/**
 * Seletor de período — `SelectTrigger` do DS.
 *
 * O primitive já entrega o que o padrão pede: fundo escuro (`bg-background`),
 * borda (`border-input`), raio, texto em uma linha (`[&>span]:line-clamp-1`) e
 * o chevron à direita girando 180° quando o menu abre
 * (`overlayChevronAnimClasses`). Aqui só ajustamos a GEOMETRIA do cabeçalho
 * (`w-auto` no lugar do `w-full`, altura/raio/padding da faixa) e o hover:
 * borda lime FOSCA, sem halo — halo é do "Mais filtros" e do "Exportar".
 */
const CLASSE_GATILHO_PERIODO = cn(
  CLASSE_GATILHO_BASE,
  'w-auto min-w-0 justify-between whitespace-nowrap text-foreground',
  'hover:border-primary/30 hover:bg-primary/5',
  'data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5'
);

/**
 * "Mais filtros" — escuro no repouso (o `outline` do Button: `bg-background` +
 * `border-input`), com uma única adição: o hover premium do sistema.
 *
 *   • `hover:border-primary/40` — a borda acende em lime;
 *   • `hover:bg-primary/5` — véu de lime a 5% (destaque sem virar botão cheio);
 *   • `hover:shadow-glow` — halo lime de baixa opacidade (`0 0 20px -5px`,
 *     a régua de todos os glows do DS). `box-shadow` não entra no layout, então
 *     nada se desloca ao passar o mouse;
 *   • 220 ms (`duration-fast`), dentro da faixa pedida de 200–250 ms, e NENHUMA
 *     animação em loop/pulso.
 *
 * Texto e ícone continuam em `--foreground` nos dois estados (o `hover:text-*`
 * do `outline` é sobrescrito): legibilidade preservada sobre o véu de lime.
 */
const CLASSE_MAIS_FILTROS = cn(
  CLASSE_GATILHO_BASE,
  'text-foreground',
  'hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-glow'
);

/**
 * Estado PADRONIZADO de "tem filtro ligado" na faixa compacta — a receita do
 * `FilterChip` (`ui/filter-chip.tsx`, ramo `compacto`): borda lime a 50%, tinta
 * lime a 10% e texto/ícone no lime. É o mesmo desenho que marca filtro ativo
 * nas outras áreas, e ele convive com o hover (que só sobe a tinta para 15%).
 */
const CLASSE_MAIS_FILTROS_ATIVO = 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary';

/** Geometria do `DatePicker` dentro dos painéis (mesma régua dos gatilhos). */
const CLASSE_CAMPO_DATA = 'h-[31px] rounded-[9px] bg-secondary/40 px-[9px] text-[11px]';

/**
 * Atalhos do seletor. `personalizado` não é uma janela fixa: ele abre o painel
 * de datas (e é o valor derivado sempre que o recorte não casa com nenhum dos
 * outros cinco).
 */
type PresetPeriodo = 'todo' | '7d' | '30d' | '90d' | '12m' | 'personalizado';

const PRESETS_PERIODO: ReadonlyArray<{ valor: PresetPeriodo; rotulo: string }> = [
  { valor: 'todo', rotulo: 'Todo o período' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: '90d', rotulo: 'Últimos 90 dias' },
  { valor: '12m', rotulo: 'Últimos 12 meses' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
];

/** Tamanho (em dias, contando hoje) de cada janela fixa. */
const DIAS_POR_PRESET: Partial<Record<PresetPeriodo, number>> = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Traduz um atalho nas duas pontas `YYYY-MM-DD` que a página já consome.
 *
 * `date-fns` + `utils/dateLocal`: a conta é de CALENDÁRIO LOCAL (é o "hoje" de
 * quem está olhando a tela), então `subMonths(hoje, 12)` devolve 12 meses reais
 * — inclusive resolvendo 29/02 para 28/02 quando o ano de destino não é
 * bissexto. Nada de `new Date('YYYY-MM-DD')` (meia-noite UTC), que devolveria o
 * dia anterior em fuso negativo.
 */
function janelaDoPreset(preset: PresetPeriodo): PeriodoExtrato {
  if (preset === 'todo' || preset === 'personalizado') return { de: '', ate: '' };
  const hoje = parseDateLocalISO(todayLocalISO());
  if (!hoje) return { de: '', ate: '' };
  const inicio = preset === '12m' ? subMonths(hoje, 12) : subDays(hoje, (DIAS_POR_PRESET[preset] ?? 1) - 1);
  return { de: formatDateLocalISO(inicio), ate: formatDateLocalISO(hoje) };
}

/**
 * Qual atalho DESCREVE o período atual.
 *
 * A comparação é pelo resultado (mesmas duas pontas), não por um `useState`
 * paralelo: assim uma data digitada no "Mais filtros" também movimenta o
 * seletor, e "limpar filtros" volta sozinho para "Todo o período".
 */
function presetDoPeriodo(periodo: PeriodoExtrato): PresetPeriodo {
  if (!temPeriodoAtivo(periodo)) return 'todo';
  const atalho = PRESETS_PERIODO.find(({ valor }) => {
    if (valor === 'todo' || valor === 'personalizado') return false;
    const janela = janelaDoPreset(valor);
    return janela.de === periodo.de && janela.ate === periodo.ate;
  });
  return atalho?.valor ?? 'personalizado';
}

/**
 * Texto do gatilho: o rótulo do atalho quando o recorte casa com um deles e,
 * fora dos atalhos, as PRÓPRIAS datas (o gatilho nunca mente sobre o recorte).
 */
function rotuloDoGatilho(periodo: PeriodoExtrato, preset: PresetPeriodo): string {
  if (preset === 'personalizado') return rotuloPeriodo(periodo);
  return PRESETS_PERIODO.find((opcao) => opcao.valor === preset)?.rotulo ?? 'Todo o período';
}

/**
 * Rótulo do período no gatilho: as duas pontas quando existem, a ponta solta
 * quando só uma foi escolhida e "Todo o período" quando o recorte está aberto.
 */
function rotuloPeriodo(periodo: PeriodoExtrato): string {
  const { de, ate } = periodo;
  if (de && ate) return `${formatarDataBR(de)} – ${formatarDataBR(ate)}`;
  if (de) return `A partir de ${formatarDataBR(de)}`;
  if (ate) return `Até ${formatarDataBR(ate)}`;
  return 'Todo o período';
}

/**
 * Os dois campos de data — o miolo compartilhado pelos dois painéis.
 *
 * O `max` do "De" é o "Até" e o `min` do "Até" é o "De": o calendário já
 * impede um intervalo invertido (que devolveria zero linhas sem explicação).
 */
function CamposPeriodo({
  periodo,
  onPeriodoChange,
}: {
  periodo: PeriodoExtrato;
  onPeriodoChange: (periodo: PeriodoExtrato) => void;
}) {
  return (
    <div className="space-y-[8px]">
      <div className="space-y-[4px]">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">De</span>
        <DatePicker
          value={periodo.de}
          max={periodo.ate || undefined}
          onChange={(de) => onPeriodoChange({ ...periodo, de })}
          placeholder="dd/mm/aaaa"
          aria-label="Data inicial do recorte"
          className={CLASSE_CAMPO_DATA}
        />
      </div>
      <div className="space-y-[4px]">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Até</span>
        <DatePicker
          value={periodo.ate}
          min={periodo.de || undefined}
          onChange={(ate) => onPeriodoChange({ ...periodo, ate })}
          placeholder="dd/mm/aaaa"
          aria-label="Data final do recorte"
          className={CLASSE_CAMPO_DATA}
        />
      </div>
    </div>
  );
}

export interface SeletorPeriodoBancoHorasProps {
  periodo: PeriodoExtrato;
  onPeriodoChange: (periodo: PeriodoExtrato) => void;
}

/**
 * Link discreto de "Limpar" — compartilhado pelos dois painéis (período e
 * filtros avançados) para os rodapés não divergirem em tipografia/foco.
 */
const CLASSE_LIMPAR =
  'text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40';

/**
 * Seletor do período — o DROPDOWN PADRONIZADO do Design System.
 *
 * O gatilho é o `SelectTrigger` (calendário · texto do recorte · chevron), e o
 * valor que ele mostra é DERIVADO de `periodo`: escolher um atalho escreve as
 * duas pontas via `onPeriodoChange` (a página continua dona do estado) e o
 * item correspondente aparece marcado no menu — inclusive quando as datas
 * vieram do "Mais filtros".
 *
 * "Personalizado" abre o painel de datas, não aplica recorte nenhum: ele é um
 * `Popover` CONTROLADO ancorado no seletor, com os mesmos dois `DatePicker` de
 * antes. Fecha no "Concluir", ao clicar fora e ao escolher um atalho fixo (as
 * datas em si aplicam o recorte na hora, como sempre fizeram).
 */
export function SeletorPeriodoBancoHoras({ periodo, onPeriodoChange }: SeletorPeriodoBancoHorasProps) {
  /** Painel de datas — aberto pelo item do MENU, nunca pelo gatilho. */
  const [painelPersonalizado, setPainelPersonalizado] = useState(false);
  const preset = presetDoPeriodo(periodo);
  const ativo = temPeriodoAtivo(periodo);

  /**
   * Abre o painel de datas no PRÓXIMO ciclo — e não no mesmo `pointerup`.
   *
   * O Radix Select seleciona no `pointerup` e o MESMO gesto ainda dispara
   * `click`/`mouseup` logo depois. Um overlay que monta no meio dessa sequência
   * recebe esses eventos como "interação fora" e se fecha sozinho
   * (`deferPointerDownOutside` do `DismissableLayer`), então o painel abria e
   * sumia no mesmo instante. Um tick de espera deixa o gesto terminar antes de
   * o painel existir; o timer é cancelado se o componente sair antes disso.
   */
  const aberturaRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (aberturaRef.current !== null) window.clearTimeout(aberturaRef.current);
    },
    []
  );
  const abrirPersonalizado = () => {
    if (aberturaRef.current !== null) window.clearTimeout(aberturaRef.current);
    aberturaRef.current = window.setTimeout(() => {
      aberturaRef.current = null;
      setPainelPersonalizado(true);
    }, 0);
  };

  return (
    <Popover open={painelPersonalizado} onOpenChange={setPainelPersonalizado}>
      {/* Âncora SEM gatilho: o `Select` continua sendo gatilho só do menu dele
          (um elemento não pode abrir dois overlays) e o painel de datas apenas
          se posiciona aqui — logo abaixo do botão, acima dos cards. */}
      <PopoverAnchor asChild>
        <span className="inline-flex min-w-0">
          <Select
            value={preset}
            onValueChange={(valor) => {
              if (valor === 'personalizado') {
                abrirPersonalizado();
                return;
              }
              // Um atalho fixo substitui o recorte livre: o painel não tem mais
              // o que editar, então fecha junto com a escolha.
              setPainelPersonalizado(false);
              onPeriodoChange(janelaDoPreset(valor as PresetPeriodo));
            }}
          >
            <SelectTrigger
              aria-label="Período do extrato"
              title="Escolher o período do recorte"
              className={cn(CLASSE_GATILHO_PERIODO, ativo && 'border-primary/40')}
            >
              <div className="flex min-w-0 items-center gap-[8px]">
                <CalendarDays className="h-[14px] w-[14px] shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{rotuloDoGatilho(periodo, preset)}</span>
              </div>
            </SelectTrigger>
            <SelectContent align="end" side="bottom" className="min-w-[204px] rounded-xl">
              {PRESETS_PERIODO.map((opcao) => {
                /* `personalizado` NÃO muda o recorte, e o Radix só emite
                   `onValueChange` quando o valor MUDA (`useControllableState`).
                   Por isso o painel de datas é aberto pelos eventos do próprio
                   item — exatamente os três caminhos que o `handleSelect` do
                   Radix percorre: mouse (`pointerup`), toque (`click`) e
                   teclado (`Enter`/`Espaço`). Os handlers são idempotentes:
                   quando o valor também muda, o `onValueChange` abre junto e
                   não há duplicidade. */
                const personalizado = opcao.valor === 'personalizado';
                return (
                  <SelectItem
                    key={opcao.valor}
                    value={opcao.valor}
                    className="text-[12px]"
                    onPointerUp={personalizado ? abrirPersonalizado : undefined}
                    onClick={personalizado ? abrirPersonalizado : undefined}
                    onKeyDown={
                      personalizado
                        ? (evento) => {
                            if (evento.key === 'Enter' || evento.key === ' ') abrirPersonalizado();
                          }
                        : undefined
                    }
                  >
                    {opcao.rotulo}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </span>
      </PopoverAnchor>

      <PopoverContent align="end" className="w-[268px] p-[12px]">
        <p className="mb-[9px] text-[11px] font-semibold leading-none text-foreground">Período personalizado</p>
        <CamposPeriodo periodo={periodo} onPeriodoChange={onPeriodoChange} />
        <div className="mt-[10px] flex items-center justify-between gap-[8px]">
          <button
            type="button"
            onClick={() => onPeriodoChange({ de: '', ate: '' })}
            disabled={!ativo}
            className={CLASSE_LIMPAR}
          >
            Limpar período
          </button>
          <button
            type="button"
            onClick={() => setPainelPersonalizado(false)}
            className="text-[10.5px] font-medium text-primary transition-colors hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            Concluir
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface BotaoMaisFiltrosProps {
  periodo: PeriodoExtrato;
  onPeriodoChange: (periodo: PeriodoExtrato) => void;
  filtros: FiltrosExtrato;
  onFiltrosChange: (filtros: FiltrosExtrato) => void;
  /** Zera período, busca e tipo de uma vez (o mesmo "Limpar" de antes). */
  onLimpar: () => void;
}

/**
 * "Mais filtros" — filtros avançados do recorte.
 *
 * Reúne o intervalo de datas (que a referência tirou de dentro do card do
 * extrato) e o atalho "Somente saldos negativos", que é o MESMO estado do chip
 * da faixa acima da tabela: marcar aqui acende lá e vice-versa.
 *
 * O GATILHO tem três estados, e só um deles acende o halo:
 *
 *   1. REPOUSO ... aparência escura original (`outline`: `bg-background` +
 *                  `border-input`), texto/ícone em `--foreground`;
 *   2. HOVER ..... borda lime + véu lime 5% + `shadow-glow` (ver
 *                  `CLASSE_MAIS_FILTROS`) — elegante e sem pulso contínuo;
 *   3. ATIVO ..... qualquer filtro ligado (período, busca ou tipo) troca para a
 *                  receita padronizada do `FilterChip` compacto
 *                  (`CLASSE_MAIS_FILTROS_ATIVO`): borda lime 50%, tinta 10%,
 *                  texto lime. `data-filtros-ativos` espelha o estado no DOM
 *                  para inspeção/teste sem depender de cor computada.
 *
 * `temFiltroExtratoAtivo` é o único critério — nada de `useState` extra aqui.
 */
export function BotaoMaisFiltros({
  periodo,
  onPeriodoChange,
  filtros,
  onFiltrosChange,
  onLimpar,
}: BotaoMaisFiltrosProps) {
  const algumAtivo = temFiltroExtratoAtivo(filtros, periodo);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(CLASSE_MAIS_FILTROS, algumAtivo && CLASSE_MAIS_FILTROS_ATIVO)}
          title="Filtros avançados do extrato"
          data-filtros-ativos={algumAtivo ? 'true' : 'false'}
        >
          <SlidersHorizontal className="h-[14px] w-[14px] shrink-0 opacity-80" aria-hidden />
          Mais filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[268px] p-[12px]">
        <p className="mb-[9px] text-[11px] font-semibold leading-none text-foreground">Filtros avançados</p>

        <CamposPeriodo periodo={periodo} onPeriodoChange={onPeriodoChange} />

        <label className="mt-[10px] flex cursor-pointer items-center gap-[8px] rounded-[9px] border border-border/60 bg-secondary/30 px-[9px] py-[7px]">
          <Checkbox
            checked={filtros.tipo === 'negativos'}
            onCheckedChange={(marcado) => onFiltrosChange({ ...filtros, tipo: marcado ? 'negativos' : 'todos' })}
            aria-label="Mostrar somente lançamentos com saldo negativo"
          />
          <span className="text-[11px] leading-none text-muted-foreground">Somente saldos negativos</span>
        </label>

        <div className="mt-[10px] flex items-center justify-between gap-[8px]">
          <button type="button" onClick={onLimpar} disabled={!algumAtivo} className={CLASSE_LIMPAR}>
            Limpar filtros
          </button>
          <span className="text-[10px] text-muted-foreground/70">{rotuloPeriodo(periodo)}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
