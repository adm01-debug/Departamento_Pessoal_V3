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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
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
function buildListarChain(result: { data: unknown[] | null; error: unknown }): ChainSpy {
  const range = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ range }));
  const eq = vi.fn(() => ({ order, range }));
  const select = vi.fn(() => ({ eq, order, range }));
  const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
  from.mockReturnValue({ select });
  return { from, select, eq, order, range };
}

describe('despesaService.listar — isolamento multi-tenant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lança erro quando empresaId é string vazia (multi-tenant guard)', async () => {
    await expect(despesaService.listar('')).rejects.toThrow(/empresaId é obrigatório/i);
    // Nenhuma query deve ter sido disparada
    expect((supabase.from as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('lança erro quando empresaId é undefined (via bypass de tipo)', async () => {
    await expect(
      (despesaService.listar as unknown as (id?: string) => Promise<unknown[]>)(undefined)
    ).rejects.toThrow(/empresaId é obrigatório/i);
    expect((supabase.from as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('lança erro quando empresaId é null (via bypass de tipo)', async () => {
    await expect(
      (despesaService.listar as unknown as (id: unknown) => Promise<unknown[]>)(null)
    ).rejects.toThrow(/empresaId é obrigatório/i);
    expect((supabase.from as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
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
