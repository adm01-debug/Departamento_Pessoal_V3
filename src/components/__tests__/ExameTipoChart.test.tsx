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

import { ExameTipoChart } from '../exames/ExameTipoChart';
import type { Tables } from '@/integrations/supabase/types';

const DATA = [
  { id: '1', tipo: 'admissional' },
  { id: '2', tipo: 'admissional' },
  { id: '3', tipo: 'periodico' },
  { id: '4', tipo: 'demissional' },
] as unknown as Tables<'exames'>[];

describe('ExameTipoChart', () => {
  it('renders Exames por Tipo title', () => {
    render(<ExameTipoChart data={DATA} />);
    expect(screen.getByText('Exames por Tipo')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ExameTipoChart data={[]} />);
    expect(screen.getByText('Nenhum exame registrado')).toBeInTheDocument();
  });

  it('renders admissional label', () => {
    render(<ExameTipoChart data={DATA} />);
    expect(screen.getByText('Admissional')).toBeInTheDocument();
  });

  it('renders periodico label', () => {
    render(<ExameTipoChart data={DATA} />);
    expect(screen.getByText('Periódico')).toBeInTheDocument();
  });

  it('renders demissional label', () => {
    render(<ExameTipoChart data={DATA} />);
    expect(screen.getByText('Demissional')).toBeInTheDocument();
  });

  it('shows count for admissional (2)', () => {
    render(<ExameTipoChart data={DATA} />);
    expect(screen.getByText(/^2 \(50%\)$/)).toBeInTheDocument();
  });
});
