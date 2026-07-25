import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockStorage, mockFunctions, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockStorage: { from: vi.fn() },
  mockFunctions: { invoke: vi.fn() },
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    storage: mockStorage,
    functions: mockFunctions,
    rpc: mockRpc,
  },
}));

// Suppress window.location usage in gerarTokenAssinatura
Object.defineProperty(window, 'location', {
  value: { origin: 'https://app.test' },
  writable: true,
});

import { contratoTemplateService } from '../contratoTemplateService';

const EMPRESA_ID = 'emp-1';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

function makeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const single = vi.fn().mockResolvedValue({ data, error });
  const chain: any = { maybeSingle, single };
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain, maybeSingle, single };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('contratoTemplateService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns templates list', async () => {
    const templates = [{ id: 'tpl-1', nome: 'CLT Padrão', tipo_contrato: 'clt_indeterminado' }];
    makeListChain(templates);
    const result = await contratoTemplateService.listar(EMPRESA_ID);
    expect(result).toEqual(templates);
  });

  it('returns empty array when data is null', async () => {
    makeListChain(null as any);
    const result = await contratoTemplateService.listar(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    makeListChain([], { message: 'fail' });
    await expect(contratoTemplateService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── obter ────────────────────────────────────────────────────────────────────

describe('contratoTemplateService.obter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns template by id', async () => {
    const tpl = { id: 'tpl-1', nome: 'Estágio' };
    const { maybeSingle } = makeSingleChain(tpl);
    const result = await contratoTemplateService.obter('tpl-1');
    expect(result).toEqual(tpl);
    expect(maybeSingle).toHaveBeenCalled();
  });

  it('returns null when not found', async () => {
    makeSingleChain(null);
    const result = await contratoTemplateService.obter('missing');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    makeSingleChain(null, { message: 'fail' });
    await expect(contratoTemplateService.obter('tpl-1')).rejects.toBeDefined();
  });
});

// ─── salvar (insert) ──────────────────────────────────────────────────────────

describe('contratoTemplateService.salvar — insert (no id)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts new template and returns it', async () => {
    const newTpl = { id: 'tpl-new', nome: 'PJ', tipo_contrato: 'pj', empresa_id: EMPRESA_ID, corpo_html: '<p/>' };
    const singleFn = vi.fn().mockResolvedValue({ data: newTpl, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await contratoTemplateService.salvar({
      empresa_id: EMPRESA_ID,
      nome: 'PJ',
      tipo_contrato: 'pj',
      corpo_html: '<p/>',
    });
    expect(result).toEqual(newTpl);
    expect(insertFn).toHaveBeenCalled();
  });

  it('throws on insert error', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(
      contratoTemplateService.salvar({ empresa_id: EMPRESA_ID, nome: 'X', tipo_contrato: 'clt_indeterminado', corpo_html: '' })
    ).rejects.toBeDefined();
  });
});

// ─── salvar (update) ──────────────────────────────────────────────────────────

describe('contratoTemplateService.salvar — update (with id)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates existing template and returns it', async () => {
    const updated = { id: 'tpl-1', nome: 'Updated', tipo_contrato: 'clt_indeterminado', empresa_id: EMPRESA_ID, corpo_html: '<p/>' };
    const singleFn = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    const result = await contratoTemplateService.salvar({
      id: 'tpl-1',
      empresa_id: EMPRESA_ID,
      nome: 'Updated',
      tipo_contrato: 'clt_indeterminado',
      corpo_html: '<p/>',
    });
    expect(result).toEqual(updated);
    expect(updateFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'tpl-1');
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('contratoTemplateService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes by id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(contratoTemplateService.excluir('tpl-1')).resolves.toBeUndefined();
    expect(eqFn).toHaveBeenCalledWith('id', 'tpl-1');
  });

  it('throws on error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(contratoTemplateService.excluir('tpl-1')).rejects.toBeDefined();
  });
});

// ─── listarGerados ────────────────────────────────────────────────────────────

describe('contratoTemplateService.listarGerados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns gerados list', async () => {
    const gerados = [{ id: 'g-1', status: 'gerado' }];
    makeListChain(gerados);
    const result = await contratoTemplateService.listarGerados(EMPRESA_ID);
    expect(result).toEqual(gerados);
  });

  it('returns empty array on null data', async () => {
    makeListChain(null as any);
    const result = await contratoTemplateService.listarGerados(EMPRESA_ID);
    expect(result).toEqual([]);
  });
});

// ─── downloadUrl ─────────────────────────────────────────────────────────────

describe('contratoTemplateService.downloadUrl', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns signed url', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null });
    mockStorage.from.mockReturnValue({ createSignedUrl });

    const result = await contratoTemplateService.downloadUrl('path/to/file.pdf');
    expect(result).toBe('https://signed.url');
  });

  it('throws on storage error', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockStorage.from.mockReturnValue({ createSignedUrl });

    await expect(contratoTemplateService.downloadUrl('path/x')).rejects.toBeDefined();
  });
});

// ─── listarEventos ────────────────────────────────────────────────────────────

describe('contratoTemplateService.listarEventos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns events for contrato', async () => {
    const events = [{ id: 'ev-1', evento: 'visualizado', detalhes: null, ip: '1.1.1.1', user_agent: null, created_at: '2026-07-24' }];
    makeListChain(events);
    const result = await contratoTemplateService.listarEventos('c-1');
    expect(result).toEqual(events);
  });

  it('returns empty array on null', async () => {
    makeListChain(null as any);
    const result = await contratoTemplateService.listarEventos('c-1');
    expect(result).toEqual([]);
  });
});
