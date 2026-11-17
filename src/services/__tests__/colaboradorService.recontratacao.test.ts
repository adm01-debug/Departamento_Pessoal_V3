import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockCriarVinculoInicial } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCriarVinculoInicial: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Só o que colaboradorService.recontratar realmente chama em vinculoService —
// isola o teste de orquestração da lógica interna de vínculo (já coberta em
// vinculoService.test.ts).
vi.mock('../vinculoService', () => ({
  vinculoService: { criarVinculoInicial: mockCriarVinculoInicial },
}));

import { colaboradorService } from '../colaboradorService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('colaboradorService.recontratar', () => {
  it('exige empresaId (isolamento de tenant)', async () => {
    await expect(colaboradorService.recontratar('c1', { data_admissao: '2026-09-18' }, '')).rejects.toThrow(
      /empresa_id/i
    );
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });

  it('exige data_admissao', async () => {
    await expect(colaboradorService.recontratar('c1', { data_admissao: '' }, 'emp-1')).rejects.toThrow(/admiss/i);
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });

  it('atualiza o MESMO colaborador.id (status ativo, data_desligamento null) e cria vínculo tipo "Readmissão"', async () => {
    const atualizado = { id: 'c1', status: 'ativo', data_admissao: '2026-09-18', empresa_id: 'emp-1' };

    // BaseService.atualizar: com useVersioning, primeiro lê `version`, depois faz o update.
    const versionSingle = vi.fn().mockResolvedValue({ data: { version: 3 }, error: null });
    const versionEq = vi.fn().mockReturnValue({ single: versionSingle });
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq });

    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: atualizado, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEqVersion = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqEmpresa = vi.fn().mockReturnValue({ eq: updateEqVersion });
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqEmpresa });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqId });

    // A leitura de `version` usa .select().eq().single() direto (sem passar por `update`);
    // como ambos os caminhos compartilham o mesmo mockFrom, o `select` acima cobre a
    // leitura e `update` cobre a escrita — deepChain resolve qualquer variação de
    // encadeamento não coberta.
    mockFrom.mockImplementation(() => ({ select: versionSelect, update: updateFn }));

    const result = await colaboradorService.recontratar(
      'c1',
      { data_admissao: '2026-09-18', cargo: 'Analista', departamento: 'Financeiro', salario_base: 5000 },
      'emp-1'
    );

    expect(result).toEqual(atualizado);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ativo', data_desligamento: null, data_admissao: '2026-09-18' })
    );
    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('c1', '2026-09-18', 'Readmissão');
  });
});
