import React from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { entradaSimulador } from './simuladorEntrada';

/**
 * ============================================================================
 * CARD DE PARÂMETRO DO SIMULADOR ROI (visual + edição manual).
 *
 * O valor CONFIRMADO é único e vive no pai (`value`). Este componente mantém
 * apenas um rascunho de texto enquanto o campo está focado, para permitir
 * apagar/substituir/digitar decimais sem reformatação a cada tecla.
 *
 *   slider  → onChange(valor) → pai recalcula → `value` → campo
 *   digitar → Enter/blur validam → onChange → pai → slider e campo
 *
 * Escape restaura o último valor confirmado. Valores inválidos nunca são
 * enviados ao pai. Nenhuma fórmula financeira mora aqui.
 * ============================================================================
 */

export type ScenarioParameterUnit = 'integer' | 'currency' | 'percentage';

interface ScenarioParameterCardProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: ScenarioParameterUnit;
  icon: React.ReactNode;
  iconClassName?: string;
  onChange: (value: number) => void;
  /** Índice da cascata de entrada (0–8); o próprio card é o item animado. */
  indice?: number;
}

const CASAS: Record<ScenarioParameterUnit, number> = {
  integer: 0,
  currency: 2,
  percentage: 1,
};

const numero = (v: number, casas = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Valor exibido quando o campo NÃO está em edição. */
function formatarValor(v: number, unit: ScenarioParameterUnit): string {
  if (unit === 'currency') return numero(v, 2);
  if (unit === 'percentage') return numero(v, Number.isInteger(v) ? 0 : 1);
  return numero(v, 0);
}

/** Extremos do slider — sem centavos, como no desenho aprovado. */
function formatarLimite(v: number, unit: ScenarioParameterUnit): string {
  if (unit === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);
  }
  if (unit === 'percentage') return `${numero(v, 0)}%`;
  return numero(v, 0);
}

/** Texto inicial do rascunho: sem separador de milhar e com vírgula decimal. */
function textoDeEdicao(v: number): string {
  return String(v).replace('.', ',');
}

/**
 * Converte o texto digitado (formato brasileiro OU decimal simples).
 * "7.500" → 7500 · "7.500,50" → 7500.5 · "7500.50" → 7500.5
 * Retorna null para texto vazio/incompleto — sem marcar erro.
 */
function converterNumero(texto: string): number | null {
  let s = texto.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!s) return null;

  let negativo = false;
  if (s.startsWith('-')) {
    negativo = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

function arredondar(v: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(v * fator) / fator;
}

export function ScenarioParameterCard({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  icon,
  iconClassName,
  onChange,
  indice = 0,
}: ScenarioParameterCardProps) {
  const id = React.useId();
  const erroId = `${id}-erro`;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [focado, setFocado] = React.useState(false);
  const [rascunho, setRascunho] = React.useState('');
  const [invalido, setInvalido] = React.useState(false);
  /** Escape cancela a edição e o blur não pode confirmar o rascunho antigo. */
  const cancelarRef = React.useRef(false);

  const casas = CASAS[unit];
  const larguraCampo = unit === 'currency' ? 'w-[84px]' : 'w-[52px]';
  const mensagem = `Informe um valor entre ${formatarLimite(min, unit)} e ${formatarLimite(max, unit)}.`;
  const exibicao = focado ? rascunho : formatarValor(value, unit);

  React.useEffect(() => {
    if (focado) inputRef.current?.select();
  }, [focado]);

  const confirmar = (): boolean => {
    const n = converterNumero(rascunho);
    if (n === null) {
      setInvalido(false);
      return false;
    }
    const confirmado = arredondar(n, casas);
    if (confirmado < min || confirmado > max) {
      setInvalido(true);
      return false;
    }
    setInvalido(false);
    if (confirmado !== value) onChange(confirmado);
    return true;
  };

  return (
    <motion.div
      {...entradaSimulador(indice)}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border/60 bg-card/80 p-3.5',
        'transition-colors duration-150 hover:border-border hover:bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
            {icon}
          </span>
          <label htmlFor={id} className="line-clamp-2 min-w-0 text-[11.5px] font-medium leading-tight">
            {label}
          </label>
        </div>

        <div
          title={invalido ? mensagem : undefined}
          className={cn(
            'flex h-7 shrink-0 items-center gap-0.5 rounded-md border bg-background/70 px-1.5',
            'text-[11px] transition-colors',
            larguraCampo,
            invalido
              ? 'border-destructive/70 focus-within:border-destructive/70 focus-within:ring-1 focus-within:ring-destructive/15'
              : 'border-border/60 focus-within:border-muted-foreground/70 focus-within:ring-1 focus-within:ring-muted-foreground/15',
          )}
        >
          {unit === 'currency' && (
            <span aria-hidden className="shrink-0 text-[10px] font-medium text-muted-foreground">
              R$
            </span>
          )}
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode={unit === 'integer' ? 'numeric' : 'decimal'}
            autoComplete="off"
            value={exibicao}
            aria-invalid={invalido || undefined}
            aria-describedby={invalido ? erroId : undefined}
            onFocus={() => {
              setRascunho(textoDeEdicao(value));
              setFocado(true);
              setInvalido(false);
            }}
            onChange={(e) => {
              const bruto = e.target.value;
              if (!/^-?[\d.,]*$/.test(bruto)) {
                // Não aceita letras/símbolos: mantém só dígitos e separadores.
                setRascunho(bruto.replace(/[^\d.,-]/g, ''));
                setInvalido(true);
                return;
              }
              setRascunho(bruto);
              const n = converterNumero(bruto);
              setInvalido(n !== null && (n < min || n > max));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setRascunho(textoDeEdicao(value));
                setInvalido(false);
                cancelarRef.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              if (cancelarRef.current) {
                cancelarRef.current = false;
                setFocado(false);
                setInvalido(false);
                return;
              }
              const ok = confirmar();
              setFocado(false);
              if (!ok) setInvalido(false);
            }}
            className={cn(
              'text-numeric w-full min-w-0 bg-transparent text-right text-[11px] font-semibold tabular-nums',
              'text-foreground outline-none placeholder:text-muted-foreground/60',
              // O `:focus-visible` global aplica `ring-2 ring-ring ring-inset` (lime)
              // DENTRO do input. O indicador de foco deste campo é a borda
              // azul-acinzentada do contêiner — anulamos apenas esse anel local.
              'focus-visible:ring-0 focus-visible:ring-offset-0',
            )}
          />
          {unit === 'percentage' && (
            <span aria-hidden className="shrink-0 text-[10px] font-medium text-muted-foreground">
              %
            </span>
          )}
        </div>
      </div>

      <p className="mt-1.5 truncate text-[10px] leading-tight text-muted-foreground" title={description}>
        {description}
      </p>

      <Slider
        className="mt-3 roi-slider-gradient"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]: number[]) => {
          setInvalido(false);
          onChange(v);
        }}
        aria-label={label}
      />
      <div className="text-numeric mt-1.5 flex justify-between text-[9.5px] text-muted-foreground">
        <span>{formatarLimite(min, unit)}</span>
        <span>{formatarLimite(max, unit)}</span>
      </div>

      <span id={erroId} role="status" aria-live="polite" className="sr-only">
        {invalido ? mensagem : ''}
      </span>
    </motion.div>
  );
}

