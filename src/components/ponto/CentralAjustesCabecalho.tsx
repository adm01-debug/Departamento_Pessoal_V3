/**
 * ============================================================================
 * CABEÇALHO DA CENTRAL DE AJUSTES — linha 1 da COLUNA ESQUERDA.
 *
 *   [ ícone ]  Central de Ajustes
 *              Revisão e gerenciamento de solicitações de ajuste de ponto
 *
 * ── O QUE SAIU DAQUI (E POR QUÊ) ───────────────────────────────────────────
 * Até a revisão estrutural, esta faixa carregava também a busca e o botão
 * "Filtros". Na composição aprovada os dois pertencem à COLUNA DIREITA, logo
 * acima do painel de detalhes — e o `PontoAdjustmentRequests` coloca esta faixa
 * e aquela (`CentralAjustesBuscaFiltros`) na MESMA linha do grid. O cabeçalho,
 * portanto, é só a identificação do módulo: nenhum controle de filtro mora
 * aqui, e não existe uma segunda busca no sistema.
 *
 * ── TIPOGRAFIA E MEDIDAS ──────────────────────────────────────────────────
 * Receita copiada de `horas-extras/CabecalhoSolicitacoes` (o cabeçalho compacto
 * oficial das telas de solicitação): bloco do ícone de 34 px com o gradiente
 * `primary → primary-glow`, título com as MESMAS classes do `<h1>` do
 * `PageLayout` (`text-2xl font-display font-medium tracking-tight`) e subtítulo
 * de 11 px em `text-muted-foreground`.
 *
 * A faixa mantém `min-h-[36px]` e `items-center`: é a altura que a linha 1 do
 * grid usa como régua, e a busca da coluna direita tem 30 px centrados nela —
 * por isso as duas colunas começam na MESMA linha de base, sem margem
 * compensatória.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';

interface CentralAjustesCabecalhoProps {
  /** Posição na fila de entrada da página (o cabeçalho é o slot 0). */
  index?: number;
}

export function CentralAjustesCabecalho({ index = 0 }: CentralAjustesCabecalhoProps) {
  return (
    <EntradaPresenca>
      <motion.header {...entradaCard(index)} className="flex min-h-[36px] min-w-0 items-center gap-[11px]">
        {/* Ícone do módulo — o mesmo do item "Central de Ajustes" da navegação
            lateral, no bloco de 34 px do cabeçalho compacto do sistema. */}
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow-sm">
          <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden />
        </span>
        {/* Título e subtítulo colados: `leading-tight` nos dois e 1 px entre
            eles. A faixa é a primeira coisa da aba — respiro grande aqui
            empurra KPIs, filtros e tabela para baixo sem informar nada. */}
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-medium leading-tight tracking-tight">Central de Ajustes</h1>
          <p className="mt-[1px] truncate text-[11px] leading-tight text-muted-foreground">
            Revisão e gerenciamento de solicitações de ajuste de ponto
          </p>
        </div>
      </motion.header>
    </EntradaPresenca>
  );
}
