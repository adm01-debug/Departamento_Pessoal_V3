import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableToolbar } from '../data-table-toolbar';

describe('DataTableToolbar — filtros no mobile', () => {
  it('não mostra o botão de filtros quando não há filtros', () => {
    render(<DataTableToolbar search="" onSearchChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Abrir filtros' })).toBeNull();
  });

  it('abre uma gaveta com os filtros principais ao tocar no botão', () => {
    const filters = [
      {
        key: 'status',
        label: 'Status',
        options: [{ value: 'ativo', label: 'Ativo' }],
        value: 'all',
        onChange: vi.fn(),
      },
      { key: 'setor', label: 'Setor', options: [{ value: 'rh', label: 'RH' }], value: 'all', onChange: vi.fn() },
    ];
    render(<DataTableToolbar search="" onSearchChange={vi.fn()} filters={filters} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir filtros' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(screen.getByText('Filtros')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Setor' })).toBeTruthy();
  });
});
