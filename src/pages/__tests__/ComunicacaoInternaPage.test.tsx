import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComunicacaoInternaPage from '@/pages/ComunicacaoInternaPage';
import { comunicacaoService } from '@/services/comunicacaoService';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
const auth = vi.hoisted(() => ({ roles: ['rh'] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    isAdmin: auth.roles.includes('admin'),
    hasRole: (r: string) => auth.roles.includes(r),
  }),
}));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      channel: () => channel,
      removeChannel: vi.fn(),
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    },
  };
});
vi.mock('@/services/comunicacaoService', () => ({
  comunicacaoService: {
    listarComunicados: vi.fn(),
    listarDenuncias: vi.fn(),
    criarComunicado: vi.fn(),
    atualizarComunicado: vi.fn(),
    excluirComunicado: vi.fn(),
    marcarLido: vi.fn(),
    criarDenuncia: vi.fn(),
  },
}));

const comunicado = {
  id: 'c1',
  empresa_id: 'emp-1',
  titulo: 'Reunião geral',
  conteudo: 'Sexta às 10h',
  tipo: 'evento',
  prioridade: 2,
  ativo: true,
  created_at: '2026-11-10T12:00:00Z',
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ComunicacaoInternaPage />
    </QueryClientProvider>
  );
}

describe('ComunicacaoInternaPage — editar comunicado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['rh'];
    vi.mocked(comunicacaoService.listarComunicados).mockResolvedValue([comunicado] as never);
    vi.mocked(comunicacaoService.listarDenuncias).mockResolvedValue([] as never);
    vi.mocked(comunicacaoService.atualizarComunicado).mockResolvedValue({ ...comunicado } as never);
  });

  it('abre o formulário preenchido e salva via atualizarComunicado', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByText('Editar Comunicado')).toBeInTheDocument();
    const titulo = screen.getByPlaceholderText('Título do comunicado');
    expect(titulo).toHaveValue('Reunião geral');
    expect(screen.getByPlaceholderText('Escreva o comunicado...')).toHaveValue('Sexta às 10h');

    fireEvent.change(titulo, { target: { value: 'Reunião geral (adiada)' } });
    expect(screen.getByText(/pode ter sido lido/)).toBeInTheDocument();
    const salvar = screen.getByRole('button', { name: /Salvar Alterações/ });
    expect(salvar).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);

    await waitFor(() =>
      expect(comunicacaoService.atualizarComunicado).toHaveBeenCalledWith(
        'c1',
        { titulo: 'Reunião geral (adiada)', conteudo: 'Sexta às 10h', tipo: 'evento', prioridade: 2 },
        'emp-1'
      )
    );
    expect(comunicacaoService.criarComunicado).not.toHaveBeenCalled();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Comunicado atualizado!'));
  });

  it('mostra erro seguro quando a atualização falha', async () => {
    vi.mocked(comunicacaoService.atualizarComunicado).mockRejectedValue(new Error('falhou'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('não salva a edição sem a confirmação de ciência', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const salvar = screen.getByRole('button', { name: /Salvar Alterações/ });
    expect(salvar).toBeDisabled();
    fireEvent.click(salvar);

    expect(comunicacaoService.atualizarComunicado).not.toHaveBeenCalled();
  });

  it('admin também vê Editar e Excluir', async () => {
    auth.roles = ['admin'];
    renderPage();

    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo Comunicado/ })).toBeInTheDocument();
  });

  it('colaborador sem papel RH/admin não vê Novo Comunicado, Editar nem Excluir', async () => {
    auth.roles = ['user'];
    renderPage();

    expect(await screen.findByText('Reunião geral')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo Comunicado/ })).not.toBeInTheDocument();
  });
});
