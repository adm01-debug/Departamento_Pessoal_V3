import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import CanalEticaPage from '@/pages/CanalEticaPage';
import { comunicacaoService } from '@/services/comunicacaoService';
import { makeChain } from '@/test/chain';

const auth: { isAdmin: boolean; hasRole: (r: string) => boolean } = { isAdmin: false, hasRole: (r) => r === 'rh' };

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
  useAuth: () => auth,
}));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/services/comunicacaoService', () => ({
  comunicacaoService: { atualizarDenuncia: vi.fn() },
}));

const denuncia = {
  id: 'd1',
  protocolo: 'abc12345',
  categoria: 'assedio',
  descricao: 'Relato de teste',
  prioridade: 'alta',
  status: 'aberto',
  resposta: null,
  anonimo: true,
  empresa_id: 'emp-1',
  created_at: '2026-11-10T10:00:00Z',
  updated_at: null,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => makeChain({ data: [denuncia], error: null })) },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CanalEticaPage />
    </QueryClientProvider>
  );
}

describe('CanalEticaPage — tratamento de denúncias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAdmin = false;
    auth.hasRole = (r: string) => r === 'rh';
  });

  it('RH abre a denúncia e salva status + parecer via atualizarDenuncia', async () => {
    vi.mocked(comunicacaoService.atualizarDenuncia).mockResolvedValue({ ...denuncia } as never);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tratar' }));
    expect(screen.getByText('Relato de teste')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Parecer / resposta'), { target: { value: '  Apurado e encerrado  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar tratamento' }));

    await waitFor(() =>
      expect(comunicacaoService.atualizarDenuncia).toHaveBeenCalledWith(
        'd1',
        { status: 'aberto', resposta: 'Apurado e encerrado' },
        'emp-1'
      )
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Denúncia atualizada'));
  });

  it('mostra erro quando a atualização não grava nenhuma linha', async () => {
    vi.mocked(comunicacaoService.atualizarDenuncia).mockRejectedValue(
      new Error('Nenhum registro de denúncia foi retornado.')
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tratar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar tratamento' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('usuário sem papel RH/admin não vê a ação de tratar', async () => {
    auth.hasRole = () => false;
    renderPage();

    expect(await screen.findByText('abc12345')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tratar' })).not.toBeInTheDocument();
  });
});
