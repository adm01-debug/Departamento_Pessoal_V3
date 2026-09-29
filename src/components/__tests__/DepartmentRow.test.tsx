import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DepartmentRow } from '../organograma/DepartmentRow';

const BASE = {
  nome: 'Financeiro',
  expanded: false,
  onToggle: vi.fn(),
  colaboradoresCount: 2,
  subDepartamentosCount: 1,
};

function renderRow(isRoot: boolean) {
  return render(<DepartmentRow {...BASE} isRoot={isRoot} />);
}

/** Badge que envolve o ícone `Building2` desta row (o svg dentro do span). */
function badgeDoIcone(container: HTMLElement) {
  const svg = container.querySelector('span > svg');
  expect(svg, 'badge do ícone Building2 não encontrado').not.toBeNull();
  return svg!.parentElement as HTMLElement;
}

function classes(el: Element) {
  return el.className.split(/\s+/);
}

// ─── Tinta do ícone por nível ───
// A raiz do organograma mantém o lime da identidade (`bg-primary/10 text-primary`);
// todo nó interno da árvore (nível ≥ 1 — Recursos Humanos, Financeiro, Comercial,
// Tecnologia etc.) usa o azul do design system (`--info`), o mesmo par
// `bg-info/15 text-info` do card "Departamentos" do cabeçalho e do contador de
// subdepartamentos desta própria row. O que decide a cor é o nível do nó.
describe('DepartmentRow — ícone do departamento', () => {
  it('pinta o ícone do subdepartamento de azul (token `info`)', () => {
    const { container } = renderRow(false);
    const classesDoBadge = classes(badgeDoIcone(container));

    expect(classesDoBadge).toContain('bg-info/15');
    expect(classesDoBadge).toContain('text-info');

    // Nada do cinza neutro anterior (`bg-muted text-muted-foreground`).
    expect(classesDoBadge).not.toContain('bg-muted');
    expect(classesDoBadge).not.toContain('text-muted-foreground');
    expect(classesDoBadge).not.toContain('text-primary');
  });

  it('não mexe na cor do ícone do departamento principal (raiz segue lime)', () => {
    const { container } = renderRow(true);
    const classesDoBadge = classes(badgeDoIcone(container));

    expect(classesDoBadge).toContain('bg-primary/10');
    expect(classesDoBadge).toContain('text-primary');

    // E a raiz não pega carona no azul novo.
    expect(classesDoBadge).not.toContain('bg-info/15');
    expect(classesDoBadge).not.toContain('text-info');
  });

  it('preserva badge, ícone, textos, grid e alturas (só a cor mudou)', () => {
    const { container, unmount } = renderRow(false);
    const subBadge = classes(badgeDoIcone(container));

    // Badge (w-7/h-7) e ícone (h-3.5/w-3.5) do subdepartamento, como antes.
    for (const classe of ['w-7', 'h-7', 'rounded-md', 'shrink-0', 'flex', 'items-center', 'justify-center']) {
      expect(subBadge).toContain(classe);
    }
    expect(badgeDoIcone(container).querySelector('svg')?.getAttribute('class')).toContain('h-3.5');

    // Grid, altura e espaçamento do subdepartamento intactos.
    const row = container.firstElementChild as HTMLElement;
    expect(classes(row)).toContain('h-12');
    expect(row.className).toMatch(/grid-cols-\[minmax\(0,1fr\)_120px_168px\]/);

    // Textos intactos: nome, contador de colaboradores e de subdepartamentos.
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('2 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('1 subdepartamento')).toBeInTheDocument();
    // O contador de subdepartamentos já era azul (`text-info`) — segue igual.
    expect(classes(screen.getByText('1 subdepartamento'))).toContain('text-info');
    // O toggle de expandir/recolher continua com a sua própria tinta neutra.
    const toggle = screen.getByRole('button', { name: /expandir financeiro/i });
    expect(classes(toggle)).toContain('text-muted-foreground');
    expect(classes(toggle)).not.toContain('text-info');

    unmount();

    // Raiz: mesmo badge/ícone maiores de antes (w-8/h-8 e h-4), só a cor é lime.
    const { container: rootContainer } = renderRow(true);
    const rootBadge = classes(badgeDoIcone(rootContainer));
    for (const classe of ['w-8', 'h-8', 'rounded-md', 'shrink-0']) {
      expect(rootBadge).toContain(classe);
    }
    expect(badgeDoIcone(rootContainer).querySelector('svg')?.getAttribute('class')).toContain('h-4');
    expect(classes(rootContainer.firstElementChild as HTMLElement)).toContain('h-14');
  });
});
