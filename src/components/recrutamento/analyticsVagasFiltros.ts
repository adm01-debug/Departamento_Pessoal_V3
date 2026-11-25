import type { DetalheVaga, SituacaoVaga } from './analyticsComum';
import { normalizarBusca } from './pipelineEtapas';

/**
 * ============================================================================
 * DESEMPENHO POR VAGA — recorte da JANELA de detalhamento (funções puras)
 *
 * A tabela do modal "Ver todas" filtra e ordena a MESMA lista que
 * `construirDetalheVagas` entrega à tela (`analyticsComum`). Nada aqui consulta
 * o banco, nada é recalculado: é só recorte e ordem sobre registros que já
 * existem — por isso os KPIs do topo (que leem a lista INTEIRA) nunca mudam de
 * valor quando o usuário filtra, e nenhuma linha é inventada para preencher a
 * tabela.
 *
 * ── SITUAÇÕES ─────────────────────────────────────────────────────────────
 * `todas` · `aberta` · `pausada` · `encerrada`, exatamente os estados que
 * `situacaoDaVaga` reconhece no campo `vagas.status`. Vagas com status fora
 * desses conjuntos aparecem em `todas` (situação `indefinida`), nunca
 * reclassificadas à força em uma das três.
 *
 * ── BUSCA ─────────────────────────────────────────────────────────────────
 * Reusa `normalizarBusca` do pipeline (sem acento, minúsculo) e procura em
 * título, departamento e rótulo da situação — os textos que a linha mostra.
 * ============================================================================
 */

export type FiltroSituacao = 'todas' | 'aberta' | 'pausada' | 'encerrada';

export type OrdenacaoDesempenho = 'candidatos' | 'maior-conversao' | 'menor-conversao' | 'titulo';

export interface FiltrosDesempenho {
  busca: string;
  situacao: FiltroSituacao;
  ordenacao: OrdenacaoDesempenho;
}

/** Padrão de abertura: base inteira, na ordem de volume do card. */
export const FILTROS_DESEMPENHO_PADRAO: FiltrosDesempenho = {
  busca: '',
  situacao: 'todas',
  ordenacao: 'candidatos',
};

/** Opções do seletor de status — mesmos rótulos no plural, como nos filtros de vaga. */
export const SITUACOES_DESEMPENHO: readonly { value: FiltroSituacao; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'pausada', label: 'Pausadas' },
  { value: 'encerrada', label: 'Encerradas' },
];

/** Opções do seletor de ordenação. */
export const ORDENACOES_DESEMPENHO: readonly { value: OrdenacaoDesempenho; label: string }[] = [
  { value: 'candidatos', label: 'Mais candidatos' },
  { value: 'maior-conversao', label: 'Maior conversão' },
  { value: 'menor-conversao', label: 'Menor conversão' },
  { value: 'titulo', label: 'Nome da vaga' },
];

/** Rótulo de uma opção (para o `title`/`aria-label` do trigger). */
export function rotuloOrdenacao(ordenacao: OrdenacaoDesempenho): string {
  return ORDENACOES_DESEMPENHO.find((opcao) => opcao.value === ordenacao)?.label ?? 'Mais candidatos';
}

/** Rótulo de uma situação do filtro (singular no trigger do seletor). */
export function rotuloSituacaoFiltro(situacao: FiltroSituacao): string {
  return SITUACOES_DESEMPENHO.find((opcao) => opcao.value === situacao)?.label ?? 'Todas';
}

/**
 * Há algum filtro fora do padrão? Governa o destaque lime do "Limpar filtros"
 * (mesmo contrato de `temFiltroAtivo` da barra do topo). A busca conta sem
 * espaços — digitar só espaço não é filtro.
 */
export function temFiltroDesempenho(filtros: FiltrosDesempenho): boolean {
  return (
    filtros.busca.trim() !== '' ||
    filtros.situacao !== FILTROS_DESEMPENHO_PADRAO.situacao ||
    filtros.ordenacao !== FILTROS_DESEMPENHO_PADRAO.ordenacao
  );
}

/** Comparadores estáveis: empate cai no volume e, depois, no nome (pt-BR). */
function porTitulo(a: DetalheVaga, b: DetalheVaga): number {
  return a.titulo.localeCompare(b.titulo, 'pt-BR');
}

/** Aplica busca + situação e devolve a lista na ordem escolhida. */
export function filtrarDetalheVagas(vagas: readonly DetalheVaga[], filtros: FiltrosDesempenho): DetalheVaga[] {
  const alvo = normalizarBusca(filtros.busca);
  const situacao = filtros.situacao as SituacaoVaga;

  const filtradas = vagas.filter((vaga) => {
    if (filtros.situacao !== 'todas' && vaga.situacao !== situacao) return false;
    if (!alvo) return true;
    const texto = normalizarBusca([vaga.titulo, vaga.departamento ?? '', vaga.statusRotulo].join(' '));
    return texto.includes(alvo);
  });

  const copia = [...filtradas];
  switch (filtros.ordenacao) {
    case 'maior-conversao':
      return copia.sort((a, b) => b.conversao - a.conversao || b.candidatos - a.candidatos || porTitulo(a, b));
    case 'menor-conversao':
      return copia.sort((a, b) => a.conversao - b.conversao || b.candidatos - a.candidatos || porTitulo(a, b));
    case 'titulo':
      return copia.sort(porTitulo);
    default:
      return copia.sort((a, b) => b.candidatos - a.candidatos || b.conversao - a.conversao || porTitulo(a, b));
  }
}
