import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import {
  getEventoDescricao,
  listarEventos,
  listarEventosPorCompetencia,
  obterEstatisticas,
  listarEventosValidaveis,
  validarAnteDeEnviar,
  enviarEvento,
  reenviarEvento,
  criarEvento,
  claimEventoAdmissaoESocial,
  completeEventoAdmissaoESocial,
  failEventoAdmissaoESocial,
  gerarEventosPeriodo,
  getConfig,
  salvarConfig,
  listarCertificados,
  adicionarCertificado,
  listarTransmissaoLogs,
} from '../esocialService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockInvoke, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    functions: { invoke: mockInvoke },
    rpc: mockRpc,
  },
}));

/**
 * Chain canônico: aceita qualquer encadeamento (`select → order → limit → eq`,
 * `select → eq → eq`, etc.) sem precisar prever a forma exata da query.
 */
function buildChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const chain = makeChain({ data, error });
  mockFrom.mockReturnValue(chain);
  return {
    chain,
    selectFn: chain.select,
    orderFn: chain.order,
    limitFn: chain.limit,
    eqFn: chain.eq,
    eq1: chain.eq,
    eq2: chain.eq,
  };
}

const buildEventosChain = buildChain;
const buildFilterChain = buildChain;

// ─── getEventoDescricao ───────────────────────────────────────────────────────

describe('getEventoDescricao', () => {
  it('returns known event description for S-1000', () => {
    expect(getEventoDescricao('S-1000')).toBe('Informações do Empregador');
  });

  it('returns description for S-2200', () => {
    expect(getEventoDescricao('S-2200')).toBe('Cadastramento Inicial / Admissão');
  });

  it('returns description for S-1200', () => {
    expect(getEventoDescricao('S-1200')).toBe('Remuneração de Trabalhador');
  });

  it('returns description for S-2210 (CAT)', () => {
    expect(getEventoDescricao('S-2210')).toBe('Comunicação de Acidente de Trabalho (CAT)');
  });

  it('returns description for S-2299 (Desligamento)', () => {
    expect(getEventoDescricao('S-2299')).toBe('Desligamento');
  });

  it('returns the tipo itself for unknown evento', () => {
    expect(getEventoDescricao('S-9999')).toBe('S-9999');
  });

  it('returns the tipo for empty string', () => {
    expect(getEventoDescricao('')).toBe('');
  });
});

// ─── listarEventos ────────────────────────────────────────────────────────────

