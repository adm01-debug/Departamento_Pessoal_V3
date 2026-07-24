import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarChart2 } from 'lucide-react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { RelatoriosExportTab } from '../relatorios/RelatoriosExportTab';

const RELATORIOS = [
  { id: 'r1', title: 'Folha de Pagamento', description: 'Resumo mensal da folha', icon: BarChart2, gradient: 'from-primary to-primary-glow' },
  { id: 'r2', title: 'Headcount por Depto', description: 'Colaboradores por departamento', icon: BarChart2, gradient: 'from-success to-success/70' },
];

describe('RelatoriosExportTab', () => {
  it('renders report titles', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="csv" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getByText('Folha de Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Headcount por Depto')).toBeInTheDocument();
  });

  it('renders report descriptions', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="csv" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getByText('Resumo mensal da folha')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores por departamento')).toBeInTheDocument();
  });

  it('shows CSV button label when exportFormat is csv', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="csv" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getAllByText('CSV').length).toBe(2);
  });

  it('shows Excel button label when exportFormat is excel', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="excel" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getAllByText('Excel').length).toBe(2);
  });

  it('shows PDF button label when exportFormat is pdf', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="pdf" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getAllByText('PDF').length).toBe(2);
  });

  it('calls onExport with correct id when export button clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="csv" generating={null} onExport={onExport} onEmailOpen={vi.fn()} />);
    const csvButtons = screen.getAllByText('CSV');
    await user.click(csvButtons[0]);
    expect(onExport).toHaveBeenCalledWith('r1');
  });

  it('shows Gerando text when generating matches id', () => {
    render(<RelatoriosExportTab relatorios={RELATORIOS} exportFormat="csv" generating="r1" onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(screen.getByText('Gerando...')).toBeInTheDocument();
  });

  it('renders empty grid for no relatorios', () => {
    const { container } = render(<RelatoriosExportTab relatorios={[]} exportFormat="csv" generating={null} onExport={vi.fn()} onEmailOpen={vi.fn()} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
