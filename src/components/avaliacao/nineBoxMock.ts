/**
 * ============================================================================
 * ⚠️ MOCK VISUAL DO NINE-BOX ⚠️  (TEMPORÁRIO)
 *
 * Existe SOMENTE para conferir o LAYOUT da aba Nine-Box com os nove quadrantes
 * preenchidos e com o comparativo entre ciclos ligado. Não é dado de produção.
 *
 * ── O QUE ESTE ARQUIVO NÃO FAZ ──────────────────────────────────────────────
 *  • não escreve nada no Supabase (nenhuma query, nenhuma mutation);
 *  • não cria migration, coluna, tabela nem regra de negócio;
 *  • não altera a regra de classificação (`nineBoxComum.classifyScore`);
 *  • não toca nas outras abas: a aplicação acontece DENTRO de `NineBoxTab`,
 *    logo depois de receber as listas reais da página.
 *
 * ── COMO REMOVER (2 passos) ─────────────────────────────────────────────────
 *  1. apague este arquivo;
 *  2. em `NineBoxTab.tsx`, apague o import de `aplicarMockNineBox` e o bloco
 *     marcado com "TEMPORÁRIO — MOCK VISUAL DO NINE-BOX" (a aba volta a usar só
 *     as listas reais, sem nenhuma outra alteração).
 * Nada mais no sistema depende deste arquivo.
 *
 * ── COMO ESTÁ MONTADO ───────────────────────────────────────────────────────
 *  • 15 colaboradores fictícios (foto de placeholder, cargo e departamento)
 *    distribuídos para cobrir os NOVE quadrantes;
 *  • cada um tem um registro no ciclo em foco (`mock-ciclo-3`, o ativo) e outro
 *    no anterior (`mock-ciclo-2`) — é isso que faz "Evoluíram / Permaneceram /
 *    Regrediram" e o widget "Movimentações" aparecerem preenchidos;
 *  • os ids de ciclo são os MESMOS do mock do módulo, então o seletor
 *    "Ciclo em visão" e o botão "Comparar ciclos" funcionam de verdade;
 *  • os dados são ADICIONADOS aos reais (não substituem): a Estrela mantém as
 *    pessoas que já vinham do feedback real e os quadrantes vazios ganham gente.
 * ============================================================================
 */

import type { ColaboradorNineBox } from './nineBoxComum';

/**
 * Interruptor único do mock: só pode ser ligado em DESENVOLVIMENTO e com a
 * vitrine explicitamente habilitada. Em produção/teste é sempre `false` — o
 * Nine-Box de produção nunca mistura fixtures com avaliações reais.
 */
export const MOCK_NINEBOX_ATIVO =
  import.meta.env.DEV &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_DESEMPENHO_MOCK === 'true' &&
  import.meta.env.VITE_NINEBOX_MODO_REAL !== 'true';

/**
 * Estado inicial do botão "Comparar ciclos": só parte ligado quando o mock
 * visual está ativo; em produção/teste o comparativo começa desligado.
 */
export const MOCK_NINEBOX_COMPARAR_INICIAL = MOCK_NINEBOX_ATIVO;

/** Ciclos usados pelo mock — os MESMOS ids do `desempenhoMock` do módulo. */
const CICLO_ATUAL = 'mock-ciclo-3';
const CICLO_ANTERIOR = 'mock-ciclo-2';

/** Pessoa fictícia: par de notas (anterior → atual) para o comparativo. */
interface Ficticio {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  foto: string;
  /** [nota de desempenho, potencial] no ciclo ANTERIOR (1–5). */
  antes: [number, number];
  /** [nota de desempenho, potencial] no ciclo ATUAL (1–5). */
  agora: [number, number];
}

/**
 * Distribuição escolhida para cobrir os nove quadrantes:
 * Estrela 5 · Alto Potencial 2 · Enigma 1 · Core Player 2 · Alto Profissional 1
 * · Dilema 1 · Efetivo 1 · Profissional Confiável 1 · Sub-performer 1.
 *
 * Movimentos resultantes (soma das duas notas): 7 evoluíram · 6 permaneceram
 * · 2 regrediram — todos comparáveis nos dois ciclos.
 */
