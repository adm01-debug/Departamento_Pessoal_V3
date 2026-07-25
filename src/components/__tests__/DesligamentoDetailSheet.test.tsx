import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { atualizar: vi.fn() },
}));

vi.mock('@/services/rescisaoService', () => ({
  rescisaoService: { calcularESalvar: vi.fn(), homologar: vi.fn() },
}));

vi.mock('@/utils/rescisaoPDF', () => ({ gerarPDFRescisao: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('../desligamentos/DesligamentoStatusBadge', () => ({
  StatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
  TipoBadge: ({ tipo }: any) => <span data-testid="tipo-badge">{tipo}</span>,
}));

vi.mock('../desligamentos/DesligamentoChecklist', () => ({
  DesligamentoChecklist: () => <div data-testid="checklist" />,
}));

import { DesligamentoDetailSheet } from '../desligamentos/DesligamentoDetailSheet';

const MOCK_DESL = {
  id: 'd-001',
  empresa_id: 'emp-001',
  status: 'pendente',
  tipo: 'sem_justa_causa',
  etapa: 'comunicacao',
  colaborador: { nome_completo: 'Pedro Souza', data_admissao: '2020-01-15' },
  data_desligamento: '2026-07-24',
  data_aviso_previo: null,
  salario_base: 5000,
  motivo: null,
  saldo_salario: 1500,
  decimo_terceiro: 800,
  ferias_proporcionais: 600,
  ferias_vencidas: 0,
  terco_constitucional: 200,
  aviso_previo: 0,
  total_proventos: 3100,
  total_descontos: 200,
  liquido: 2900,
};

describe('DesligamentoDetailSheet', () => {
  it('returns null when desligamento is null', () => {
    const { container } = render(
      <DesligamentoDetailSheet desligamento={null} open={true} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders colaborador name', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getAllByText('Pedro Souza').length).toBeGreaterThanOrEqual(1);
  });

  it('renders StatusBadge', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('renders TipoBadge', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('tipo-badge')).toBeInTheDocument();
  });

  it('renders Detalhes tab', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
  });

  it('renders Checklist tab', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Checklist')).toBeInTheDocument();
  });

  it('renders Rescisão tab', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Rescisão')).toBeInTheDocument();
  });

  it('renders Etapa Atual card when etapa is set', () => {
    render(<DesligamentoDetailSheet desligamento={MOCK_DESL} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Etapa Atual')).toBeInTheDocument();
  });
});
