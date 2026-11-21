import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelogiosPanel } from '@/components/ponto/relogio/RelogiosPanel';
import { statusColetor } from '@/components/ponto/relogio/statusColetor';

// O painel é a única entrada de escrita dos coletores do relógio de ponto: só
// admin gera/rotaciona/revoga (RPCs SECURITY DEFINER), o token volta em claro
// uma vez e precisa aparecer no dialog. Os casos cobrem papéis, estados e as RPCs.

const { mockUseAuth, svc } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  svc: {
    listarColetores: vi.fn(),
    listarLotes: vi.fn(),
    gerarToken: vi.fn(),
    revogar: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
vi.mock('@/services/relogio/coletoresService', () => ({ coletoresService: svc }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const EMPRESA = '11111111-1111-1111-1111-111111111111';
const TOKEN = 'a'.repeat(64);

const coletor = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  empresa_id: EMPRESA,
  nome: 'PC recepção',
  unidade: 'Matriz',
  token_prefixo: 'abcd1234',
  ativo: true,
  revogado_em: null,
  ultimo_contato_em: new Date().toISOString(),
  ultima_marcacao_em: null,
  versao_coletor: '1.0.0',
  created_at: '2026-11-21T00:00:00Z',
  updated_at: '2026-11-21T00:00:00Z',
  ...over,
});

function renderPainel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RelogiosPanel empresaId={EMPRESA} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAdmin: true });
  svc.listarColetores.mockResolvedValue([coletor()]);
  svc.listarLotes.mockResolvedValue([]);
});

describe('statusColetor', () => {
  const agora = Date.parse('2026-11-21T12:00:00Z');
  it('classifica online, atrasado, nunca e revogado', () => {
    expect(statusColetor({ ativo: true, revogado_em: null, ultimo_contato_em: '2026-11-21T11:45:00Z' }, agora)).toBe(
      'online'
    );
    expect(statusColetor({ ativo: true, revogado_em: null, ultimo_contato_em: '2026-11-21T11:00:00Z' }, agora)).toBe(
      'atrasado'
    );
    expect(statusColetor({ ativo: true, revogado_em: null, ultimo_contato_em: null }, agora)).toBe('nunca');
    expect(statusColetor({ ativo: false, revogado_em: '2026-11-21T10:00:00Z', ultimo_contato_em: null }, agora)).toBe(
      'revogado'
    );
  });
});

describe('RelogiosPanel', () => {
  it('mostra carregando e depois a lista de coletores com status', async () => {
    renderPainel();
    expect(screen.getByTestId('relogio-carregando')).toBeInTheDocument();
    expect(await screen.findByText('Matriz')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('abcd1234…')).toBeInTheDocument();
    expect(svc.listarColetores).toHaveBeenCalledWith(EMPRESA);
  });

  it('mostra estado vazio', async () => {
    svc.listarColetores.mockResolvedValue([]);
    renderPainel();
    expect(await screen.findByTestId('relogio-coletores-vazio')).toBeInTheDocument();
  });

  it('mostra erro com tentar de novo', async () => {
    svc.listarColetores.mockRejectedValue(new Error('permission denied'));
    renderPainel();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('permission denied');
    svc.listarColetores.mockResolvedValue([coletor()]);
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar de novo/i }));
    expect(await screen.findByText('Matriz')).toBeInTheDocument();
  });

  it('esconde as ações de quem não é admin', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    renderPainel();
    await screen.findByText('Matriz');
    expect(screen.queryByRole('button', { name: /novo coletor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revogar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar novo token/i })).not.toBeInTheDocument();
  });

  it('novo coletor: chama a RPC e mostra o token devolvido uma vez', async () => {
    svc.gerarToken.mockResolvedValue({ dispositivo_id: 'd2', token: TOKEN });
    renderPainel();
    await screen.findByText('Matriz');
    await userEvent.click(screen.getByRole('button', { name: /novo coletor/i }));
    await userEvent.type(screen.getByLabelText('Unidade'), 'Filial');
    await userEvent.type(screen.getByLabelText('Nome'), 'PC filial');
    await userEvent.click(screen.getByRole('button', { name: /gerar token/i }));
    await waitFor(() => expect(svc.gerarToken).toHaveBeenCalledWith(EMPRESA, 'Filial', 'PC filial'));
    expect(await screen.findByTestId('relogio-token')).toHaveTextContent(TOKEN);
    expect(screen.getByText(/não será mostrado de novo/i)).toBeInTheDocument();
  });

  it('gerar novo token pede confirmação e rotaciona a mesma unidade', async () => {
    svc.gerarToken.mockResolvedValue({ dispositivo_id: 'd1', token: TOKEN });
    renderPainel();
    await screen.findByText('Matriz');
    await userEvent.click(screen.getByRole('button', { name: /gerar novo token/i }));
    expect(screen.getByText(/para de enviar até ser reconfigurado/i)).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /gerar novo token/i }));
    await waitFor(() => expect(svc.gerarToken).toHaveBeenCalledWith(EMPRESA, 'Matriz', 'PC recepção'));
    expect(await screen.findByTestId('relogio-token')).toHaveTextContent(TOKEN);
  });

  it('revogar pede confirmação e chama a RPC com o id do coletor', async () => {
    svc.revogar.mockResolvedValue(undefined);
    renderPainel();
    await screen.findByText('Matriz');
    await userEvent.click(screen.getByRole('button', { name: /^revogar$/i }));
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^revogar$/i }));
    await waitFor(() => expect(svc.revogar).toHaveBeenCalledWith('d1'));
  });

  it('aba Envios lista os lotes', async () => {
    svc.listarLotes.mockResolvedValue([
      {
        id: 'l1',
        dispositivo_id: 'd1',
        empresa_id: EMPRESA,
        recebido_em: '2026-11-21T10:00:00Z',
        periodo_inicio: '2026-11-01',
        periodo_fim: '2026-11-20',
        total_funcionarios: 12,
        total_dias: 240,
        dias_alterados: 7,
        status: 'erro',
        mensagem_erro: 'falha X',
        hash_sha256: null,
        dispositivo: { unidade: 'Matriz', nome: 'PC recepção' },
      },
    ]);
    renderPainel();
    await screen.findByText('Matriz');
    await userEvent.click(screen.getByRole('tab', { name: 'Envios' }));
    expect(await screen.findByText('01/11/2026 a 20/11/2026')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('falha X')).toBeInTheDocument();
    expect(svc.listarLotes).toHaveBeenCalledWith(EMPRESA);
  });

  it('aba Envios mostra vazio', async () => {
    renderPainel();
    await screen.findByText('Matriz');
    await userEvent.click(screen.getByRole('tab', { name: 'Envios' }));
    expect(await screen.findByTestId('relogio-envios-vazio')).toBeInTheDocument();
  });
});