const FICTICIOS: Ficticio[] = [
  {
    id: 'nb-01',
    nome: 'Helena Prado',
    cargo: 'Analista de BI',
    departamento: 'Dados',
    foto: 'https://randomuser.me/api/portraits/women/31.jpg',
    antes: [3, 2],
    agora: [5, 5],
  },
  {
    id: 'nb-02',
    nome: 'Rafael Menezes',
    cargo: 'Gerente Comercial',
    departamento: 'Comercial',
    foto: 'https://randomuser.me/api/portraits/men/41.jpg',
    antes: [4, 4],
    agora: [5, 4],
  },
  {
    id: 'nb-03',
    nome: 'Sofia Andrade',
    cargo: 'Designer de Produto',
    departamento: 'Produto',
    foto: 'https://randomuser.me/api/portraits/women/33.jpg',
    antes: [4, 3],
    agora: [4, 5],
  },
  {
    id: 'nb-04',
    nome: 'Diego Farias',
    cargo: 'Desenvolvedor Backend',
    departamento: 'Tecnologia',
    foto: 'https://randomuser.me/api/portraits/men/29.jpg',
    antes: [5, 3],
    agora: [5, 3],
  },
  {
    id: 'nb-05',
    nome: 'Laura Bittencourt',
    cargo: 'Coordenadora de Projetos',
    departamento: 'PMO',
    foto: 'https://randomuser.me/api/portraits/women/26.jpg',
    antes: [3, 5],
    agora: [4, 5],
  },
  {
    id: 'nb-06',
    nome: 'Marcos Vinícius Sá',
    cargo: 'Especialista Fiscal',
    departamento: 'Financeiro',
    foto: 'https://randomuser.me/api/portraits/men/36.jpg',
    antes: [3, 3],
    agora: [3, 5],
  },
  {
    id: 'nb-07',
    nome: 'Priscila Nogueira',
    cargo: 'Analista de Marketing',
    departamento: 'Marketing',
    foto: 'https://randomuser.me/api/portraits/women/48.jpg',
    antes: [4, 3],
    agora: [3, 5],
  },
  {
    id: 'nb-08',
    nome: 'Tiago Rezende',
    cargo: 'Assistente Administrativo',
    departamento: 'Operações',
    foto: 'https://randomuser.me/api/portraits/men/54.jpg',
    antes: [1, 4],
    agora: [1, 4],
  },
  {
    id: 'nb-09',
    nome: 'Beatriz Camargo',
    cargo: 'Analista de RH',
    departamento: 'Recursos Humanos',
    foto: 'https://randomuser.me/api/portraits/women/57.jpg',
    antes: [2, 3],
    agora: [3, 3],
  },
  {
    id: 'nb-10',
    nome: 'Eduardo Lins',
    cargo: 'Supervisor de Logística',
    departamento: 'Logística',
    foto: 'https://randomuser.me/api/portraits/men/22.jpg',
    antes: [3, 3],
    agora: [3, 3],
  },
  {
    id: 'nb-11',
    nome: 'Camila Fontes',
    cargo: 'Analista de Suporte',
    departamento: 'Infraestrutura',
    foto: 'https://randomuser.me/api/portraits/women/64.jpg',
    antes: [4, 4],
    agora: [4, 3],
  },
  {
    id: 'nb-12',
    nome: 'Rodrigo Salles',
    cargo: 'Vendedor',
    departamento: 'Comercial',
    foto: 'https://randomuser.me/api/portraits/men/63.jpg',
    antes: [2, 2],
    agora: [1, 3],
  },
  {
    id: 'nb-13',
    nome: 'Vanessa Rocha',
    cargo: 'Auxiliar Administrativo',
    departamento: 'Administrativo',
    foto: 'https://randomuser.me/api/portraits/women/71.jpg',
    antes: [2, 1],
    agora: [2, 1],
  },
  {
    id: 'nb-14',
    nome: 'Gustavo Pires',
    cargo: 'Técnico de Campo',
    departamento: 'Operações',
    foto: 'https://randomuser.me/api/portraits/men/75.jpg',
    antes: [4, 1],
    agora: [4, 1],
  },
  {
    id: 'nb-15',
    nome: 'Simone Barros',
    cargo: 'Auxiliar de Produção',
    departamento: 'Produção',
    foto: 'https://randomuser.me/api/portraits/women/79.jpg',
    antes: [2, 1],
    agora: [1, 1],
  },
];

