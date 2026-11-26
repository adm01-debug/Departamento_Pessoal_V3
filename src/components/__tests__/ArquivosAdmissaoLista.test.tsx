import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

const { listar, from, createSignedUrl } = vi.hoisted(() => ({
  listar: vi.fn(),
  from: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/services/tabelas', () => ({
  documentosAdmissaoService: { listar },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from } },
}));

import { ArquivosAdmissaoLista } from '../admissoes/ArquivosAdmissaoLista';

const render = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: wrap });
};

const arquivo = {
  id: 'doc-1',
  admissao_id: 'adm-1',
  tipo: 'cpf',
  nome_arquivo: 'cpf.pdf',
  tamanho_bytes: 2048,
  url: 'admissao_adm-1/cpf_123.pdf',
  validado: false,
  validado_em: null,
  validado_por: null,
  observacoes: null,
  substituido_em: null,
  created_at: '2026-11-26T10:00:00Z',
  updated_at: '2026-11-26T10:00:00Z',
};

describe('ArquivosAdmissaoLista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listar.mockResolvedValue([]);
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://exemplo/signed' }, error: null });
    from.mockReturnValue({ createSignedUrl });
  });

  it('avisa quando o candidato ainda não enviou nada', async () => {
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);
    expect(await screen.findByText(/Nenhum arquivo enviado pelo candidato ainda/i)).toBeTruthy();
    expect(listar).toHaveBeenCalledWith('adm-1');
  });

  it('lista o anexo com rótulo humano e nome do arquivo', async () => {
    listar.mockResolvedValue([arquivo]);
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);
    expect(await screen.findByText('CPF')).toBeTruthy();
    expect(screen.getByText(/cpf\.pdf/)).toBeTruthy();
  });

  it('abre o anexo em aba criada no clique, com URL assinada', async () => {
    listar.mockResolvedValue([arquivo]);
    const janela = { opener: {}, location: { replace: vi.fn() } };
    const open = vi.spyOn(window, 'open').mockImplementation(() => janela as unknown as Window);
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Abrir/i }));

    await waitFor(() => {
      expect(from).toHaveBeenCalledWith('documentos');
      expect(createSignedUrl).toHaveBeenCalledWith('admissao_adm-1/cpf_123.pdf', 300);
      expect(janela.location.replace).toHaveBeenCalledWith('https://exemplo/signed');
    });
    expect(janela.opener).toBeNull();
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    open.mockRestore();
  });

  it('oferece link real quando o navegador bloqueia a nova aba', async () => {
    listar.mockResolvedValue([arquivo]);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Abrir/i }));

    const link = await screen.findByRole('link', { name: /Abrir arquivo/i });
    expect(link.getAttribute('href')).toBe('https://exemplo/signed');
    expect(link.getAttribute('target')).toBe('_blank');
    open.mockRestore();
  });

  it('distingue falha de consulta de lista vazia', async () => {
    listar.mockRejectedValue(new Error('sem permissão'));
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    expect(await screen.findByText(/Não foi possível carregar os anexos/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar de novo/i })).toBeTruthy();
    expect(screen.queryByText(/Nenhum arquivo enviado/i)).toBeNull();
  });

  it('não quebra com tipo herdado do protótipo', async () => {
    listar.mockResolvedValue([{ ...arquivo, tipo: 'constructor' }]);
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    expect(await screen.findByText('constructor')).toBeTruthy();
  });

  it('explica a falha quando a URL assinada não vem', async () => {
    listar.mockResolvedValue([arquivo]);
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('denied') });
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Abrir/i }));

    expect(await screen.findByText(/Não foi possível abrir o arquivo/i)).toBeTruthy();
  });

  it('marca a versão antiga como substituída e deixa a vigente na frente', async () => {
    listar.mockResolvedValue([
      {
        ...arquivo,
        id: 'doc-antigo',
        nome_arquivo: 'cpf-antigo.pdf',
        substituido_em: '2026-11-26T11:00:00Z',
      },
      { ...arquivo, id: 'doc-novo', nome_arquivo: 'cpf-novo.pdf' },
    ]);
    render(<ArquivosAdmissaoLista admissaoId="adm-1" />);

    await screen.findByText('substituído');
    const nomes = screen
      .getAllByText(/cpf-(antigo|novo)\.pdf/)
      .map((n) => n.textContent?.split(' · ')[0]);
    expect(nomes).toEqual(['cpf-novo.pdf', 'cpf-antigo.pdf']);
  });
});