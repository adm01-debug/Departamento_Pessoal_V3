import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';

// Mesma prova de `select.test.tsx`: o wrapper Motion (não CSS) realmente
// renderiza. `open` controlado no Root evita depender de pointer events que
// o jsdom não implementa plenamente.
describe('DropdownMenu — wrapper Motion do design system', () => {
  it('renderiza os itens dentro do wrapper motion.div (DropdownMenuContent)', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Abrir</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
          <DropdownMenuItem>Item B</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const itemA = screen.getByText('Item A').closest('[role="menuitem"]') as HTMLElement;
    expect(itemA).toBeTruthy();

    let node: HTMLElement | null = itemA;
    let foundMotionWrapper = false;
    while (node && node.getAttribute('role') !== 'menu') {
      if (node.style && (node.style.opacity !== '' || node.style.transform !== '')) {
        foundMotionWrapper = true;
        break;
      }
      node = node.parentElement;
    }
    expect(foundMotionWrapper).toBe(true);
  });

  it('cada DropdownMenuItem envolve {children} num motion.span com style próprio', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Abrir</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const textNode = screen.getByText('Item A');
    // O texto fica dentro do motion.span (pai direto), que tem style próprio.
    const motionSpan = textNode.closest('span[style]');
    expect(motionSpan).toBeTruthy();
    expect((motionSpan as HTMLElement).style.opacity).not.toBe('');
  });

  it('preserva o gap-3 do consumidor (ícone + texto) via [gap:inherit] no wrapper', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Abrir</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="gap-3">
            <span data-testid="icon">🔧</span>
            <span>Com ícone</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = screen.getByTestId('icon').closest('[role="menuitem"]') as HTMLElement;
    expect(item.className).toContain('gap-3');
    // O wrapper motion.span (filho direto do Item) precisa ter a classe que
    // herda esse gap — senão o espaçamento visual desapareceria.
    const wrapper = item.querySelector(':scope > span[style]');
    expect(wrapper?.className).toContain('[gap:inherit]');
  });
});
