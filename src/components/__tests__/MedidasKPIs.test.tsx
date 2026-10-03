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

import { MedidasKPIs } from '../medidas-disciplinares/MedidasKPIs';

const STATS = {
  total: 10,
  advertenciasVerbais: 4,
  advertenciasEscritas: 3,
  suspensoes: 2,
  justaCausa: 1,
  pendenteCiencia: 2,
  recusas: 1,
  ultimosMeses: 6,
};

describe('MedidasKPIs', () => {
  it('renders Total Registros label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Total Registros')).toBeInTheDocument();
  });

  it('renders Adv. Verbais label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Adv. Verbais')).toBeInTheDocument();
  });

  it('renders Adv. Escritas label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Adv. Escritas')).toBeInTheDocument();
  });

  it('renders Suspensões label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Suspensões')).toBeInTheDocument();
  });

  it('renders Justa Causa label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders total value', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows recusas warning when recusas > 0', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText(/recusa de assinatura/)).toBeInTheDocument();
  });

  it('hides recusas warning when recusas is 0', () => {
    render(<MedidasKPIs stats={{ ...STATS, recusas: 0 }} />);
    expect(screen.queryByText(/recusa de assinatura/)).not.toBeInTheDocument();
  });
});
