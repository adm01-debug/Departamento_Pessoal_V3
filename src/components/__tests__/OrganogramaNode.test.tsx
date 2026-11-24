import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OrganogramaNode } from '../organograma/OrganogramaNode';
import { CASCADE_DURATION, CASCADE_STEP, cascadeVariants } from '../organograma/organogramaCascade';
import {
  REVEAL_CLOSE_DURATION,
  REVEAL_CLOSE_EASE,
  REVEAL_CLOSE_WAVE_STEP,
  REVEAL_MAX_STAGGERED_BLOCKS,
  REVEAL_MAX_STAGGERED_CLOSE_BLOCKS,
  REVEAL_OFFSET_Y,
  REVEAL_OPEN_DURATION,
  REVEAL_OPEN_EASE,
  REVEAL_STAGE_OVERLAP,
  REVEAL_WAVE_STEP,
  makeRevealVariants,
  revealCloseWaveDelay,
  revealItemExitDelay,
  revealLevelWindow,
  revealStageGap,
  revealWaveDelay,
} from '../organograma/organogramaReveal';
import {
  CASCADE_EXIT_DURATION,
  CASCADE_EXIT_EASE,
  CASCADE_EXIT_MAX_WINDOW,
  CASCADE_EXIT_OFFSET_Y,
  CASCADE_EXIT_STEP,
  cascadeItemExitDelay,
  cascadeItemStep,
  cascadeItemsSpan,
} from '../organograma/organogramaCascade';
import { buildCascadeIndex, buildRevealWave, type OrgDepartamento } from '@/lib/organogramaTree';

