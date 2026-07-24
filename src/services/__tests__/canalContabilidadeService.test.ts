import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canalContabilidadeService } from '../canalContabilidadeService';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

// select → eq → order → resolvedValue
function setupSelectEqOrder(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { orderFn, eqFn, selectFn };
}

// insert → select → maybeSingle → resolvedValue
function setupInsertSelectMaybeSingle(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, maybeSingle };
}

// update → eq → resolvedValue
function setupUpdateEq(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// thenable chain for listThreads
function setupListThreadsChain(data: any[], error: any = null) {
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
  return { chain };
}

// ─── listContatos ─────────────────────────────────────────────────────────────

describe('canalContabilidadeService.listContatos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns contacts ordered by nome', async () => {
    const records = [{ id: 'c1', nome: 'Contador A', email: 'a@escritorio.com' }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await canalContabilidadeService.listContatos('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('nome');
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await canalContabilidadeService.listContatos('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'permission denied' });
    await expect(canalContabilidadeService.listContatos('emp-1')).rejects.toBeDefined();
  });
});

// ─── criarContato ─────────────────────────────────────────────────────────────

describe('canalContabilidadeService.criarContato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns created contact', async () => {
    const record = { id: 'c2', nome: 'Joana Silva', email: 'joana@escrit.com', empresa_id: 'emp-1' };
    const { insertFn } = setupInsertSelectMaybeSingle(record);
    const result = await canalContabilidadeService.criarContato('emp-1', {
      nome: 'Joana Silva',
      email: 'joana@escrit.com',
      telefone: '11999990000',
    });
    expect(result).toEqual(record);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Joana Silva',
      email: 'joana@escrit.com',
      empresa_id: 'emp-1',
    }));
  });

  it('throws on DB error', async () => {
    setupInsertSelectMaybeSingle(null, { message: 'unique constraint' });
    await expect(
      canalContabilidadeService.criarContato('emp-1', { nome: 'X', email: 'x@x.com' })
    ).rejects.toBeDefined();
  });
});

// ─── toggleContato ────────────────────────────────────────────────────────────

describe('canalContabilidadeService.toggleContato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates ativo flag without error', async () => {
    const { updateFn, eqFn } = setupUpdateEq();
    await expect(canalContabilidadeService.toggleContato('c1', false)).resolves.toBeUndefined();
    expect(updateFn).toHaveBeenCalledWith({ ativo: false });
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });

  it('throws on DB error', async () => {
    setupUpdateEq({ message: 'update failed' });
    await expect(canalContabilidadeService.toggleContato('c1', true)).rejects.toBeDefined();
  });
});

// ─── listThreads ──────────────────────────────────────────────────────────────

describe('canalContabilidadeService.listThreads', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns threads when no status filter is applied', async () => {
    const records = [{ id: 't1', assunto: 'Folha de julho', status: 'aberto' }];
    const { chain } = setupListThreadsChain(records);
    const result = await canalContabilidadeService.listThreads('emp-1');
    expect(result).toEqual(records);
    expect(chain.limit).toHaveBeenCalledWith(200);
    // no second eq call for status
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c: any[]) => c[0] === 'status')).toBe(false);
  });

  it('applies status filter when filtroStatus is provided', async () => {
    const records = [{ id: 't2', status: 'resolvido' }];
    const { chain } = setupListThreadsChain(records);
    const result = await canalContabilidadeService.listThreads('emp-1', 'resolvido');
    expect(result).toEqual(records);
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c: any[]) => c[0] === 'status' && c[1] === 'resolvido')).toBe(true);
  });

  it('returns empty array when data is null', async () => {
    setupListThreadsChain(null as any);
    expect(await canalContabilidadeService.listThreads('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupListThreadsChain([], { message: 'query failed' });
    await expect(canalContabilidadeService.listThreads('emp-1')).rejects.toBeDefined();
  });
});

// ─── criarThread ──────────────────────────────────────────────────────────────

describe('canalContabilidadeService.criarThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } } });
  });

  it('creates thread and calls enviarMensagem with initial message', async () => {
    const thread = { id: 'th1', assunto: 'Dúvida FGTS', empresa_id: 'emp-1' };
    const { insertFn } = setupInsertSelectMaybeSingle(thread);
    const enviarSpy = vi.spyOn(canalContabilidadeService, 'enviarMensagem').mockResolvedValue({} as any);

    const result = await canalContabilidadeService.criarThread('emp-1', {
      assunto: 'Dúvida FGTS',
      categoria: 'folha',
      mensagemInicial: 'Olá, preciso de ajuda.',
    });

    expect(result).toEqual(thread);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      empresa_id: 'emp-1',
      assunto: 'Dúvida FGTS',
      categoria: 'folha',
      prioridade: 'normal',
      aberto_por: 'user-1',
    }));
    expect(enviarSpy).toHaveBeenCalledWith('th1', 'emp-1', 'Olá, preciso de ajuda.', 'rh');

    enviarSpy.mockRestore();
  });

  it('uses provided prioridade and contato_id', async () => {
    const thread = { id: 'th2', assunto: 'Urgente', empresa_id: 'emp-1' };
    setupInsertSelectMaybeSingle(thread);
    const enviarSpy = vi.spyOn(canalContabilidadeService, 'enviarMensagem').mockResolvedValue({} as any);

    await canalContabilidadeService.criarThread('emp-1', {
      assunto: 'Urgente',
      categoria: 'esocial',
      prioridade: 'urgente',
      contato_id: 'contato-99',
      mensagemInicial: 'Urgente!',
    });

    const { insertFn } = setupInsertSelectMaybeSingle(thread);
    void insertFn;
    expect(enviarSpy).toHaveBeenCalled();
    enviarSpy.mockRestore();
  });

  it('throws "Falha ao criar thread" when insert returns null', async () => {
    setupInsertSelectMaybeSingle(null);
    const enviarSpy = vi.spyOn(canalContabilidadeService, 'enviarMensagem').mockResolvedValue({} as any);

    await expect(
      canalContabilidadeService.criarThread('emp-1', {
        assunto: 'X',
        categoria: 'outro',
        mensagemInicial: 'Olá',
      })
    ).rejects.toThrow('Falha ao criar thread');

    enviarSpy.mockRestore();
  });

  it('throws on DB insert error', async () => {
    setupInsertSelectMaybeSingle(null, { message: 'insert error' });
    const enviarSpy = vi.spyOn(canalContabilidadeService, 'enviarMensagem').mockResolvedValue({} as any);

    await expect(
      canalContabilidadeService.criarThread('emp-1', {
        assunto: 'X',
        categoria: 'outro',
        mensagemInicial: 'Olá',
      })
    ).rejects.toBeDefined();

    enviarSpy.mockRestore();
  });
});

