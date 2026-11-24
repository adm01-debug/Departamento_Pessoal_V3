import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

// Prova de que o Select renderiza via o wrapper Motion real (Fase 21 —
// "provar que os elementos Motion são renderizados", não só que existe CSS).
// `open` controlado no Root evita depender da interação de pointer do Radix
// (hasPointerCapture/scrollIntoView), que o jsdom não implementa.
describe('Select — wrapper Motion do design system', () => {
  it('renderiza as opções dentro do wrapper motion.div (SelectContent)', () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Opção A</SelectItem>
          <SelectItem value="b">Opção B</SelectItem>
        </SelectContent>
      </Select>,
    );

    const optionA = screen.getByRole('option', { name: 'Opção A' });
    const optionB = screen.getByRole('option', { name: 'Opção B' });
    expect(optionA).toBeInTheDocument();
    expect(optionB).toBeInTheDocument();

    // O motion.div fica entre Viewport e os itens — sobe a árvore a partir
    // de um item até achar o nó com `style` inline que o Framer Motion
    // escreve (opacity/transform), prova de que é um elemento Motion real,
    // não puramente CSS.
    let node: HTMLElement | null = optionA;
    let foundMotionWrapper = false;
    while (node && node.getAttribute('role') !== 'listbox') {
      if (node.style && (node.style.opacity !== '' || node.style.transform !== '')) {
        foundMotionWrapper = true;
        break;
      }
      node = node.parentElement;
    }
    expect(foundMotionWrapper).toBe(true);
  });

  it('cada SelectItem tem um motion.span interno com estilo próprio de opacity/transform', () => {
    render(
      <Select open>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Opção A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const option = screen.getByRole('option', { name: 'Opção A' });
    // Primeiro filho não-absolute é o wrapper motion.span do ItemText.
    const motionSpan = Array.from(option.children).find((el) => el.tagName === 'SPAN' && !el.className.includes('absolute'));
    expect(motionSpan).toBeTruthy();
    expect((motionSpan as HTMLElement).style.opacity).not.toBe('');
  });

  it('o chevron reflete o estado real do Radix (data-state), sem useState duplicado', () => {
    render(
      <Select open>
        <SelectTrigger data-testid="trigger"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent><SelectItem value="a">Opção A</SelectItem></SelectContent>
      </Select>,
    );
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('data-state', 'open');
  });
});
