/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — PÍLULA DE FILTRO POR STATUS (sem bolinha).
 *
 * Mesma anatomia de `ColoredFilterChip` (do módulo de Desempenho) com UMA
 * diferença pedida pelo dono da tela: **não há o ponto colorido à esquerda**.
 * O peso visual fica no rótulo (centralizado) e no contador (na extremidade
 * direita); a cor da categoria continua tingindo borda, fundo, texto, hover,
 * estado selecionado e o glow.
 *
 * ── POR QUE UM COMPONENTE LOCAL, E NÃO UMA PROP NO COMPARTILHADO ─────────────
 * `ColoredFilterChip` é a anatomia aprovada de Gestão de Desempenho (Auditoria,
 * Feedbacks, Metas & OKRs, PDI) e a área é protegida por `.clinerules` — mexer
 * nele para atender uma tela de outro módulo mudaria as quatro abas aprovadas.
 * Aqui a pílula é local: consome só o TEMA (`TemaChip`, de `chipFiltroComum`,
 * a única fonte de verdade das cores) e redesenha apenas a estrutura, sem a
 * bolinha e sem tocar no componente dos outros módulos.
 *
 * ── POR QUE O CONTADOR É ABSOLUTO ───────────────────────────────────────────
 * "Rótulo centralizado + contador na ponta direita" são duas âncoras distintas:
 * com `justify-between` o rótulo encostaria na esquerda. Absoluto na direita
 * deixa o rótulo no centro GEOMÉTRICO da pílula; o `px-8` reserva a calha do
 * contador nos dois lados, então rótulo e badge nunca se sobrepõem.
 * ============================================================================
 */
import { cn } from '@/lib/utils';
import type { TemaChip } from '@/components/avaliacao/chipFiltroComum';

export interface PilulaFiltroPesquisaProps {
  /** Texto do filtro (ex.: "Ativas"). */
  label: string;
  /** Contador real daquele recorte. */
  count: number;
  /** Tema de cor da categoria (mesma paleta do Design System). */
  tema: TemaChip;
  /** `true` = pílula ativa (fundo/borda mais fortes + glow temático). */
  selected: boolean;
  onClick: () => void;
  /** Rótulo acessível quando o texto visível não descreve a ação. */
  ariaLabel?: string;
}

export function PilulaFiltroPesquisa({ label, count, tema, selected, onClick, ariaLabel }: PilulaFiltroPesquisaProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        // Base só de layout — a tinta vem SEMPRE do tema da categoria.
        'relative inline-flex h-9 w-full min-w-0 items-center justify-center rounded-full border px-8',
        'text-[12px] font-medium transition-all duration-200 motion-reduce:transition-none',
        // Repouso: fundo/borda/texto tingidos.
        tema.borda,
        tema.fundo,
        tema.texto,
        // Hover só no repouso: no ativo o fundo já está no tom mais intenso.
        !selected && cn(tema.hoverFundo, tema.hoverBorda, tema.hoverTexto),
        // Selecionado: MESMA cor-base com mais contraste + glow temático.
        selected && cn(tema.glow, tema.bordaAtiva, tema.fundoAtivo, tema.textoAtivo)
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'absolute right-2 rounded-full px-1.5 text-[11px] tabular-nums transition-colors',
          selected ? tema.contadorAtivo : tema.contador
        )}
      >
        {count}
      </span>
    </button>
  );
}