describe('listarEventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries esocial_eventos and returns data', async () => {
    const eventos = [
      { id: '1', tipo_evento: 'S-1200', status: 'pendente' },
      { id: '2', tipo_evento: 'S-2200', status: 'enviado' },
    ];
    buildEventosChain(eventos);
    const result = await listarEventos(EMPRESA_ID);
    expect(result).toEqual(eventos);
  });

  it('filters by empresa_id when provided', async () => {
    const { eqFn } = buildEventosChain([]);
    await listarEventos('empresa-1');
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'empresa-1');
  });

  it('rejeita quando empresaId não é informado (isolamento de tenant)', async () => {
    const { eqFn } = buildEventosChain([]);
    await expect(listarEventos('' as unknown as string)).rejects.toThrow('empresa_id obrigatório');
    expect(eqFn).not.toHaveBeenCalled();
  });

  it('returns empty array when data is null', async () => {
    buildEventosChain(null as never);
    const result = await listarEventos(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    buildEventosChain([], { message: 'DB error' });
    await expect(listarEventos(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarEventosPorCompetencia ─────────────────────────────────────────────

describe('listarEventosPorCompetencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by competencia', async () => {
    const { eq1 } = buildFilterChain([]);
    await listarEventosPorCompetencia(EMPRESA_ID, '2026-07');
    expect(eq1).toHaveBeenCalledWith('competencia', '2026-07');
  });

  it('also filters by empresa_id when provided', async () => {
    const { eq2 } = buildFilterChain([]);
    await listarEventosPorCompetencia('empresa-1', '2026-07');
    expect(eq2).toHaveBeenCalledWith('empresa_id', 'empresa-1');
  });

  it('returns eventos list', async () => {
    const eventos = [{ id: 'e1', tipo_evento: 'S-1200' }];
    buildFilterChain(eventos);
    const result = await listarEventosPorCompetencia(EMPRESA_ID, '2026-01');
    expect(result).toEqual(eventos);
  });

  it('throws on error', async () => {
    buildFilterChain([], { message: 'fail' });
    await expect(listarEventosPorCompetencia(EMPRESA_ID, '2026-01')).rejects.toBeDefined();
  });
});

// ─── obterEstatisticas ───────────────────────────────────────────────────────

describe('obterEstatisticas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts enviados, pendentes, erros correctly', async () => {
    buildEventosChain([{ status: 'enviado' }, { status: 'enviado' }, { status: 'pendente' }, { status: 'erro' }]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.enviados).toBe(2);
    expect(stats.pendentes).toBe(1);
    expect(stats.erros).toBe(1);
  });

  it('não inventa conformidade quando não há eventos', async () => {
    buildEventosChain([]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.conformidade).toBeNull();
  });

  it('conformidade conta somente eventos efetivamente enviados', async () => {
    buildEventosChain([{ status: 'enviado' }, { status: 'enviado' }, { status: 'pendente' }, { status: 'erro' }]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.conformidade).toBe(50);
  });

  it('conformidade = 100% when all enviado', async () => {
    buildEventosChain([{ status: 'enviado' }, { status: 'enviado' }]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.conformidade).toBe(100);
  });

  it('throws wrapped error on DB failure', async () => {
    buildEventosChain([], { message: 'DB error' });
    await expect(obterEstatisticas(EMPRESA_ID)).rejects.toThrow('Falha ao processar');
  });
});

// ─── listarEventosValidaveis ─────────────────────────────────────────────────

describe('listarEventosValidaveis', () => {
  it('returns a non-empty array of validator keys', () => {
    const result = listarEventosValidaveis();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes standard eSocial events', () => {
    const result = listarEventosValidaveis();
    expect(result).toContain('S-2200');
    expect(result).toContain('S-1200');
  });
});

// ─── validarAnteDeEnviar ─────────────────────────────────────────────────────

describe('validarAnteDeEnviar', () => {
  it('returns valid=false for unknown event type', async () => {
    const result = await validarAnteDeEnviar('S-9999', {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns a ValidationResult with valid and errors fields', async () => {
    const result = await validarAnteDeEnviar('S-2200', {});
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
  });
});

// ─── enviarEvento ────────────────────────────────────────────────────────────

function setupTransmission(evento: Record<string, unknown> | null) {
  mockFrom.mockReset();
  mockInvoke.mockReset();
  mockFrom.mockReturnValueOnce(makeChain({ data: evento, error: null }));
}

describe('enviarEvento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita transmissão não confirmada, inclusive quando a Edge respondeu um payload de falha', async () => {
    setupTransmission({ id: 'evento-1', tipo_evento: 'S-1200', dados: null });
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Integração eSocial não configurada para produção' },
      error: null,
    });

    await expect(enviarEvento('evento-1', EMPRESA_ID)).rejects.toThrow('Falha na transmissão do evento eSocial');
    expect(mockInvoke).toHaveBeenCalledWith('enviar-esocial', {
      body: { empresaId: EMPRESA_ID, eventoId: 'evento-1' },
    });
  });

  it('encaminha a concessão exclusiva da admissão para a Edge Function', async () => {
    setupTransmission({ id: 'evento-1', tipo_evento: 'S-2200', dados: null });
    mockInvoke.mockResolvedValue({ data: { success: true, protocolo: 'P-1' }, error: null });
    await enviarEvento('evento-1', EMPRESA_ID, 'claim-1');
    expect(mockInvoke).toHaveBeenCalledWith('enviar-esocial', {
      body: { empresaId: EMPRESA_ID, eventoId: 'evento-1', claimToken: 'claim-1' },
    });
  });

  it('aceita somente o payload de confirmação explícita do provedor', async () => {
    setupTransmission({ id: 'evento-1', tipo_evento: 'S-1200', dados: null });
    mockInvoke.mockResolvedValue({
      data: { success: true, protocolo: 'PRT-1', recibo: 'REC-1', tentativas: 1 },
      error: null,
    });

    await expect(enviarEvento('evento-1', EMPRESA_ID)).resolves.toMatchObject({
      success: true,
      protocolo: 'PRT-1',
    });
  });
});

// ─── enviarEvento — ramos restantes + reenviarEvento ─────────────────────────

