import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

function makeChain(data: unknown = [], error: { message: string; code?: string } | null = null) {
  const result = { data, error };
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(result),
    maybeSingle,
    limit,
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
  });
  // eqResult needs a self-reference so multiple .eq().eq() chains work
  const eqResult: Record<string, unknown> = {
    order,
    maybeSingle,
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
  };
  const eq = vi.fn().mockReturnValue(eqResult);
  eqResult.eq = eq;
  const upsert = vi.fn().mockResolvedValue(result);
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ maybeSingle }),
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
  });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const select = vi.fn().mockReturnValue({
    order,
    eq,
    maybeSingle,
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn),
  });
  return { select, eq, order, upsert, insert, update, maybeSingle };
}

import {
  configAfastamentosService,
  feriasSolicitacoesService,
  historicoCargoService,
  linhasTransporteService,
  notificacoesAdmissaoService,
  onboardingService,
  historicoFeriasService,
  treinamentoParticipantesService,
} from '../rhService';

describe('configAfastamentosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obter calls from config_afastamentos', async () => {
    const chain = makeChain({ id: 'c1' });
    mockFrom.mockReturnValue(chain);
    await configAfastamentosService.obter();
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
  });

  it('obter throws on error', async () => {
    const chain = makeChain(null, new Error('db error'));
    chain.select.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
    });
    mockFrom.mockReturnValue(chain);
    await expect(configAfastamentosService.obter()).rejects.toThrow('db error');
  });

  it('salvar calls upsert', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await configAfastamentosService.salvar({ tipo: 'doenca', dias_empresa_maximo: 15 });
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
    expect(chain.upsert).toHaveBeenCalled();
  });
});

describe('feriasSolicitacoesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar returns data array', async () => {
    const data = [{ id: 'f1' }];
    const chain = makeChain(data);
    mockFrom.mockReturnValue(chain);
    const result = await feriasSolicitacoesService.listar('emp-1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns empty array when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await feriasSolicitacoesService.listar('emp-1');
    expect(result).toEqual([]);
  });

  it('criar calls from ferias_solicitacoes', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await feriasSolicitacoesService.criar({
      colaborador_id: '00000000-0000-4000-8000-000000000002',
      data_inicio: '2026-01-10',
      data_fim: '2026-01-20',
    });
    expect(mockFrom).toHaveBeenCalledWith('ferias_solicitacoes');
  });
});

describe('historicoCargoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar queries historico_cargo', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await historicoCargoService.listar('col-1');
    expect(mockFrom).toHaveBeenCalledWith('historico_cargo');
  });
});

describe('linhasTransporteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar returns array', async () => {
    const chain = makeChain([{ id: 'l1', nome: 'Linha A' }]);
    mockFrom.mockReturnValue(chain);
    const result = await linhasTransporteService.listar();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('notificacoesAdmissaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar queries notificacoes_admissao', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await notificacoesAdmissaoService.listar('adm-1');
    expect(mockFrom).toHaveBeenCalledWith('notificacoes_admissao');
  });
});

describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listarTemplates queries onboarding_templates', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await onboardingService.listarTemplates();
    expect(mockFrom).toHaveBeenCalledWith('onboarding_templates');
  });

  it('listarTarefas queries onboarding_tarefas by onboardingId', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await onboardingService.listarTarefas('ob-1');
    expect(mockFrom).toHaveBeenCalledWith('onboarding_tarefas');
  });
});

// ─── cobertura adicional (onda 11) ────────────────────────────────────────────

describe('feriasSolicitacoesService — guards e writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar rejeita empresaId vazio (isolamento de tenant)', async () => {
    await expect(feriasSolicitacoesService.listar('')).rejects.toThrow('empresa_id');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('listar propaga erro do banco', async () => {
    const chain = makeChain(null, { message: 'db' });
    mockFrom.mockReturnValue(chain);
    await expect(feriasSolicitacoesService.listar('00000000-0000-4000-8000-0000000000e1')).rejects.toEqual({
      message: 'db',
    });
  });

  it('criar insere payload validado', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await feriasSolicitacoesService.criar({
      colaborador_id: '00000000-0000-4000-8000-0000000000c1',
      empresa_id: '00000000-0000-4000-8000-0000000000e1',
      data_inicio: '2026-12-01',
      data_fim: '2026-12-31',
    });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        colaborador_id: '00000000-0000-4000-8000-0000000000c1',
        empresa_id: '00000000-0000-4000-8000-0000000000e1',
      })
    );
  });

  it('criar propaga erro do banco', async () => {
    const chain = makeChain(null, { message: 'insert fail' });
    mockFrom.mockReturnValue(chain);
    await expect(
      feriasSolicitacoesService.criar({
        colaborador_id: '00000000-0000-4000-8000-0000000000c1',
        empresa_id: '00000000-0000-4000-8000-0000000000e1',
        data_inicio: '2026-12-01',
        data_fim: '2026-12-31',
      })
    ).rejects.toEqual({ message: 'insert fail' });
  });

  it('atualizar filtra por id + empresa_id e valida tenant', async () => {
    await expect(feriasSolicitacoesService.atualizar('f-1', { status: 'aprovada' }, '')).rejects.toThrow('empresa_id');
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await feriasSolicitacoesService.atualizar('f-1', { status: 'aprovada' }, '00000000-0000-4000-8000-0000000000e1');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'aprovada' }));
  });
});

