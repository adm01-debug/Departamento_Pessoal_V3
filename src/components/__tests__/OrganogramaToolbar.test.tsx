import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  const tem = (classe: string) =>
    expect(classes, `classe ausente no botão: ${classe}`).toContain(classe);

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

    await waitFor(() => {
      for (const node of reveal) expect(node.style.transform).toBe('none');
    }, { timeout: 2000 });
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

    await waitFor(() => {
      for (const botao of botoes) {
        expect(botao.parentElement!.getAttribute('style')).toBe('opacity: 1; transform: none;');
      }
    }, { timeout: 2000 });

    // E o botão continua sem estilo inline depois da entrada (nunca recebeu um).
    for (const botao of botoes) {
      expect(botao.getAttribute('style')).toBeNull();
    }
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
