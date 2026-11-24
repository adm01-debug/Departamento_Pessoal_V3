import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  countTree,
  maxDepth,
  collectAllIds,
  getDefaultExpandedIds,
  filterTree,
  buildCascadeIndex,
  buildRevealWave,
  buildCollapseStages,
  pluralize,
  type OrgDepartamento,
} from '../organogramaTree';

const TREE: OrgDepartamento[] = [
  {
    id: 'diretoria',
    nome: 'Diretoria Executiva',
    colaboradores: [],
    sub_departamentos: [
      {
        id: 'rh',
        nome: 'Recursos Humanos',
        colaboradores: [
          { id: 'ana', nome_completo: 'Ana Beatriz Souza', cargo: 'Analista de RH', email: null, foto_url: null },
        ],
        sub_departamentos: [],
      },
      {
        id: 'tech',
        nome: 'Tecnologia',
        colaboradores: [
          {
            id: 'carlos',
            nome_completo: 'Carlos Eduardo Lima',
            cargo: 'Desenvolvedor Frontend',
            email: null,
            foto_url: null,
          },
        ],
        sub_departamentos: [
          {
            id: 'produto',
            nome: 'Produto',
            colaboradores: [
              {
                id: 'mariana',
                nome_completo: 'Mariana Oliveira Santos',
                cargo: 'Gerente de Produto',
                email: null,
                foto_url: null,
              },
            ],
            sub_departamentos: [],
          },
        ],
      },
    ],
  },
  { id: 'marketing', nome: 'Marketing', colaboradores: [], sub_departamentos: [] },
];

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('MARIANA OLIVEIRA')).toBe('mariana oliveira');
    expect(normalizeText('Gerência')).toBe('gerencia');
  });
});

describe('countTree', () => {
  it('counts departamentos and colaboradores recursively', () => {
    expect(countTree(TREE)).toEqual({ totalDeptos: 5, totalColabs: 3 });
  });

  it('returns zero for an empty tree', () => {
    expect(countTree([])).toEqual({ totalDeptos: 0, totalColabs: 0 });
  });
});

describe('maxDepth', () => {
  it('computes the deepest level (root = 1)', () => {
    expect(maxDepth(TREE)).toBe(3);
  });

  it('returns 0 for an empty tree', () => {
    expect(maxDepth([])).toBe(0);
  });

  it('returns 1 for a flat structure', () => {
    expect(maxDepth([{ id: 'a', nome: 'A', colaboradores: [], sub_departamentos: [] }])).toBe(1);
  });
});

describe('collectAllIds', () => {
  it('flattens every department id in the tree', () => {
    expect(collectAllIds(TREE).sort()).toEqual(['diretoria', 'marketing', 'produto', 'rh', 'tech'].sort());
  });
});

describe('getDefaultExpandedIds', () => {
  it('expands roots and their direct children only', () => {
    const ids = getDefaultExpandedIds(TREE);
    expect(ids.has('diretoria')).toBe(true);
    expect(ids.has('marketing')).toBe(true);
    expect(ids.has('rh')).toBe(true);
    expect(ids.has('tech')).toBe(true);
    expect(ids.has('produto')).toBe(false);
  });
});

describe('buildCascadeIndex', () => {
  it('não consome posição de subárvore recolhida', () => {
    const index = buildCascadeIndex(TREE, new Set());

    // Só a raiz de cada bloco é desenhada: duas posições, nenhuma row fantasma.
    expect([...index.keys()]).toEqual(['diretoria', 'marketing']);
    expect(index.get('diretoria')).toBe(0);
    expect(index.get('marketing')).toBe(1);
  });

  it('não indexa colaborador de departamento recolhido', () => {
    const index = buildCascadeIndex(TREE, new Set(['diretoria']));

    expect(index.has('ana')).toBe(false);
    expect([...index.keys()]).toEqual(['diretoria', 'rh', 'tech', 'marketing']);
    expect(index.get('tech')).toBe(2);
  });

  it('ordena raiz → subdepartamentos (recursivo) → colaboradores, sem repetir posição', () => {
    const index = buildCascadeIndex(TREE, new Set(['diretoria', 'rh', 'tech', 'produto']));

    expect([...index.entries()]).toEqual([
      ['diretoria', 0],
      ['rh', 1],
      ['ana', 2],
      ['tech', 3],
      ['produto', 4],
      ['mariana', 5],
      ['carlos', 6],
      ['marketing', 7],
    ]);
    // Posições contíguas: o atraso da cascata nunca pula (nem repete) um item.
    expect([...index.values()].sort((a, b) => a - b)).toEqual([...Array(index.size).keys()]);
  });

  it('devolve um mapa vazio para árvore vazia', () => {
    expect(buildCascadeIndex([], new Set(['qualquer'])).size).toBe(0);
  });
});