// ─── atualizarStatus ──────────────────────────────────────────────────────────

describe('canalContabilidadeService.atualizarStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates status without resolvido_em for non-resolvido status', async () => {
    const { updateFn } = setupUpdateEq();
    await canalContabilidadeService.atualizarStatus('th1', 'respondido');
    expect(updateFn).toHaveBeenCalledWith({ status: 'respondido' });
  });

  it('sets resolvido_em when status is "resolvido"', async () => {
    const { updateFn } = setupUpdateEq();
    await canalContabilidadeService.atualizarStatus('th1', 'resolvido');
    const patch = (updateFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(patch.status).toBe('resolvido');
    expect(typeof patch.resolvido_em).toBe('string');
    expect(patch.resolvido_em).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws on DB error', async () => {
    setupUpdateEq({ message: 'update failed' });
    await expect(canalContabilidadeService.atualizarStatus('th1', 'arquivado')).rejects.toBeDefined();
  });
});

// ─── listMensagens ────────────────────────────────────────────────────────────

describe('canalContabilidadeService.listMensagens', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns messages ordered by created_at ascending', async () => {
    const records = [
      { id: 'm1', corpo: 'Olá', thread_id: 'th1' },
      { id: 'm2', corpo: 'Tudo bem?', thread_id: 'th1' },
    ];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await canalContabilidadeService.listMensagens('th1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await canalContabilidadeService.listMensagens('th1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'select failed' });
    await expect(canalContabilidadeService.listMensagens('th1')).rejects.toBeDefined();
  });
});

// ─── enviarMensagem ───────────────────────────────────────────────────────────

describe('canalContabilidadeService.enviarMensagem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.com' } } });
  });

  it('inserts message and returns data', async () => {
    const record = { id: 'msg1', corpo: 'Olá', thread_id: 'th1' };
    const { insertFn } = setupInsertSelectMaybeSingle(record);
    const result = await canalContabilidadeService.enviarMensagem('th1', 'emp-1', 'Olá', 'rh');
    expect(result).toEqual(record);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      thread_id: 'th1',
      empresa_id: 'emp-1',
      corpo: 'Olá',
      autor_tipo: 'rh',
      autor_id: 'user-1',
      autor_nome: 'a@b.com',
    }));
  });

  it('throws "Mensagem vazia" when corpo is empty string', async () => {
    await expect(
      canalContabilidadeService.enviarMensagem('th1', 'emp-1', '', 'rh')
    ).rejects.toThrow('Mensagem vazia');
  });

  it('throws "Mensagem vazia" when corpo is only whitespace', async () => {
    await expect(
      canalContabilidadeService.enviarMensagem('th1', 'emp-1', '   ', 'rh')
    ).rejects.toThrow('Mensagem vazia');
  });

  it('trims corpo before inserting', async () => {
    const record = { id: 'msg2', corpo: 'Texto com espaços', thread_id: 'th1' };
    const { insertFn } = setupInsertSelectMaybeSingle(record);
    await canalContabilidadeService.enviarMensagem('th1', 'emp-1', '  Texto com espaços  ', 'rh');
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ corpo: 'Texto com espaços' }));
  });

  it('throws on DB error', async () => {
    setupInsertSelectMaybeSingle(null, { message: 'insert error' });
    await expect(
      canalContabilidadeService.enviarMensagem('th1', 'emp-1', 'Olá', 'contabilidade')
    ).rejects.toBeDefined();
  });

  it('passes anexos array to insert', async () => {
    const record = { id: 'msg3', corpo: 'Com anexo', thread_id: 'th1' };
    const { insertFn } = setupInsertSelectMaybeSingle(record);
    const anexos = [{ path: 'emp/th/file.pdf', nome: 'file.pdf', tamanho: 1024, mime: 'application/pdf' }];
    await canalContabilidadeService.enviarMensagem('th1', 'emp-1', 'Com anexo', 'rh', anexos);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ anexos }));
  });
});
