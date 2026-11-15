import { motion } from 'framer-motion';
import { MODULOS_AUDITORIA } from './auditoriaComum';
import { TEMA_TODOS, type TemaChip } from './chipFiltroComum';
import { ColoredFilterChip } from './ColoredFilterChip';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * AUDITORIA — CHIPS DE MÓDULO (contadores).
 *
 * Um chip por módulo, com a quantidade de eventos REAL. As contagens são
 * calculadas sobre os registros carregados respeitando os demais filtros, mas
 * ignorando o próprio filtro de módulo — senão selecionar um módulo zeraria os
 * outros. "Todos" nasce selecionado.
 *
 * ── CORES (identidade por categoria) ────────────────────────────────────────
 * Nenhuma cor mora aqui: cada chip consome o `tema` do módulo (`chipFiltroComum`),
 * que centraliza as classes dos três estados — repouso, hover e selecionado.
 * O chip NÃO fica neutro quando inativo: continua com borda, fundo, texto e
 * contador tingidos pela cor da categoria (a bolinha é sólida em todos os
 * estados), então "Ciclos = azul" e "Nine-Box = vermelho" se leem sem clicar.
 *
 * ── ANATOMIA COMPARTILHADA ──────────────────────────────────────────────────
 * O desenho do chip (h-8, rounded-full, px-3, bolinha + rótulo + contador, glow
 * no selecionado) foi EXTRAÍDO para `ColoredFilterChip` — o componente único do
 * Design System de Desempenho. Esta barra é a REFERÊNCIA do padrão; as demais
 * abas (Metas & OKRs, Feedbacks, PDI) consomem o MESMO componente.
 * ============================================================================
 */

interface AuditoriaChipsProps {
  indice?: number;
  modulo: string;
  onModulo: (valor: string) => void;
  contagens: { todos: number; porTabela: Record<string, number> };
}

interface ItemChip {
  tabela: string;
  rotulo: string;
  tema: TemaChip;
  total: number;
}

export function AuditoriaChips({ indice = 1, modulo, onModulo, contagens }: AuditoriaChipsProps) {
  const itens: ItemChip[] = [
    { tabela: '', rotulo: 'Todos', tema: TEMA_TODOS, total: contagens.todos },
    ...MODULOS_AUDITORIA.map((m) => ({
      tabela: String(m.tabela),
      rotulo: m.rotulo,
      tema: m.tema,
      total: contagens.porTabela[String(m.tabela)] ?? 0,
    })),
  ];

  return (
    <motion.div {...entradaCard(indice)} className="flex flex-wrap items-center gap-2">
      {itens.map((item) => (
        <ColoredFilterChip
          key={item.rotulo}
          label={item.rotulo}
          count={item.total}
          tema={item.tema}
          selected={modulo === item.tabela}
          onClick={() => onModulo(item.tabela)}
        />
      ))}
    </motion.div>
  );
}
