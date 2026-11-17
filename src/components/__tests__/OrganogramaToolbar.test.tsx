import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OrganogramaToolbar } from '../organograma/OrganogramaToolbar';

function renderToolbar(overrides: Partial<Parameters<typeof OrganogramaToolbar>[0]> = {}) {
  const props = {
    search: '',
    onSearchChange: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    ...overrides,
  };
  return { ...render(<OrganogramaToolbar {...props} />), props };
}

/** Mesmas classes de lime nos dois botões, em TODOS os estados. */
function expectLimeDestaque(button: HTMLElement) {
  // `className` já passou pelo `cn`/twMerge do Button: classes separadas por
  // espaço, sem duplicata — então a comparação é por token exato.
  const classes = button.className.split(/\s+/);
  const tem = (classe: string) => expect(classes, `classe ausente no botão: ${classe}`).toContain(classe);

  // Repouso: lime chapado + tinta near-black.
  tem('bg-primary');
  tem('text-primary-foreground');
  tem('border-primary');
  tem('shadow-glow');

  // Hover: o lime clareia, a tinta continua a mesma.
  tem('hover:bg-primary-glow');
  tem('hover:text-primary-foreground');
  tem('hover:border-primary');

  // Pressionado / active: mesma tinta, só o fundo e a escala reagem.
  tem('active:bg-primary-glow');
  tem('active:text-primary-foreground');
  tem('active:border-primary');

  // Foco por teclado: fundo e tinta explícitos e anel escuro DENTRO do botão
  // (o `:focus-visible { ring-ring }` global é lime e sumiria no lime).
  tem('focus-visible:bg-primary');
  tem('focus-visible:text-primary-foreground');
  tem('focus-visible:ring-primary-foreground');

  // Em nenhum estado o variant `outline` pode repintar o texto de claro —
  // `--accent-foreground` é `60 10% 92%` no tema escuro e apagaria o rótulo.
  for (const classe of classes) {
    expect(classe).not.toMatch(/accent-foreground/);
  }

  // Altura/espaçamento do cabeçalho preservados (h-11, sem encolher na linha).
  tem('h-11');
  tem('shrink-0');
  // Não sobra o cinza neutro do `variant="outline"` original.
  expect(classes).not.toContain('bg-background');
  expect(classes).not.toContain('border-input');
}

/**
 * Os três itens da toolbar que carregam a entrada: o wrapper do campo de busca e
 * o wrapper de cada botão (ver OrganogramaToolbar.tsx) — slots 3, 4 e 5 da fila
 * do cabeçalho.
 */
function revealNodes(): HTMLElement[] {
  return [
    screen.getByPlaceholderText('Buscar na estrutura...').parentElement as HTMLElement,
    screen.getByRole('button', { name: /expandir tudo/i }).parentElement as HTMLElement,
    screen.getByRole('button', { name: /recolher tudo/i }).parentElement as HTMLElement,
  ];
}

/** O wrapper `motion.div` de um botão: é ele que anima entrada E pressionar. */
function wrapperDoBotao(nome: RegExp): HTMLElement {
  return screen.getByRole('button', { name: nome }).parentElement as HTMLElement;
}

/** O `motion.span` que desloca o ícone dentro de um botão. */
function iconeDoBotao(nome: RegExp): HTMLElement {
  return screen.getByRole('button', { name: nome }).querySelector('svg')!.parentElement as HTMLElement;
}

/**
 * O gesto da Motion escuta eventos de PONTEIRO, não `mouseenter`/`mouseleave` —
 * e o `pointerdown` precisa de `isPrimary` (qualquer coisa diferente de `false`)
 * pra não ser descartado como ponteiro secundário. `pointerType: 'mouse'` é o que
 * separa do caso `touch`, que o gesto de hover ignora de propósito.
 */
const PONTEIRO = { isPrimary: true, pointerType: 'mouse' };

