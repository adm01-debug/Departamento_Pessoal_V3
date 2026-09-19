import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Command, CommandGroup, CommandItem, CommandList } from '../command';

// jsdom não implementa `scrollIntoView` (cmdk chama isso ao montar a lista
// pra rolar até o item ativo) — polyfill local, só pra este arquivo.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Popover — wrapper Motion do design system', () => {
  it('renderiza o conteúdo dentro do wrapper motion.div (PopoverContent)', () => {
    render(
      <Popover open>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>
          <p data-testid="conteudo">Conteúdo do popover</p>
        </PopoverContent>
      </Popover>,
    );
    const conteudo = screen.getByTestId('conteudo');
    let node: HTMLElement | null = conteudo;
    let foundMotionWrapper = false;
    while (node) {
      if (node.style && (node.style.opacity !== '' || node.style.transform !== '')) {
        foundMotionWrapper = true;
        break;
      }
      node = node.parentElement;
    }
    expect(foundMotionWrapper).toBe(true);
  });
});

describe('Popover + Command (combobox) — wrapper Motion do design system', () => {
  it('cada CommandItem envolve {children} num motion.span com style próprio', () => {
    render(
      <Popover open>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>
          <Command>
            <CommandList>
              <CommandGroup>
                <CommandItem>Resultado A</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>,
    );
    const textNode = screen.getByText('Resultado A');
    const motionSpan = textNode.closest('span[style]');
    expect(motionSpan).toBeTruthy();
    expect((motionSpan as HTMLElement).style.opacity).not.toBe('');
  });
});
