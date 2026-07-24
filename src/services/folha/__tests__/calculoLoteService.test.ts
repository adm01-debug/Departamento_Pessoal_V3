import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: { error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('sonner', () => ({ toast: { error: mockToast.error } }));

vi.mock('@/utils/folhaCalc', () => ({
  folhaCalc: {
    processar: vi.fn().mockReturnValue({
      proventos: 3000,
      descontos: 500,
      liquido: 2500,
      inss: 300,
      irrf: 150,
      fgts: 240,
      detalheEventos: [],
      horasExtras: 0,
    }),
  },
}));

vi.mock('@/utils/folha/pontoIntegracaoUtils', () => ({
  pontoIntegracaoUtils: {
    intervalToDecimal: vi.fn().mockReturnValue(0),
  },
}));

import { calculoLoteService } from '../calculoLoteService';

const colaboradoresMock = [
  {
    id: 'c1',
    nome_completo: 'Ana Silva',
    salario_base: 3000,
    dependentes: [],
    eventos_variaveis: [],
    contratos: [{ jornada_mensal: 220 }],
  },
];

function buildSupabaseChain(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    colaboradores: { data: colaboradoresMock, error: null },
    folhas_pagamento: { data: { id: 'folha-1', status: 'aberta' }, error: null },
    registros_ponto: { data: [], error: null },
    beneficios_colaborador: { data: [], error: null },
    folha_itens: { data: null, error: null },
    folha_auditoria: { data: null, error: null },
  };
  const results = { ...defaults, ...overrides };

  return (table: string) => {
    const result = results[table] ?? { data: null, error: null };
    const maybeSingle = vi.fn().mockResolvedValue(result);
    const single = vi.fn().mockResolvedValue(result);
    const upsert = vi.fn().mockResolvedValue(result);
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
      then: (fn: any) => Promise.resolve(result).then(fn),
    });
    const gte = vi.fn().mockReturnValue({ lte: vi.fn().mockResolvedValue(result) });
    const lte = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
        maybeSingle,
        gte,
        then: (fn: any) => Promise.resolve(result).then(fn),
      }),
      maybeSingle,
      gte,
      then: (fn: any) => Promise.resolve(result).then(fn),
    });
    const select = vi.fn().mockReturnValue({
      eq,
      then: (fn: any) => Promise.resolve(result).then(fn),
    });
    return { select, upsert, insert, eq };
  };
}

describe('calculoLoteService.processarLote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when no colaboradores found', async () => {
    mockFrom.mockImplementation(buildSupabaseChain({
      colaboradores: { data: [], error: null },
    }));
    await expect(
      calculoLoteService.processarLote('emp-1', '2024-07')
    ).rejects.toThrow('Nenhum colaborador ativo encontrado');
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('throws when colaboradores query returns error', async () => {
    mockFrom.mockImplementation(buildSupabaseChain({
      colaboradores: { data: null, error: new Error('DB error') },
    }));
    await expect(
      calculoLoteService.processarLote('emp-1', '2024-07')
    ).rejects.toThrow('DB error');
  });

  it('throws when folha is already fechada', async () => {
    mockFrom.mockImplementation(buildSupabaseChain({
      folhas_pagamento: { data: { id: 'f1', status: 'fechada' }, error: null },
    }));
    await expect(
      calculoLoteService.processarLote('emp-1', '2024-07')
    ).rejects.toThrow('já está fechada');
  });

  it('returns progress with success count', async () => {
    mockFrom.mockImplementation(buildSupabaseChain());
    const progress = await calculoLoteService.processarLote('emp-1', '2024-07');
    expect(progress).toBeDefined();
    expect(progress?.total).toBe(1);
    expect(progress?.success).toBe(1);
    expect(progress?.errors).toBe(0);
  });

  it('calls onProgress callback with updates', async () => {
    mockFrom.mockImplementation(buildSupabaseChain());
    const onProgress = vi.fn();
    await calculoLoteService.processarLote('emp-1', '2024-07', onProgress);
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.success).toBe(1);
  });

  it('queries colaboradores from correct empresa', async () => {
    mockFrom.mockImplementation(buildSupabaseChain());
    await calculoLoteService.processarLote('emp-42', '2024-07');
    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
  });

  it('increments errors when colaborador processing fails', async () => {
    const { folhaCalc } = await import('@/utils/folhaCalc');
    vi.mocked(folhaCalc.processar).mockImplementationOnce(() => { throw new Error('calc error'); });
    mockFrom.mockImplementation(buildSupabaseChain());
    const progress = await calculoLoteService.processarLote('emp-1', '2024-07');
    expect(progress?.errors).toBe(1);
    expect(progress?.success).toBe(0);
  });
});
