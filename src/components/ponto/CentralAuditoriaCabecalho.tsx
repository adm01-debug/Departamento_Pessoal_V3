/**
 * ============================================================================
 * CABEÇALHO DA CENTRAL DE AUDITORIA — faixa compacta da aba.
 *
 *   [ ícone ]  Central de Auditoria          [ 📅 Últimos 30 dias ] [ ⭳ Exportar Trilha ]
 *              Histórico de operações, rastreabilidade e integridade dos registros.
 *
 * Tipografia e medidas seguem a receita dos cabeçalhos compactos do módulo
 * (`CentralAjustesCabecalho`): ícone de 36 px com a tinta do `primary`, título
 * de 15 px em `font-display` e subtítulo de 11,5 px em `text-muted-foreground`.
 * Nada de faixa alta: o pedido é explícito em "evitar cabeçalhos excessivamente
 * altos".
 *
 * ── O SELETOR DE PERÍODO ──────────────────────────────────────────────────
 * É o dropdown oficial do Design System (`ui/select`), com o rótulo DERIVADO do
 * recorte: escolher um atalho escreve o intervalo no componente pai e o menu
 * marca o item correspondente (inclusive quando as datas vieram do painel).
 *
 * "Personalizado" abre um `Popover` CONTROLADO com os dois `DatePicker` do
 * sistema, ancorado no próprio gatilho (`PopoverAnchor`) — um mesmo elemento não
 * pode ser gatilho de dois overlays, então o `Select` continua sendo o gatilho e
 * o painel apenas se ancora nele. A abertura é adiada em um tick porque o Radix
 * seleciona no `pointerup` e o `click` do MESMO gesto fecharia o painel recém
 * montado (ver `SeletorPeriodoBancoHoras`, que resolve o mesmo problema).
 *
 * ── A EXPORTAÇÃO ──────────────────────────────────────────────────────────
 * Mesma função e mesmo comportamento de antes: `exportPontoCSV` com a trilha
 * FILTRADA (não só a página). O que mudou é só o lugar do botão.
 * ============================================================================
 */
import { useRef, useState } from 'react';
import { CalendarDays, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PERIODOS_AUDITORIA,
  intervaloDoPeriodoAuditoria,
  rotuloDoPeriodoAuditoria,
  type PeriodoAuditoria,
  type RecortePersonalizado,
} from './centralAuditoria';

interface CentralAuditoriaCabecalhoProps {
  periodo: PeriodoAuditoria;
  personalizado: RecortePersonalizado;
  onPeriodo: (periodo: PeriodoAuditoria) => void;
  onPersonalizado: (recorte: RecortePersonalizado) => void;
  onExportar: () => void;
}

/** Rótulo de campo do painel de datas — a mesma régua do painel de detalhes. */
const ROTULO_CAMPO = 'block text-[10px] font-medium tracking-wide text-muted-foreground uppercase';

export function CentralAuditoriaCabecalho({
  periodo,
  personalizado,
  onPeriodo,
  onPersonalizado,
  onExportar,
}: CentralAuditoriaCabecalhoProps) {
  /** Painel de datas — aberto pelo item do MENU, nunca pelo gatilho. */
  const [painelAberto, setPainelAberto] = useState(false);
  const timerRef = useRef<number | null>(null);
  /** Marca que o painel de datas está a caminho (ver `onCloseAutoFocus`). */
  const pendenteRef = useRef(false);

  const abrirPainel = () => {
    pendenteRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPainelAberto(true);
    }, 0);
  };

  const trocarPeriodo = (valor: string) => {
    if (valor === 'personalizado') {
      onPeriodo('personalizado');
      abrirPainel();
      return;
    }
    onPeriodo(valor as PeriodoAuditoria);
    setPainelAberto(false);
  };

  const recorte = intervaloDoPeriodoAuditoria('personalizado', personalizado);

  return (
    <header className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-[15px] leading-tight font-semibold tracking-tight">
            Central de Auditoria
          </h2>
          <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
            Histórico de operações, rastreabilidade e integridade dos registros.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
        <Popover open={painelAberto} onOpenChange={setPainelAberto}>
          <PopoverAnchor asChild>
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Select value={periodo} onValueChange={trocarPeriodo}>
                <SelectTrigger
                  aria-label="Período da trilha de auditoria"
                  className="h-9 w-full gap-2 rounded-lg border-border/60 bg-background/70 px-2.5 text-[11.5px] font-medium sm:w-[176px]"
                >
                  {/* O `div` é necessário: o trigger aplica `[&>span]:line-clamp-1`
                      nos filhos diretos, e `line-clamp` grava `display:-webkit-box`
                      (mata o `flex` do calendário + texto). */}
                  <div className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <SelectValue className="whitespace-nowrap">
                      {rotuloDoPeriodoAuditoria(periodo, personalizado)}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                {/* O `Select` devolve o foco ao gatilho assim que fecha. Quando o
                    painel de datas está a caminho, esse `focusin` cai FORA do
                    painel recém-montado e o `DismissableLayer` do Radix lê como
                    "interagiu fora": o painel abria e fechava sozinho meio
                    segundo depois. Devolver o foco ao gatilho é o certo para os
                    atalhos; no personalizado quem assume o foco é o painel. */}
                <SelectContent
                  onCloseAutoFocus={(evento) => {
                    if (pendenteRef.current) evento.preventDefault();
                  }}
                >
                  {PERIODOS_AUDITORIA.map((opcao) => (
                    <SelectItem
                      key={opcao.valor}
                      value={opcao.valor}
                      className="text-xs"
                      // O `onValueChange` não dispara quando o item já está
                      // selecionado; sem este gancho o segundo clique em
                      // "Personalizado" não reabriria o recorte.
                      onPointerUp={opcao.valor === 'personalizado' ? abrirPainel : undefined}
                    >
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverAnchor>

          <PopoverContent align="end" sideOffset={6} className="w-[248px] space-y-2 p-3">
            <p className="text-[11px] font-semibold">Período personalizado</p>
            <div className="space-y-1">
              <span className={ROTULO_CAMPO}>De</span>
              <DatePicker
                value={personalizado.de}
                max={personalizado.ate || undefined}
                onChange={(de) => onPersonalizado({ ...personalizado, de })}
                placeholder="dd/mm/aaaa"
                aria-label="Data inicial da trilha"
                className="h-8 w-full rounded-lg border-border/60 bg-background/70 text-[11.5px]"
              />
            </div>
            <div className="space-y-1">
              <span className={ROTULO_CAMPO}>Até</span>
              <DatePicker
                value={personalizado.ate}
                min={personalizado.de || undefined}
                onChange={(ate) => onPersonalizado({ ...personalizado, ate })}
                placeholder="dd/mm/aaaa"
                aria-label="Data final da trilha"
                className="h-8 w-full rounded-lg border-border/60 bg-background/70 text-[11.5px]"
              />
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {recorte.inicio === recorte.fim
                ? 'Recorte de um único dia.'
                : 'O recorte é aplicado assim que as duas datas estão preenchidas.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-[11px]"
              onClick={() => setPainelAberto(false)}
            >
              Concluir
            </Button>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportar}
          className="h-9 gap-1.5 rounded-lg px-3 text-[11.5px] font-medium"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Exportar Trilha
        </Button>
      </div>
    </header>
  );
}
