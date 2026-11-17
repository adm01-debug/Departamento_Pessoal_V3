import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesligamentoFilters } from '../desligamentos/DesligamentoFilters';

describe('DesligamentoFilters', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    statusFilter: 'todos',
    onStatusChange: vi.fn(),
    tipoFilter: 'todos',
    onTipoChange: vi.fn(),
  };

  it('renders search input placeholder', () => {
    render(<DesligamentoFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Buscar por colaborador/)).toBeInTheDocument();
  });

  it('shows current search value', () => {
    render(<DesligamentoFilters {...defaultProps} search="João" />);
    expect(screen.getByDisplayValue('João')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<DesligamentoFilters {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText(/Buscar por colaborador/);
    await user.type(input, 'A');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('renders Todos os Status trigger text', () => {
    render(<DesligamentoFilters {...defaultProps} />);
    expect(screen.getByText('Todos os Status')).toBeInTheDocument();
  });

  it('renders Todos os Tipos trigger text', () => {
    render(<DesligamentoFilters {...defaultProps} />);
    expect(screen.getByText('Todos os Tipos')).toBeInTheDocument();
  });

  // Controle que aceita clique e nao faz nada e pior que controle ausente: a
  // pagina de hoje passa busca, status e tipo, e os outros dois caiam num
  // handler vazio (o usuario escolhia "Ultimos 3 meses" e a lista nao mudava).
  it('esconde Departamento e Mais filtros quando a pagina nao oferece os callbacks', () => {
    render(
      <DesligamentoFilters
        search=""
        onSearchChange={vi.fn()}
        statusFilter="todos"
        onStatusChange={vi.fn()}
        tipoFilter="todos"
        onTipoChange={vi.fn()}
      />
    );
    expect(screen.queryByText('Departamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Mais filtros')).not.toBeInTheDocument();
  });

  it('mostra os dois assim que os callbacks existem', () => {
    render(
      <DesligamentoFilters
        search=""
        onSearchChange={vi.fn()}
        statusFilter="todos"
        onStatusChange={vi.fn()}
        tipoFilter="todos"
        onTipoChange={vi.fn()}
        onDepartamentoChange={vi.fn()}
        onPeriodoChange={vi.fn()}
      />
    );
    expect(screen.getByText('Departamento')).toBeInTheDocument();
    expect(screen.getByText('Mais filtros')).toBeInTheDocument();
  });
});
