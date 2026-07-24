import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/dateLocal', () => ({ todayLocalISO: () => '2024-07-24' }));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order, then: (fn: any) => Promise.resolve(result).then(fn) });
  const delete_ = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const insert = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq, order, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, insert, delete: delete_, update };
}

import {
  beneficiariosPlanoService,
  beneficiariosSeguroService,
  colaboradorBeneficiosService,
  segurosColaboradoresService,
} from '../beneficiosService';

describe('beneficiariosPlanoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries beneficiarios_plano', async () => {
    const chain = makeChain([{ id: 'bp1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await beneficiariosPlanoService.listar('plano-1');
    expect(mockFrom).toHaveBeenCalledWith('beneficiarios_plano');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await beneficiariosPlanoService.listar('plano-1');
    expect(result).toEqual([]);
  });

  it('criar calls insert', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await beneficiariosPlanoService.criar({ plano_saude_id: 'p1', colaborador_id: 'c1' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('excluir calls update with status=excluido', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await beneficiariosPlanoService.excluir('bp-1');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'excluido' }));
  });
});

describe('beneficiariosSeguroService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries beneficiarios_seguro', async () => {
    const chain = makeChain([{ id: 'bs1' }]);
    mockFrom.mockReturnValue(chain);
    await beneficiariosSeguroService.listar('seguro-1');
    expect(mockFrom).toHaveBeenCalledWith('beneficiarios_seguro');
  });

  it('criar calls insert on beneficiarios_seguro', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await beneficiariosSeguroService.criar({ seguro_vida_id: 's1' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('excluir calls update with status=inativo', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await beneficiariosSeguroService.excluir('bs-1');
    expect(chain.update).toHaveBeenCalledWith({ status: 'inativo' });
  });
});

describe('colaboradorBeneficiosService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries colaborador_beneficios by colaborador_id', async () => {
    const chain = makeChain([{ id: 'cb1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await colaboradorBeneficiosService.listar('col-1');
    expect(mockFrom).toHaveBeenCalledWith('colaborador_beneficios');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await colaboradorBeneficiosService.listar('col-1');
    expect(result).toEqual([]);
  });
});

describe('segurosColaboradoresService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries seguros_colaboradores', async () => {
    const chain = makeChain([{ id: 'sc1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await segurosColaboradoresService.listar();
    expect(mockFrom).toHaveBeenCalledWith('seguros_colaboradores');
    expect(Array.isArray(result)).toBe(true);
  });

  it('vincular calls insert on seguros_colaboradores', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await segurosColaboradoresService.vincular({ seguro_vida_id: 's1', colaborador_id: 'c1' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('desvincular calls delete on seguros_colaboradores', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await segurosColaboradoresService.desvincular('sc-1');
    expect(chain.delete).toHaveBeenCalled();
  });
});
