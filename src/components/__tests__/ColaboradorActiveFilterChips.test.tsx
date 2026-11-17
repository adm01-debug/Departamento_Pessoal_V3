import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColaboradorActiveFilterChips } from '@/components/colaboradores/ColaboradorActiveFilterChips';

// Este componente veio da branch `muri`, onde já estava plumbado dentro de
// `ColaboradorFilters` — mas nenhuma página passava `activeFilterChips`, então
// os chips nunca apareceram. O primeiro caso trava justamente o estado que
// deixava tudo invisível.

describe('ColaboradorActiveFilterChips', () => {
  it('sem filtro ativo não renderiza nada (nem o "Limpar filtros")', () => {
    const { container } = render(<ColaboradorActiveFilterChips filters={[]} onClearAll={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Limpar filtros')).not.toBeInTheDocument();
  });

  it('mostra um chip por filtro ativo', () => {
    render(
      <ColaboradorActiveFilterChips
        filters={[
          { key: 'status', label: 'Ativos', onRemove: vi.fn() },
          { key: 'departamento', label: 'TI', onRemove: vi.fn() },
        ]}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('TI')).toBeInTheDocument();
  });

  it('o X de cada chip remove só aquele filtro', async () => {
    const removerStatus = vi.fn();
    const removerDepto = vi.fn();
    render(
      <ColaboradorActiveFilterChips
        filters={[
          { key: 'status', label: 'Ativos', onRemove: removerStatus },
          { key: 'departamento', label: 'TI', onRemove: removerDepto },
        ]}
        onClearAll={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover filtro TI' }));
    expect(removerDepto).toHaveBeenCalledTimes(1);
    expect(removerStatus).not.toHaveBeenCalled();
  });

  it('cada X tem rótulo acessível com o nome do filtro', () => {
    render(
      <ColaboradorActiveFilterChips
        filters={[{ key: 'cargo', label: 'Analista', onRemove: vi.fn() }]}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Remover filtro Analista' })).toBeInTheDocument();
  });

  it('"Limpar filtros" chama onClearAll uma vez', async () => {
    const limparTudo = vi.fn();
    render(
      <ColaboradorActiveFilterChips
        filters={[{ key: 'status', label: 'Ativos', onRemove: vi.fn() }]}
        onClearAll={limparTudo}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(limparTudo).toHaveBeenCalledTimes(1);
  });
});
