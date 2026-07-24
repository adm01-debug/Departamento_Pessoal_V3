import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColaboradorFilters } from '../colaboradores/ColaboradorFilters';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  departamento: 'all',
  cargo: 'all',
};

const DEPARTAMENTOS = [
  { id: '1', nome: 'TI' },
  { id: '2', nome: 'RH' },
];

const CARGOS = [
  { id: '1', nome: 'Desenvolvedor' },
  { id: '2', nome: 'Analista' },
];

describe('ColaboradorFilters', () => {
  it('renders search input', () => {
    render(
      <ColaboradorFilters
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onDeptoChange={vi.fn()}
        onCargoChange={vi.fn()}
        currentFilters={DEFAULT_FILTERS}
      />
    );
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument();
  });

  it('calls onSearchChange when user types', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <ColaboradorFilters
        onSearchChange={onSearchChange}
        onStatusChange={vi.fn()}
        onDeptoChange={vi.fn()}
        onCargoChange={vi.fn()}
        currentFilters={DEFAULT_FILTERS}
      />
    );
    await user.type(screen.getByPlaceholderText(/Buscar por nome/i), 'João');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('reflects current search value', () => {
    render(
      <ColaboradorFilters
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onDeptoChange={vi.fn()}
        onCargoChange={vi.fn()}
        currentFilters={{ ...DEFAULT_FILTERS, search: 'Maria' }}
      />
    );
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
  });

  it('renders without departamentos or cargos', () => {
    render(
      <ColaboradorFilters
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onDeptoChange={vi.fn()}
        onCargoChange={vi.fn()}
        currentFilters={DEFAULT_FILTERS}
      />
    );
    // Should render without crashing
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument();
  });
});
