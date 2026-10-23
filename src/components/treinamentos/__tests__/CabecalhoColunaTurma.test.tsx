import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarClock } from 'lucide-react';
import { CabecalhoColunaTurma } from '../CabecalhoColunaTurma';

/**
 * CABEÇALHO DE COLUNA — a mesma faixa de status nas três colunas.
 *
 * As classes são verificadas porque o requisito é estrutural: ícone solto de
 * 18 px na linha do título, contador à direita, subtítulo na segunda linha
 * abaixo do título, faixa translúcida com acento inferior de 2 px e 8 px até
 * os cards.
 */
const BASE = {
  id: 'turmas-coluna-proximas',
  titulo: 'Próximas turmas',
  descricao: 'Turmas que iniciarão em breve',
  contagem: 2,
  icone: CalendarClock,
  tom: {
    icone: 'text-info',
    superficie: 'border-info/20 bg-info/[0.07]',
    contador: 'border-info/30 bg-info/10 text-info',
    acento: 'bg-info/80',
  },
};

describe('CabecalhoColunaTurma', () => {
  it('monta a faixa de status com ícone solto, título e subtítulo', () => {
    const { container } = render(<CabecalhoColunaTurma {...BASE} />);
    const header = container.querySelector('[data-turmas-cabecalho]');
    expect(header).not.toBeNull();
    expect(header).toHaveClass(
      'relative',
      'mb-2',
      'grid',
      'w-full',
      'min-w-0',
      'grid-cols-[18px_minmax(0,1fr)_auto]',
      'items-center',
      'gap-x-2.5',
      'gap-y-0.5',
      'overflow-hidden',
      'rounded-xl',
      'border',
      'px-3',
      'py-2.5'
    );
    expect(header).toHaveClass('border-info/20', 'bg-info/[0.07]');

    // O primeiro filho é o próprio SVG: não existe mais o tile quadrado.
    const icone = header?.firstElementChild;
    expect(icone?.tagName.toLowerCase()).toBe('svg');
    expect(icone).toHaveClass('h-[18px]', 'w-[18px]', 'shrink-0', 'col-start-1', 'row-start-1', 'text-info');

    expect(screen.getByRole('heading', { level: 2, name: 'Próximas turmas' })).toHaveAttribute(
      'id',
      'turmas-coluna-proximas'
    );
    expect(screen.getByTitle('2 turma(s)')).toHaveTextContent('2');
    expect(screen.getByText('Turmas que iniciarão em breve')).toHaveClass(
      'col-start-2',
      'row-start-2',
      'truncate',
      'text-[11px]'
    );
  });

  it('alinha título e contador na primeira linha e o subtítulo abaixo do título', () => {
    const { container } = render(<CabecalhoColunaTurma {...BASE} />);
    const titulo = screen.getByRole('heading', { level: 2 });
    const contador = container.querySelector('[data-turmas-contador]');
    const subtitulo = screen.getByText('Turmas que iniciarão em breve');

    expect(titulo).toHaveClass('col-start-2', 'row-start-1', 'min-w-0', 'truncate');
    expect(contador).toHaveClass('col-start-3', 'row-start-1', 'h-5', 'min-w-[22px]', 'shrink-0', 'justify-self-end');
    expect(subtitulo).toHaveClass('col-start-2');
    // Mesma coluna do título → mesmo x inicial.
    expect(subtitulo.className).toContain('col-start-2');
  });

  it('preserva o tom da coluna na faixa, no contador e no acento inferior', () => {
    const { container } = render(<CabecalhoColunaTurma {...BASE} />);
    const header = container.querySelector('[data-turmas-cabecalho]');
    const contador = container.querySelector('[data-turmas-contador]');
    const acento = container.querySelector('[data-turmas-acento]');

    expect(header).toHaveClass('border-info/20', 'bg-info/[0.07]');
    expect(contador).toHaveClass('border-info/30', 'bg-info/10', 'text-info');
    expect(acento).toHaveClass('absolute', 'inset-x-0', 'bottom-0', 'h-0.5', 'bg-info/80');
  });
});
