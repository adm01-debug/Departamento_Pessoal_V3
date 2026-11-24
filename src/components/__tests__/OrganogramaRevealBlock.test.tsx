import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * O que só este arquivo prova: a ONDA chega até o bloco. Os números do preset têm
 * teste próprio (o dos valores, em OrganogramaNode.test.tsx), a FILA de cada bloco
 * tem o dela (buildRevealWave, em src/lib/__tests__/organogramaTree.test.ts) e o
 * comportamento em DOM real também (keyframes + AnimatePresence), mas a FIAÇÃO —
 * a árvore informando a fila, o nó repassando o próprio slot e o bloco resolvendo
 * o preset a partir dele — é o tipo de código que volta ao estado anterior (todos
 * os blocos no mesmo frame) sem quebrar nenhuma asserção de valor.
 *
 * Pra ver o preset que a Motion recebeu sem depender de tempo, aqui o `motion.div`
 * é substituído por uma div que ANOTA as props: é o mesmo mock de
 * `framer-motion` usado pelo resto da suíte (ver DashboardHeader.test.tsx),
 * apenas guardando o `variants` em vez de descartá-lo.
 */
const { reveals } = vi.hoisted(() => ({
  reveals: [] as { className?: string; variants?: unknown }[],
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...props }: any) => {
      reveals.push({ className: props.className, variants });
      return <div className={props.className}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { OrganogramaRevealBlock } from '../organograma/OrganogramaRevealBlock';
import { OrganogramaNode } from '../organograma/OrganogramaNode';
import { REVEAL_WAVE_STEP, makeRevealVariants, type RevealWave } from '../organograma/organogramaReveal';
import { cascadeItemsSpan } from '../organograma/organogramaCascade';
import { buildCascadeIndex, buildRevealWave, type OrgDepartamento } from '@/lib/organogramaTree';

/** Diretoria → Tecnologia → Plataforma: três níveis, pra onda ter o que escalonar. */
const NESTED_TREE: OrgDepartamento = {
  id: 'raiz',
  nome: 'Diretoria',
  colaboradores: [],
  sub_departamentos: [
    {
      id: 'filho',
      nome: 'Tecnologia',
      colaboradores: [],
      sub_departamentos: [{ id: 'neto', nome: 'Plataforma', colaboradores: [], sub_departamentos: [] }],
    },
  ],
};

/** Diretoria com dois colaboradores embaixo: o bloco dos colaboradores é o mais cheio. */
const TREE_WITH_EMPLOYEES: OrgDepartamento = {
  id: 'dir',
  nome: 'Diretoria',
  colaboradores: [],
  sub_departamentos: [
    {
      id: 'rh',
      nome: 'Recursos Humanos',
      colaboradores: [
        { id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', email: null, foto_url: null },
        { id: 'c2', nome_completo: 'Bia Souza', cargo: 'Dev', email: null, foto_url: null },
      ],
      sub_departamentos: [],
    },
  ],
};

/**
 * Wrappers da revelação de altura, na ordem do render — identificados pela classe
 * única que `OrganogramaRevealBlock` usa (`overflow-hidden`); as rows usam outros
 * `motion.div` e ficam de fora.
 */
function revealVariants() {
  return reveals.filter((entry) => entry.className === 'overflow-hidden').map((entry) => entry.variants);
}

/** O preset que o bloco do departamento `id` deveria receber, direto da fila dele. */
function expectedWave(tree: OrgDepartamento, id: string, items: number, slot: 'open' | 'trailing' = 'open'): RevealWave {
  const slots = buildRevealWave([tree]).slots.get(id)!;
  return { open: slots[slot], close: slots.close, items };
}

function renderTree(node: OrgDepartamento, expandedIds: Set<string>) {
  return render(
    <OrganogramaNode
      node={node}
      level={0}
      expandedIds={expandedIds}
      onToggle={vi.fn()}
      cascadeIndex={buildCascadeIndex([node], expandedIds)}
      waveIndex={buildRevealWave([node])}
    />
  );
}

describe('OrganogramaRevealBlock — onda dos blocos (fiação árvore → nó → bloco)', () => {
  beforeEach(() => {
    reveals.length = 0;
  });

  it('cada bloco recebe o preset do PRÓPRIO slot na fila da árvore', () => {
    const expanded = new Set(['raiz', 'filho', 'neto']);
    renderTree(NESTED_TREE, expanded);

    // Subdepartamentos da raiz (slot 0) → subdepartamentos do filho (1) → mensagem
    // de "sem filhos" do neto (2), na ordem em que a árvore renderiza. O slot de
    // abertura é a pré-ordem da árvore — a mesma ordem da cascata das rows.
    expect(revealVariants()).toEqual([
      makeRevealVariants(expectedWave(NESTED_TREE, 'raiz', 1)),
      makeRevealVariants(expectedWave(NESTED_TREE, 'filho', 1)),
      makeRevealVariants(expectedWave(NESTED_TREE, 'neto', 1)),
    ]);
  });

  it('abre descendo a árvore: cada bloco entra um degrau depois do anterior', () => {
    const expanded = new Set(['raiz', 'filho', 'neto']);
    renderTree(NESTED_TREE, expanded);

    const atrasosDeAbertura = revealVariants().map(
      (variants: any) => variants.expanded.transition.delay as number
    );

    expect(atrasosDeAbertura[0]).toBe(0);
    for (let slot = 1; slot < atrasosDeAbertura.length; slot++) {
      expect(atrasosDeAbertura[slot] - atrasosDeAbertura[slot - 1]).toBeCloseTo(REVEAL_WAVE_STEP, 10);
    }
  });

  it('o bloco mais cheio espera os próprios itens saírem antes de encolher', () => {
    renderTree(TREE_WITH_EMPLOYEES, new Set(['dir', 'rh']));

    // Blocos: subdepartamentos da raiz (1 item: o RH) e colaboradores do RH (2 itens).
    const [blocoDeSubs, blocoDeColaboradores]: any[] = revealVariants();
    expect(blocoDeSubs).toEqual(makeRevealVariants(expectedWave(TREE_WITH_EMPLOYEES, 'dir', 1)));

    // O bloco dos colaboradores usa o slot `trailing` (depois da subárvore) e
    // espera a janela dos DOIS itens antes de fechar o vão.
    expect(blocoDeColaboradores).toEqual(makeRevealVariants(expectedWave(TREE_WITH_EMPLOYEES, 'rh', 2, 'trailing')));
    expect(blocoDeColaboradores.collapsed.transition.delay).toBeCloseTo(cascadeItemsSpan(2), 10);
  });

  it('sem `wave` o bloco se comporta como bloco solto (não espera a vez nem item nenhum)', () => {
    render(<OrganogramaRevealBlock open>conteúdo</OrganogramaRevealBlock>);
    expect(revealVariants()).toEqual([makeRevealVariants({})]);

    reveals.length = 0;
    render(
      <OrganogramaRevealBlock open wave={{ open: 2, close: 1, items: 0 }}>
        conteúdo
      </OrganogramaRevealBlock>
    );
    expect(revealVariants()).toEqual([makeRevealVariants({ open: 2, close: 1, items: 0 })]);
  });
});