/** Colaboradores fictícios (resolvem cargo, departamento e foto na tela). */
export const NINEBOX_MOCK_COLABORADORES: ColaboradorNineBox[] = FICTICIOS.map((f) => ({
  id: f.id,
  nome_completo: f.nome,
  cargo: f.cargo,
  departamento: f.departamento,
  foto_url: f.foto,
}));

/** Um registro de feedback por pessoa e por ciclo (o par que a aba consome). */
function registro(f: Ficticio, ciclo: string, notas: [number, number], data: string) {
  return {
    id: `mock-nb-${f.id}-${ciclo}`,
    empresa_id: 'mock-empresa-1',
    avaliado_id: f.id,
    avaliador_id: 'mock-13',
    ciclo_id: ciclo,
    tipo: 'gestor',
    nota_geral: notas[0],
    potencial: notas[1],
    status: 'concluido',
    comentarios: '',
    created_at: data,
    updated_at: data,
    avaliado: { nome_completo: f.nome },
    avaliador: { nome_completo: 'Mariana Oliveira' },
  };
}

/** Feedbacks do mock: ciclo anterior + ciclo atual (base do comparativo). */
export const NINEBOX_MOCK_FEEDBACKS = FICTICIOS.flatMap((f) => [
  registro(f, CICLO_ANTERIOR, f.antes, '2026-05-20T10:00:00'),
  registro(f, CICLO_ATUAL, f.agora, '2026-09-20T10:00:00'),
]);

/**
 * PDIs fictícios para PARTE das pessoas (12 de 15): sem isso o banner acusaria
 * quase todo mundo como "sem PDI" e o layout não seria representativo. Cada PDI
 * aponta para o `colaborador_id` real da pessoa fictícia — a mesma relação que
 * a aba usa para marcar "Com PDI".
 */
export const NINEBOX_MOCK_PDIS = FICTICIOS.slice(0, 12).map((f) => ({
  id: `mock-nb-pdi-${f.id}`,
  empresa_id: 'mock-empresa-1',
  colaborador_id: f.id,
  titulo: `Plano de desenvolvimento — ${f.cargo}`,
  competencia_foco: 'Desenvolvimento contínuo',
  acao_desenvolvimento: 'Trilha de desenvolvimento acordada com a liderança.',
  prazo: '2026-12-15',
  status: 'em_andamento',
  comentarios: '',
}));

/**
 * Aplica o mock às listas reais. `false` no interruptor devolve exatamente o que
 * recebeu — nenhuma cópia, nenhum custo.
 */
export function aplicarMockNineBox({
  feedbacks,
  colaboradores,
  pdis,
}: {
  feedbacks: unknown[];
  colaboradores: ColaboradorNineBox[];
  pdis: unknown[];
}): { feedbacks: unknown[]; colaboradores: ColaboradorNineBox[]; pdis: unknown[] } {
  if (!MOCK_NINEBOX_ATIVO) return { feedbacks, colaboradores, pdis };

  const idsConhecidos = new Set(colaboradores.map((c) => String(c?.id ?? '')));
  return {
    feedbacks: [...feedbacks, ...NINEBOX_MOCK_FEEDBACKS],
    colaboradores: [...colaboradores, ...NINEBOX_MOCK_COLABORADORES.filter((c) => !idsConhecidos.has(String(c.id)))],
    pdis: [...pdis, ...NINEBOX_MOCK_PDIS],
  };
}