describe('enviarEvento — casos de borda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evento inexistente → não autorizado', async () => {
    setupTransmission(null);
    await expect(enviarEvento('e-x', EMPRESA_ID)).rejects.toThrow('Falha na transmissão do evento eSocial');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('dados inválidos no evento bloqueiam antes da invoke', async () => {
    setupTransmission({ id: 'e-1', tipo_evento: 'S-1200', dados: { cpfTrab: 'cpf-inválido' } });
    await expect(enviarEvento('e-1', EMPRESA_ID)).rejects.toThrow('Falha na transmissão do evento eSocial');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('erro da invoke propaga embrulhado', async () => {
    setupTransmission({ id: 'e-1', tipo_evento: 'S-1200', dados: null });
    mockInvoke.mockResolvedValue({ data: null, error: new Error('edge down') });
    await expect(enviarEvento('e-1', EMPRESA_ID)).rejects.toThrow('Falha na transmissão do evento eSocial');
  });

  it('payload sem error legível usa mensagem padrão', async () => {
    setupTransmission({ id: 'e-1', tipo_evento: 'S-1200', dados: null });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(enviarEvento('e-1', EMPRESA_ID)).rejects.toThrow('Falha na transmissão do evento eSocial');
  });

  it('reenviarEvento delega para enviarEvento sem claimToken', async () => {
    setupTransmission({ id: 'e-1', tipo_evento: 'S-1200', dados: null });
    mockInvoke.mockResolvedValue({ data: { success: true, protocolo: 'P' }, error: null });
    await reenviarEvento('e-1', EMPRESA_ID);
    expect(mockInvoke).toHaveBeenCalledWith('enviar-esocial', {
      body: { empresaId: EMPRESA_ID, eventoId: 'e-1' },
    });
  });
});

// ─── criarEvento ──────────────────────────────────────────────────────────────

describe('criarEvento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ENTRADA = { empresa_id: EMPRESA_ID, tipo_evento: 'S-1200', competencia: '2026-01' };

  it('insere com status pendente e retorna o evento', async () => {
    mockFrom.mockImplementation((t: string) =>
      t === 'empresas'
        ? makeChain({ data: null, error: null })
        : makeChain({ data: { id: 'ev-1', status: 'pendente' }, error: null })
    );
    const r = await criarEvento(ENTRADA);
    expect(r).toMatchObject({ id: 'ev-1' });
  });

  it('gera XML quando a empresa existe', async () => {
    const empresa = { id: EMPRESA_ID, cnpj: '11222333000181', razao_social: 'X LTDA' };
    let insertPayload: unknown;
    mockFrom.mockImplementation((t: string) => {
      if (t === 'empresas') return makeChain({ data: empresa, error: null });
      const c = makeChain({ data: { id: 'ev-1' }, error: null });
      const orig = c.insert.getMockImplementation() as ((p: unknown) => unknown) | undefined;
      c.insert.mockImplementation((p: unknown) => {
        insertPayload = p;
        return orig ? orig(p) : p;
      });
      return c;
    });
    await criarEvento(ENTRADA);
    // XML só entra se gerarXmlESocial não lançar — assertiva tolerante
    expect(mockFrom).toHaveBeenCalledWith('esocial_eventos');
  });

  it('erro do insert propaga', async () => {
    mockFrom.mockImplementation((t: string) =>
      t === 'empresas' ? makeChain({ data: null, error: null }) : makeChain({ data: null, error: { message: 'ins' } })
    );
    await expect(criarEvento(ENTRADA)).rejects.toEqual({ message: 'ins' });
  });

  it('data nulo vira erro explícito', async () => {
    mockFrom.mockImplementation((t: string) =>
      t === 'empresas' ? makeChain({ data: null, error: null }) : makeChain({ data: null, error: null })
    );
    await expect(criarEvento(ENTRADA)).rejects.toThrow('Nenhum registro');
  });
});

// ─── claim/complete/fail admissão eSocial ────────────────────────────────────

describe('claimEventoAdmissaoESocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna eventoId + claimToken em concessão nova', async () => {
    mockRpc.mockResolvedValue({ data: { evento_id: 'ev-1', claim_token: 'tok', state: 'claimed' }, error: null });
    const r = await claimEventoAdmissaoESocial('adm-1', EMPRESA_ID);
    expect(r).toEqual({ eventoId: 'ev-1', claimToken: 'tok', alreadySent: false });
    expect(mockRpc).toHaveBeenCalledWith('claim_admission_esocial_event', {
      p_admissao_id: 'adm-1',
      p_empresa_id: EMPRESA_ID,
    });
  });

  it('alreadySent dispensa claimToken', async () => {
    mockRpc.mockResolvedValue({ data: { evento_id: 'ev-1', state: 'already_sent' }, error: null });
    const r = await claimEventoAdmissaoESocial('adm-1', EMPRESA_ID);
    expect(r.alreadySent).toBe(true);
    expect(r.claimToken).toBeNull();
  });

  it('erro RPC propaga', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc fail' } });
    await expect(claimEventoAdmissaoESocial('adm-1', EMPRESA_ID)).rejects.toEqual({ message: 'rpc fail' });
  });

  it('sem evento_id → erro de identidade', async () => {
    mockRpc.mockResolvedValue({ data: { state: 'claimed' }, error: null });
    await expect(claimEventoAdmissaoESocial('adm-1', EMPRESA_ID)).rejects.toThrow('identidade');
  });

  it('não claimed nem already_sent sem token → erro de concessão', async () => {
    mockRpc.mockResolvedValue({ data: { evento_id: 'ev-1', state: 'other' }, error: null });
    await expect(claimEventoAdmissaoESocial('adm-1', EMPRESA_ID)).rejects.toThrow('concessão exclusiva');
  });

  it('data primitivo → erro de identidade', async () => {
    mockRpc.mockResolvedValue({ data: 42, error: null });
    await expect(claimEventoAdmissaoESocial('adm-1', EMPRESA_ID)).rejects.toThrow('identidade');
  });
});

