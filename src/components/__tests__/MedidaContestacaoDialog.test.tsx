import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockUseQuery, mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('@/services', () => ({
  medidasDisciplinaresService: {
    listarAnexosContestacao: vi.fn(),
    contestar: vi.fn(),
    responderContestacao: vi.fn(),
    uploadAnexoContestacao: vi.fn(),
    signedUrlAnexoContestacao: vi.fn(),
    listarHistorico: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  useAuth: () => ({ user: { id: 'user-rh', email: 'rh@test.com' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...rest }: any) => (
    <textarea value={value} onChange={onChange} {...rest} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('./MedidaWorkflowTimeline', () => ({
  MedidaWorkflowTimeline: ({ medidaId }: any) => (
    <div data-testid="workflow-timeline" data-medida-id={medidaId} />
  ),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <svg />,
  Clock: () => <svg />,
  Paperclip: () => <svg />,
  Upload: () => <svg />,
  Download: () => <svg />,
  FileText: () => <svg />,
  Check: () => <svg />,
  X: () => <svg />,
}));

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('01/07/2026 10:00'),
  parseISO: vi.fn((s: string) => new Date(s)),
  formatDistanceToNow: vi.fn().mockReturnValue('em 5 dias'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

import { MedidaContestacaoDialog } from '../medidas-disciplinares/MedidaContestacaoDialog';

const DEFAULT_MUTATION = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

const makeMedida = (overrides = {}) => ({
  id: 'm-1',
  empresa_id: 'emp-1',
  descricao: 'Falta injustificada',
  status_workflow: 'aplicada',
  contestacao_texto: null,
  contestacao_resposta: null,
  contestacao_prazo_ate: null,
  contestacao_data: null,
  contestacao_aceita: null,
  ...overrides,
});

describe('MedidaContestacaoDialog', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue(DEFAULT_MUTATION);
  });

  it('returns null when medida is null', () => {
    const { container } = render(
      <MedidaContestacaoDialog
        medida={null}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render dialog content when open is false', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida()}
        open={false}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when open is true with medida', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida()}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the dialog title', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida()}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByText('Contestação de Medida Disciplinar')).toBeInTheDocument();
  });

  it('shows medida descricao', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida({ descricao: 'Ausência sem justificativa' })}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByText('Ausência sem justificativa')).toBeInTheDocument();
  });

  it('shows current workflow status', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida({ status_workflow: 'aplicada' })}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByText('aplicada')).toBeInTheDocument();
  });

  it('shows existing contestacao_texto when present', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida({ contestacao_texto: 'Não concordo com esta medida' })}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByText('Não concordo com esta medida')).toBeInTheDocument();
  });

  it('shows response form when isRHOrAdmin and status is contestada', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida({ status_workflow: 'contestada' })}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={true}
      />
    );
    expect(screen.getByText('Resposta do RH (mínimo 10 caracteres)')).toBeInTheDocument();
  });

  it('includes MedidaWorkflowTimeline with correct medidaId', () => {
    render(
      <MedidaContestacaoDialog
        medida={makeMedida({ id: 'm-42' })}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    const timeline = screen.getByTestId('workflow-timeline');
    expect(timeline).toHaveAttribute('data-medida-id', 'm-42');
  });

  it('shows "Nenhum anexo." when no attachments', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(
      <MedidaContestacaoDialog
        medida={makeMedida()}
        open={true}
        onOpenChange={onOpenChange}
        isRHOrAdmin={false}
      />
    );
    expect(screen.getByText('Nenhum anexo.')).toBeInTheDocument();
  });
});
