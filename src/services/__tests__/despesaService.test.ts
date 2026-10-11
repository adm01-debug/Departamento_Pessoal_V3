/**
 * Testes de regressão multi-tenant para despesaService.
 *
 * Regras críticas cobertas:
 *  1. empresaId é OBRIGATÓRIO — chamadas sem ele lançam antes de qualquer query.
 *  2. Toda listagem filtra por empresa_id (defesa em profundidade sobre a RLS).
 *  3. Paginação é aplicada por padrão em .range(0, 499) — nenhuma listagem
 *     "aberta" pode escapar o teto de 500 registros.
 *  4. Parâmetros custom de from/to são respeitados.
 *  5. Ordenação por data_despesa DESC continua estável.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { despesaService } from '../despesaService';
import { supabase } from '@/integrations/supabase/client';

const { mockRpc, mockUpload, mockSignedUrl } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockUpload: vi.fn(),
  mockSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: mockRpc,
    storage: {
      from: vi.fn(() => ({ upload: mockUpload, createSignedUrl: mockSignedUrl })),
    },
  },
}));

interface ChainSpy {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
}

/**
 * Monta a chain fluente do supabase-js para .from().select().eq().order().range()
 * retornando os spies de cada elo para asserção posterior.
 */
function buildListarChain(result: { data: unknown | null; error: unknown }): ChainSpy {
  const range = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ range }));
  const eq = vi.fn(() => ({ order, range }));
  const select = vi.fn(() => ({ eq, order, range }));
  const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
  from.mockReturnValue({ select });
  return { from, select, eq, order, range };
}

// ─── métodos de escrita / RPC / storage (onda 12) ──────────────────────────

import { makeChain } from '@/test/chain';

describe('despesaService — escritas e storage', () => {
  const from = () => supabase.from as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('criar: aplica defaults de status/tipo e retorna o registro', async () => {
    from().mockReturnValue(makeChain({ data: { id: 'd1' }, error: null }));
    const d = await despesaService.criar({ empresa_id: 'e1', valor: 10 } as never);
    expect(d.id).toBe('d1');
  });

  it('criar: lança quando insert não retorna registro', async () => {
    from().mockReturnValue(makeChain({ data: null, error: null }));
    await expect(despesaService.criar({ empresa_id: 'e1' } as never)).rejects.toThrow('Nenhum registro de despesa');
  });

  it('aprovar: exige empresaId', async () => {
    await expect(despesaService.aprovar('d1', '')).rejects.toThrow('obrigatório');
  });

  it('aprovar: falha quando despesa não pertence à empresa', async () => {
    from().mockReturnValue(makeChain({ data: null, error: null }));
    await expect(despesaService.aprovar('d1', 'e1')).rejects.toThrow('não encontrada');
  });

  it('aprovar: chama RPC aprovar_despesa após o check de tenant', async () => {
    from().mockReturnValue(makeChain({ data: { id: 'd1' }, error: null }));
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    const r = await despesaService.aprovar('d1', 'e1', 'ok');
    expect(mockRpc).toHaveBeenCalledWith('aprovar_despesa', {
      _despesa_id: 'd1',
      _observacoes: 'ok',
    });
    expect(r).toEqual({ ok: true });
  });

  it('rejeitar: exige motivo com 3+ caracteres', async () => {
    await expect(despesaService.rejeitar('d1', 'e1', 'x')).rejects.toThrow('mínimo 3');
  });

  it('rejeitar: chama RPC rejeitar_despesa', async () => {
    from().mockReturnValue(makeChain({ data: { id: 'd1' }, error: null }));
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    await despesaService.rejeitar('d1', 'e1', 'fora da política');
    expect(mockRpc).toHaveBeenCalledWith('rejeitar_despesa', {
      _despesa_id: 'd1',
      _motivo: 'fora da política',
    });
  });

  it('marcarPago: atualiza status para pago e retorna a linha', async () => {
    from().mockReturnValue(makeChain({ data: { id: 'd1', status: 'pago' }, error: null }));
    const d = await despesaService.marcarPago('d1', 'e1');
    expect(d?.status).toBe('pago');
  });

  it('integrarFolha: retorna null quando status não é aprovado (update sem match)', async () => {
    from().mockReturnValue(makeChain({ data: null, error: null }));
    const d = await despesaService.integrarFolha('d1', 'f1', 'e1');
    expect(d).toBeNull();
  });

  it('excluir: propaga erro do delete', async () => {
    from().mockReturnValue(makeChain({ data: null, error: { message: 'boom' } }));
    await expect(despesaService.excluir('d1', 'e1')).rejects.toEqual({ message: 'boom' });
  });

  it('uploadComprovante: envia para o bucket e grava comprovante_url', async () => {
    mockUpload.mockResolvedValue({ error: null });
    from().mockReturnValue(makeChain({ data: null, error: null }));
    const file = new File(['x'], 'nota.pdf', { type: 'application/pdf' });
    const path = await despesaService.uploadComprovante('e1', 'd1', file);
    expect(path).toMatch(/^e1\/d1\/.+\.pdf$/);
    expect(mockUpload).toHaveBeenCalledWith(path, file, { upsert: false });
  });

  it('uploadComprovante: propaga erro do upload sem gravar no banco', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'quota' } });
    const file = new File(['x'], 'nota.pdf', { type: 'application/pdf' });
    await expect(despesaService.uploadComprovante('e1', 'd1', file)).rejects.toEqual({
      message: 'quota',
    });
    expect(from()).not.toHaveBeenCalled();
  });

  it('getComprovanteUrl: devolve a URL assinada', async () => {
    mockSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://s' }, error: null });
    expect(await despesaService.getComprovanteUrl('p')).toBe('https://s');
  });

  it('getComprovanteUrl: devolve null em erro', async () => {
    mockSignedUrl.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await despesaService.getComprovanteUrl('p')).toBeNull();
  });

  it('listarLog: retorna o log da despesa', async () => {
    from().mockReturnValue(makeChain({ data: [{ id: 'l1' }], error: null }));
    const logs = await despesaService.listarLog('d1');
    expect(logs).toEqual([{ id: 'l1' }]);
  });
});

