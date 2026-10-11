import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'emp-1' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useNotificacoes } from '../useNotificacoes';

function buildSelectChain(data: unknown = []) {
  const response = { data, error: null };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn);
  mockFrom.mockReturnValue(chain);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSelectChain([]);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns empty notificacoes initially', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notificacoes).toEqual([]);
  });

  it('naoLidas count is 0 when all notificacoes are read', async () => {
    buildSelectChain([
      { id: 'n1', lida: true, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: true, tipo: 'contrato_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.naoLidas).toBe(0);
  });

  it('naoLidas counts unread notificacoes', async () => {
    buildSelectChain([
      { id: 'n1', lida: false, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: true, tipo: 'contrato_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.naoLidas).toBe(1);
  });

  it('porTipo counts unread by type', async () => {
    buildSelectChain([
      { id: 'n1', lida: false, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: false, tipo: 'contrato_vencendo' },
      { id: 'n3', lida: true, tipo: 'ferias_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.porTipo.ferias_vencendo).toBe(1);
    expect(result.current.porTipo.contrato_vencendo).toBe(1);
  });

  it('queries notificacoes table with empresa_id', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('notificacoes');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('criarNotificacao calls supabase insert', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: insertFn,
        then: (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).catch(fn),
        finally: (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).finally(fn),
      };
      return chain;
    });

    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.criarNotificacao({
        tipo: 'ferias_aprovada',
        titulo: 'Férias Aprovadas',
        mensagem: 'Suas férias foram aprovadas',
        entidade_id: 'f1',
        entidade_tipo: 'ferias',
      });
    });

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'ferias_aprovada', lida: false }));
  });

  describe('mutations simples', () => {
    function buildMutationChain() {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.delete = vi.fn().mockReturnValue(chain);
      chain.lt = vi.fn().mockReturnValue(chain);
      chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn);
      mockFrom.mockReturnValue(chain);
      return chain;
    }

    it('marcarComoLida faz update lida=true no id e empresa', async () => {
      const chain = buildMutationChain();
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.marcarComoLida('n1');
      });
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ lida: true }));
      expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
      expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    });

    it('marcarTodasComoLidas filtra lida=false', async () => {
      const chain = buildMutationChain();
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.marcarTodasComoLidas();
      });
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ lida: true }));
      expect(chain.eq).toHaveBeenCalledWith('lida', false);
    });

    it('excluirNotificacao deleta por id e empresa', async () => {
      const chain = buildMutationChain();
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.excluirNotificacao('n9');
      });
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'n9');
    });

    it('limparAntigas deleta registros anteriores a ~30 dias', async () => {
      const chain = buildMutationChain();
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.limparAntigas();
      });
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.lt).toHaveBeenCalledWith('created_at', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
      expect(chain.eq).toHaveBeenCalledWith('lida', true);
    });
  });

  describe('gerarNotificacoesAutomaticas', () => {
    // Encadeamento por tabela: periodos_aquisitivos, colaboradores (2 buscas
    // distintas), ferias e notificacoes (dedup + insert final).
    function setupGeracao(opts: {
      periodos?: unknown[];
      contratos?: unknown[];
      cnh?: unknown[];
      ferias?: unknown[];
      existente?: unknown;
    }) {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const resolve = (data: unknown) => ({ data, error: null });
      const makeList = (rows: unknown[]) => {
        const c: Record<string, unknown> = {};
        c.select = vi.fn().mockReturnValue(c);
        c.eq = vi.fn().mockReturnValue(c);
        c.in = vi.fn().mockReturnValue(c);
        c.not = vi.fn().mockReturnValue(c);
        c.then = (fn: (v?: unknown) => unknown) => Promise.resolve(resolve(rows)).then(fn);
        return c;
      };
      const notifChain: Record<string, unknown> = {};
      notifChain.select = vi.fn().mockReturnValue(notifChain);
      notifChain.eq = vi.fn().mockReturnValue(notifChain);
      notifChain.maybeSingle = vi.fn().mockResolvedValue({ data: opts.existente ?? null, error: null });
      notifChain.insert = insertFn;

      const periodoList = makeList(opts.periodos ?? []);
      const contratoList = makeList(opts.contratos ?? []);
      const cnhList = makeList(opts.cnh ?? []);
      const feriasList = makeList(opts.ferias ?? []);
      let colabCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'periodos_aquisitivos') return periodoList;
        if (table === 'colaboradores') {
          colabCalls += 1;
          return colabCalls === 1 ? contratoList : cnhList;
        }
        if (table === 'ferias') return feriasList;
        return notifChain;
      });
      return { insertFn };
    }

    const addDaysIso = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    it('gera notificações nos 4 grupos e insere uma única vez', async () => {
      const { insertFn } = setupGeracao({
        periodos: [
          {
            id: 'p1',
            data_fim: addDaysIso(-335), // concessivo termina em ~30 dias
            colaboradores: { id: 'c1', nome_completo: 'Ana', status: 'ativo', empresa_id: 'emp-1' },
          },
        ],
        contratos: [{ id: 'c2', nome_completo: 'Beto', tipo_contrato: 'temporario', data_admissao: addDaysIso(-160) }],
        cnh: [{ id: 'c3', nome_completo: 'Caio', cnh_validade: addDaysIso(15) }],
        ferias: [
          {
            id: 'f1',
            data_inicio: addDaysIso(3),
            status: 'aprovada',
            colaboradores: { id: 'c4', nome_completo: 'Duda' },
          },
        ],
      });

      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.gerarNotificacoesAutomaticas(undefined, {});
      });
      await waitFor(() => expect(insertFn).toHaveBeenCalled());

      const payload = insertFn.mock.calls[0][0] as Array<{ tipo: string; entidade_id: string; lida: boolean }>;
      expect(payload).toHaveLength(4);
      expect(payload.map((n) => n.tipo).sort()).toEqual(
        ['contrato_vencendo', 'documento_vencendo', 'ferias_vencendo', 'periodo_aquisitivo'].sort()
      );
      expect(payload.every((n) => n.lida === false)).toBe(true);
    });

    it('deduplica: notificação existente não é recriada e nada é inserido', async () => {
      const { insertFn } = setupGeracao({
        existente: { id: 'n-existente' },
        periodos: [
          {
            id: 'p1',
            data_fim: addDaysIso(-335),
            colaboradores: { id: 'c1', nome_completo: 'Ana', status: 'ativo', empresa_id: 'emp-1' },
          },
        ],
      });
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.gerarNotificacoesAutomaticas(undefined, {});
      });
      // dedup pegou o único candidato → nada a inserir → insert nunca chamado
      await new Promise((r) => setTimeout(r, 50));
      expect(insertFn).not.toHaveBeenCalled();
    });

    it('ignora candidatos fora da janela (férias >60d concessivo não notifica)', async () => {
      const { insertFn } = setupGeracao({
        periodos: [
          {
            id: 'p1',
            data_fim: addDaysIso(-100), // concessivo ainda falta ~265 dias
            colaboradores: { id: 'c1', nome_completo: 'Ana', status: 'ativo', empresa_id: 'emp-1' },
          },
          {
            id: 'p2',
            data_fim: addDaysIso(-335),
            colaboradores: { id: 'c2', nome_completo: 'Inativo', status: 'desligado', empresa_id: 'emp-1' },
          },
        ],
      });
      const { result } = renderHook(() => useNotificacoes(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.gerarNotificacoesAutomaticas(undefined, {});
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(insertFn).not.toHaveBeenCalled();
    });
  });
});
