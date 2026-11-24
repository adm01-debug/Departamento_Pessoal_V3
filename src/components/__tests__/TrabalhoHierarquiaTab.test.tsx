import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const { mockBuscarPorId, mockCargoBuscarPorId, mockLocalBuscarPorId } = vi.hoisted(() => ({
  mockBuscarPorId: vi.fn(),
  mockCargoBuscarPorId: vi.fn(),
  mockLocalBuscarPorId: vi.fn(),
}));

vi.mock('@/services', () => ({
  colaboradorService: { buscarPorId: mockBuscarPorId, list: vi.fn(async () => []) },
}));
vi.mock('@/services/cargoService', () => ({
  cargoService: { buscarPorId: mockCargoBuscarPorId },
}));
vi.mock('@/services/localTrabalhoService', () => ({
  localTrabalhoService: { buscarPorId: mockLocalBuscarPorId },
}));
const { mockUseCentrosCusto, mockUseTimes, mockUseLotacaoPrincipal } = vi.hoisted(() => ({
  mockUseCentrosCusto: vi.fn(() => ({ data: [] as { id: string; nome: string }[], isLoading: false })),
  mockUseTimes: vi.fn(() => ({ data: [] as { id: string; nome: string }[], isLoading: false })),
  mockUseLotacaoPrincipal: vi.fn(() => ({ data: null as { id: string; nome: string; ativa?: boolean } | null, isLoading: false })),
}));
vi.mock('@/hooks/useTabelasReferencia', () => ({
  useCentrosCusto: mockUseCentrosCusto,
}));
vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useTimes: mockUseTimes,
}));
// Fonte real de "Unidade / Locação principal" — colaborador_lotacoes.principal
// = true (ver TrabalhoHierarquiaTab.tsx), não mais a heurística "primeira
// lotação ativa" sobre `lotacoes.colaborador_id` (nunca populada por nenhum
// código do app — auditoria da task de arquitetura colaborador<->lotação).
vi.mock('@/hooks/useColaboradorLotacao', () => ({
  useLotacaoPrincipal: mockUseLotacaoPrincipal,
}));
vi.mock('@/hooks/useVinculos', () => ({
  useVinculosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { TrabalhoHierarquiaTab } from '../colaborador-detalhes/TrabalhoHierarquiaTab';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(
    QueryClientProvider,
    { client: qc },
    React.createElement(MemoryRouter, null, children)
  );
}

describe('TrabalhoHierarquiaTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows cargo from the cargos join when cargo_id is set', async () => {
    mockBuscarPorId.mockResolvedValue({
      id: 'col-1', empresa_id: 'emp-1', cargo: 'Analista Texto', cargo_id: 'cg-1',
    });
    mockCargoBuscarPorId.mockResolvedValue({ id: 'cg-1', nome: 'Analista de RH', cbo: '2524-05' });

    render(<TrabalhoHierarquiaTab colaboradorId="col-1" />, { wrapper });

    await waitFor(() => expect(screen.getAllByText('Analista de RH').length).toBeGreaterThan(0));
  });

  it('falls back to the plain text cargo column when cargo_id is not set', async () => {
    mockBuscarPorId.mockResolvedValue({
      id: 'col-2', empresa_id: 'emp-1', cargo: 'Analista Texto', cargo_id: null, cbo: '4110-05',
    });

    render(<TrabalhoHierarquiaTab colaboradorId="col-2" />, { wrapper });

    await waitFor(() => expect(screen.getAllByText('Analista Texto').length).toBeGreaterThan(0));
    expect(mockCargoBuscarPorId).not.toHaveBeenCalled();
  });

  it('does not invent a gestor direto when supervisor_id is not set', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 'col-3', empresa_id: 'emp-1', cargo: 'Analista', departamento: 'Financeiro' });

    render(<TrabalhoHierarquiaTab colaboradorId="col-3" />, { wrapper });

    await waitFor(() => expect(screen.getByText('Hierarquia')).toBeInTheDocument());
    expect(screen.getByText('Gestor direto')).toBeInTheDocument();
    expect(screen.getByText('Não definido')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Nenhum colaborador')).toBeInTheDocument();
  });

  // "Vínculo & Alocação" — confirma que o card resolve Time/Centro de
  // custo/Local de trabalho a partir dos MESMOS campos (`time_id`,
  // `centro_custo_id`, `local_trabalho_id`) que a aba Profissional
  // (ColaboradorFormPage.tsx) agora grava. Isso fecha o loop
  // edita→salva→reabre→card-mostra sem precisar montar as duas telas juntas:
  // o teste de ColaboradorFormPage.test.tsx prova o que é enviado ao salvar;
  // este prova que, dado esse mesmo dado já persistido (o "reabrir"), o card
  // (não alterado nesta tarefa) o exibe corretamente.
  describe('Vínculo & Alocação — Time/Centro de custo/Local de trabalho', () => {
    it('mostra o Time resolvido via join quando time_id está definido', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-4', empresa_id: 'emp-1', cargo: 'Analista', time_id: 't2' });
      mockUseTimes.mockReturnValue({ data: [{ id: 't1', nome: 'Time de Recursos Humanos' }, { id: 't2', nome: 'Time Administrativo' }], isLoading: false });

      render(<TrabalhoHierarquiaTab colaboradorId="col-4" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      expect(screen.getByText('Time Administrativo')).toBeInTheDocument();
    });

    it('mostra o Centro de custo resolvido via join quando centro_custo_id está definido', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-5', empresa_id: 'emp-1', cargo: 'Analista', centro_custo_id: 'cc2', centro_custo: 'Recursos Humanos' });
      mockUseCentrosCusto.mockReturnValue({ data: [{ id: 'cc1', nome: 'Recursos Humanos' }, { id: 'cc2', nome: 'Administrativo' }], isLoading: false });

      render(<TrabalhoHierarquiaTab colaboradorId="col-5" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      // Prioriza o join pelo ID (Administrativo) sobre o texto legado
      // ("Recursos Humanos") que ficou desatualizado no próprio registro.
      expect(screen.getByText('Administrativo')).toBeInTheDocument();
      expect(screen.queryByText('Recursos Humanos')).not.toBeInTheDocument();
    });

    it('mostra o Local de trabalho resolvido via localTrabalhoService quando local_trabalho_id está definido', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-6', empresa_id: 'emp-1', cargo: 'Analista', local_trabalho_id: 'lt2' });
      mockLocalBuscarPorId.mockResolvedValue({ id: 'lt2', nome: 'Filial Campinas' });

      render(<TrabalhoHierarquiaTab colaboradorId="col-6" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Filial Campinas')).toBeInTheDocument());
    });

    it('cai para o texto legado quando centro_custo_id/local_trabalho_id não têm join correspondente (colaborador antigo)', async () => {
      mockBuscarPorId.mockResolvedValue({
        id: 'col-7', empresa_id: 'emp-1', cargo: 'Analista',
        centro_custo_id: null, centro_custo: 'Financeiro (texto legado)',
        local_trabalho_id: null, local_trabalho: 'Sede Rio de Janeiro',
      });
      mockUseCentrosCusto.mockReturnValue({ data: [], isLoading: false });

      render(<TrabalhoHierarquiaTab colaboradorId="col-7" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      expect(screen.getByText('Financeiro (texto legado)')).toBeInTheDocument();
      expect(screen.getByText('Sede Rio de Janeiro')).toBeInTheDocument();
      expect(mockLocalBuscarPorId).not.toHaveBeenCalled();
    });
  });

  describe('Vínculo & Alocação — Unidade / Locação principal', () => {
    it('mostra a lotação principal vinda de colaborador_lotacoes.principal = true', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-8', empresa_id: 'emp-1', cargo: 'Analista' });
      mockUseLotacaoPrincipal.mockReturnValue({ data: { id: 'lo-b', nome: 'Unidade Campinas/SP', ativa: true }, isLoading: false });

      render(<TrabalhoHierarquiaTab colaboradorId="col-8" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      // O card já mostra a lotação principal em mais de um lugar (indicador
      // de resumo no topo + badge em "Vínculo & Alocação") — nenhum dos dois
      // foi tocado nesta tarefa, só a fonte do dado que os alimenta.
      expect(screen.getAllByText('Unidade Campinas/SP').length).toBeGreaterThan(0);
      expect(mockUseLotacaoPrincipal).toHaveBeenCalledWith('col-8', 'emp-1');
    });

    it('mostra "Nenhuma lotação cadastrada" quando o colaborador não tem lotação principal definida', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-9', empresa_id: 'emp-1', cargo: 'Analista' });
      mockUseLotacaoPrincipal.mockReturnValue({ data: null, isLoading: false });

      render(<TrabalhoHierarquiaTab colaboradorId="col-9" />, { wrapper });

      await waitFor(() => expect(screen.getByText('Vínculo & Alocação')).toBeInTheDocument());
      expect(screen.getByText('Nenhuma lotação cadastrada')).toBeInTheDocument();
    });

    it('troca de Unidade São Paulo/SP para Unidade Campinas/SP quando a fonte muda (simula reabrir após salvar)', async () => {
      mockBuscarPorId.mockResolvedValue({ id: 'col-10', empresa_id: 'emp-1', cargo: 'Analista' });
      mockUseLotacaoPrincipal.mockReturnValue({ data: { id: 'lo-a', nome: 'Unidade São Paulo/SP', ativa: true }, isLoading: false });

      const { rerender } = render(<TrabalhoHierarquiaTab colaboradorId="col-10" />, { wrapper });
      await waitFor(() => expect(screen.getAllByText('Unidade São Paulo/SP').length).toBeGreaterThan(0));

      mockUseLotacaoPrincipal.mockReturnValue({ data: { id: 'lo-b', nome: 'Unidade Campinas/SP', ativa: true }, isLoading: false });
      rerender(<TrabalhoHierarquiaTab colaboradorId="col-10" />);

      await waitFor(() => expect(screen.getAllByText('Unidade Campinas/SP').length).toBeGreaterThan(0));
      expect(screen.queryByText('Unidade São Paulo/SP')).not.toBeInTheDocument();
    });
  });
});
