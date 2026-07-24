import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order, then: (fn: any) => Promise.resolve(result).then(fn) });
  const insert = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ order, eq, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, insert };
}

import {
  documentoTemplatesService,
  documentosAdmissaoService,
  documentosAfastamentoService,
  documentosAssinaturaService,
  documentosColaboradorService,
} from '../documentosService';

describe('documentoTemplatesService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries documento_templates', async () => {
    const chain = makeChain([{ id: 't1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await documentoTemplatesService.listar();
    expect(mockFrom).toHaveBeenCalledWith('documento_templates');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await documentoTemplatesService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls insert on documento_templates', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await documentoTemplatesService.criar({ nome: 'Template A' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('documentosAdmissaoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries documentos_admissao by admissao_id', async () => {
    const chain = makeChain([{ id: 'da1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await documentosAdmissaoService.listar('adm-1');
    expect(mockFrom).toHaveBeenCalledWith('documentos_admissao');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on documentos_admissao', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await documentosAdmissaoService.criar({ admissao_id: 'adm-1' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('documentosAfastamentoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries documentos_afastamento by afastamento_id', async () => {
    const chain = makeChain([{ id: 'af1' }]);
    mockFrom.mockReturnValue(chain);
    await documentosAfastamentoService.listar('afst-1');
    expect(mockFrom).toHaveBeenCalledWith('documentos_afastamento');
  });

  it('criar calls insert on documentos_afastamento', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await documentosAfastamentoService.criar({ afastamento_id: 'a1' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('documentosAssinaturaService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries documentos_assinatura', async () => {
    const chain = makeChain([{ id: 'as1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await documentosAssinaturaService.listar();
    expect(mockFrom).toHaveBeenCalledWith('documentos_assinatura');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on documentos_assinatura', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await documentosAssinaturaService.criar({ empresa_id: 'emp-1' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('documentosColaboradorService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries documentos_colaborador by colaborador_id', async () => {
    const chain = makeChain([{ id: 'dc1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await documentosColaboradorService.listar('col-1');
    expect(mockFrom).toHaveBeenCalledWith('documentos_colaborador');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await documentosColaboradorService.listar('col-1');
    expect(result).toEqual([]);
  });

  it('criar calls insert on documentos_colaborador', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await documentosColaboradorService.criar({ colaborador_id: 'c1', nome: 'CPF' });
    expect(chain.insert).toHaveBeenCalled();
  });
});
