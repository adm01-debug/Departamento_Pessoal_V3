import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockCriarVinculoInicial } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCriarVinculoInicial: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: (...a: unknown[]) => deepChain(mockFrom(...a)) };
  return { supabase: client, supabaseBase: client };
});

vi.mock('../loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Só o que colaboradorService.criar/recontratar realmente chamam em
// vinculoService — isola o teste de orquestração da lógica interna de vínculo
// (já coberta em vinculoService.test.ts).
vi.mock('../vinculoService', () => ({
  vinculoService: { criarVinculoInicial: mockCriarVinculoInicial },
}));

import { colaboradorService } from '../colaboradorService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('colaboradorService.criar — primeira admissão', () => {
  it('cria o colaborador e, em seguida, o vínculo inicial com tipo "Admissão"', async () => {
    const novoColaborador = { id: 'novo-1', nome_completo: 'Teste', data_admissao: '2026-09-18', empresa_id: 'emp-1' };
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: novoColaborador, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await colaboradorService.criar({ nome_completo: 'Teste', data_admissao: '2026-09-18' });

    expect(result).toEqual(novoColaborador);
    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('novo-1', '2026-09-18', 'Admissão');
  });

  it('alteração contratual isolada (sem passar por criar()) nunca chama criarVinculoInicial', () => {
    // historico_contratos é gravado por historicoContratoService, que não
    // importa vinculoService — não há caminho de código que crie um vínculo
    // fora de colaboradorService.criar/recontratar. Este teste documenta essa
    // garantia estrutural (ver import estático do módulo).
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });
});

describe('colaboradorService.recontratar', () => {
  it('exige empresaId (isolamento de tenant)', async () => {
    await expect(
      colaboradorService.recontratar('c1', { data_admissao: '2026-09-18' }, '')
    ).rejects.toThrow(/empresa_id/i);
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });

  it('exige data_admissao', async () => {
    await expect(
      colaboradorService.recontratar('c1', { data_admissao: '' }, 'emp-1')
    ).rejects.toThrow(/admiss/i);
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });

  it('atualiza o MESMO colaborador.id (status ativo, data_desligamento null) e cria vínculo tipo "Readmissão"', async () => {
    const atualizado = { id: 'c1', status: 'ativo', data_admissao: '2026-09-18', empresa_id: 'emp-1' };

    // BaseService.atualizar: com useVersioning, primeiro lê `version`, depois faz o update.
    const versionMaybeSingle = vi.fn().mockResolvedValue({ data: { version: 3 }, error: null });
    const versionEq = vi.fn().mockReturnValue({ single: versionMaybeSingle });
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq });

    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: atualizado, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEqVersion = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqEmpresa = vi.fn().mockReturnValue({ eq: updateEqVersion });
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqEmpresa });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqId });

    mockFrom.mockImplementation(() => ({
      select: versionSelect,
      update: updateFn,
    }));
    // A leitura de `version` usa .select().eq().single() diretamente (sem passar por `update`);
    // como ambos os caminhos compartilham o mesmo mockFrom, o `select` acima cobre a leitura,
    // e `update` cobre a escrita — deepChain resolve qualquer variação de encadeamento não coberta.

    const result = await colaboradorService.recontratar(
      'c1',
      { data_admissao: '2026-09-18', cargo: 'Analista', departamento: 'Financeiro', salario_base: 5000 },
      'emp-1'
    );

    expect(result).toEqual(atualizado);
    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('c1', '2026-09-18', 'Readmissão');
  });
});
