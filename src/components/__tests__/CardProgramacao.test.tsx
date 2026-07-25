import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => '' } },
}));

vi.mock('@/lib/utils', () => ({ cn: (...c: any[]) => c.filter(Boolean).join(' ') }));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span />,
  Check: () => <span />,
  MoreVertical: () => <span />,
  Shield: () => <span />,
  UserCheck: () => <span />,
  X: () => <span />,
  ArrowRight: () => <span />,
}));

import { CardProgramacao } from '../ferias/programacao/CardProgramacao';
import type { ProgramacaoFerias } from '@/hooks/ferias/useProgramacaoFerias';

function makeCard(overrides: Partial<ProgramacaoFerias> = {}): ProgramacaoFerias {
  return {
    id: 'p-1',
    colaborador_id: 'col-1',
    ano: 2026,
    mes_previsto: 7,
    dias_previstos: 30,
    status: 'rascunho',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    colaborador: { id: 'col-1', nome_completo: 'Maria Costa', foto_url: null } as any,
    periodo_aquisitivo: null,
    data_inicio_prevista: null,
    ...overrides,
  } as ProgramacaoFerias;
}

const defaultProps = {
  canManage: false,
  isRH: false,
  onAprovarGestor: vi.fn(),
  onAprovarRH: vi.fn(),
  onRejeitar: vi.fn(),
  onConverter: vi.fn(),
};

describe('CardProgramacao', () => {
  it('renders colaborador name', () => {
    render(<CardProgramacao programacao={makeCard()} {...defaultProps} />);
    expect(screen.getByText('Maria Costa')).toBeTruthy();
  });

  it('renders dias previstos', () => {
    render(<CardProgramacao programacao={makeCard()} {...defaultProps} />);
    expect(screen.getByText(/30 dias/)).toBeTruthy();
  });

  it('renders status badge for rascunho', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'rascunho' })} {...defaultProps} />);
    expect(screen.getByText('Rascunho')).toBeTruthy();
  });

  it('renders status badge for aprovado_rh', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'aprovado_rh' })} {...defaultProps} />);
    expect(screen.getByText('RH OK')).toBeTruthy();
  });

  it('renders status badge for convertido', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'convertido' })} {...defaultProps} />);
    expect(screen.getByText('Convertido')).toBeTruthy();
  });

  it('renders status badge for rejeitado', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'rejeitado' })} {...defaultProps} />);
    expect(screen.getByText('Rejeitado')).toBeTruthy();
  });

  it('uses initials when name available', () => {
    render(<CardProgramacao programacao={makeCard()} {...defaultProps} />);
    expect(screen.getByText('MC')).toBeTruthy();
  });

  it('uses "?" initials when colaborador is null', () => {
    render(<CardProgramacao programacao={makeCard({ colaborador: null as any })} {...defaultProps} />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('shows "Colaborador" fallback when nome_completo is null', () => {
    render(<CardProgramacao programacao={makeCard({ colaborador: { id: 'x', nome_completo: null, foto_url: null } as any })} {...defaultProps} />);
    expect(screen.getByText('Colaborador')).toBeTruthy();
  });

  it('does not show dropdown when canManage=false', () => {
    render(<CardProgramacao programacao={makeCard()} {...defaultProps} canManage={false} />);
    expect(screen.queryByLabelText('Ações da programação')).toBeNull();
  });

  it('shows dropdown trigger when canManage=true', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'rascunho' })} {...defaultProps} canManage />);
    expect(screen.getByLabelText('Ações da programação')).toBeTruthy();
  });

  it('shows "Aprovar (Gestor)" for sugerido_gestor status', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'sugerido_gestor' })} {...defaultProps} canManage />);
    expect(screen.getByText(/Aprovar \(Gestor\)/)).toBeTruthy();
  });

  it('calls onAprovarGestor when clicked', () => {
    const onAprovarGestor = vi.fn();
    render(<CardProgramacao programacao={makeCard({ status: 'sugerido_gestor' })} {...defaultProps} canManage onAprovarGestor={onAprovarGestor} />);
    fireEvent.click(screen.getByText(/Aprovar \(Gestor\)/));
    expect(onAprovarGestor).toHaveBeenCalledWith('p-1');
  });

  it('shows "Aprovar (RH)" for aprovado_gestor when isRH', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'aprovado_gestor' })} {...defaultProps} canManage isRH />);
    expect(screen.getByText(/Aprovar \(RH\)/)).toBeTruthy();
  });

  it('calls onAprovarRH when clicked', () => {
    const onAprovarRH = vi.fn();
    render(<CardProgramacao programacao={makeCard({ status: 'aprovado_gestor' })} {...defaultProps} canManage isRH onAprovarRH={onAprovarRH} />);
    fireEvent.click(screen.getByText(/Aprovar \(RH\)/));
    expect(onAprovarRH).toHaveBeenCalledWith('p-1');
  });

  it('shows "Converter em férias" for aprovado_rh when isRH', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'aprovado_rh' })} {...defaultProps} canManage isRH />);
    expect(screen.getByText(/Converter em férias/)).toBeTruthy();
  });

  it('shows "Rejeitar" option for rejectable statuses', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'sugerido_gestor' })} {...defaultProps} canManage />);
    expect(screen.getByText('Rejeitar')).toBeTruthy();
  });

  it('hides "Rejeitar" for convertido status', () => {
    render(<CardProgramacao programacao={makeCard({ status: 'convertido' })} {...defaultProps} canManage />);
    expect(screen.queryByText('Rejeitar')).toBeNull();
  });

  it('calls onRejeitar when Rejeitar clicked', () => {
    const onRejeitar = vi.fn();
    const card = makeCard({ status: 'sugerido_gestor' });
    render(<CardProgramacao programacao={card} {...defaultProps} canManage onRejeitar={onRejeitar} />);
    fireEvent.click(screen.getByText('Rejeitar'));
    expect(onRejeitar).toHaveBeenCalledWith(card);
  });

  it('shows "Dobra" badge when vacation is past date limit', () => {
    const card = makeCard({
      ano: 2024,
      mes_previsto: 7,
      periodo_aquisitivo: { data_limite_concessao: '2024-01-01' } as any,
    });
    render(<CardProgramacao programacao={card} {...defaultProps} />);
    expect(screen.getByText('Dobra')).toBeTruthy();
  });

  it('does not show "Dobra" badge when within date limit', () => {
    const card = makeCard({
      ano: 2022,
      mes_previsto: 3,
      periodo_aquisitivo: { data_limite_concessao: '2025-12-31' } as any,
    });
    render(<CardProgramacao programacao={card} {...defaultProps} />);
    expect(screen.queryByText('Dobra')).toBeNull();
  });

  it('shows data_inicio_prevista in formatted form', () => {
    const card = makeCard({ data_inicio_prevista: '2026-07-15' });
    render(<CardProgramacao programacao={card} {...defaultProps} />);
    expect(screen.getByText(/15\/07/)).toBeTruthy();
  });
});
