import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const client = { from: (...a: unknown[]) => deepChain(mockFrom(...a)) };
  return { supabase: client, supabaseBase: client };
});

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError, warn: vi.fn(), info: vi.fn() },
}));

// `vinculoService` consulta o mock module de Colaboradores (mockOr) — em
// modo de teste (MODE === 'test') ele sempre retorna `undefined`, então os
// testes abaixo exercitam o caminho real (supabase mockado), não o mock de dev.
import { vinculoService } from '../vinculoService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('vinculoService.contarPassagensPorColaboradores', () => {
  it('retorna objeto vazio sem chamar o supabase quando não há ids', async () => {
    const result = await vinculoService.contarPassagensPorColaboradores([]);
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('faz UMA única query .in() para N colaboradores (sem N+1)', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectFn = vi.fn().mockReturnValue({ in: inFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const ids = ['c1', 'c2', 'c3', 'c4', 'c5'];
    await vinculoService.contarPassagensPorColaboradores(ids);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledWith('colaborador_id', ids);
  });

  it('1 vínculo => quantidadePassagens 1, quantidadeRecontratacoes 0', async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: [{ colaborador_id: 'c1', data_inicio: '2020-01-10', data_fim: null }],
      error: null,
    });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ in: inFn }) });

    const result = await vinculoService.contarPassagensPorColaboradores(['c1']);
    expect(result.c1).toEqual({
      quantidadePassagens: 1,
      quantidadeRecontratacoes: 0,
      primeiraAdmissao: '2020-01-10',
      admissaoAtual: '2020-01-10',
    });
  });

  it('2 vínculos => quantidadePassagens 2, quantidadeRecontratacoes 1, admissaoAtual = vínculo aberto', async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: [
        { colaborador_id: 'c1', data_inicio: '2018-03-01', data_fim: '2020-06-30' },
        { colaborador_id: 'c1', data_inicio: '2023-01-02', data_fim: null },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ in: inFn }) });

    const result = await vinculoService.contarPassagensPorColaboradores(['c1']);
    expect(result.c1.quantidadePassagens).toBe(2);
    expect(result.c1.quantidadeRecontratacoes).toBe(1);
    expect(result.c1.primeiraAdmissao).toBe('2018-03-01');
    expect(result.c1.admissaoAtual).toBe('2023-01-02');
  });

  it('3 vínculos => quantidadePassagens 3', async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: [
        { colaborador_id: 'c1', data_inicio: '2015-01-01', data_fim: '2016-01-01' },
        { colaborador_id: 'c1', data_inicio: '2017-01-01', data_fim: '2019-01-01' },
        { colaborador_id: 'c1', data_inicio: '2020-01-01', data_fim: null },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ in: inFn }) });

    const result = await vinculoService.contarPassagensPorColaboradores(['c1']);
    expect(result.c1.quantidadePassagens).toBe(3);
    expect(result.c1.quantidadeRecontratacoes).toBe(2);
  });

  it('colaborador sem nenhum vínculo não aparece no resultado (não força 1ª passagem)', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ in: inFn }) });

    const result = await vinculoService.contarPassagensPorColaboradores(['legado-sem-vinculo']);
    expect(result['legado-sem-vinculo']).toBeUndefined();
  });
});

describe('vinculoService.criarVinculoInicial', () => {
  it('insere colaborador_id, data_inicio, data_fim null, status ativo e o tipo informado', async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: insertFn });

    await vinculoService.criarVinculoInicial('c1', '2026-09-18', 'Admissão');

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      colaborador_id: 'c1',
      data_inicio: '2026-09-18',
      data_fim: null,
      status: 'ativo',
      tipo: 'Admissão',
    }));
  });

  it('usa tipo "Readmissão" quando explicitamente passado (recontratação)', async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: insertFn });

    await vinculoService.criarVinculoInicial('c1', '2026-09-18', 'Readmissão');

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'Readmissão' }));
  });

  it('é best-effort: não lança erro quando o insert falha, só registra o log', async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: new Error('insert falhou') });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(vinculoService.criarVinculoInicial('c1', '2026-09-18')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('vinculoService.fecharVinculoAberto', () => {
  it('encontra o vínculo com data_fim IS NULL e o encerra', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { id: 'v-aberto' }, error: null });
    const limitFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
    const isFn = vi.fn().mockReturnValue({ order: orderFn });
    const eqFn = vi.fn().mockReturnValue({ is: isFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

    mockFrom.mockReturnValue({ select: selectFn, update: updateFn });

    await vinculoService.fecharVinculoAberto('c1', '2026-10-01');

    expect(isFn).toHaveBeenCalledWith('data_fim', null);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ data_fim: '2026-10-01', status: 'encerrado' }));
    expect(updateEqFn).toHaveBeenCalledWith('id', 'v-aberto');
  });

  it('não chama update quando não há vínculo aberto (nada a fechar)', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const limitFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
    const isFn = vi.fn().mockReturnValue({ order: orderFn });
    const eqFn = vi.fn().mockReturnValue({ is: isFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    const updateFn = vi.fn();

    mockFrom.mockReturnValue({ select: selectFn, update: updateFn });

    await vinculoService.fecharVinculoAberto('c1', '2026-10-01');
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('é best-effort: não lança erro quando a busca falha', async () => {
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: new Error('falhou') });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn }) }) }) }),
      }),
    });

    await expect(vinculoService.fecharVinculoAberto('c1', '2026-10-01')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('vinculoService.listarPorColaborador', () => {
  it('retorna [] sem consultar o supabase quando colaboradorId está vazio', async () => {
    const result = await vinculoService.listarPorColaborador(undefined);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
