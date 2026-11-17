import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockCriarVinculoInicial, mockCriarVinculoHistorico, mockListarPorColaborador } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCriarVinculoInicial: vi.fn().mockResolvedValue(undefined),
  mockCriarVinculoHistorico: vi.fn().mockResolvedValue(undefined),
  mockListarPorColaborador: vi.fn().mockResolvedValue([]),
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
  vinculoService: {
    criarVinculoInicial: mockCriarVinculoInicial,
    criarVinculoHistorico: mockCriarVinculoHistorico,
    listarPorColaborador: mockListarPorColaborador,
  },
}));

import { colaboradorService } from '../colaboradorService';

beforeEach(() => {
  vi.clearAllMocks();
  mockListarPorColaborador.mockResolvedValue([]);
});

/**
 * Chain do PostgREST usado por `recontratar`: leitura do cadastro
 * (`.select('*').eq().eq().maybeSingle()`), leitura da versão
 * (`.select('version').eq().single()`) e o update com versionamento
 * (`.update().eq().eq().eq().select().maybeSingle()`).
 */
function mockChainColaborador(cadastro: Record<string, unknown> | null, atualizado: Record<string, unknown>) {
  const updateMaybeSingle = vi.fn().mockResolvedValue({ data: atualizado, error: null });
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle }) }),
      }),
    }),
  });
  const selectFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { version: 3 }, error: null }),
      eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: cadastro, error: null }) }),
    }),
  });
  mockFrom.mockImplementation(() => ({ select: selectFn, update: updateFn }));
  return { selectFn, updateFn };
}

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

  it('recusa admissão anterior ao ENCERRAMENTO da última passagem (sobreposição)', async () => {
    mockListarPorColaborador.mockResolvedValue([
      { id: 'v1', colaborador_id: 'c1', data_inicio: '2022-01-01', data_fim: '2026-06-30' },
    ]);
    mockChainColaborador(null, { id: 'c1' });

    // Posterior à admissão (2022-01-01) mas anterior ao desligamento (2026-06-30).
    await expect(colaboradorService.recontratar('c1', { data_admissao: '2025-01-01' }, 'emp-1')).rejects.toThrow(
      /2026-06-30/
    );
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
  });

  it('recusa sobreposição em cadastro legado, cujas datas vivem em `colaboradores`', async () => {
    mockChainColaborador(
      { id: 'c1', data_admissao: '2022-01-01', data_desligamento: '2026-06-30', version: 3 },
      { id: 'c1' }
    );

    await expect(colaboradorService.recontratar('c1', { data_admissao: '2025-01-01' }, 'emp-1')).rejects.toThrow(
      /2026-06-30/
    );
    expect(mockCriarVinculoInicial).not.toHaveBeenCalled();
    expect(mockCriarVinculoHistorico).not.toHaveBeenCalled();
  });

  it('aceita admissão posterior ao encerramento da última passagem', async () => {
    mockListarPorColaborador.mockResolvedValue([
      { id: 'v1', colaborador_id: 'c1', data_inicio: '2022-01-01', data_fim: '2026-06-30' },
    ]);
    mockChainColaborador(null, { id: 'c1', status: 'ativo' });

    await colaboradorService.recontratar('c1', { data_admissao: '2026-07-01' }, 'emp-1');

    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('c1', '2026-07-01', 'Readmissão');
    // Já havia vínculo: nada a resgatar de `colaboradores`.
    expect(mockCriarVinculoHistorico).not.toHaveBeenCalled();
  });

  it('cadastro legado sem vínculo: registra a passagem antiga antes da readmissão', async () => {
    mockChainColaborador(
      { id: 'c1', data_admissao: '2022-01-01', data_desligamento: '2026-06-30', version: 3 },
      { id: 'c1', status: 'ativo' }
    );

    await colaboradorService.recontratar('c1', { data_admissao: '2026-07-01' }, 'emp-1');

    expect(mockCriarVinculoHistorico).toHaveBeenCalledWith('c1', '2022-01-01', '2026-06-30');
    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('c1', '2026-07-01', 'Readmissão');
  });

  it('não inventa data de fim quando o cadastro legado não tem data_desligamento', async () => {
    mockChainColaborador({ id: 'c1', data_admissao: '2022-01-01', data_desligamento: null, version: 3 }, { id: 'c1' });

    await colaboradorService.recontratar('c1', { data_admissao: '2026-07-01' }, 'emp-1');

    expect(mockCriarVinculoHistorico).not.toHaveBeenCalled();
    expect(mockCriarVinculoInicial).toHaveBeenCalledWith('c1', '2026-07-01', 'Readmissão');
  });
});