describe('filterTree', () => {
  it('returns the original tree untouched when the term is empty', () => {
    const result = filterTree(TREE, '');
    expect(result.nodes).toBe(TREE);
  });

  it('matches by department name and keeps its whole subtree', () => {
    const { nodes } = filterTree(TREE, 'tecnologia');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('diretoria');
    expect(nodes[0].sub_departamentos).toHaveLength(1);
    expect(nodes[0].sub_departamentos[0].id).toBe('tech');
    expect(nodes[0].sub_departamentos[0].sub_departamentos[0].id).toBe('produto');
  });

  it('matches a deeply nested colaborador and preserves the ancestor path', () => {
    const { nodes, matchedIds } = filterTree(TREE, 'Mariana');

    expect(nodes).toHaveLength(1);
    const diretoria = nodes[0];
    expect(diretoria.id).toBe('diretoria');
    expect(diretoria.sub_departamentos.map((d) => d.id)).toEqual(['tech']);
    expect(diretoria.sub_departamentos[0].colaboradores).toHaveLength(0);
    expect(diretoria.sub_departamentos[0].sub_departamentos[0].id).toBe('produto');
    expect(diretoria.sub_departamentos[0].sub_departamentos[0].colaboradores[0].nome_completo).toBe(
      'Mariana Oliveira Santos'
    );

    expect(matchedIds.has('diretoria')).toBe(true);
    expect(matchedIds.has('tech')).toBe(true);
    expect(matchedIds.has('produto')).toBe(true);
    expect(matchedIds.has('rh')).toBe(false);
  });

  it('matches by cargo', () => {
    const { nodes } = filterTree(TREE, 'Gerente de Produto');
    expect(nodes[0].sub_departamentos[0].sub_departamentos[0].colaboradores).toHaveLength(1);
  });

  it('is case and accent insensitive', () => {
    const { nodes } = filterTree(TREE, 'ANALISTA de rh');
    expect(nodes[0].sub_departamentos.find((d) => d.id === 'rh')?.colaboradores).toHaveLength(1);
  });

  it('returns no nodes when nothing matches', () => {
    const { nodes } = filterTree(TREE, 'não existe em lugar nenhum');
    expect(nodes).toHaveLength(0);
  });
});

describe('pluralize', () => {
  it('uses the singular form for 1', () => {
    expect(pluralize(1, 'colaborador', 'colaboradores')).toBe('colaborador');
  });

  it('uses the plural form for 0 and for 2+', () => {
    expect(pluralize(0, 'colaborador', 'colaboradores')).toBe('colaboradores');
    expect(pluralize(2, 'colaborador', 'colaboradores')).toBe('colaboradores');
  });
});

