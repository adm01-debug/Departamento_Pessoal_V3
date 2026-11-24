import type { TemaChip } from '@/components/avaliacao/chipFiltroComum';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * CHIP DE FILTRO PREMIUM — Auditoria de Admissões.
 *
 * Pílula da faixa de filtros rápidos do "Histórico de Auditoria – Admissões"
 * com a MESMA anatomia dos chips de **Gestão de Desempenho** (`ColoredFilterChip`:
 * mesma altura, raio, tipografia, contador em badge e glow temático). A cor não
 * mora aqui: entra por `tema` (`TemaChip`, de `avaliacao/chipFiltroComum`), a
 * única fonte de verdade das cores do Design System de chips. As classes do
 * tema são literais naquele módulo, então o Tailwind gera o CSS normalmente.
 *
 * ESTADOS
 *   • repouso     → fundo translúcido + borda fina + texto na cor da família,
 *                   sem glow (o chip nunca parece apagado, mas também não
 *                   compete com o aceso);
 *   • aceso       → a MESMA família com mais contraste + `tema.glow`
 *                   (`shadow-glow*`), ou seja: o fundo sólido antigo (lime
 *                   opaco) saiu de cena — o destaque é borda + halo;
 *   • hover       → só no repouso (no aceso o fundo já está no tom mais forte).
 *   `transition-all duration-200` faz o glow entrar/sair pela própria
 *   transição da box-shadow; `motion-reduce` desliga a animação.
 *
 * DIFERENÇA DELIBERADA EM RELAÇÃO AO CHIP DE DESEMPENHO: aqui a bolinha é
 * OPCIONAL (`ponto`). As pílulas de STATUS ("Sucesso"/"Pendente"/"Falha")
 * mantêm o ponto colorido; as de CATEGORIA/etapa ("eSocial", "Docs Pendentes",
 * "Contrato", "Em Validação") mostram só rótulo + contador — sem bolinha e sem
 * ícone, como pede a referência. Por isso este módulo tem o próprio renderizador
 * em vez de reusar o de `avaliacao` (área congelada, sem a opção "sem bolinha").
 *
 * O contador fica ancorado na EXTREMIDADE DIREITA (`ml-auto`): os chips são
 * itens `flex-1` da faixa, então os números formam uma coluna alinhada — o
 * mesmo encaixe harmônico do modelo de Desempenho.
 * ============================================================================
 */
interface ChipFiltroAuditoriaProps {
  /** Texto do filtro (ex.: "Sucesso", "Docs Pendentes", "Todos"). */
  label: string;
  /** Contagem REAL da trilha para este filtro (nunca some: 0 é 0). */
  total: number;
  /** Tema de cor da família (paleta do Design System de chips). */
  tema: TemaChip;
  /** Classe da bolinha (`bg-*`). Ausente = chip sem ponto (categorias). */
  ponto?: string;
  /** `true` = filtro aplicado (borda mais forte + glow temático). */
  ativo: boolean;
  onClick: () => void;
}

export function ChipFiltroAuditoria({ label, total, tema, ponto, ativo, onClick }: ChipFiltroAuditoriaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      // Nome acessível explícito: o contador é um badge visual (só o número),
      // então o leitor de tela recebe "Sucesso (12)" em vez de "Sucesso 12".
      aria-label={`${label} (${total})`}
      className={cn(
        // Base só de layout — a tinta vem SEMPRE do tema da família.
        'group flex h-8 w-full min-w-fit items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-all duration-200 motion-reduce:transition-none',
        // Repouso: fundo/borda/texto tingidos de leve (sem glow).
        tema.borda,
        tema.fundo,
        tema.texto,
        // Hover só no repouso.
        !ativo && cn(tema.hoverFundo, tema.hoverBorda, tema.hoverTexto),
        // Aceso: MESMA cor-base, mais contraste + halo temático.
        ativo && cn(tema.glow, tema.bordaAtiva, tema.fundoAtivo, tema.textoAtivo)
      )}
    >
      {ponto && <span aria-hidden data-ponto="" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ponto)} />}
      {label}
      <span
        data-contador=""
        className={cn(
          'ml-auto rounded-full px-1.5 text-[11px] tabular-nums transition-colors',
          ativo ? tema.contadorAtivo : tema.contador
        )}
      >
        {total}
      </span>
    </button>
  );
}
