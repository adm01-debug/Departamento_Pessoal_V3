/**
 * ============================================================================
 * APP PAGINATION — padrão ÚNICO de paginação do sistema.
 *
 * Mesma linguagem visual em TODAS as telas, na sequência oficial:
 *
 *     Linhas por página  →  [ seletor ]  →  ‹  (página atual)  ›
 *
 * · Seletor compacto (dropdown) com o valor selecionado, fundo escuro, borda
 *   discreta e o raio do Design System (`rounded-lg`), 28 px de altura;
 * · Página ativa em verde-lima SÓLIDO (`--primary`) com texto escuro
 *   (`--primary-foreground`), 28 × 28 px;
 *
 * DIMENSÕES (padrão único, minimalista — não aumentar sem necessidade):
 *   · altura dos controles (seletor, setas e página ativa) .... 28 px
 *   · largura do seletor ...................................... 64 px
 *   · ícones das setas ........................................ 14 px
 *   · texto dos controles ..................................... 12 px
 *   · espaçamento entre controles ............................. 6 px (gap-1.5)
 *   · rodapé total (com o padding usual das telas) ............ ~40–44 px
 * · Setas em `text-muted-foreground` com hover discreto (`hover:bg-accent`) e
 *   `disabled` nas extremidades;
 * · Contador de registros à esquerda (texto do chamador, via `label`).
 *
 * APRESENTAÇÃO apenas: o componente não busca, filtra nem guarda estado de
 * paginação — recebe página/total/tamanho e emite `onPageChange` /
 * `onPageSizeChange`. Quem pagina (hooks, páginas, serviços) continua dono das
 * consultas, filtros, busca, ordenação e paginação (local ou no servidor).
 *
 * Uso:
 *   <AppPagination page={page} total={total} pageSize={pageSize}
 *     onPageChange={setPage} onPageSizeChange={setPageSize}
 *     label={`Mostrando 1–25 de ${total}`} />
 * ============================================================================
 */
import { useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Opções de "Linhas por página" usadas quando a tela não define as suas.
 * O valor corrente é SEMPRE acrescentado à lista (ver `opcoes` abaixo), para
 * que nenhuma página fique com o seletor em branco por ter um tamanho que não
 * está no conjunto padrão (ex.: 12 ou 15, herdados das APIs).
 */
const OPCOES_LINHAS_POR_PAGINA = [10, 25, 50, 100] as const;

/** Rótulo padrão do seletor — é o texto da primeira referência. */
const ROTULO_LINHAS_POR_PAGINA = 'Linhas por página';

export interface AppPaginationProps {
  /** Página atual (1-based). Valores fora da faixa são recortados na exibição. */
  page: number;
  /** Total de registros do conjunto paginado (não da página). */
  total: number;
  /** Registros por página em uso. */
  pageSize: number;
  /** Opções do seletor. Se omitido, usa `OPCOES_LINHAS_POR_PAGINA`. */
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  /**
   * Sem este handler o seletor NÃO é renderizado: nada de controle decorativo
   * em telas cujo backend/tela não suportam trocar o tamanho.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** Contador à esquerda (ex.: "Mostrando 1–25 de 120"). Opcional. */
  label?: ReactNode;
  /** Texto do rótulo do seletor. */
  linhasPorPaginaLabel?: string;
  /** Desabilita os controles durante um carregamento. */
  isLoading?: boolean;
  /** Classes extras do rodapé (ex.: quando o card pai já tem borda/padding). */
  className?: string;
}

export function AppPagination({
  page,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  label,
  linhasPorPaginaLabel = ROTULO_LINHAS_POR_PAGINA,
  isLoading = false,
  className,
}: AppPaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  // Nunca exibe/emite uma página inexistente (ex.: trocar de 10→50 por página
  // deixando a página 4 no estado de quem chama).
  const paginaAtual = Math.min(Math.max(1, page), totalPaginas);

  const opcoes = useMemo(
    () =>
      Array.from(new Set<number>([...(pageSizeOptions ?? OPCOES_LINHAS_POR_PAGINA), pageSize]))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [pageSizeOptions, pageSize]
  );

  const exibirSeletor = Boolean(onPageSizeChange) && opcoes.length > 1;

  return (
    <div className={cn('flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between', className)}>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : <span />}

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {exibirSeletor && (
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-muted-foreground">{linhasPorPaginaLabel}</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange?.(Number(v))}>
              <SelectTrigger
                aria-label={linhasPorPaginaLabel}
                disabled={isLoading}
                className="h-7 w-[64px] rounded-lg border-border/40 bg-background text-xs tabular-nums"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {opcoes.map((n) => (
                  <SelectItem key={n} value={String(n)} className="tabular-nums">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="flex items-center gap-1.5" aria-label="Paginação">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onPageChange(paginaAtual - 1)}
            disabled={isLoading || paginaAtual <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span
            aria-current="page"
            aria-label={`Página ${paginaAtual}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold tabular-nums text-primary-foreground"
          >
            {paginaAtual}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onPageChange(paginaAtual + 1)}
            disabled={isLoading || paginaAtual >= totalPaginas}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