// ─── Onda dos blocos (abrir/fechar) ───
// Cada bloco do organograma (subdepartamentos, colaboradores e a mensagem de
// vazio) tem um lugar na fila de ABERTURA e outro na de FECHAMENTO. A de abertura
// é a pré-ordem da árvore — a mesma ordem da cascata das rows
// (`buildCascadeIndex`) — e a de fechamento é por NÍVEL, de trás pra frente, o que
// só faz sentido junto com os PASSOS do recolhimento: `buildCollapseStages` decide
// que um nível sai de cada vez, e a onda dentro do nível é o que dá a ordem dos
// blocos daquele passo. Era aqui que "Expandir tudo"/"Recolher tudo" ficavam sem
// hierarquia: a onda antiga era por profundidade (um único degrau em árvore de
// dois níveis) e o recolhimento largava todos os ids de uma vez.
describe('buildRevealWave', () => {
  it('abre na pré-ordem: a row do dono, os subdepartamentos e só então os colaboradores', () => {
    const { slots, span } = buildRevealWave(TREE);

    // O bloco de subdepartamentos abre junto com a row do dono; o de
    // colaboradores, depois de TODA a subárvore dele (é essa a ordem na tela).
    expect(slots.get('diretoria')).toMatchObject({ open: 0, trailing: 7 });
    expect(slots.get('rh')).toMatchObject({ open: 1, trailing: 2 });
    expect(slots.get('tech')).toMatchObject({ open: 3, trailing: 6 });
    expect(slots.get('produto')).toMatchObject({ open: 4, trailing: 5 });

    // A fila de abertura é estritamente crescente na ordem em que a árvore
    // renderiza — nenhum slot repetido, nenhum salto pra trás.
    const abertura = ['diretoria', 'rh', 'tech', 'produto', 'marketing'].map((id) => slots.get(id)!.open);
    expect(abertura).toEqual([...abertura].sort((a, b) => a - b));
    expect(new Set(abertura).size).toBe(abertura.length);

    // Fim da fila: 2 slots por departamento da árvore (subs + colaboradores).
    expect(span).toBe(9);
  });

  it('fecha de trás pra frente DENTRO do nível (o último do nível sai primeiro)', () => {
    const { slots, closeSpan } = buildRevealWave(TREE);

    // Nível 0: marketing (0) sai antes de diretoria (1)...
    expect(slots.get('diretoria')!.close).toBe(1);
    expect(slots.get('marketing')!.close).toBe(0);
    // ...e no nível 1 vale o mesmo: tech antes de rh.
    expect(slots.get('rh')!.close).toBe(1);
    expect(slots.get('tech')!.close).toBe(0);
    // Nível com um departamento só não tem onda nenhuma.
    expect(slots.get('produto')!.close).toBe(0);

    expect(closeSpan).toBe(1);
  });

  it('lida com árvore vazia e com departamento sem filhos', () => {
    expect(buildRevealWave([])).toEqual({ slots: new Map(), span: 0, closeSpan: 0 });

    const folha = buildRevealWave([{ id: 'x', nome: 'X', colaboradores: [], sub_departamentos: [] }]);
    expect(folha.slots.get('x')).toEqual({ open: 0, trailing: 1, close: 0 });
    expect(folha.span).toBe(1);
  });
});

describe('buildCollapseStages', () => {
  const ABERTOS = new Set(['diretoria', 'marketing', 'rh', 'tech']);

  it('recolhe um nível por vez, do fundo pra raiz', () => {
    const stages = buildCollapseStages(TREE, ABERTOS);

    expect(stages.map((stage) => stage.ids)).toEqual([
      ['rh', 'tech'], // o nível de baixo termina de sair primeiro...
      ['diretoria', 'marketing'], // ...e só então o nível de cima encolhe
    ]);
  });

  it('leva pro passo a medida do nível: o bloco mais cheio e a onda do nível', () => {
    const [nivel1, raiz] = buildCollapseStages(TREE, ABERTOS);

    // Nível 1: um colaborador em cada, onda de dois blocos (0 e 1).
    expect(nivel1).toMatchObject({ maxItems: 1, closeSlots: 1 });
    // Raiz: a diretoria tem dois subdepartamentos — o bloco mais cheio decide a
    // janela do passo (é o que a página espera antes de recolher o nível de cima).
    expect(raiz).toMatchObject({ maxItems: 2, closeSlots: 1 });
  });

  it('não cria passo de nível já recolhido nem deixa id de fora', () => {
    expect(buildCollapseStages(TREE, new Set())).toEqual([]);
    expect(buildCollapseStages(TREE, new Set(['diretoria', 'marketing']))).toHaveLength(1);
    // Nível intermediário aberto sozinho: um passo, no nível dele.
    expect(buildCollapseStages(TREE, new Set(['rh'])).map((stage) => stage.ids)).toEqual([['rh']]);
  });

  it('cobre TODOS os ids expandidos: no fim da onda a árvore está recolhida', () => {
    const expanded = new Set(['diretoria', 'marketing', 'rh', 'tech', 'produto']);
    const ids = buildCollapseStages(TREE, expanded).flatMap((stage) => stage.ids);

    // Cada departamento cai em um passo só — e nenhum fica esquecido aberto.
    expect(new Set(ids)).toEqual(expanded);
    expect(ids).toHaveLength(expanded.size);
    expect(buildCollapseStages(TREE, expanded)[0].ids).toEqual(['produto']);
  });
});