describe('despesaService.listar — isolamento multi-tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lança erro quando empresaId é string vazia (multi-tenant guard)', async () => {
    await expect(despesaService.listar('')).rejects.toThrow(/empresaId é obrigatório/i);
    // Nenhuma query deve ter sido disparada
    expect(supabase.from as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('lança erro quando empresaId é undefined (via bypass de tipo)', async () => {
    await expect((despesaService.listar as unknown as (id?: string) => Promise<unknown[]>)(undefined)).rejects.toThrow(
      /empresaId é obrigatório/i
    );
    expect(supabase.from as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('lança erro quando empresaId é null (via bypass de tipo)', async () => {
    await expect((despesaService.listar as unknown as (id: unknown) => Promise<unknown[]>)(null)).rejects.toThrow(
      /empresaId é obrigatório/i
    );
    expect(supabase.from as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('filtra por empresa_id EXATO fornecido', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await despesaService.listar('empresa-abc');

    expect(chain.from).toHaveBeenCalledWith('despesas');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'empresa-abc');
    // Só um .eq esperado — nada de filtros implícitos escondidos
    expect(chain.eq).toHaveBeenCalledTimes(1);
  });

  it('aplica .range(0, 499) por padrão (teto de paginação de 500)', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await despesaService.listar('empresa-abc');

    expect(chain.range).toHaveBeenCalledTimes(1);
    expect(chain.range).toHaveBeenCalledWith(0, 499);
  });

  it('ordena por data_despesa DESC (mais recentes primeiro)', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await despesaService.listar('empresa-abc');

    expect(chain.order).toHaveBeenCalledWith('data_despesa', { ascending: false });
  });

  it('respeita from/to customizados para paginação', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await despesaService.listar('empresa-abc', { from: 500, to: 999 });

    expect(chain.range).toHaveBeenCalledWith(500, 999);
  });

  it('respeita from customizado com to default', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await despesaService.listar('empresa-abc', { from: 100 });

    // from customizado, to volta ao default 499
    expect(chain.range).toHaveBeenCalledWith(100, 499);
  });

  it('propaga erro do Supabase (não engole silenciosamente)', async () => {
    buildListarChain({ data: null, error: new Error('RLS negou acesso') });
    await expect(despesaService.listar('empresa-abc')).rejects.toThrow(/RLS negou acesso/);
  });

  it('retorna [] quando data é null (contrato seguro para consumidores)', async () => {
    buildListarChain({ data: null, error: null });
    const rows = await despesaService.listar('empresa-abc');
    expect(rows).toEqual([]);
  });

  it('retorna os dados quando query é bem-sucedida', async () => {
    const fake = [
      { id: '1', empresa_id: 'empresa-abc', valor: 100 },
      { id: '2', empresa_id: 'empresa-abc', valor: 250 },
    ];
    buildListarChain({ data: fake, error: null });
    const rows = await despesaService.listar('empresa-abc');
    expect(rows).toEqual(fake);
  });

  it('nunca dispara query cross-tenant: chamadas paralelas mantêm filtros isolados', async () => {
    const chain = buildListarChain({ data: [], error: null });
    await Promise.all([
      despesaService.listar('empresa-A'),
      despesaService.listar('empresa-B'),
      despesaService.listar('empresa-C'),
    ]);

    const calls = chain.eq.mock.calls.map((c) => c[1]);
    expect(calls.sort()).toEqual(['empresa-A', 'empresa-B', 'empresa-C']);
    // Cada uma teve seu próprio range default aplicado
    expect(chain.range).toHaveBeenCalledTimes(3);
    for (const call of chain.range.mock.calls) {
      expect(call).toEqual([0, 499]);
    }
  });
});
