import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockToast, mockItemUpsert, mockFolhaUpdate, mockIn } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: { error: vi.fn() },
  mockItemUpsert: vi.fn(),
  mockFolhaUpdate: vi.fn(),
  mockIn: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
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

import { calculoLoteService, COLABORADOR_FOLHA_SELECT, EVENTO_VARIAVEL_SELECT } from '../calculoLoteService';

const colaboradoresMock = [
  {
    id: 'c1',
    nome_completo: 'Ana Silva',
    salario_base: 3000,
    jornada_horas_mensais: '220',
    dependentes: [],
  },
];

function buildSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    colaboradores: { data: colaboradoresMock, error: null },
    folhas_pagamento: { data: { id: 'folha-1', status: 'aberta' }, error: null },
    registros_ponto: { data: [], error: null },
    beneficios_colaborador: { data: [], error: null },
    eventos_variaveis: { data: [], error: null },
    folha_itens: { data: null, error: null },
    folha_itens_select: { data: [], error: null },
    folha_auditoria: { data: null, error: null },
  };
  const results = { ...defaults, ...overrides };

  return (table: string) => {
    const writeResult = results[table] ?? { data: null, error: null };
    // folha_itens é gravado (upsert) e depois lido para somar os totais.
    const result = table === 'folha_itens' ? results.folha_itens_select : writeResult;
    const maybeSingle = vi.fn().mockResolvedValue(result);
    const single = vi.fn().mockResolvedValue(result);
    const upsert =
      table === 'folha_itens' ? mockItemUpsert.mockResolvedValue(writeResult) : vi.fn().mockResolvedValue(writeResult);
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
      then: (fn: (v?: unknown) => unknown) => Promise.resolve(writeResult).then(fn),
    });
    const update =
      table === 'folhas_pagamento'
        ? mockFolhaUpdate.mockReturnValue({
            eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          })
        : vi.fn();
    const gte = vi.fn().mockReturnValue({ lte: vi.fn().mockResolvedValue(result) });
    const lte = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
        maybeSingle,
        gte,
        then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
      }),
      maybeSingle,
      gte,
      in: mockIn.mockResolvedValue(result),
      then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
    });
    const select = vi.fn().mockReturnValue({
      eq,
      then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
    });
    return { select, upsert, insert, update, eq };
  };
}

describe('calculoLoteService.processarLote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa somente relações existentes e lê jornada do colaborador canônico', () => {
    expect(COLABORADOR_FOLHA_SELECT).not.toContain('contratos_trabalho');
    // dependentes não tem coluna `tipo` e eventos_variaveis não tem codigo/descricao/tipo
    // (vêm da rubrica): o embed antigo dava 42703 e derrubava o lote inteiro.
    expect(COLABORADOR_FOLHA_SELECT).not.toContain('eventos_variaveis');
    expect(COLABORADOR_FOLHA_SELECT).toContain('dependentes (id, para_irrf)');
    expect(EVENTO_VARIAVEL_SELECT).toContain('rubrica:rubricas_folha(codigo, descricao, tipo)');
  });

  it('aplica eventos variáveis da competência via rubrica e dependentes de IRRF', async () => {
    const { folhaCalc } = await import('@/utils/folhaCalc');
    mockFrom.mockImplementation(
      buildSupabaseChain({
        colaboradores: {
          data: [
            {
              ...colaboradoresMock[0],
              dependentes: [
                { id: 'd1', para_irrf: true },
                { id: 'd2', para_irrf: false },
              ],
            },
          ],
          error: null,
        },
        eventos_variaveis: {
          data: [
            {
              colaborador_id: 'c1',
              valor: '150.5',
              rubrica: { codigo: '1010', descricao: 'Comissão', tipo: 'provento' },
            },
            { colaborador_id: 'c1', valor: 99, rubrica: { codigo: '9000', descricao: 'Base', tipo: 'informativo' } },
            { colaborador_id: 'outro', valor: 10, rubrica: { codigo: '5100', descricao: 'Multa', tipo: 'desconto' } },
          ],
          error: null,
        },
      })
    );

    await calculoLoteService.processarLote('emp-1', '2024-07');

    expect(mockIn).toHaveBeenCalledWith('competencia', ['2024-07', '2024-07-01']);
    expect(folhaCalc.processar).toHaveBeenCalledWith(
      3000,
      expect.objectContaining({
        dependentes: 1,
        eventos: [{ codigo: '1010', descricao: 'Comissão', tipo: 'provento', valor: 150.5 }],
      })
    );
  });

  it('grava no cabeçalho os totais somados dos itens, só com a folha aberta', async () => {
    mockFrom.mockImplementation(
      buildSupabaseChain({
        folha_itens_select: {
          data: [
            { total_proventos: 3000, total_descontos: 500.1, total_liquido: 2499.9, fgts_mes: 240 },
            { total_proventos: 1000.2, total_descontos: 100, total_liquido: 900.2, fgts_mes: 80.02 },
          ],
          error: null,
        },
      })
    );

    await calculoLoteService.processarLote('emp-1', '2024-07');

    expect(mockFolhaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        total_proventos: 4000.2,
        total_descontos: 600.1,
        total_liquido: 3400.1,
        total_fgts: 320.02,
        total_colaboradores: 2,
      })
    );
    const eqId = mockFolhaUpdate.mock.results[0].value.eq;
    expect(eqId).toHaveBeenCalledWith('id', 'folha-1');
    expect(eqId.mock.results[0].value.eq).toHaveBeenCalledWith('status', 'aberta');
  });

  it('throws when no colaboradores found', async () => {
    mockFrom.mockImplementation(
      buildSupabaseChain({
        colaboradores: { data: [], error: null },
      })
    );
    await expect(calculoLoteService.processarLote('emp-1', '2024-07')).rejects.toThrow(
      'Nenhum colaborador ativo encontrado'
    );
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('throws when colaboradores query returns error', async () => {
    mockFrom.mockImplementation(
      buildSupabaseChain({
        colaboradores: { data: null, error: new Error('DB error') },
      })
    );
    await expect(calculoLoteService.processarLote('emp-1', '2024-07')).rejects.toThrow('DB error');
  });

  it('throws when folha is already fechada', async () => {
    mockFrom.mockImplementation(
      buildSupabaseChain({
        folhas_pagamento: { data: { id: 'f1', status: 'fechada' }, error: null },
      })
    );
    await expect(calculoLoteService.processarLote('emp-1', '2024-07')).rejects.toThrow('já está fechada');
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
    vi.mocked(folhaCalc.processar).mockImplementationOnce(() => {
      throw new Error('calc error');
    });
    mockFrom.mockImplementation(buildSupabaseChain());
    const progress = await calculoLoteService.processarLote('emp-1', '2024-07');
    expect(progress?.errors).toBe(1);
    expect(progress?.success).toBe(0);
  });

  it('counts an item upsert failure as an error instead of reporting false success', async () => {
    mockFrom.mockImplementation(
      buildSupabaseChain({
        folha_itens: { data: null, error: new Error('unique constraint missing') },
      })
    );
    const progress = await calculoLoteService.processarLote('emp-1', '2024-07');
    expect(progress?.errors).toBe(1);
    expect(progress?.success).toBe(0);
  });

  it('uses the folha/colaborador compound conflict target for batch item writes', async () => {
    mockFrom.mockImplementation(buildSupabaseChain());

    await calculoLoteService.processarLote('emp-1', '2024-07');

    expect(mockItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ folha_id: 'folha-1', colaborador_id: 'c1' }),
      { onConflict: 'folha_id,colaborador_id' }
    );
  });
});
