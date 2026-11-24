import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
    button: ({ children, onClick }: any) => (
      <button onClick={onClick}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/utils', () => ({ cn: (...c: any[]) => c.filter(Boolean).join(' ') }));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}));

vi.mock('lucide-react', () => ({
  Zap: () => <span />,
  UserPlus: () => <span />,
  DollarSign: () => <span />,
  Clock: () => <span />,
  Calendar: () => <span />,
  FileText: () => <span />,
  BarChart3: () => <span />,
  X: () => <span>X</span>,
  ChevronRight: () => <span />,
  ClipboardList: () => <span />,
  Calculator: () => <span />,
  Settings: () => <span />,
  Network: () => <span />,
}));

import { MobileQuickActions } from '../layout/MobileQuickActions';

describe('MobileQuickActions', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<MobileQuickActions open={false} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Ações Rápidas heading when open=true', () => {
    render(<MobileQuickActions open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Ações Rápidas')).toBeTruthy();
  });

  it('renders all 10 quick action labels', () => {
    render(<MobileQuickActions open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Novo Colaborador')).toBeTruthy();
    expect(screen.getByText('Calcular Folha')).toBeTruthy();
    expect(screen.getByText('Registrar Ponto')).toBeTruthy();
    expect(screen.getByText('Solicitar Férias')).toBeTruthy();
    expect(screen.getByText('Obrigações Fiscais')).toBeTruthy();
    expect(screen.getByText('Relatórios DP')).toBeTruthy();
    expect(screen.getByText('Pesquisas Clima')).toBeTruthy();
    expect(screen.getByText('Rescisão')).toBeTruthy();
    expect(screen.getByText('Configurações')).toBeTruthy();
    expect(screen.getByText('Organograma')).toBeTruthy();
  });

  it('renders Fechar Painel button', () => {
    render(<MobileQuickActions open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Fechar Painel')).toBeTruthy();
  });

  it('calls onOpenChange(false) when X button clicked', () => {
    const onOpenChange = vi.fn();
    render(<MobileQuickActions open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when "Fechar Painel" button clicked', () => {
    const onOpenChange = vi.fn();
    render(<MobileQuickActions open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Fechar Painel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls navigate with /colaboradores/novo when Novo Colaborador clicked', () => {
    const onOpenChange = vi.fn();
    render(<MobileQuickActions open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Novo Colaborador').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/colaboradores/novo');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls navigate with /ponto when Registrar Ponto clicked', () => {
    const onOpenChange = vi.fn();
    render(<MobileQuickActions open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Registrar Ponto').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/ponto');
  });

  it('calls onOpenChange(false) when backdrop clicked', () => {
    const onOpenChange = vi.fn();
    render(<MobileQuickActions open onOpenChange={onOpenChange} />);
    const backdrop = screen.getAllByRole('generic').find(el =>
      el.className?.includes('fixed inset-0')
    );
    if (backdrop) fireEvent.click(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
