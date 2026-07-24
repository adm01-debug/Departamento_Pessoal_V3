import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/utils/feriasPDF', () => ({
  feriasPDF: { gerarRecibo: vi.fn() },
}));

import { FeriasActions } from '../ferias/FeriasActions';

const BASE_SOLICITACAO = { id: 'sol-1', aprovado_gestor: false, aprovado_rh: false, enviado_contabilidade: false, cancelado: false, status: 'pendente' };

const DEFAULT_PROPS = {
  solicitacao: BASE_SOLICITACAO,
  onAprovarGestor: vi.fn(),
  onAprovarRH: vi.fn(),
  onEnviarContabilidade: vi.fn(),
  onRejeitar: vi.fn(),
  onCancelar: vi.fn(),
};

describe('FeriasActions', () => {
  it('renders Aprovar (Gestor) button when not yet approved', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Aprovar \(Gestor\)/i })).toBeInTheDocument();
  });

  it('renders Rejeitar button when not yet approved by gestor', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Rejeitar/i })).toBeInTheDocument();
  });

  it('renders Baixar button always', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeInTheDocument();
  });

  it('renders Cancelar button always', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('renders Aprovar (RH) button when approved by gestor but not RH', () => {
    render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, aprovado_gestor: true }} />);
    expect(screen.getByRole('button', { name: /Aprovar \(RH\)/i })).toBeInTheDocument();
  });

  it('returns null when solicitacao is cancelado', () => {
    const { container } = render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, cancelado: true }} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when status is rejeitada', () => {
    const { container } = render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, status: 'rejeitada' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onAprovarGestor when Aprovar (Gestor) is clicked', async () => {
    const onAprovarGestor = vi.fn();
    render(<FeriasActions {...DEFAULT_PROPS} onAprovarGestor={onAprovarGestor} />);
    await userEvent.click(screen.getByRole('button', { name: /Aprovar \(Gestor\)/i }));
    expect(onAprovarGestor).toHaveBeenCalledWith('sol-1');
  });
});
