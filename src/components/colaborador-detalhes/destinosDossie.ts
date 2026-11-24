import type { PendenciaChave } from '@/hooks/usePendenciasColaborador';

/**
 * Para onde os atalhos do dossiê ("Resolver agora", "Ver detalhes") levam.
 *
 * Por que isto é uma função pura em arquivo próprio, e não um `if` dentro da
 * página: as abas principais e as sub-abas têm estado INDEPENDENTE. Trocar só
 * a aba principal deixa a sub-aba no padrão dela, então o botão anunciava um
 * destino e entregava outro — férias caíam em Ponto, onboarding em Trabalho &
 * Hierarquia, documento pessoal em Dependentes.
 *
 * Foi o que Devin e Codex apontaram na #641, cada um por conta própria, e o
 * mesmo defeito tinha vindo da #639. Os dois notaram também que os testes dos
 * diálogos só provam que o callback foi chamado, não PARA ONDE ele leva. Com o
 * mapa aqui, o destino passa a ser testável sem montar a página inteira.
 */

export type AbaPrincipal =
  | 'geral'
  | 'pessoal'
  | 'profissional'
  | 'jornada'
  | 'financeiro'
  | 'documentos'
  | 'beneficios'
  | 'historico'
  | 'timeline';

export interface DestinoDossie {
  principal: AbaPrincipal;
  /** Sub-aba dentro da principal. Ausente = a principal não tem sub-abas. */
  sub?: string;
}

/** Onde cada pendência se resolve (ver `usePendenciasColaborador`). */
export function destinoPendencia(chave: PendenciaChave): DestinoDossie {
  switch (chave) {
    case 'ponto':
      // Ajuste de ponto aguardando aprovação: Jornada > Ponto.
      return { principal: 'jornada', sub: 'ponto' };
    case 'onboarding':
      // Tarefas de integração: Profissional > Desenvolvimento.
      return { principal: 'profissional', sub: 'desenvolvimento' };
    case 'aso':
      // Profissional > ASO. Antes levava para /sst, tirando o usuário do
      // dossiê — e o ASOTab está aqui dentro.
      return { principal: 'profissional', sub: 'aso' };
    case 'documentos':
      // Documentos > Documentos Pessoais. NÃO é a aba "Pessoal", que é
      // dependentes/emergência/PCD/estrangeiro.
      return { principal: 'documentos', sub: 'pessoais' };
  }
}

/** Onde cada próximo evento se resolve (ver `useProximosEventos`, campo `tipo`). */
export function destinoEvento(tipo: string): DestinoDossie {
  switch (tipo) {
    case 'aso':
      return { principal: 'profissional', sub: 'aso' };
    case 'ferias_vencimento':
    case 'ferias_inicio':
      return { principal: 'jornada', sub: 'ferias' };
    case 'onboarding':
      return { principal: 'profissional', sub: 'desenvolvimento' };
    case 'documento':
      return { principal: 'documentos', sub: 'pessoais' };
    case 'experiencia':
      return { principal: 'profissional', sub: 'experiencia' };
    default:
      // Tipo novo no hook sem destino aqui: cai no resumo profissional em vez
      // de num lugar aleatório, e o teste de cobertura abaixo avisa.
      return { principal: 'profissional', sub: 'desenvolvimento' };
  }
}
