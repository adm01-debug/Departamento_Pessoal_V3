import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/services/premiacoesService', () => ({
  premiacoesService: {
    criarCampanha: vi.fn().mockResolvedValue({ id: 'camp-001' }),
    criarRegra: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CampaignWizard } from '../premiacoes/CampaignWizard';

const defaultProps = { isOpen: true, onClose: vi.fn(), empresaId: 'emp-001' };

describe('CampaignWizard', () => {
  it('renders dialog title', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText(/Configurar Nova Campanha de Incentivo/i)).toBeInTheDocument();
  });

  it('renders dialog description', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText(/Defina o período, orçamento/i)).toBeInTheDocument();
  });

  it('renders Nome da Campanha label on step 1', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText('Nome da Campanha')).toBeInTheDocument();
  });

  it('renders Início label on step 1', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('renders Fim label on step 1', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText('Fim')).toBeInTheDocument();
  });

  it('renders Orçamento Máximo Estimado label on step 1', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByText('Orçamento Máximo Estimado')).toBeInTheDocument();
  });

  it('renders Próximo button on step 1', () => {
    render(<CampaignWizard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Próximo: Regras de Pagamento/i })).toBeInTheDocument();
  });

  it('renders Regras de Premiação label after clicking Próximo', () => {
    render(<CampaignWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    expect(screen.getByText('Regras de Premiação')).toBeInTheDocument();
  });
});
