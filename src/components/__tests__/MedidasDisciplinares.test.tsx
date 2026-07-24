import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { MedidasKPIs } from '../medidas-disciplinares/MedidasKPIs';
import { MedidasGravityScale } from '../medidas-disciplinares/MedidasGravityScale';

const STATS = {
  total: 20,
  advertenciasVerbais: 8,
  advertenciasEscritas: 6,
  suspensoes: 4,
  justaCausa: 2,
  pendenteCiencia: 3,
  recusas: 0,
  ultimosMeses: 5,
};

const MEDIDAS = [
  { id: '1', tipo: 'advertencia_verbal' },
  { id: '2', tipo: 'advertencia_verbal' },
  { id: '3', tipo: 'advertencia_escrita' },
  { id: '4', tipo: 'suspensao' },
  { id: '5', tipo: 'justa_causa' },
];

describe('MedidasKPIs', () => {
  it('renders Total Registros label', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Total Registros')).toBeInTheDocument();
  });

  it('renders all KPI labels', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('Adv. Verbais')).toBeInTheDocument();
    expect(screen.getByText('Adv. Escritas')).toBeInTheDocument();
    expect(screen.getByText('Suspensões')).toBeInTheDocument();
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
    expect(screen.getByText('Pendente Ciência')).toBeInTheDocument();
  });

  it('renders stat values', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show recusas alert when recusas is 0', () => {
    render(<MedidasKPIs stats={STATS} />);
    expect(screen.queryByText(/recusa de assinatura/)).not.toBeInTheDocument();
  });

  it('shows recusas alert when recusas > 0', () => {
    render(<MedidasKPIs stats={{ ...STATS, recusas: 2 }} />);
    expect(screen.getByText(/recusa de assinatura/)).toBeInTheDocument();
  });
});

describe('MedidasGravityScale', () => {
  it('renders Distribuição por Gravidade title', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText('Distribuição por Gravidade')).toBeInTheDocument();
  });

  it('renders all gravity level labels', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText('Adv. Verbal')).toBeInTheDocument();
    expect(screen.getByText('Adv. Escrita')).toBeInTheDocument();
    expect(screen.getByText('Suspensão')).toBeInTheDocument();
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('shows counts for each level', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText(/2 \(40%\)/)).toBeInTheDocument();
  });

  it('renders escala progressiva section', () => {
    render(<MedidasGravityScale medidas={MEDIDAS} />);
    expect(screen.getByText(/Escala de progressão disciplinar/)).toBeInTheDocument();
  });

  it('handles empty medidas without crash', () => {
    render(<MedidasGravityScale medidas={[]} />);
    expect(screen.getByText('Distribuição por Gravidade')).toBeInTheDocument();
  });
});
