import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { NineBoxMatrix } from '../avaliacao/NineBoxMatrix';

const DATA = [
  { id: '1', performance: 5, potencial: 5, avaliado: { nome_completo: 'Ana Lima' } },
  { id: '2', performance: 5, potencial: 5, avaliado: { nome_completo: 'Bruno Costa' } },
  { id: '3', performance: 1, potencial: 1, avaliado: { nome_completo: 'Carla Souza' } },
  { id: '4', performance: 3, potencial: 3, avaliado: { nome_completo: 'Diego Alves' } },
];

describe('NineBoxMatrix', () => {
  it('renders Matriz Nine-Box title', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText(/Matriz Nine-Box/)).toBeInTheDocument();
  });

  it('renders Estrelas section', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText('Estrelas')).toBeInTheDocument();
  });

  it('renders Core Players section', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText('Core Players')).toBeInTheDocument();
  });

  it('renders Em Risco section', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText('Em Risco')).toBeInTheDocument();
  });

  it('renders with empty data without crash', () => {
    render(<NineBoxMatrix data={[]} />);
    expect(screen.getByText(/Matriz Nine-Box/)).toBeInTheDocument();
  });

  it('shows Estrela grid label', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText('Estrela')).toBeInTheDocument();
  });

  it('shows Sub-performer grid label', () => {
    render(<NineBoxMatrix data={DATA} />);
    expect(screen.getByText('Sub-performer')).toBeInTheDocument();
  });
});
