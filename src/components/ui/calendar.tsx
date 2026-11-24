import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Janela de 12 anos exibida na visão de anos (mesmo tamanho de grade da
 * visão de meses — 3 colunas × 4 linhas — pra manter o componente compacto). */
const YEAR_WINDOW = 12;

const NAV_BUTTON_CLASS = cn(
  buttonVariants({ variant: "outline" }),
  "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 shrink-0",
);

const DAY_CLASSNAMES = {
  months: "flex flex-col",
  month: "space-y-0",
  month_grid: "w-full border-collapse space-y-1",
  weekdays: "flex",
  weekday: "text-muted-foreground rounded-md w-7 font-normal text-[11px]",
  week: "flex w-full mt-1.5",
  day: "h-7 w-7 text-center text-[12px] p-0 relative",
  day_button: cn(
    buttonVariants({ variant: "ghost" }),
    "h-7 w-7 p-0 font-normal aria-selected:opacity-100",
  ),
  range_end: "day-range-end",
  selected:
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
  today: "bg-accent text-accent-foreground",
  outside:
    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
  disabled: "text-muted-foreground opacity-50",
  range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
  hidden: "invisible",
};

/** Cabeçalho compartilhado pelas 3 visões (dias/meses/anos) — grid de 3
 * colunas com as setas em colunas de largura FIXA e o título numa coluna
 * `1fr` entre elas. Diferente de `position: absolute`, isso centraliza o
 * título de verdade (relativo ao componente inteiro) sem depender da
 * largura das setas, e nunca deixa a seta "vazar" pra cima da grade de dias
 * — é um item de grid separado, não sobreposto. */
function CalendarHeader({
  label, onPrev, onNext, onLabelClick, disabledPrev, disabledNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onLabelClick?: () => void;
  disabledPrev?: boolean;
  disabledNext?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-1 px-1 pt-1 pb-3">
      <button
        type="button"
        aria-label="Anterior"
        onClick={onPrev}
        disabled={disabledPrev}
        className={NAV_BUTTON_CLASS}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          className="justify-self-center rounded-md px-2 py-1 text-[13px] font-medium capitalize transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {label}
        </button>
      ) : (
        <span className="justify-self-center text-[13px] font-medium capitalize">{label}</span>
      )}
      <button
        type="button"
        aria-label="Próximo"
        onClick={onNext}
        disabled={disabledNext}
        className={NAV_BUTTON_CLASS}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Botão de célula compartilhado pelas grades de meses/anos — mesmos
 * estados (hoje/selecionado/hover) da grade de dias, só com formato de
 * "pill" em vez de círculo (a referência visual do pedido). */