describe('historicoFeriasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita empresaId vazio', async () => {
    await expect(historicoFeriasService.listar('00000000-0000-4000-8000-0000000000c1', '')).rejects.toThrow(
      'empresa_id'
    );
  });

  it('lista histórico via join em férias', async () => {
    const data = [{ id: 'h-1' }];
    mockFrom.mockReturnValue(makeChain(data));
    const r = await historicoFeriasService.listar(
      '00000000-0000-4000-8000-0000000000c1',
      '00000000-0000-4000-8000-0000000000e1'
    );
    expect(mockFrom).toHaveBeenCalledWith('historico_ferias');
    expect(r).toEqual(data);
  });
});

describe('linhasTransporteService.criar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('insere linha validada e propaga erro', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await linhasTransporteService.criar({ nome: 'Linha A', tipo: 'onibus' });
    expect(chain.insert).toHaveBeenCalled();
    mockFrom.mockReturnValue(makeChain(null, { message: 'fail' }));
    await expect(linhasTransporteService.criar({ nome: 'Linha A', tipo: 'onibus' })).rejects.toEqual({
      message: 'fail',
    });
  });
});

describe('onboardingService — writes e listagens restantes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('criarTemplate retorna a linha inserida e propaga erro', async () => {
    mockFrom.mockReturnValue(makeChain({ id: '00000000-0000-4000-8000-000000000011' }));
    const r = await onboardingService.criarTemplate({
      nome: 'Onboarding Padrão',
      empresa_id: '00000000-0000-4000-8000-0000000000e1',
    });
    expect(r).toEqual({ id: '00000000-0000-4000-8000-000000000011' });
    mockFrom.mockReturnValue(makeChain(null, { message: 'fail' }));
    await expect(
      onboardingService.criarTemplate({ nome: 'X', empresa_id: '00000000-0000-4000-8000-0000000000e1' })
    ).rejects.toEqual({
      message: 'fail',
    });
  });

  it('listarTemplateTarefas filtra por template', async () => {
    mockFrom.mockReturnValue(makeChain([{ id: 't-1', ordem: 1 }]));
    const r = await onboardingService.listarTemplateTarefas('00000000-0000-4000-8000-000000000011');
    expect(r).toEqual([{ id: 't-1', ordem: 1 }]);
  });

  it('criarTemplateTarefa insere e propaga erro', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await onboardingService.criarTemplateTarefa({
      template_id: '00000000-0000-4000-8000-000000000011',
      titulo: 'Assinar',
    });
    expect(chain.insert).toHaveBeenCalled();
    mockFrom.mockReturnValue(makeChain(null, { message: 'fail' }));
    await expect(
      onboardingService.criarTemplateTarefa({ template_id: '00000000-0000-4000-8000-000000000011', titulo: 'x' })
    ).rejects.toEqual({
      message: 'fail',
    });
  });

  it('listarColaboradores aplica filtro de empresa quando informado', async () => {
    mockFrom.mockReturnValue(makeChain([{ id: 'oc-1' }]));
    const r = await onboardingService.listarColaboradores('00000000-0000-4000-8000-0000000000e1');
    expect(r).toEqual([{ id: 'oc-1' }]);
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await onboardingService.listarColaboradores();
    expect(mockFrom).toHaveBeenCalledWith('onboarding_colaborador');
  });

  it('iniciarOnboarding retorna a linha criada', async () => {
    mockFrom.mockReturnValue(makeChain({ id: 'onb-1' }));
    const r = await onboardingService.iniciarOnboarding({
      colaborador_id: '00000000-0000-4000-8000-0000000000c1',
      empresa_id: '00000000-0000-4000-8000-0000000000e1',
    });
    expect(r).toEqual({ id: 'onb-1' });
  });

  it('concluirTarefa valida onboardingId e marca concluída', async () => {
    await expect(onboardingService.concluirTarefa('', 't-1')).rejects.toThrow('onboarding_id');
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await onboardingService.concluirTarefa('onb-1', 't-1');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ concluida: true, data_conclusao: expect.stringMatching(/^\d{4}-/) })
    );
  });
});

describe('treinamentoParticipantesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar filtra por treinamento e retorna [] quando nulo', async () => {
    mockFrom.mockReturnValue(makeChain([{ id: 'p-1' }]));
    expect(await treinamentoParticipantesService.listar('tr-1')).toEqual([{ id: 'p-1' }]);
    mockFrom.mockReturnValue(makeChain(null));
    expect(await treinamentoParticipantesService.listar()).toEqual([]);
  });

  it('registrarPresenca valida treinamentoId e marca presente', async () => {
    await expect(treinamentoParticipantesService.registrarPresenca('', 'p-1')).rejects.toThrow('treinamento_id');
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await treinamentoParticipantesService.registrarPresenca('tr-1', 'p-1');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ presente: true }));
  });
});
