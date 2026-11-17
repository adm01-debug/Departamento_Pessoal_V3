import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

// A lista de colaboradores e o unico dado que este dialogo busca. O mock guarda
// a chamada para os casos de carga ao abrir poderem afirmar se ela aconteceu.
const { mockOrder, mockColaboradores } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockColaboradores: {
    linhas: [] as { id: string; nome_completo: string; cargo: string | null; salario_base: number | null }[],
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: (...args: unknown[]) => {
              mockOrder(...args);
              return { data: mockColaboradores.linhas, error: null };
            },
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { criar: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked }: { checked?: boolean }) => <input type="checkbox" readOnly checked={!!checked} />,
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: unknown, d: string) => d) }));

import { NovoDesligamentoDialog } from '../desligamentos/NovoDesligamentoDialog';

describe('NovoDesligamentoDialog', () => {
  beforeEach(() => {
    mockOrder.mockClear();
    mockColaboradores.linhas = [];
  });

  it('renders Novo Desligamento title', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Novo Desligamento')).toBeInTheDocument();
  });

  it('renders dialog description', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Registre um novo desligamento de colaborador')).toBeInTheDocument();
  });

  it('renders Colaborador * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Colaborador *')).toBeInTheDocument();
  });

  it('renders Data Desligamento * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Data Desligamento *')).toBeInTheDocument();
  });

  it('renders Tipo de Rescisão * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Tipo de Rescisão *')).toBeInTheDocument();
  });

  it('renders Sem Justa Causa select option', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Sem Justa Causa')).toBeInTheDocument();
  });

  it('renders Motivo label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('renders Registrar Desligamento button', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Registrar Desligamento')).toBeInTheDocument();
  });

  // Regressao coberta: o dialogo e controlado pelo pai (`open={showNovo}` em
  // DesligamentosPage), e `onOpenChange` do Radix nao dispara na abertura feita
  // de fora. Com a carga pendurada nele, o select abria vazio e nao havia quem
  // desligar.
  it('carrega os colaboradores quando abre (lista vinda do banco na tela)', async () => {
    mockColaboradores.linhas = [
      { id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', salario_base: 3000 },
      { id: 'c2', nome_completo: 'Bruno Alves', cargo: 'Dev', salario_base: 5000 },
    ];

    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);

    expect(mockOrder).toHaveBeenCalledWith('nome_completo');
    expect(await screen.findByText(/Ana Lima/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno Alves/)).toBeInTheDocument();
  });

  it('nao consulta o banco enquanto esta fechado', () => {
    render(<NovoDesligamentoDialog open={false} onClose={vi.fn()} />);
    expect(mockOrder).not.toHaveBeenCalled();
  });

  it('carrega ao passar de fechado para aberto', async () => {
    mockColaboradores.linhas = [{ id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', salario_base: 3000 }];

    const { rerender } = render(<NovoDesligamentoDialog open={false} onClose={vi.fn()} />);
    expect(mockOrder).not.toHaveBeenCalled();

    rerender(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(await screen.findByText(/Ana Lima/)).toBeInTheDocument();
  });
});