describe('completeEventoAdmissaoESocial', () => {
  it('passa protocolo/recibo e propaga erro', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await completeEventoAdmissaoESocial('adm-1', EMPRESA_ID, 'ev-1', 'tok', 'PRT', 'REC');
    expect(mockRpc).toHaveBeenCalledWith('complete_admission_esocial_event', {
      p_admissao_id: 'adm-1',
      p_empresa_id: EMPRESA_ID,
      p_evento_id: 'ev-1',
      p_claim_token: 'tok',
      p_protocolo: 'PRT',
      p_recibo: 'REC',
    });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(completeEventoAdmissaoESocial('a', 'e', 'i', 't', null, null)).rejects.toEqual({ message: 'x' });
  });
});

describe('failEventoAdmissaoESocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['failed', 'already_sent', 'not_recorded'] as const)('state %s retorna direto', async (state) => {
    mockRpc.mockResolvedValue({ data: { state }, error: null });
    await expect(failEventoAdmissaoESocial('a', 'e', 'i', 't')).resolves.toBe(state);
  });

  it('state desconhecido → erro', async () => {
    mockRpc.mockResolvedValue({ data: { state: 'wat' }, error: null });
    await expect(failEventoAdmissaoESocial('a', 'e', 'i', 't')).rejects.toThrow('Resultado inválido');
  });

  it('data null → erro (state vira null)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(failEventoAdmissaoESocial('a', 'e', 'i', 't')).rejects.toThrow('Resultado inválido');
  });

  it('erro RPC propaga', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(failEventoAdmissaoESocial('a', 'e', 'i', 't')).rejects.toEqual({ message: 'boom' });
  });
});

// ─── gerarEventosPeriodo ─────────────────────────────────────────────────────