function GridCell({
  label, selected, isToday, onClick,
}: {
  label: string; selected?: boolean; isToday?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-md text-[12px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected
          ? "bg-primary text-primary-foreground hover:bg-primary"
          : isToday
            ? "border border-primary/50 text-foreground hover:bg-accent hover:text-accent-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}

function MonthsGrid({ year, selectedMonth, onSelect }: { year: number; selectedMonth?: number; onSelect: (monthIndex: number) => void }) {
  const today = new Date();
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
      {MESES_ABREV.map((label, i) => (
        <GridCell
          key={label}
          label={label}
          selected={selectedMonth === i}
          isToday={today.getFullYear() === year && today.getMonth() === i}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}

function YearsGrid({ start, selectedYear, onSelect }: { start: number; selectedYear?: number; onSelect: (year: number) => void }) {
  const today = new Date();
  const years = Array.from({ length: YEAR_WINDOW }, (_, i) => start + i);
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
      {years.map((year) => (
        <GridCell
          key={year}
          label={String(year)}
          selected={selectedYear === year}
          isToday={today.getFullYear() === year}
          onClick={() => onSelect(year)}
        />
      ))}
    </div>
  );
}

type CalendarView = "days" | "months" | "years";

/**
 * Calendário global do Design System (dark, compacto) — usado por todo
 * `DatePicker` (ver `date-picker.tsx`) e por qualquer outro consumidor
 * direto (ex.: `TelemetryFilters`).
 *
 * Além da grade de dias do `react-day-picker`, adiciona navegação rápida por
 * mês/ano (clicar no título → grade de meses → grade de anos) pra não
 * depender de dezenas de cliques na seta pra voltar décadas — só ativo em
 * `mode="single"` (único modo usado hoje); outros modos caem no
 * `react-day-picker` puro, com o mesmo ajuste de cabeçalho (`navLayout`).
 */
// `CalendarProps` é a união discriminada (por `mode`) do react-day-picker —
// só `mode="single"` ganha a navegação rápida por mês/ano (ver comentário
// acima do componente), então o corpo dessa visão trabalha com um formato
// simplificado em vez de lutar contra a união pra cada campo.
interface SingleModeProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: CalendarProps["disabled"];
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (date: Date) => void;
  [key: string]: unknown;
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const isSingle = props.mode === "single" || props.mode === undefined;
  const single = props as unknown as SingleModeProps;

  const initialMonth =
    single.month ??
    single.defaultMonth ??
    (single.selected instanceof Date ? single.selected : undefined) ??
    new Date();
  const [month, setMonth] = React.useState<Date>(initialMonth);
  const [view, setView] = React.useState<CalendarView>("days");
  const [yearWindowStart, setYearWindowStart] = React.useState(
    () => Math.floor(initialMonth.getFullYear() / YEAR_WINDOW) * YEAR_WINDOW,
  );

  const goToMonth = (next: Date) => {
    setMonth(next);
    props.onMonthChange?.(next);
  };

  if (!isSingle) {
    // Modos multiple/range: só o ajuste de cabeçalho (setas ao redor do
    // título, bem espaçadas da grade) — a navegação rápida por mês/ano é
    // exclusiva do `mode="single"`, único caso real usado no app hoje.
    return (
      <DayPicker
        showOutsideDays={showOutsideDays}
        navLayout="around"
        locale={ptBR}
        className={cn("p-3", className)}
        classNames={{
          ...DAY_CLASSNAMES,
          month: "space-y-0",
          month_caption: "justify-self-center text-[13px] font-medium capitalize",
          button_previous: cn(NAV_BUTTON_CLASS, "justify-self-start"),
          button_next: cn(NAV_BUTTON_CLASS, "justify-self-end"),
          ...classNames,
        }}
        components={{
          Month: ({ className: monthClassName, ...rest }) => (
            <div
              className={cn(
                "grid grid-cols-[1.75rem_1fr_1.75rem] grid-rows-[auto_auto] items-center gap-y-3",
                monthClassName,
              )}
              {...rest}
            />
          ),
        }}
        {...props}
      />
    );
  }

  const { selected, onSelect, disabled, onMonthChange: _onMonthChange, month: _month, defaultMonth: _defaultMonth, mode: _mode, ...rest } = single;
  const selectedDate = selected instanceof Date ? selected : undefined;

  return (
    <div className={cn("p-3", className)}>
      {view === "days" && (
        <>
          <CalendarHeader
            label={`${MESES_LONGOS[month.getMonth()]} ${month.getFullYear()}`}
            onPrev={() => goToMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            onNext={() => goToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            onLabelClick={() => setView("months")}
          />
          <DayPicker
            mode="single"
            showOutsideDays={showOutsideDays}
            locale={ptBR}
            month={month}
            onMonthChange={goToMonth}
            selected={selectedDate}
            onSelect={onSelect}
            disabled={disabled}
            hideNavigation
            className="p-0"
            classNames={{ ...DAY_CLASSNAMES, ...classNames }}
            components={{ MonthCaption: () => <></> }}
            {...(rest as Record<string, unknown>)}
          />
        </>
      )}

      {view === "months" && (
        <>
          <CalendarHeader
            label={String(month.getFullYear())}
            onPrev={() => setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))}
            onNext={() => setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))}
            onLabelClick={() => {
              setYearWindowStart(Math.floor(month.getFullYear() / YEAR_WINDOW) * YEAR_WINDOW);
              setView("years");
            }}
          />
          <MonthsGrid
            year={month.getFullYear()}
            selectedMonth={selectedDate && selectedDate.getFullYear() === month.getFullYear() ? selectedDate.getMonth() : undefined}
            onSelect={(monthIndex) => {
              goToMonth(new Date(month.getFullYear(), monthIndex, 1));
              setView("days");
            }}
          />
        </>
      )}

      {view === "years" && (
        <>
          <CalendarHeader
            label={`${yearWindowStart}–${yearWindowStart + YEAR_WINDOW - 1}`}
            onPrev={() => setYearWindowStart((y) => y - YEAR_WINDOW)}
            onNext={() => setYearWindowStart((y) => y + YEAR_WINDOW)}
          />
          <YearsGrid
            start={yearWindowStart}
            selectedYear={selectedDate?.getFullYear()}
            onSelect={(year) => {
              setMonth(new Date(year, month.getMonth(), 1));
              setView("months");
            }}
          />
        </>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
