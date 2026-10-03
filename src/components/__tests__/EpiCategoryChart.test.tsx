import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children?: ReactNode; asChild?: boolean }) =>
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { EpiCategoryChart } from '../epis/EpiCategoryChart';

const EPIS = [
  { id: '1', categoria: 'cabeca' },
  { id: '2', categoria: 'cabeca' },
  { id: '3', categoria: 'olhos' },
  { id: '4', categoria: 'maos' },
];

describe('EpiCategoryChart', () => {
  it('renders Cobertura por Categoria title', () => {
    render(<EpiCategoryChart epis={EPIS} />);
    expect(screen.getByText('Cobertura por Categoria')).toBeInTheDocument();
  });

  it('shows zero categories when no epis', () => {
    render(<EpiCategoryChart epis={[]} />);
    expect(screen.getByText(/0 de 9 categorias/)).toBeInTheDocument();
  });

  it('renders Cabeça label', () => {
    render(<EpiCategoryChart epis={EPIS} />);
    expect(screen.getByText('Cabeça')).toBeInTheDocument();
  });

  it('renders Olhos/Face label', () => {
    render(<EpiCategoryChart epis={EPIS} />);
    expect(screen.getByText('Olhos/Face')).toBeInTheDocument();
  });

  it('renders Mãos label', () => {
    render(<EpiCategoryChart epis={EPIS} />);
    expect(screen.getByText('Mãos')).toBeInTheDocument();
  });

  it('shows count for cabeca (2)', () => {
    render(<EpiCategoryChart epis={EPIS} />);
    expect(screen.getByText(/^2 \(50%\)$/)).toBeInTheDocument();
  });
});
