import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  FileWarning: () => <svg data-testid="icon-FileWarning" />,
  Ban: () => <svg data-testid="icon-Ban" />,
  Gavel: () => <svg data-testid="icon-Gavel" />,
  MessageSquare: () => <svg data-testid="icon-MessageSquare" />,
  CheckCircle2: () => <svg data-testid="icon-CheckCircle2" />,
  XCircle: () => <svg data-testid="icon-XCircle" />,
  Clock: () => <svg data-testid="icon-Clock" />,
}));

import { MedidasTimeline } from '../medidas-disciplinares/MedidasTimeline';

const makeMedida = (overrides = {}) => ({
  id: 'm1',
  tipo: 'advertencia_escrita',
  data_ocorrencia: '2026-07-01T10:00:00Z',
  descricao: 'Teste de advertência',
  colaborador_ciente: false,
  recusa_assinatura: false,
  colaborador: { nome_completo: 'João Silva' },
  ...overrides,
});

describe('MedidasTimeline', () => {
  const onMarcarCiencia = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when medidas is empty', () => {
    const { container } = render(
      <MedidasTimeline medidas={[]} onMarcarCiencia={onMarcarCiencia} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders medida descricao', () => {
    render(
      <MedidasTimeline medidas={[makeMedida()]} onMarcarCiencia={onMarcarCiencia} />
    );
    expect(screen.getByText('Teste de advertência')).toBeInTheDocument();
  });

  it('renders colaborador name', () => {
    render(
      <MedidasTimeline medidas={[makeMedida()]} onMarcarCiencia={onMarcarCiencia} />
    );
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('shows "Registrar ciência" button when not ciente and not recusa', () => {
    render(
      <MedidasTimeline medidas={[makeMedida()]} onMarcarCiencia={onMarcarCiencia} />
    );
    expect(screen.getByText('Registrar ciência')).toBeInTheDocument();
  });

  it('calls onMarcarCiencia with medida id when button is clicked', () => {
    render(
      <MedidasTimeline
        medidas={[makeMedida({ id: 'm-test' })]}
        onMarcarCiencia={onMarcarCiencia}
      />
    );
    fireEvent.click(screen.getByText('Registrar ciência'));
    expect(onMarcarCiencia).toHaveBeenCalledWith('m-test');
  });

  it('shows Ciente badge when colaborador_ciente is true', () => {
    render(
      <MedidasTimeline
        medidas={[makeMedida({ colaborador_ciente: true })]}
        onMarcarCiencia={onMarcarCiencia}
      />
    );
    expect(screen.getByText('Ciente')).toBeInTheDocument();
    expect(screen.queryByText('Registrar ciência')).toBeNull();
  });

  it('shows Recusou badge when recusa_assinatura is true', () => {
    render(
      <MedidasTimeline
        medidas={[makeMedida({ recusa_assinatura: true })]}
        onMarcarCiencia={onMarcarCiencia}
      />
    );
    expect(screen.getByText('Recusou')).toBeInTheDocument();
  });

  it('limits to 10 most recent medidas', () => {
    const medidas = Array.from({ length: 15 }, (_, i) => makeMedida({
      id: `m${i}`,
      data_ocorrencia: `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      descricao: `Medida ${i}`,
    }));
    render(
      <MedidasTimeline medidas={medidas} onMarcarCiencia={onMarcarCiencia} />
    );
    // Each medida has "Registrar ciência" button, so count them
    const buttons = screen.getAllByText('Registrar ciência');
    expect(buttons.length).toBeLessThanOrEqual(10);
  });

  it('shows "Colaborador" as fallback when colaborador has no nome_completo', () => {
    render(
      <MedidasTimeline
        medidas={[makeMedida({ colaborador: {} })]}
        onMarcarCiencia={onMarcarCiencia}
      />
    );
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });
});
