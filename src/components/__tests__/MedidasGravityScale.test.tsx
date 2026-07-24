import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { MedidasGravityScale } from '../medidas-disciplinares/MedidasGravityScale';

const MEDIDAS = [
  { tipo: 'advertencia_verbal' },
  { tipo: 'advertencia_verbal' },
  { tipo: 'suspensao' },
  { tipo: 'justa_causa' },
];

describe('MedidasGravityScale', () => {
  it('renders Distribuição por Gravidade title', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText('Distribuição por Gravidade')).toBeInTheDocument();
  });

  it('renders all four gravidade levels', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText('Adv. Verbal')).toBeInTheDocument();
    expect(screen.getByText('Adv. Escrita')).toBeInTheDocument();
    expect(screen.getByText('Suspensão')).toBeInTheDocument();
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders correct count for advertencia_verbal', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText(/2 \(50%\)/)).toBeInTheDocument();
  });

  it('renders CLT scale progression label', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText(/Escala de progressão disciplinar/)).toBeInTheDocument();
  });

  it('renders without crash when empty', () => {
    render(<MedidasGravityScale medidas={[]} />);
    expect(screen.getByText('Distribuição por Gravidade')).toBeInTheDocument();
  });
});