describe('OrganogramaToolbar', () => {
  it('destaca "Expandir tudo" e "Recolher tudo" em lime', () => {
    renderToolbar();

    expectLimeDestaque(screen.getByRole('button', { name: /expandir tudo/i }));
    expectLimeDestaque(screen.getByRole('button', { name: /recolher tudo/i }));
  });

  it('mantém os ícones e os rótulos das duas ações', () => {
    const { container } = renderToolbar();

    expect(screen.getByText('Expandir tudo')).toBeInTheDocument();
    expect(screen.getByText('Recolher tudo')).toBeInTheDocument();
    expect(container.querySelectorAll('button svg')).toHaveLength(2);
  });

  it('dispara as ações de expandir e recolher', async () => {
    const user = userEvent.setup();
    const { props } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /expandir tudo/i }));
    expect(props.onExpandAll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /recolher tudo/i }));
    expect(props.onCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('deixa o campo de busca sem alteração', async () => {
    const user = userEvent.setup();
    const { props } = renderToolbar();

    const input = screen.getByPlaceholderText('Buscar na estrutura...');
    expect(input.className).not.toMatch(/primary/);

    await user.type(input, 'RH');
    expect(props.onSearchChange).toHaveBeenCalledTimes(2);
  });

  it('entra na cascata do cabeçalho com a MESMA animação dos KPI Cards do Dashboard', async () => {
    renderToolbar();
    const reveal = revealNodes();

    // Keyframe `hidden` do `cardVariants` (dashboard/MetricCard.tsx) em cada um
    // dos três itens — slots 3, 4 e 5 da fila (organogramaHeaderReveal.ts).
    for (const node of reveal) {
      expect(node.getAttribute('style')).toBe('opacity: 0; transform: translateY(20px);');
    }

    await waitFor(
      () => {
        for (const node of reveal) expect(node.style.transform).toBe('none');
      },
      { timeout: 2000 }
    );
  });

  it('anima o botão por um wrapper, para não apagar o `active:scale` do CSS', async () => {
    renderToolbar();

    const botoes = [
      screen.getByRole('button', { name: /expandir tudo/i }),
      screen.getByRole('button', { name: /recolher tudo/i }),
    ];

    for (const botao of botoes) {
      // A Motion deixa `transform: none` inline ao fim da entrada; como estilo
      // inline vence o `:active { scale(.99) }` da classe, quem anima é o wrapper
      // (`motion.div` pai) — o botão em si nunca recebe `style` nenhum e mantém o
      // feedback de pressionar.
      expect(botao.getAttribute('style')).toBeNull();
      expect(botao.className).toMatch(/active:scale-\[0\.99\]/);
      // O wrapper é o item do flex (mesmo lugar do botão) e não encolhe: em tela
      // estreita ele não pode transbordar por cima da busca.
      expect(botao.parentElement!.className).toMatch(/shrink-0/);
    }

    // A busca anima em cima do próprio wrapper do campo (`relative flex-1`).
    const busca = screen.getByPlaceholderText('Buscar na estrutura...').parentElement!;
    expect(busca.className).toMatch(/relative/);
    expect(busca.className).toMatch(/flex-1/);

    await waitFor(
      () => {
        for (const botao of botoes) {
          expect(botao.parentElement!.getAttribute('style')).toBe('opacity: 1; transform: none;');
        }
      },
      { timeout: 2000 }
    );

    // E o botão continua sem estilo inline depois da entrada (nunca recebeu um).
    for (const botao of botoes) {
      expect(botao.getAttribute('style')).toBeNull();
    }
  });

  it('desloca só o ícone no hover, no sentido em que a árvore vai mexer', async () => {
    renderToolbar();

    const iconeExpandir = iconeDoBotao(/expandir tudo/i);
    const iconeRecolher = iconeDoBotao(/recolher tudo/i);

    // Fim da entrada (cascata de 0.4s com atraso por slot): os dois wrappers
    // param em `transform: none` e nenhum ícone fica deslocado.
    await waitFor(
      () => {
        expect(wrapperDoBotao(/expandir tudo/i).style.transform).toBe('none');
        expect(wrapperDoBotao(/recolher tudo/i).style.transform).toBe('none');
      },
      { timeout: 2000 }
    );
    expect(iconeExpandir.style.transform).toBe('none');
    expect(iconeRecolher.style.transform).toBe('none');

    fireEvent.pointerEnter(wrapperDoBotao(/expandir tudo/i), PONTEIRO);
    await waitFor(() => expect(iconeExpandir.style.transform).toBe('translateY(2px)'), { timeout: 2000 });
    // O irmão fica parado (gesto do botão apontado, não da toolbar) e quem anima
    // é só o ícone: o wrapper segue no lugar em que a entrada o deixou.
    expect(iconeRecolher.style.transform).toBe('none');
    expect(wrapperDoBotao(/expandir tudo/i).style.transform).toBe('none');

    // Fora do hover o ícone VOLTA a zero (tween reverso, sem ficar "preso" em 2px).
    fireEvent.pointerLeave(wrapperDoBotao(/expandir tudo/i), PONTEIRO);
    await waitFor(() => expect(iconeExpandir.style.transform).toBe('none'), { timeout: 2000 });

    // Mesma história do outro lado, com o sentido invertido.
    fireEvent.pointerEnter(wrapperDoBotao(/recolher tudo/i), PONTEIRO);
    await waitFor(() => expect(iconeRecolher.style.transform).toBe('translateY(-2px)'), { timeout: 2000 });
    expect(iconeExpandir.style.transform).toBe('none');
  });

  it('encolhe o wrapper ao pressionar, sem encostar no botão', async () => {
    renderToolbar();

    const botao = screen.getByRole('button', { name: /expandir tudo/i });
    const wrapper = wrapperDoBotao(/expandir tudo/i);
    const icone = iconeDoBotao(/expandir tudo/i);

    await waitFor(() => expect(wrapper.style.transform).toBe('none'), { timeout: 2000 });

    fireEvent.pointerDown(botao, PONTEIRO);
    await waitFor(() => expect(wrapper.style.transform).toBe('scale(0.98)'), { timeout: 2000 });
    // Mesma separação da entrada: a escala da Motion é do wrapper, então o botão
    // continua sem `style` inline e o press não mexe no ícone.
    expect(botao.getAttribute('style')).toBeNull();
    expect(icone.style.transform).toBe('none');

    fireEvent.pointerUp(botao, PONTEIRO);
    await waitFor(() => expect(wrapper.style.transform).toBe('none'), { timeout: 2000 });
  });

  it('declara a microanimação do ícone com as duas pontas em tween, só em y', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaToolbar.tsx'), 'utf8');

    // O rótulo `hover` sai do wrapper e chega ao ícone por PROPAGAÇÃO de variante
    // (o ícone não declara `whileHover` próprio); o press fica no wrapper. Ancorado
    // no começo da linha pra contar só atributo JSX, e não a menção no comentário.
    expect([...source.matchAll(/^\s+whileHover="hover"$/gm)]).toHaveLength(2);
    expect([...source.matchAll(/^\s+whileTap=\{TAP_ACAO\}$/gm)]).toHaveLength(2);

    // Cada ação com o seu sentido: "Expandir tudo" desce, "Recolher tudo" sobe.
    expect(source).toMatch(/const ICONE_EXPANDIR = variantesIconeAcao\(2\);/);
    expect(source).toMatch(/const ICONE_RECOLHER = variantesIconeAcao\(-2\);/);

    // As DUAS variantes do ícone com `transition`: sem a de repouso (`visible`, o
    // rótulo que ele já herda do `cardVariants`), a volta do hover cairia na
    // transição padrão da Motion — uma mola, que passa do ponto antes de parar.
    // O casamento é do bloco inteiro, então nenhuma propriedade a mais entra aqui
    // (nada de cor, tamanho, opacidade ou rotação: o ícone só muda de posição).
    expect(source).toMatch(
      /function variantesIconeAcao\(deslocamentoEmPx: number\): Variants \{\s*return \{\s*visible: \{ y: 0, transition: MICRO_ACAO \},\s*hover: \{ y: deslocamentoEmPx, transition: MICRO_ACAO \},\s*\};\s*\}/
    );
    // 180ms com a MESMA curva da cascata de entrada (`cardVariants`).
    expect(source).toMatch(/const MICRO_ACAO = \{ duration: 0\.18, ease: \[0\.25, 0\.46, 0\.45, 0\.94\] \} as const;/);
    // Pressionar: só `scale`, e nenhum outro alvo.
    expect(source).toMatch(/const TAP_ACAO = \{ scale: 0\.98, transition: MICRO_ACAO \};/);

    // O ícone anima dentro de um `motion.span` com o MESMO box que ele já ocupava
    // (`inline-flex` porque `transform` não tem efeito em caixa inline pura; nada
    // de classe nova de cor/tamanho no span nem no svg).
    expect([...source.matchAll(/<motion\.span variants=\{ICONE_\w+\} className="inline-flex">/g)]).toHaveLength(2);
  });

  it('reaproveita o `cardVariants` do Dashboard em vez de recriar a animação', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaToolbar.tsx'), 'utf8');

    // Mesmo objeto, importado da referência — o padrão dos KPI Cards do Dashboard
    // Executivo, sem `hidden:`/`visible:` local (nada de cópia "parecida").
    expect(source).toMatch(/import \{ cardVariants \} from '@\/components\/dashboard\/MetricCard'/);
    expect(source).toMatch(/variants=\{cardVariants\}/);
    expect(source).toMatch(/initial="hidden"/);
    expect(source).toMatch(/animate="visible"/);
    expect(source).not.toMatch(/hidden:\s*\{/);
    expect(source).not.toMatch(/visible:\s*\(/);

    // Busca (3), "Expandir tudo" (4) e "Recolher tudo" (5) — na MESMA ordem do
    // JSX, que é a ordem visual da esquerda para a direita.
    const slots = [...source.matchAll(/custom=\{HEADER_REVEAL\.(\w+)\}/g)].map((m) => m[1]);
    expect(slots).toEqual(['busca', 'expandirTudo', 'recolherTudo']);
    expect(source).not.toMatch(/custom=\{\d+\}/);
  });

  it('deixa os ícones herdarem a tinta do botão (nada de cor fixa que suma)', () => {
    const { container } = renderToolbar();

    const svgs = Array.from(container.querySelectorAll('button svg'));
    expect(svgs).toHaveLength(2);

    for (const svg of svgs) {
      // Sem classe de cor própria: a tinta vem do `currentColor` do botão, então
      // ícone e rótulo não têm como divergir em nenhum estado.
      expect(svg.getAttribute('class')).not.toMatch(/text-/);
      expect(svg.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it('usa só utilitários de brilho que existem no tema (sem classe morta)', () => {
    // Classe de brilho fora do tema não gera CSS nenhum — foi o caso do
    // `shadow-glow-sm` que sobrou no `variant="premium"` do Button: o nome não
    // está em `boxShadow` e o Tailwind simplesmente não emite regra. Aqui o
    // valor de brilho tem de ser um token declarado em `tailwind.config.js`.
    const source = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaToolbar.tsx'), 'utf8');
    const config = readFileSync(resolve(process.cwd(), 'tailwind.config.js'), 'utf8');

    const usados = [...new Set([...source.matchAll(/shadow-([a-z][a-z-]*)/g)].map((m) => m[1]))];
    const declarados = [...new Set([...config.matchAll(/'?([\w-]+)'?:\s*'0 0 /g)].map((m) => m[1]))];

    expect(usados).toContain('glow');
    expect(declarados.length).toBeGreaterThan(0);
    for (const token of usados) {
      expect(declarados, `boxShadow.${token} não existe no tema`).toContain(token);
    }
  });
});