const LEAF_NODE: OrgDepartamento = {
  id: '1',
  nome: 'Recursos Humanos',
  colaboradores: [{ id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', email: 'ana@example.com', foto_url: null }],
  sub_departamentos: [],
};

const NODE_WITH_SUBS: OrgDepartamento = {
  id: '2',
  nome: 'TI',
  colaboradores: [],
  sub_departamentos: [{ id: '3', nome: 'Desenvolvimento', colaboradores: [], sub_departamentos: [] }],
};

const EMPTY_NODE: OrgDepartamento = {
  id: '4',
  nome: 'Administrativo',
  colaboradores: [],
  sub_departamentos: [],
};

function renderNode(node: OrgDepartamento, expandedIds: Set<string>, onToggle = vi.fn()) {
  // Mesmo índice que a árvore real monta (ver OrganogramaTree): a raiz em 0 e o
  // resto em pré-ordem — raiz → subdepartamentos → colaboradores. A onda dos
  // blocos também vem de lá: é ela que diz onde cada bloco está na fila de
  // abrir/fechar e quantos itens ele tem.
  return render(
    <OrganogramaNode
      node={node}
      level={0}
      expandedIds={expandedIds}
      onToggle={onToggle}
      cascadeIndex={buildCascadeIndex([node], expandedIds)}
      waveIndex={buildRevealWave([node])}
    />
  );
}

describe('OrganogramaNode', () => {
  it('renders department name', () => {
    renderNode(LEAF_NODE, new Set());
    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();
  });

  it('shows colaborador count', () => {
    renderNode(LEAF_NODE, new Set());
    expect(screen.getByText('1 colaborador')).toBeInTheDocument();
  });

  it('pluralizes colaborador count correctly', () => {
    const twoColabs: OrgDepartamento = {
      ...LEAF_NODE,
      colaboradores: [
        ...LEAF_NODE.colaboradores,
        { id: 'c2', nome_completo: 'Bia', cargo: 'Dev', email: null, foto_url: null },
      ],
    };
    renderNode(twoColabs, new Set());
    expect(screen.getByText('2 colaboradores')).toBeInTheDocument();
  });

  it('shows colaborador name only when expanded', () => {
    renderNode(LEAF_NODE, new Set());
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();

    renderNode(LEAF_NODE, new Set(['1']));
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('shows sub-departamento count', () => {
    renderNode(NODE_WITH_SUBS, new Set());
    expect(screen.getByText('1 subdepartamento')).toBeInTheDocument();
  });

  it('calls onToggle when the row is clicked (expansion is controlled by the parent)', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderNode(LEAF_NODE, new Set(['1']), onToggle);

    await user.click(screen.getByText('Recursos Humanos'));
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('renders sub-departamento node name when expanded', () => {
    renderNode(NODE_WITH_SUBS, new Set(['2']));
    expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
  });

  it('renders 3+ level deep hierarchies', () => {
    const deep: OrgDepartamento = {
      id: 'root',
      nome: 'Diretoria',
      colaboradores: [],
      sub_departamentos: [
        {
          id: 'tech',
          nome: 'Tecnologia',
          colaboradores: [],
          sub_departamentos: [
            {
              id: 'produto',
              nome: 'Produto',
              colaboradores: [
                { id: 'm1', nome_completo: 'Mariana Oliveira Santos', cargo: 'Gerente', email: null, foto_url: null },
              ],
              sub_departamentos: [],
            },
          ],
        },
      ],
    };

    renderNode(deep, new Set(['root', 'tech', 'produto']));
    expect(screen.getByText('Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Mariana Oliveira Santos')).toBeInTheDocument();
  });

  it('shows empty state message for a department with no colaboradores or sub-departamentos', () => {
    renderNode(EMPTY_NODE, new Set(['4']));
    expect(screen.getByText('Nenhum colaborador vinculado.')).toBeInTheDocument();
  });

  it('renders mailto link for colaborador email', () => {
    renderNode(LEAF_NODE, new Set(['1']));
    const link = screen.getByText('ana@example.com').closest('a');
    expect(link).toHaveAttribute('href', 'mailto:ana@example.com');
  });
});

// ─── Linhas de conexão do organograma ───
// O defeito original: toda linha da árvore media 2px, mas cada uma escolhia a
// PRÓPRIA tinta — `muted-foreground/50` na moldura da raiz, `/30` nas demais e
// `muted-foreground` cheio nos traços (tronco e ramal). Medido em captura de tela,
// o mesmo 2px geométrico rendia 52% de contraste no traço e 15% na moldura de
// subdepartamento: parecia que as linhas tinham espessuras diferentes. A correção
// não foi ajustar número de className, e sim eliminar a escolha por chamada:
// espessura e cor passam a vir de dois tokens únicos de CSS
// (`--organograma-line-width`/`--organograma-line-color`, em src/index.css),
// consumidos pelas classes `.organograma-*` que a moldura, o tronco e o ramal
// compartilham. Estes testes congelam essa fonte única: quem voltar a espalhar
// 2px solto ou a variar opacidade por chamada quebra aqui.
describe('OrganogramaNode — linhas de conexão (fonte única)', () => {
  const NODE_WITH_TWO_COLABS: OrgDepartamento = {
    ...LEAF_NODE,
    colaboradores: [
      ...LEAF_NODE.colaboradores,
      { id: 'c2', nome_completo: 'Bia Souza', cargo: 'Dev', email: null, foto_url: null },
    ],
  };

  const NESTED_NODE: OrgDepartamento = {
    id: 'raiz',
    nome: 'Diretoria',
    colaboradores: [{ id: 'c9', nome_completo: 'Caio Reis', cargo: 'Diretor', email: null, foto_url: null }],
    sub_departamentos: [
      {
        id: 'filho',
        nome: 'Tecnologia',
        colaboradores: [{ id: 'c8', nome_completo: 'Dora Prado', cargo: 'Tech Lead', email: null, foto_url: null }],
        sub_departamentos: [],
      },
    ],
  };

  it('desenha moldura, tronco e ramal com as classes organizadas do token', () => {
    const { container } = renderNode(LEAF_NODE, new Set(['1']));

    expect(container.querySelector('.organograma-frame')).toHaveClass('organograma-frame');
    // Tronco único + um ramal para o único colaborador.
    expect(container.querySelectorAll('.organograma-line-vertical')).toHaveLength(1);
    expect(container.querySelectorAll('.organograma-line-horizontal')).toHaveLength(1);
    // Os três (moldura, tronco e ramal) herdam a mesma tinta: é o que garante
    // peso visual igual, independente de qual elemento desenha a linha.
    expect(container.querySelectorAll('.organograma-line')).toHaveLength(2);
  });

  it('cria um tronco por nível e um ramal por colaborador', () => {
    const { container } = renderNode(NESTED_NODE, new Set(['raiz', 'filho']));

    // Dois níveis abertos, cada um com o seu tronco.
    expect(container.querySelectorAll('.organograma-line-vertical')).toHaveLength(2);
    // Dois colaboradores no total (um por nível).
    expect(container.querySelectorAll('.organograma-line-horizontal')).toHaveLength(2);
    expect(container.querySelectorAll('.organograma-frame')).toHaveLength(2);
  });

  it('desenha um ramal por colaborador, sem valor de espessura ou tinta embutido no markup', () => {
    const { container } = renderNode(NODE_WITH_TWO_COLABS, new Set(['1']));

    expect(container.querySelectorAll('.organograma-line-horizontal')).toHaveLength(2);
    // Nenhuma linha pode voltar a carregar espessura fixa ([2px]) nem opacidade
    // de tinta na própria className — espessura e cor são do token, não do JSX.
    expect(container.innerHTML).not.toMatch(/\[2px\]/);
    expect(container.innerHTML).not.toMatch(/bg-muted-foreground\b/);
    expect(container.innerHTML).not.toMatch(/border-muted-foreground\//);
  });

  it('declara espessura e tinta uma única vez em src/index.css, com tinta opaca', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    // Um só lugar define a espessura e um só lugar define a cor (por tema).
    expect(css.match(/--organograma-line-width\s*:/g)).toHaveLength(1);
    expect(css.match(/--organograma-line-color\s*:/g)).toHaveLength(1);
    expect(css).toMatch(/--organograma-line-width\s*:\s*2px;/);
    // Tinta OPACA de propósito: com alfa, a cor final dependeria do fundo sob a
    // linha (`bg-card`, `bg-muted/15`, `bg-background/70`) e o mesmo 2px sairia
    // com pesos diferentes conforme o nível.
    expect(css).toMatch(/--organograma-line-color\s*:\s*hsl\(var\(--muted-foreground\)\);/);

    // E cada classe que desenha linha deriva dos tokens — sem valor próprio.
    for (const cls of [
      'organograma-line',
      'organograma-line-vertical',
      'organograma-line-horizontal',
      'organograma-frame',
    ]) {
      const block = css.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`))?.[0];
      expect(block, `.${cls} não encontrada em src/index.css`).toBeDefined();
      expect(block).toMatch(/var\(--organograma-line-(width|color)\)/);
      expect(block).not.toMatch(/\d+px/);
    }
  });
});

// ─── Ícones da árvore por nível ───
// Raiz (nível 0) segue com o lime da identidade; TODO nó interno (nível ≥ 1, os
// subdepartamentos — Recursos Humanos, Financeiro, Comercial, Tecnologia etc.)
// passa a usar o azul do design system (`--info`). O que decide a cor é o NÍVEL
// do nó, nunca o nome nem a ordem na árvore; e a mudança não alcança o avatar do
// colaborador (EmployeeRow), que continua com o lime discreto de sempre.
describe('OrganogramaNode — ícones por nível (raiz lime, subdepartamento azul)', () => {
  const ARVORE: OrgDepartamento = {
    id: 'raiz',
    nome: 'Matriz',
    colaboradores: [],
    sub_departamentos: [
      {
        id: 'rh',
        nome: 'Recursos Humanos',
        colaboradores: [],
        sub_departamentos: [{ id: 'dp', nome: 'Departamento Pessoal', colaboradores: [], sub_departamentos: [] }],
      },
    ],
  };

  /** Classes do badge que envolve o ícone `Building2` de cada row da árvore. */
  function badgesDaIcone(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('span > svg')).map(
      (svg) => (svg.parentElement as HTMLElement).className
    );
  }

  it('segue o nível: raiz em lime, todo subdepartamento em azul', () => {
    const { container } = renderNode(ARVORE, new Set(['raiz', 'rh']));
    const [raiz, nivel1, nivel2] = badgesDaIcone(container);

    expect(badgesDaIcone(container)).toHaveLength(3); // Matriz, RH e Departamento Pessoal
    expect(raiz).toMatch(/\bbg-primary\/10\b/);
    expect(raiz).toMatch(/\btext-primary\b/);

    // Nível 1 e nível 2 são igualmente azuis: nenhum subdepartamento escapa.
    for (const sub of [nivel1, nivel2]) {
      expect(sub).toMatch(/\bbg-info\/15\b/);
      expect(sub).toMatch(/\btext-info\b/);
      expect(sub).not.toMatch(/text-primary\b/);
      expect(sub).not.toMatch(/bg-muted\b/);
      expect(sub).not.toMatch(/text-muted-foreground\b/);
    }
  });

  it('não altera o tamanho do badge nem o ícone da row', () => {
    const { container } = renderNode(ARVORE, new Set(['raiz', 'rh']));
    const [raiz, sub] = badgesDaIcone(container);
    const svgs = Array.from(container.querySelectorAll('span > svg'));

    expect(raiz).toMatch(/\bw-8\b/);
    expect(raiz).toMatch(/\bh-8\b/);
    expect(sub).toMatch(/\bw-7\b/);
    expect(sub).toMatch(/\bh-7\b/);
    expect(svgs[0].getAttribute('class')).toContain('h-4');
    expect(svgs[1].getAttribute('class')).toContain('h-3.5');
  });

  it('não altera o avatar do colaborador', () => {
    const comColaborador: OrgDepartamento = {
      ...ARVORE,
      colaboradores: [
        { id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', email: 'ana@example.com', foto_url: null },
      ],
    };
    const { container } = renderNode(comColaborador, new Set(['raiz']));

    // Iniciais do colaborador continuam no lime discreto do AvatarFallback.
    const iniciais = screen.getByText('AL');
    expect(iniciais.className).toMatch(/\bbg-primary\/5\b/);
    expect(iniciais.className).toMatch(/\btext-primary\b/);
    expect(iniciais.className).not.toMatch(/bg-info\b|text-info\b/);

    // E o ícone da row do colaborador (Mail) não ganha tinta própria.
    const mail = container.querySelector('a svg');
    expect(mail).not.toBeNull();
    expect(mail!.getAttribute('class')).not.toMatch(/text-info/);
  });
});

// ─── Entrada em cascata ───
// Mesma linguagem de motion da Timeline de colaboradores (aba "Timeline", em
// colaborador-detalhes/historico): cada item entra deslizando da esquerda com
// fade, com atraso progressivo por posição (`delay: index * CASCADE_STEP`), a
// mesma curva de easing de lá e uma duração um pouco mais longa — o ritmo foi
// desacelerado de propósito (ver CASCADE_DURATION/CASCADE_STEP em
// components/organograma/organogramaCascade.ts). A ORDEM da cascata (raiz →
// subdepartamentos → colaboradores) é decidida por `buildCascadeIndex` — testada
// em src/lib/__tests__/organogramaTree.test.ts.
describe('OrganogramaNode — entrada em cascata (mesma da Timeline de colaboradores)', () => {
  it('parte de opacidade 0 com deslocamento curto à esquerda', () => {
    expect(cascadeVariants.hidden).toEqual({ opacity: 0, x: -10 });
  });

  it('usa o ritmo desacelerado: 0.7s por item, 100ms entre itens', () => {
    // Trava o ritmo em si (não só o efeito): se alguém mexer nas constantes, a
    // intenção de "mais lento" aparece como teste quebrado, e não como regressão
    // silenciosa de velocidade.
    expect(CASCADE_DURATION).toBe(0.7);
    expect(CASCADE_STEP).toBe(0.1);
  });

  it('termina em opacidade 1 / x 0, com duração, easing e delay por index', () => {
    expect(cascadeVariants.visible({ enter: 0 })).toMatchObject({
      opacity: 1,
      x: 0,
      transition: { delay: 0, duration: 0.7 },
    });

    const quarto = cascadeVariants.visible({ enter: 3 });
    expect(quarto.transition.delay).toBeCloseTo(0.3, 10);
    expect(quarto.transition.duration).toBe(0.7);
    expect(quarto.transition.ease).toEqual([0.25, 0.46, 0.45, 0.94]);
  });

  it('sai na ordem INVERSA da entrada: o último item do bloco vai embora primeiro', () => {
    // A saída não volta pra esquerda (não é o espelho da entrada): o item sobe um
    // pouco e desaparece, o mesmo `y` curto do bloco recolhido. É bem mais curta
    // que a entrada (0,22s contra 0,7s) porque é ela que o "Recolher tudo" repete
    // em cada nível.
    expect(CASCADE_EXIT_DURATION).toBeGreaterThanOrEqual(0.2);
    expect(CASCADE_EXIT_DURATION).toBeLessThanOrEqual(0.3);
    expect(CASCADE_EXIT_OFFSET_Y).toBeLessThan(0);
    expect(Math.abs(CASCADE_EXIT_OFFSET_Y)).toBeLessThanOrEqual(5);
    expect(CASCADE_EXIT_EASE).toEqual([0.22, 1, 0.36, 1]);

    // `rankFromEnd = 0` é o ÚLTIMO item (sai primeiro); o primeiro item é o último.
    // O degrau é o EFETIVO do bloco (`cascadeItemStep`): com 3 itens ele ainda é o
    // cheio, então um bloco pequeno não perde nada.
    expect(cascadeItemExitDelay(3, 0)).toBe(0);
    expect(cascadeItemExitDelay(3, 1)).toBeCloseTo(cascadeItemStep(3), 10);
    expect(cascadeItemExitDelay(3, 2)).toBeCloseTo(2 * cascadeItemStep(3), 10);
    expect(cascadeItemStep(3)).toBe(CASCADE_EXIT_STEP);

    // O `delay` chega pronto pelo `custom` (o preset não adivinha a posição).
    expect(cascadeVariants.closed({ exit: 0.37 })).toMatchObject({
      opacity: 0,
      y: CASCADE_EXIT_OFFSET_Y,
      transition: { delay: 0.37, duration: CASCADE_EXIT_DURATION, ease: CASCADE_EXIT_EASE },
    });
  });

  it('bloco cheio encolhe o degrau em vez de estourar a janela que o bloco espera', () => {
    expect(cascadeItemStep(0)).toBe(0);
    expect(cascadeItemStep(1)).toBe(0);
    expect(cascadeItemStep(2)).toBe(CASCADE_EXIT_STEP);
    // O teto da janela é dimensionado pro bloco de TRÊS itens: ele é o último que
    // mantém o degrau cheio; de quatro em diante o degrau já encolheu.
    expect(cascadeItemStep(3)).toBe(CASCADE_EXIT_STEP);
    expect(cascadeItemStep(4)).toBeLessThan(CASCADE_EXIT_STEP);
    expect(cascadeItemStep(40)).toBeLessThan(CASCADE_EXIT_STEP);

    // A janela é do primeiro item que começa a sair até o último terminar: é
    // exatamente ela que o bloco aguarda antes de encolher (`makeRevealVariants`).
    expect(cascadeItemsSpan(0)).toBe(0);
    expect(cascadeItemsSpan(1)).toBe(CASCADE_EXIT_DURATION);
    expect(cascadeItemsSpan(3)).toBeCloseTo(2 * cascadeItemStep(3) + CASCADE_EXIT_DURATION, 10);
    expect(cascadeItemsSpan(40)).toBeCloseTo(CASCADE_EXIT_MAX_WINDOW, 10);

    for (const items of [0, 1, 2, 3, 9, 40]) {
      expect(cascadeItemsSpan(items)).toBeLessThanOrEqual(CASCADE_EXIT_MAX_WINDOW + 1e-9);
    }
  });

  it('anima a row do departamento e a row de cada colaborador', () => {
    const { container } = renderNode(LEAF_NODE, new Set(['1']));

    // Wrapper da DepartmentRow = primeiro filho da moldura; wrapper da
    // EmployeeRow = pai do ramal horizontal. Os dois recebem o keyframe inicial
    // da Motion (opacity 0 + 10px à esquerda) antes de animar: prova de que a
    // cascata está ligada nas rows, não apenas declarada no preset.
    //
    // Aqui o nó nasce EXPANDIDO, então a row do colaborador entra DENTRO de um
    // bloco de revelação que já nasce aberto. As duas coisas convivem: o bloco
    // não anima (é layout inicial) e a cascata de dentro dele continua tocando —
    // é o `AnimatePresence` interno de OrganogramaRevealBlock que garante isso.
    // Sem ele o keyframe das rows sumiria junto (o contexto de presença alcança
    // todo `motion.*` descendente) e este teste reprovaria.
    const rowDepartamento = container.querySelector('.organograma-frame')!.firstElementChild as HTMLElement;
    const rowColaborador = container.querySelector('.organograma-line-horizontal')!.parentElement as HTMLElement;

    for (const row of [rowDepartamento, rowColaborador]) {
      expect(row.style.opacity).toBe('0');
      expect(row.style.transform).toBe('translateX(-10px)');
    }
  });

  it('não mexe no que a row já era: mesmas classes, sem estilo extra de layout', () => {
    const { container } = renderNode(LEAF_NODE, new Set(['1']));

    // Só transform/opacity vêm da Motion (animam fora do fluxo): a cascata não
    // acrescenta classe nenhuma às rows nem ao que está dentro delas.
    const rowColaborador = container.querySelector('.organograma-line-horizontal')!.parentElement as HTMLElement;
    expect(rowColaborador.className).toBe('relative');
    expect(rowColaborador.querySelector('div')!.className).toContain('grid-cols-[minmax(0,1fr)_260px]');
    expect(container.querySelector('.organograma-frame > div > div')).not.toBeNull();
  });
});

// ─── Abertura/fechamento suave dos blocos (altura + opacidade) ───
// Expandir/recolher trocava o conteúdo no MESMO frame do clique: o bloco
// aparecia/sumia de uma vez e a árvore dava um salto de layout — o que
// "Expandir tudo"/"Recolher tudo" deixavam mais evidente. Agora todo bloco que
// nasce/morre com o expandir cresce/encolhe animando `height` + `opacity`, e a
// SAÍDA toca até o fim (`AnimatePresence`) em vez de desmontar na hora. O ritmo
// é um só — preset em components/organograma/organogramaReveal.ts.
describe('OrganogramaNode — abertura/fechamento suave (altura + opacidade)', () => {
  /** Renderiza o nó e devolve `expand` pra controlar a expansão depois do mount. */
  function renderControlledNode(node: OrgDepartamento) {
    const view = (expandedIds: Set<string>) => (
      <OrganogramaNode
        node={node}
        level={0}
        expandedIds={expandedIds}
        onToggle={vi.fn()}
        cascadeIndex={buildCascadeIndex([node], expandedIds)}
        waveIndex={buildRevealWave([node])}
      />
    );
    const rendered = render(view(new Set()));
    return { ...rendered, expand: (expandedIds: Set<string>) => rendered.rerender(view(expandedIds)) };
  }

  /**
   * O wrapper que a Motion anima em volta de cada bloco: uma div com UMA classe
   * (o recorte que a revelação de altura exige). É esta asserção que garante que
   * a animação não trouxe layout, cor nem espaçamento junto.
   */
  function revealWrapper(el: HTMLElement): HTMLElement {
    expect(el.className).toBe('overflow-hidden');
    return el;
  }

  it('abre em 350–450ms e fecha um degrau abaixo (300ms), animando altura + opacidade + um y curto (sem scale nem glow)', () => {
    // A ABERTURA é a referência de ritmo (faixa de 350–450ms).
    expect(REVEAL_OPEN_DURATION).toBeGreaterThanOrEqual(0.35);
    expect(REVEAL_OPEN_DURATION).toBeLessThanOrEqual(0.45);

    // O fechamento fica ABAIXO dessa faixa de propósito: fechar é a volta, e
    // "Recolher tudo" paga essa duração em cada nível da árvore. O piso existe
    // pra não virar corte seco (a cauda de assentamento precisa sobrar).
    expect(REVEAL_CLOSE_DURATION).toBeGreaterThanOrEqual(0.28);
    expect(REVEAL_CLOSE_DURATION).toBeLessThan(REVEAL_OPEN_DURATION);

    // Só altura, opacidade e o deslocamento vertical animam — cada estado carrega
    // a PRÓPRIA transição, porque é o alvo da saída que define o ritmo do
    // fechamento. A lista de chaves é exata de propósito: nenhum `scale` (nem
    // outro transform) pode entrar aqui sem quebrar este teste — o bloco não
    // muda de tamanho, só de altura/opacidade/posição.
    const variants = makeRevealVariants(0);
    expect(Object.keys(variants.collapsed).sort()).toEqual(['height', 'opacity', 'transition', 'y']);
    expect(Object.keys(variants.expanded).sort()).toEqual(['height', 'opacity', 'transition', 'y']);

    expect(variants.collapsed).toMatchObject({
      height: 0,
      opacity: 0,
      y: REVEAL_OFFSET_Y,
      transition: { duration: REVEAL_CLOSE_DURATION },
    });
    expect(variants.expanded).toMatchObject({
      height: 'auto',
      opacity: 1,
      y: 0,
      transition: { duration: REVEAL_OPEN_DURATION },
    });

    // O bloco vem de cima: y negativo no recolhido, 0 no aberto (curto de
    // propósito — 4px, dentro da folga dos recuos internos).
    expect(REVEAL_OFFSET_Y).toBeLessThan(0);
    expect(Math.abs(REVEAL_OFFSET_Y)).toBeLessThanOrEqual(5);
  });

  it('abre e fecha sem snap: tangente zero nas pontas em que o bloco precisa parar', () => {
    expect(REVEAL_OPEN_EASE).toEqual([0.22, 1, 0.36, 1]);
    expect(REVEAL_CLOSE_EASE).toEqual([0.4, 0, 0.2, 1]);
    expect(REVEAL_CLOSE_EASE).not.toEqual(REVEAL_OPEN_EASE);

    // Tangente de um cubic-bezier de easing: na largada é y1/x1 (direção do
    // primeiro controle) e na chegada é (1-y2)/(1-x2).
    const tangenteInicial = ([x1, y1]: number[]) => y1 / x1;
    const tangenteFinal = ([, , x2, y2]: number[]) => (1 - y2) / (1 - x2);

    // Abrir: larga rápido e CHEGA EM REPOUSO — era essa a ponta que faltava
    // (curva terminando com velocidade = freada brusca no último quadro).
    expect(tangenteInicial(REVEAL_OPEN_EASE)).toBeGreaterThan(3);
    expect(tangenteFinal(REVEAL_OPEN_EASE)).toBe(0);

    // Fechar: parte E chega em repouso. O espelho da abertura que estava aqui
    // antes terminava em velocidade máxima, o que é o "snap" de saída.
    expect(tangenteInicial(REVEAL_CLOSE_EASE)).toBe(0);
    expect(tangenteFinal(REVEAL_CLOSE_EASE)).toBe(0);

    // Nenhuma curva estoura: y1/y2 nunca passam de 1, então o progresso não
    // ultrapassa o alvo (sem estufar e voltar — nada de mola elástica).
    for (const [, y1, , y2] of [REVEAL_OPEN_EASE, REVEAL_CLOSE_EASE]) {
      expect(y1).toBeLessThanOrEqual(1);
      expect(y2).toBeLessThanOrEqual(1);
    }
  });

  it('não anima o bloco que já nasce aberto (é o layout inicial, não uma interação)', () => {
    const { container } = renderNode(NODE_WITH_SUBS, new Set(['2']));
    const wrapper = revealWrapper(container.querySelector('.organograma-frame')!.children[1] as HTMLElement);

    // Sem keyframe de abertura: o bloco já está no estado final no primeiro frame.
    expect(wrapper.style.height).toBe('auto');
    expect(wrapper.style.opacity).toBe('1');
  });

  it('abre animando quando a abertura acontece depois do primeiro render', () => {
    const { container, expand } = renderControlledNode(NODE_WITH_SUBS);

    expand(new Set(['2']));
    const wrapper = revealWrapper(container.querySelector('.organograma-frame')!.children[1] as HTMLElement);

    // Keyframe do preset (bloco começa fechado, 4px acima) e o conteúdo JÁ
    // montado dentro: a altura cresce com os subdepartamentos dentro dela, nem
    // antes nem depois.
    expect(wrapper.style.height).toBe('0px');
    expect(wrapper.style.opacity).toBe('0');
    expect(wrapper.style.transform).toBe('translateY(-4px)');
    expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
  });

  it('recolhe animando: o bloco só desmonta no fim da transição (não some no clique)', async () => {
    const { container, expand } = renderControlledNode(NODE_WITH_SUBS);

    expand(new Set(['2']));
    const frame = container.querySelector('.organograma-frame')!;
    expect(frame.children).toHaveLength(2);

    expand(new Set());
    // Primeiro frame depois do clique: continuam montados — é a saída em
    // andamento (altura + opacidade), não um desaparecimento instantâneo.
    expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
    expect(frame.children).toHaveLength(2);

    await waitFor(() => expect(frame.children).toHaveLength(1));
    expect(screen.queryByText('Desenvolvimento')).not.toBeInTheDocument();
  });

  it('fecha e reabre: a segunda abertura volta a animar do zero', async () => {
    const { container, expand } = renderControlledNode(NODE_WITH_SUBS);

    expand(new Set(['2']));
    expand(new Set());
    await waitFor(() => expect(container.querySelector('.organograma-frame')!.children).toHaveLength(1));

    expand(new Set(['2']));
    const wrapper = revealWrapper(container.querySelector('.organograma-frame')!.children[1] as HTMLElement);
    expect(wrapper.style.height).toBe('0px');
    expect(wrapper.style.opacity).toBe('0');
  });

  it('os itens saem ANTES de o bloco encolher (o vão fecha depois do conteúdo)', async () => {
    const { container, expand } = renderControlledNode(LEAF_NODE);

    expand(new Set(['1']));
    const row = container.querySelector('.organograma-line-horizontal')!.parentElement as HTMLElement;
    const wrapper = revealWrapper(row.parentElement!.parentElement as HTMLElement);

    // Espera a ENTRADA terminar: é o único jeito de a leitura da saída abaixo não
    // ser confundida com o keyframe da cascata (que também começa em opacidade 0).
    await waitFor(() => expect(row.style.opacity).toBe('1'), { timeout: 2000 });
    expect(wrapper.style.height).toBe('auto');

    expand(new Set());

    // O bloco NÃO começa a encolher no mesmo frame: o `delay` do estado recolhido
    // soma a janela dos itens, então o vão continua na altura natural enquanto a
    // saída do conteúdo acontece. Sem esse tempo, a row seria recortada de uma vez
    // pelo `overflow-hidden` do bloco (o defeito que este teste trava).
    expect(wrapper.style.height).toBe('auto');

    // E a row ganha a PRÓPRIA saída, em vez de desaparecer montada: a opacidade
    // vai a 0 e, no fim da saída inteira (itens + fechamento), o wrapper sai.
    await waitFor(() => expect(Number(row.style.opacity)).toBeLessThan(1), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument());
  });

  it('envolve os colaboradores no mesmo bloco animado', () => {
    const { container, expand } = renderControlledNode(LEAF_NODE);

    expand(new Set(['1']));
    // Tronco vertical → bloco dos colaboradores (`relative ml-4 …`) → wrapper.
    const bloco = container.querySelector('.organograma-line-vertical')!.parentElement as HTMLElement;
    const wrapper = revealWrapper(bloco.parentElement as HTMLElement);

    expect(wrapper.style.height).toBe('0px');
    expect(wrapper.style.opacity).toBe('0');
  });

  it('envolve a mensagem de departamento vazio no mesmo bloco animado', () => {
    const { expand } = renderControlledNode(EMPTY_NODE);

    expand(new Set(['4']));
    // O `p` fica dentro do wrapper de ITEM (o que dá saída à mensagem, como as
    // rows) — e esse, dentro do wrapper de revelação do bloco.
    const item = screen.getByText('Nenhum colaborador vinculado.').parentElement as HTMLElement;
    const wrapper = revealWrapper(item.parentElement as HTMLElement);

    expect(wrapper.style.height).toBe('0px');
    expect(wrapper.style.opacity).toBe('0');
  });
});

// ─── Onda entre blocos (fila da árvore + itens antes do bloco) ───
// Sem onda, TODOS os blocos de "Expandir tudo"/"Recolher tudo" partiam no mesmo
// frame: a árvore crescia como uma parede só, sem hierarquia — é o que fazia a
// animação parecer seca mesmo com duração maior. O degrau agora não é por
// PROFUNDIDADE (numa árvore de dois níveis sobrava um único passo de 40ms e a
// expansão continuava parecendo uma coisa só): é por SLOT na fila da árvore, a
// MESMA ordem da cascata das rows — quem monta a fila é `buildRevealWave`
// (testado em src/lib/__tests__/organogramaTree.test.ts). No fechamento o slot é
// outro (a posição DENTRO do nível, de trás pra frente, porque a página recolhe
// um nível por vez) e o bloco só encolhe depois que os itens dele saíram. A
// fiação nó → bloco tem teste próprio em OrganogramaRevealBlock.test.tsx; aqui
// ficam os números da onda e a garantia de que ela não mexeu em mais nada.
describe('OrganogramaNode — onda entre blocos ao abrir/fechar', () => {
  const TETO = REVEAL_MAX_STAGGERED_BLOCKS * REVEAL_WAVE_STEP;

  it('abre na ordem da árvore: um degrau por slot, com teto', () => {
    // Degrau dentro da faixa pedida (80–120ms): pequeno o bastante pra não virar
    // espera, grande o bastante pra hierarquia ser lida.
    expect(REVEAL_WAVE_STEP).toBeGreaterThanOrEqual(0.08);
    expect(REVEAL_WAVE_STEP).toBeLessThanOrEqual(0.12);

    // O primeiro bloco da fila abre SEM espera: é ele o topo da onda.
    expect(revealWaveDelay(0)).toBe(0);
    for (let slot = 1; slot <= REVEAL_MAX_STAGGERED_BLOCKS; slot++) {
      expect(revealWaveDelay(slot)).toBeCloseTo(slot * REVEAL_WAVE_STEP, 10);
      expect(makeRevealVariants({ open: slot }).expanded.transition.delay).toBeCloseTo(
        slot * REVEAL_WAVE_STEP,
        10
      );
    }

    // Acima do teto, entra junto com o último slot escalonado (a onda não soma
    // tempo em árvore grande).
    expect(revealWaveDelay(REVEAL_MAX_STAGGERED_BLOCKS + 4)).toBe(revealWaveDelay(REVEAL_MAX_STAGGERED_BLOCKS));
    expect(TETO).toBeGreaterThan(0);
  });

  it('fecha na ordem inversa do nível e só ENCOLHE depois que os itens saíram', () => {
    // O slot de fechamento é contado de trás pra frente dentro do nível (quem
    // monta assim é `buildRevealWave`): slot 0 sai antes do slot 1.
    expect(revealCloseWaveDelay(0)).toBeLessThan(revealCloseWaveDelay(1));

    // A espera do estado recolhido é a do slot MAIS a janela dos itens: os itens
    // saem primeiro e o vão fecha depois, nunca o contrário.
    expect(makeRevealVariants({ close: 0, items: 0 }).collapsed.transition.delay).toBe(0);
    expect(makeRevealVariants({ close: 0, items: 3 }).collapsed.transition.delay).toBeCloseTo(
      cascadeItemsSpan(3),
      10
    );
    expect(makeRevealVariants({ close: 1, items: 3 }).collapsed.transition.delay).toBeCloseTo(
      revealCloseWaveDelay(1) + cascadeItemsSpan(3),
      10
    );
  });

  it('a VOLTA é mais apertada que a abertura: degrau e teto próprios do fechamento', () => {
    // Degrau curto (50ms): "Recolher tudo" é uma volta, não uma segunda cascata.
    expect(REVEAL_CLOSE_WAVE_STEP).toBeGreaterThan(0);
    expect(REVEAL_CLOSE_WAVE_STEP).toBeLessThan(REVEAL_WAVE_STEP);
    expect(REVEAL_MAX_STAGGERED_CLOSE_BLOCKS).toBeLessThan(REVEAL_MAX_STAGGERED_BLOCKS);

    // O mesmo slot de abertura é bom no fechamento: a onda da volta é
    // monotonamente mais curta que a da ida (é o que faz o botão parecer rápido).
    for (let slot = 1; slot <= REVEAL_MAX_STAGGERED_BLOCKS; slot++) {
      expect(revealCloseWaveDelay(slot)).toBeLessThan(revealWaveDelay(slot));
    }

    // Teto próprio: acima dele o bloco entra junto com o último slot escalonado.
    expect(revealCloseWaveDelay(REVEAL_MAX_STAGGERED_CLOSE_BLOCKS + 4)).toBe(
      revealCloseWaveDelay(REVEAL_MAX_STAGGERED_CLOSE_BLOCKS)
    );
    expect(revealCloseWaveDelay(REVEAL_MAX_STAGGERED_CLOSE_BLOCKS)).toBeLessThanOrEqual(0.16 + 1e-9);

    // E o fechamento não inventa espera com slot "estranho".
    for (const slot of [-5, 0, 1.7, 99, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(revealCloseWaveDelay(slot)).toBeGreaterThanOrEqual(0);
      expect(revealCloseWaveDelay(slot)).toBeLessThanOrEqual(
        REVEAL_MAX_STAGGERED_CLOSE_BLOCKS * REVEAL_CLOSE_WAVE_STEP + 1e-9
      );
    }
  });

  it('o item e o bloco andam no mesmo passo da onda', () => {
    const bloco = { close: 2, items: 3 };

    // O ÚLTIMO item do bloco sai quando o bloco entra na fila; o primeiro item é
    // o último a sair, um degrau EFETIVO de item depois de cada um dos outros
    // (com 3 itens o degrau ainda é o cheio — ver `cascadeItemStep`).
    expect(revealItemExitDelay(bloco, 0)).toBeCloseTo(revealCloseWaveDelay(2), 10);
    expect(revealItemExitDelay(bloco, 1)).toBeCloseTo(
      revealCloseWaveDelay(2) + cascadeItemStep(3),
      10
    );
    expect(revealItemExitDelay(bloco, 2)).toBeCloseTo(
      revealCloseWaveDelay(2) + 2 * cascadeItemStep(3),
      10
    );

    // A espera do bloco cobre a saída inteira: o último item termina exatamente
    // quando o `height` começa a encolher.
    expect(makeRevealVariants(bloco).collapsed.transition.delay).toBeCloseTo(
      revealCloseWaveDelay(2) + cascadeItemsSpan(3),
      10
    );
  });

  it('não soma tempo além do teto nem com slot fora do normal', () => {
    for (const slot of [-5, 0, 1.7, REVEAL_MAX_STAGGERED_BLOCKS, 99, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(revealWaveDelay(slot)).toBeGreaterThanOrEqual(0);
      expect(revealWaveDelay(slot)).toBeLessThanOrEqual(TETO + 1e-9);
    }
  });

  it('a página espera a janela do nível inteiro antes de recolher o de cima', () => {
    // `revealLevelWindow` é a janela do passo do "Recolher tudo": o bloco mais
    // atrasado do nível + os itens dele + o próprio fechamento. Nível sem bloco
    // pendente não espera onda nenhuma.
    expect(revealLevelWindow({ closeSlots: 0, maxItems: 0 })).toBe(REVEAL_CLOSE_DURATION);
    expect(revealLevelWindow({ closeSlots: 2, maxItems: 3 })).toBeCloseTo(
      revealCloseWaveDelay(2) + cascadeItemsSpan(3) + REVEAL_CLOSE_DURATION,
      10
    );
    // Nível mais largo (onda maior) demora mais que um nível estreito.
    expect(revealLevelWindow({ closeSlots: 4, maxItems: 3 })).toBeGreaterThan(
      revealLevelWindow({ closeSlots: 1, maxItems: 3 })
    );
  });

  it('o passo seguinte do "Recolher tudo" atropela só a CAUDA do anterior', () => {
    // A sobreposição é uma fração curta do fechamento (a cauda em que o vão já
    // está praticamente fechado) — nunca a saída do conteúdo.
    expect(REVEAL_STAGE_OVERLAP).toBeGreaterThan(0);
    expect(REVEAL_STAGE_OVERLAP).toBeLessThan(REVEAL_CLOSE_DURATION);

    // O intervalo entre os passos é a janela do nível menos essa cauda: mais
    // curto que a janela (é o ganho de tempo) sem ser negativo.
    for (const stage of [
      { closeSlots: 0, maxItems: 0 },
      { closeSlots: 2, maxItems: 3 },
      { closeSlots: 8, maxItems: 40 },
    ]) {
      expect(revealStageGap(stage)).toBeCloseTo(revealLevelWindow(stage) - REVEAL_STAGE_OVERLAP, 10);
      expect(revealStageGap(stage)).toBeGreaterThan(0);
      // O que NÃO pode ser atropelado é a saída dos itens: o passo seguinte
      // começa depois de o conteúdo do nível ter ido embora.
      expect(revealStageGap(stage)).toBeGreaterThan(cascadeItemsSpan(stage.maxItems));
    }

    // Nível mais largo continua esperando mais que um estreito.
    expect(revealStageGap({ closeSlots: 4, maxItems: 3 })).toBeGreaterThan(
      revealStageGap({ closeSlots: 1, maxItems: 3 })
    );

    // Pior caso por nível: 150ms de onda + 280ms de itens + 300ms de bloco,
    // menos a cauda atropelada — abaixo de 0,7s por nível no pior cenário.
    expect(revealStageGap({ closeSlots: 8, maxItems: 40 })).toBeLessThan(0.7);
    expect(revealStageGap({ closeSlots: 8, maxItems: 40 })).toBeCloseTo(
      revealLevelWindow({ closeSlots: 8, maxItems: 40 }) - REVEAL_STAGE_OVERLAP,
      10
    );
  });

  it('a onda muda só o TEMPO: altura, opacidade e y são os mesmos em qualquer slot', () => {
    const primeiro = makeRevealVariants({ open: 0, close: 0, items: 0 });
    const fundo = makeRevealVariants({
      open: REVEAL_MAX_STAGGERED_BLOCKS,
      close: REVEAL_MAX_STAGGERED_BLOCKS,
      items: 9,
    });

    expect(fundo.expanded).toMatchObject({ height: 'auto', opacity: 1, y: 0 });
    expect(fundo.collapsed).toMatchObject({ height: 0, opacity: 0, y: REVEAL_OFFSET_Y });

    // Só o `delay` difere entre os slots: duração, curva e alvo são os mesmos.
    expect(fundo.expanded.transition).toMatchObject({
      duration: primeiro.expanded.transition.duration,
      ease: primeiro.expanded.transition.ease,
    });
    expect(fundo.collapsed.transition).toMatchObject({
      duration: primeiro.collapsed.transition.duration,
      ease: primeiro.collapsed.transition.ease,
    });
  });
});
