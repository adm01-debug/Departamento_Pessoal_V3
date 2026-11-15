import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { TemaChip } from './chipFiltroComum';

/**
 * ============================================================================
 * CHIP COLORIDO DE FILTRO — componente ÚNICO do Design System de Desempenho.
 *
 * Esta é a ANATOMIA aprovada na aba Auditoria, extraída para ser reutilizada
 * por TODAS as abas que têm chips de filtro coloridos (Metas & OKRs, Feedbacks,
 * PDI). Nenhum módulo redesenha o chip: todos consomem este componente.
 *
 * ESTRUTURA (ordem fixa): bolinha colorida → rótulo → contador [→ trailing].
 *
 * GEOMETRIA / TIPOGRAFIA (idênticas à referência da Auditoria):
 *   • altura            → `h-8` (32px);
 *   • formato           → `rounded-full`;
 *   • padding           → `px-3`, sem padding vertical (a altura manda);
 *   • espaçamento       → `gap-2` entre bolinha, rótulo e contador;
 *   • fonte do rótulo   → `text-[12px] font-medium`;
 *   • contador          → `rounded-full px-1.5 text-[11px] tabular-nums`.
 *
 * CORES: o componente não conhece nenhum nome de cor — recebe `tema` (TemaChip,
 * de `chipFiltroComum`). A cor da categoria é preservada nos DOIS estados: o
 * inativo continua com borda, fundo, texto, bolinha e contador tingidos; o
 * selecionado usa a MESMA família com mais contraste.
 *
 * ANIMAÇÃO DE GLOW (a mesma da Auditoria): `transition-all duration-200` + o
 * `shadow-glow-*` temático aplicado SÓ no estado selecionado (`tema.glow`). A
 * transição de entrada/saída do brilho é a própria transição da box-shadow.
 * Sob `prefers-reduced-motion` a transição é desativada (`motion-reduce`).
 * ============================================================================
 */
interface ColoredFilterChipProps {
  /** Texto do filtro (ex.: "Em risco", "Autoavaliação"). */
  label: string;
  /** Contador numérico derivado do dado. */
  count: number;
  /** Tema de cor da categoria (única fonte de verdade das cores). */
  tema: TemaChip;
  /** `true` = chip ativo (fundo/borda mais fortes + glow temático). */
  selected: boolean;
  onClick: () => void;
  /** Conteúdo opcional DEPOIS do contador (ex.: ícone de remover). */
  trailing?: ReactNode;
  /** Rótulo acessível quando o texto visível não descreve a ação. */
  ariaLabel?: string;
}

export function ColoredFilterChip({
  label,
  count,
  tema,
  selected,
  onClick,
  trailing,
  ariaLabel,
}: ColoredFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        // Base só de layout — a tinta vem SEMPRE do tema da categoria.
        'group inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-all duration-200 motion-reduce:transition-none',
        // Repouso: fundo/borda/texto tingidos (o chip nunca parece apagado).
        tema.borda,
        tema.fundo,
        tema.texto,
        // Hover só no repouso: no ativo o fundo já está no tom mais intenso.
        !selected && cn(tema.hoverFundo, tema.hoverBorda, tema.hoverTexto),
        // Selecionado: MESMA cor-base, mais contraste + glow temático.
        selected && cn(tema.glow, tema.bordaAtiva, tema.fundoAtivo, tema.textoAtivo)
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tema.ponto)} />
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-[11px] tabular-nums transition-colors',
          selected ? tema.contadorAtivo : tema.contador
        )}
      >
        {count}
      </span>
      {trailing}
    </button>
  );
}
