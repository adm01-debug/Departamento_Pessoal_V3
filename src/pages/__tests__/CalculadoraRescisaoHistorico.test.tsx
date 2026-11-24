import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalculadoraRescisaoPage from '@/pages/CalculadoraRescisaoPage';
import { createQueryBuilder } from '@/test/supabaseMock';

/**
 * A tela GRAVAVA em `historico_rescisoes` (botão "Salvar") e NUNCA lia: o
 * cálculo ia para uma tabela que nenhuma tela exibia. Fluxo pela metade
 * (AGENTS.md, seção 3). Estes casos provam a contraparte de leitura.
 *
 * A tabela estava VAZIA em produção quando isto foi escrito (0 linhas), então o
 * estado vazio é tão importante quanto a lista preenchida.
 */

type LinhaHistorico = {
  id: string;
  created_at: string;
  nome_colaborador: string | null;
  cargo: string | null;
  tipo_rescisao: string | null;
  data_desligamento: string | null;
  total_liquido: number | null;
};

let historico: LinhaHistorico[] = [];

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useDataAccessLog', () => ({ useDataAccessLog: () => undefined }));
vi.mock('@/services/piiAccessLogService', () => ({ registrarAcessoPII: vi.fn(async () => undefined) }));
vi.mock('@/services/edgeFunctionsService', () => ({ edgeFunctionsService: { calcularRescisao: vi.fn() } }));
vi.mock('@/utils/rescisaoPDF', () => ({ gerarPDFRescisao: vi.fn() }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((tabela: string) =>
      tabela === 'historico_rescisoes'
        ? createQueryBuilder({ data: historico, error: null })
        : createQueryBuilder({ data: [], error: null })
    ),
  },
}));

function renderPagina() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CalculadoraRescisaoPage />
    </QueryClientProvider>
  );
}

describe('CalculadoraRescisaoPage — histórico salvo passa a ser lido', () => {
  beforeEach(() => {
    historico = [];
  });

  it('com a tabela vazia, explica como preencher em vez de mostrar tabela em branco', async () => {
    renderPagina();
    expect(await screen.findByText('Nenhum cálculo salvo ainda.')).toBeInTheDocument();
    expect(screen.getByText(/clique em "Salvar" para guardar aqui/)).toBeInTheDocument();
  });

  it('lista os cálculos salvos com colaborador, tipo, data e líquido', async () => {
    historico = [
      {
        id: 'h1',
        created_at: '2026-11-18T12:00:00.000Z',
        nome_colaborador: 'Colaborador de Teste',
        cargo: 'Analista',
        tipo_rescisao: 'sem_justa_causa',
        data_desligamento: '2026-11-10',
        total_liquido: 4321.5,
      },
    ];
    renderPagina();

    expect(await screen.findByText('Colaborador de Teste')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
    // O underscore do enum não é mostrado cru ao usuário.
    expect(screen.getByText('sem justa causa')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum cálculo salvo ainda.')).toBeNull();
  });

  it('a data de desligamento não escorrega um dia por fuso', async () => {
    historico = [
      {
        id: 'h2',
        created_at: '2026-11-18T12:00:00.000Z',
        nome_colaborador: 'Outro Colaborador',
        cargo: null,
        tipo_rescisao: 'pedido_demissao',
        // Meia-noite UTC viraria 31/10 em fuso negativo se a data fosse lida crua.
        data_desligamento: '2026-11-01',
        total_liquido: null,
      },
    ];
    renderPagina();

    await waitFor(() => expect(screen.getByText('Outro Colaborador')).toBeInTheDocument());
    expect(screen.getByText('01/11/2026')).toBeInTheDocument();
  });
});
