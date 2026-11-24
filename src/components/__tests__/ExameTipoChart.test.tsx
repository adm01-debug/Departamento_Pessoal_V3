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

import { ExameTipoChart } from '../exames/ExameTipoChart';

const DATA = [
  { id: '1', tipo: 'admissional' },
  { id: '2', tipo: 'admissional' },
  { id: '3', tipo: 'periodico' },
  { id: '4', tipo: 'demissional' },
];

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