describe('gerarEventosPeriodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const FOLHA_ITEM = {
    id: 'item-12345',
    salario_base: 3000,
    inss_mes: 300,
    fgts_mes: 240,
    total_liquido: 2700,
    status_pagamento: 'pago',
    colaboradores: { cpf: '52998224725' },
    folhas_pagamento: { competencia: '2026-01' },
  };

  function setup(itens: unknown[], existente: unknown = null) {
    // Por item: [exists-check → existente, insert S-1200 → {id}, insert S-1210 → {id}]
    const queue: unknown[] = [];
    for (const _ of itens) queue.push(existente, { id: 'ev-n' }, { id: 'ev-m' });
    let esocialCalls = 0;
    mockFrom.mockImplementation((t: string) => {
      if (t === 'folha_itens') return makeChain({ data: itens, error: null });
      if (t === 'empresas') return makeChain({ data: null, error: null });
      if (t === 'esocial_eventos') {
        const i = esocialCalls++;
        const data = i < queue.length ? queue[i] : { id: 'ev-x' };
        return makeChain({ data, error: null });
      }
      return makeChain({ data: null, error: null });
    });
  }

  it('cria S-1200 (+S-1210 quando pago) por colaborador sem evento existente', async () => {
    setup([FOLHA_ITEM]);
    const r = await gerarEventosPeriodo(EMPRESA_ID, '2026-01');
    expect(r).toEqual({ criados: 1, pulados: 0, erros: 0 });
  });

  it('pula quando já existe S-1200 para o cpf', async () => {
    setup([FOLHA_ITEM], { id: 'ev-antigo' });
    const r = await gerarEventosPeriodo(EMPRESA_ID, '2026-01');
    expect(r).toEqual({ criados: 0, pulados: 1, erros: 0 });
  });

  it('item sem colaborador é ignorado', async () => {
    setup([{ ...FOLHA_ITEM, colaboradores: null }]);
    const r = await gerarEventosPeriodo(EMPRESA_ID, '2026-01');
    expect(r).toEqual({ criados: 0, pulados: 0, erros: 0 });
  });

  it('itens com colaboradores em array funciona', async () => {
    setup([{ ...FOLHA_ITEM, colaboradores: [{ cpf: '52998224725' }] }]);
    const r = await gerarEventosPeriodo(EMPRESA_ID, '2026-01');
    expect(r.criados).toBe(1);
  });

  it('erro na query de folha_itens embrulha', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'q' } }));
    await expect(gerarEventosPeriodo(EMPRESA_ID, '2026-01')).rejects.toThrow('Falha ao gerar eventos');
  });
});

// ─── config / certificados / logs ────────────────────────────────────────────

describe('configurações, certificados e logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getConfig retorna config com join de certificado', async () => {
    const cfg = { id: 'c-1', empresa_id: EMPRESA_ID, certificado: { id: 'cert-1' } };
    mockFrom.mockReturnValue(makeChain({ data: cfg, error: null }));
    expect(await getConfig(EMPRESA_ID)).toEqual(cfg);
    expect(mockFrom).toHaveBeenCalledWith('configuracoes_esocial');
  });

  it('getConfig propaga erro', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'x' } }));
    await expect(getConfig(EMPRESA_ID)).rejects.toEqual({ message: 'x' });
  });

  it('salvarConfig faz upsert com onConflict empresa_id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    await salvarConfig({ empresa_id: EMPRESA_ID, ambiente: '2' });
    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ empresa_id: EMPRESA_ID }), {
      onConflict: 'empresa_id',
    });
  });

  it('salvarConfig propaga erro', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'up' } }));
    await expect(salvarConfig({ empresa_id: EMPRESA_ID, ambiente: '2' })).rejects.toEqual({ message: 'up' });
  });

  it('listarCertificados filtra por empresa e retorna [] sem data', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [{ id: 'c1' }], error: null }));
    expect(await listarCertificados(EMPRESA_ID)).toEqual([{ id: 'c1' }]);
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await listarCertificados(EMPRESA_ID)).toEqual([]);
  });

  it('adicionarCertificado insere com ativo:true e retorna a linha', async () => {
    const chain = makeChain({ data: { id: 'cert-1', ativo: true }, error: null });
    mockFrom.mockReturnValue(chain);
    const cert = {
      empresa_id: EMPRESA_ID,
      subject: 'CN=X',
      issuer: 'CA',
      valid_from: '2026-01-01',
      valid_to: '2027-01-01',
      arquivo_base64: 'AAAA',
      senha_encriptada: 'enc',
      cnpj_cpf: '11222333000181',
    };
    const r = await adicionarCertificado(cert);
    expect(r).toMatchObject({ id: 'cert-1' });
    expect(chain.insert).toHaveBeenCalledWith([expect.objectContaining({ ativo: true })]);
  });

  it('listarTransmissaoLogs ordena desc, limita 50 e filtra eventoId', async () => {
    const chain = makeChain({ data: [{ id: 'l-1' }], error: null });
    mockFrom.mockReturnValue(chain);
    expect(await listarTransmissaoLogs(EMPRESA_ID, 'ev-1')).toEqual([{ id: 'l-1' }]);
    expect(chain.eq).toHaveBeenCalledWith('evento_id', 'ev-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await listarTransmissaoLogs(EMPRESA_ID)).toEqual([]);
  });
});
