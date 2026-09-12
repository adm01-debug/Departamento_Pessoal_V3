import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

import { calcularAliquotaEncargosProvisao, calcularProvisaoColaborador, provisoesService } from '../provisoesService';

const lucroReal = {
  regime_tributario: 'lucro_real' as const,
  rat: 0.02,
  fap: 1,
  terceiros: 0.058,
  simples_anexo: null,
  aliquota_encargos_folha: null,
};

function makeColabChain(data: any[] | null, error: any = null) {
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

function makeEmpresaChain(data: any = lucroReal, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

describe('provisoesService.calcularProvisoesMensais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => (table === 'empresas' ? makeEmpresaChain() : makeColabChain(null)));
  });

  it('returns undefined when no colaboradores found', async () => {
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBeUndefined();
  });

  it('returns true when colaboradores is empty array', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'empresas') return makeEmpresaChain();
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
      if (table === 'empresas') return makeEmpresaChain();
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
      if (table === 'empresas') return makeEmpresaChain();
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
    expect(capturedUpsert.encargos_provisao).toBe(208.83);
    expect(capturedUpsert.valor_total).toBe(792.16);
  });

  it('queries colaboradores table with empresa_id and status=ativo', async () => {
    await provisoesService.calcularProvisoesMensais('emp-2', '2024-07');
    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
  });

  it('handles colaborador with no salario_base (defaults to 0)', async () => {
    const colaboradores = [{ id: 'c1', salario_base: null, nome_completo: 'Zero' }];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'empresas') return makeEmpresaChain();
      if (table === 'colaboradores') return makeColabChain(colaboradores);
      return makeUpsertChain();
    });
    const result = await provisoesService.calcularProvisoesMensais('emp-1', '2024-07');
    expect(result).toBe(true);
  });

  it('derives charges from the company tax regime and RAT × FAP configuration', () => {
    expect(calcularAliquotaEncargosProvisao(lucroReal)).toBeCloseTo(0.358, 6);
    expect(calcularAliquotaEncargosProvisao({ ...lucroReal, rat: 0.03, fap: 1.5 })).toBeCloseTo(0.383, 6);
    expect(
      calcularAliquotaEncargosProvisao({
        ...lucroReal,
        regime_tributario: 'simples_nacional',
        simples_anexo: 'III',
      })
    ).toBe(0.08);
    expect(
      calcularAliquotaEncargosProvisao({
        ...lucroReal,
        regime_tributario: 'simples_nacional',
        simples_anexo: 'IV',
      })
    ).toBeCloseTo(0.3, 6);
    expect(calcularAliquotaEncargosProvisao({ ...lucroReal, regime_tributario: 'mei' })).toBe(0.11);
    expect(calcularAliquotaEncargosProvisao({ ...lucroReal, aliquota_encargos_folha: 0.3125 })).toBe(0.3125);
    expect(() =>
      calcularAliquotaEncargosProvisao({
        ...lucroReal,
        regime_tributario: 'simples_nacional',
        simples_anexo: null,
      })
    ).toThrow('Anexo do Simples Nacional');
  });

  it('uses the supplied effective company rate in collaborator provisions', () => {
    const values = calcularProvisaoColaborador(3000, 0.08);
    expect(values.encargos_provisao).toBe(46.67);
    expect(values.valor_total).toBe(630);
  });

  it('fails closed when the company tax configuration is absent or invalid', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'empresas' ? makeEmpresaChain(null) : makeColabChain([])
    );
    await expect(provisoesService.calcularProvisoesMensais('emp-1', '2026-09')).rejects.toThrow(
      'Configuração tributária da empresa não encontrada'
    );
    expect(() => calcularAliquotaEncargosProvisao({ ...lucroReal, rat: 2 })).toThrow('RAT');
    expect(() => calcularAliquotaEncargosProvisao({ ...lucroReal, rat: 0.031 })).toThrow('RAT');
    expect(() => calcularAliquotaEncargosProvisao({ ...lucroReal, terceiros: 0.201 })).toThrow('Terceiros');
  });
});
