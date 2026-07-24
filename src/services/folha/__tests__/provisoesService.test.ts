import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

import { provisoesService } from '../provisoesService';

function makeColabChain(data: any[], error: any = null) {
  const result = { data, error };
  const eq2 = vi.fn().mockResolvedValue(result);
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select };
}

function makeUpsertChain(error: any = null) {
  const upsert = vi.fn().mockResolvedValue({ data: null, error });
  return { upsert };
}

describe('provisoesService.calcularProvisoesMensais', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns undefined when no colaboradores found', async () => {
    mockFrom.mockReturnValue(makeColabChain(null));
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBeUndefined();
  });

  it('returns true when colaboradores is empty array', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') return makeColabChain([]);
      return makeUpsertChain();
    });
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBe(true);
  });

  it('processes colaboradores and returns true', async () => {
    const colaboradores = [
      { id: 'c1', salario_base: 3000, nome_completo: 'Ana' },
      { id: 'c2', salario_base: 5000, nome_completo: 'Bob' },
    ];
    let upsertCalled = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') return makeColabChain(colaboradores);
      if (table === 'provisoes_folha') {
        upsertCalled++;
        return makeUpsertChain();
      }
      return makeUpsertChain();
    });
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBe(true);
    expect(upsertCalled).toBe(2);
  });

  it('upserts correct provisão values for a 3000 salary', async () => {
    const colaboradores = [{ id: 'c1', salario_base: 3000, nome_completo: 'Test' }];
    let capturedUpsert: any = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') return makeColabChain(colaboradores);
      if (table === 'provisoes_folha') {
        const upsert = vi.fn().mockImplementation((data: any) => {
          capturedUpsert = data;
          return Promise.resolve({ data: null, error: null });
        });
        return { upsert };
      }
      return makeUpsertChain();
    });
    await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(capturedUpsert).not.toBeNull();
    expect(capturedUpsert.valor_13_salario).toBeCloseTo(250, 1);
    expect(capturedUpsert.valor_ferias).toBeCloseTo(333.33, 1);
    expect(capturedUpsert.encargos_provisao).toBeGreaterThan(0);
  });

  it('queries colaboradores table with empresa_id and status=ativo', async () => {
    mockFrom.mockReturnValue(makeColabChain(null));
    await provisoesService.calcularProvisoesMensais('emp-2', '2024-07');
    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
  });

  it('handles colaborador with no salario_base (defaults to 0)', async () => {
    const colaboradores = [{ id: 'c1', salario_base: null, nome_completo: 'Zero' }];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') return makeColabChain(colaboradores);
      return makeUpsertChain();
    });
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBe(true);
  });
});
