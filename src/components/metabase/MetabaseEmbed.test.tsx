import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetabaseEmbed } from './MetabaseEmbed';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { warn: vi.fn() },
}));

const mockedUseQuery = vi.mocked(useQuery);

describe('MetabaseEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não mostra números de demonstração quando o Metabase está indisponível', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        metabaseOk: false,
        message: 'Metabase indisponível. Nenhum dado de demonstração é exibido.',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useQuery>);

    render(<MetabaseEmbed dashboardId={1} title="RH" />);

    expect(screen.getByText('Dashboard indisponível')).toBeInTheDocument();
    expect(screen.getByText('Nenhum valor estimado ou de demonstração é exibido neste estado.')).toBeInTheDocument();
    expect(screen.queryByText('Headcount por Departamento')).not.toBeInTheDocument();
  });

  it('não expõe o detalhe técnico de um erro de carregamento', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('HTTP 500: detalhe interno não deve aparecer'),
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useQuery>);

    render(<MetabaseEmbed dashboardId={1} title="RH" />);

    expect(screen.getByText('Não foi possível obter dados do Metabase neste momento.')).toBeInTheDocument();
    expect(screen.queryByText('detalhe interno não deve aparecer')).not.toBeInTheDocument();
  });
});
