import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { cnabService } from '../cnabService';
import { makeChain } from '@/test/chain';

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)), rpc: mockRpc },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

// select → eq → maybeSingle
function setupSelectEqMaybeSingle(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

// select → eq → order → resolvedValue
function setupSelectEqOrder(data: unknown, error: { message: string; code?: string } | null = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// update → eq → resolvedValue
function setupUpdateEq(error: { message: string; code?: string } | null = null) {
  const eqFn = vi.fn();
  const __delChain = {
    then: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).then(r),
    catch: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).catch(r),
    finally: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).finally(r),
    eq: eqFn,
  };
  eqFn.mockReturnValue(__delChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// insert → resolvedValue
function setupInsert(error: { message: string; code?: string } | null = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

// ─── getConfig ────────────────────────────────────────────────────────────────

describe('cnabService.getConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns config when found', async () => {
    const config = { banco_codigo: '001', agencia: '1234', conta: '00001', conta_digito: '5', convenio: 'CON001' };
    const { eqFn } = setupSelectEqMaybeSingle(config);
    const result = await cnabService.getConfig('emp-1');
    expect(result).toEqual(config);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns null when config not found', async () => {
    setupSelectEqMaybeSingle(null);
    expect(await cnabService.getConfig('emp-1')).toBeNull();
  });

  it('throws on DB error', async () => {
    setupSelectEqMaybeSingle(null, { message: 'fail' });
    await expect(cnabService.getConfig('emp-1')).rejects.toBeDefined();
  });
});

// ─── saveConfig ───────────────────────────────────────────────────────────────

describe('cnabService.saveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const config = { banco_codigo: '001', agencia: '1234', conta: '00001', conta_digito: '5', convenio: 'CON001' };

  it('calls UPDATE when existing config found', async () => {
    const existing = { id: 'cfg-1' };

    // First call: select.eq.maybeSingle → existing
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    // Second call: update.eq → success
    const upChain = makeChain({ error: null });
    const update2 = upChain.update;
    const eq2 = upChain.eq;

    mockFrom.mockReturnValueOnce({ select: select1 }).mockReturnValueOnce(upChain);

    await cnabService.saveConfig('emp-1', config);
    expect(update2).toHaveBeenCalledWith(config);
    expect(eq2).toHaveBeenCalledWith('id', 'cfg-1');
  });

  it('calls INSERT when no existing config', async () => {
    // First call: select.eq.maybeSingle → null (no existing)
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    // Second call: insert → success
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ select: select1 }).mockReturnValueOnce({ insert: insertFn });

    await cnabService.saveConfig('emp-1', config);
    expect(insertFn).toHaveBeenCalledWith([expect.objectContaining({ empresa_id: 'emp-1', ...config })]);
  });

  it('throws when update fails', async () => {
    const existing = { id: 'cfg-1' };
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    const upChain = makeChain({ error: { message: 'fail' } });
    const update2 = upChain.update;
    mockFrom.mockReturnValueOnce({ select: select1 }).mockReturnValueOnce(upChain);

    await expect(cnabService.saveConfig('emp-1', config)).rejects.toBeDefined();
  });
});

// ─── listRemessas ─────────────────────────────────────────────────────────────

describe('cnabService.listRemessas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns remessas ordered by created_at desc', async () => {
    const records = [{ id: 'r1', status: 'enviado', valor_total: 5000 }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await cnabService.listRemessas('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as never);
    expect(await cnabService.listRemessas('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'fail' });
    await expect(cnabService.listRemessas('emp-1')).rejects.toBeDefined();
  });
});

// ─── listPixLotes ─────────────────────────────────────────────────────────────

describe('cnabService.listPixLotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns PIX lotes ordered by created_at desc', async () => {
    const records = [{ id: 'pl1', status: 'gerado' }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await cnabService.listPixLotes('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as never);
    expect(await cnabService.listPixLotes('emp-1')).toEqual([]);
  });
});

// ─── parseRetornoCNAB ─────────────────────────────────────────────────────────

describe('cnabService.parseRetornoCNAB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeSegmentALine(seuNumero: string, ocorrencia: string): string {
    // CNAB 240: tipoRegistro at index 7, segmento at index 13, seuNumero at 73-93, ocorrencia at 230-232
    const line = ' '.repeat(240);
    const chars = line.split('');
    chars[7] = '3'; // tipoRegistro === '3'
    chars[13] = 'A'; // segmento === 'A'
    // seuNumero: positions 73-92 (20 chars)
    const numPadded = seuNumero.padEnd(20, ' ');
    for (let i = 0; i < 20; i++) chars[73 + i] = numPadded[i];
    // ocorrencia: positions 230-231 (2 chars)
    chars[230] = ocorrencia[0];
    chars[231] = ocorrencia[1];
    return chars.join('');
  }

  function makeCnab400Line(seuNumero: string, pos63: boolean, ocorrencia: string): string {
    // CNAB 400 retorno: tipo '1' na posição 1; seu número 63-72 (padrão) ou
    // 68-77 (onde a remessa escreveu); ocorrência 109-110.
    const chars = ' '.repeat(400).split('');
    chars[0] = '1';
    const start = pos63 ? 62 : 67;
    const padded = seuNumero.padEnd(10, ' ');
    for (let i = 0; i < 10; i++) chars[start + i] = padded[i];
    chars[108] = ocorrencia[0];
    chars[109] = ocorrencia[1];
    return chars.join('');
  }

  it('ignores lines shorter than 240 chars', async () => {
    const result = await cnabService.parseRetornoCNAB('emp-1', 'short line\n');
    expect(result).toEqual({
      sucesso: 0,
      erro: 0,
      falhasTecnicas: 0,
      semVinculoFolha: 0,
      naoEncontrados: 0,
      detalhes: [],
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('processes success ocorrencia 00 and counts sucesso', async () => {
    const line = makeSegmentALine('SEU001', '00');
    const item = {
      id: 'item-1',
      folha_item_id: 'fi-1',
      nome_favorecido: 'João',
      seu_numero: 'SEU001',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: null });
    const folhaChain = makeChain({ error: null });
    const updateFolha = folhaChain.update;

    mockFrom
      .mockReturnValueOnce(selChain)
      .mockReturnValueOnce(remChain)
      .mockReturnValueOnce(updChain)
      .mockReturnValueOnce(folhaChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(1);
    expect(result.erro).toBe(0);
    expect(result.detalhes[0]).toEqual(
      expect.objectContaining({
        nome: 'João',
        status: 'pago',
        ocorrencia: '00',
      })
    );
    expect(updateFolha).toHaveBeenCalled();
  });

  it('processes error ocorrencia and counts erro', async () => {
    const line = makeSegmentALine('SEU002', '99');
    const item = {
      id: 'item-2',
      folha_item_id: null,
      nome_favorecido: 'Maria',
      seu_numero: 'SEU002',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: null });

    mockFrom.mockReturnValueOnce(selChain).mockReturnValueOnce(remChain).mockReturnValueOnce(updChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.erro).toBe(1);
    expect(result.sucesso).toBe(0);
    expect(result.detalhes[0].status).toBe('erro');
  });

  it('skips segment A lines where item is not found in DB', async () => {
    const line = makeSegmentALine('NOTFOUND', '00');

    const selChain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(selChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(0);
    expect(result.erro).toBe(0);
    expect(result.naoEncontrados).toBe(1);
    expect(result.detalhes).toHaveLength(0);
  });

  it('conta erro quando o update de cnab_itens falha (antes era engolido)', async () => {
    const line = makeSegmentALine('SEU003', '00');
    const item = {
      id: 'item-3',
      folha_item_id: 'fi-3',
      nome_favorecido: 'Ana',
      seu_numero: 'SEU003',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: { message: 'RLS' } });

    mockFrom.mockReturnValueOnce(selChain).mockReturnValueOnce(remChain).mockReturnValueOnce(updChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(0);
    expect(result.erro).toBe(0);
    expect(result.falhasTecnicas).toBe(1);
    expect(result.detalhes[0].ocorrencia).toBe('FALHA_UPDATE');
  });

  it('pagamento confirmado sem folha_item_id vira semVinculoFolha (conciliação manual)', async () => {
    const line = makeSegmentALine('SEU004', '00');
    const item = {
      id: 'item-4b',
      folha_item_id: null,
      nome_favorecido: 'Paulo',
      seu_numero: 'SEU004',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: null });

    mockFrom.mockReturnValueOnce(selChain).mockReturnValueOnce(remChain).mockReturnValueOnce(updChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(0);
    expect(result.erro).toBe(0);
    expect(result.falhasTecnicas).toBe(0);
    expect(result.semVinculoFolha).toBe(1);
    // cnab_itens ainda foi marcado pago — só falta o vínculo com a folha
    expect(updChain.update).toHaveBeenCalled();
  });

  it('CNAB400: casa item novo (10 chars) por posição 63-72', async () => {
    const line = makeCnab400Line('abcdef0007', true, '00');
    const item = {
      id: 'item-4',
      folha_item_id: 'fi-4',
      nome_favorecido: 'Beto',
      seu_numero: 'abcdef0007',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: null });
    const folhaChain = makeChain({ error: null });

    mockFrom
      .mockReturnValueOnce(selChain)
      .mockReturnValueOnce(remChain)
      .mockReturnValueOnce(updChain)
      .mockReturnValueOnce(folhaChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(1);
    expect(result.erro).toBe(0);
    expect(selChain.or).toHaveBeenCalled();
  });

  it('CNAB400: casa remessa antiga (12 chars) pelo prefixo gravado', async () => {
    // Remessas antigas gravaram 12 chars mas o arquivo ecoou só 10.
    const line = makeCnab400Line('1234567800', true, '00');
    const item = {
      id: 'item-5',
      folha_item_id: 'fi-5',
      nome_favorecido: 'Carla',
      seu_numero: '123456780012',
      remessa_id: 'rem-1',
    };

    const remChain = makeChain({ data: { empresa_id: 'emp-1' }, error: null });
    const selChain = makeChain({ data: [item], error: null });
    const updChain = makeChain({ error: null });
    const folhaChain = makeChain({ error: null });

    mockFrom
      .mockReturnValueOnce(selChain)
      .mockReturnValueOnce(remChain)
      .mockReturnValueOnce(updChain)
      .mockReturnValueOnce(folhaChain);

    const result = await cnabService.parseRetornoCNAB('emp-1', line);
    expect(result.sucesso).toBe(1);
  });

  it('CNAB400: linha de 400 chars que não é detalhe tipo 1 é ignorada', async () => {
    const header = '0' + ' '.repeat(399);
    const trailer = '9' + ' '.repeat(399);
    const result = await cnabService.parseRetornoCNAB('emp-1', header + '\n' + trailer);
    expect(result.sucesso).toBe(0);
    expect(result.naoEncontrados).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── fixtures compartilhadas dos geradores ────────────────────────────────────

const EMP = 'emp-1';
const FOLHA = 'folha-1';
const CONFIG = {
  banco_codigo: '001',
  agencia: '1234',
  agencia_digito: '1',
  conta: '00001',
  conta_digito: '5',
  convenio: 'CON001',
  nome_empresa: 'EMPRESA TESTE',
};
const REMESSA = { id: 'abcdef12-3456-7890-abcd-ef1234567890', status: 'pendente' };
const REMESSA_ENVIADA = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  status: 'enviado',
  arquivo_remessa: 'ARQUIVO_CACHED',
};
// CPFs válidos (módulo 11): 529.982.247-25 e 111.444.777-35
const ITENS = [
  {
    id: 'fi-1',
    colaborador_id: 'col-1',
    folha_id: FOLHA,
    total_liquido: 1234.56,
    colaborador: { id: 'col-1', nome_completo: 'João Silva', cpf: '52998224725' },
  },
  {
    id: 'fi-2',
    colaborador_id: 'col-2',
    folha_id: FOLHA,
    total_liquido: 765.44,
    colaborador: { id: 'col-2', nome_completo: 'Maria Souza', cpf: '11144477735' },
  },
];
const CONTAS = [
  {
    id: 'ct-1',
    colaborador_id: 'col-1',
    banco_codigo: '033',
    agencia: '2222',
    agencia_digito: '1',
    conta: '11111',
    digito: '2',
  },
  {
    id: 'ct-2',
    colaborador_id: 'col-2',
    banco_codigo: '033',
    agencia: '3333',
    conta: '22222',
    digito: '3',
    pix_chave: 'maria@pix.com',
    pix_tipo: 'EMAIL',
  },
];

/**
 * Mapeia `from(tabela)` para chains por tabela. `cnab_remessas` é chamada 3x
 * (select existente → insert → update); `remessasSeq` controla o resultado de
 * cada chamada em ordem.
 */
function mockTables(opts: {
  config?: unknown;
  itens?: unknown;
  contas?: unknown;
  remessasSeq?: unknown[];
  cnabItens?: unknown;
  folhaItensUpdate?: unknown;
}) {
  let remessaCalls = 0;
  const remessasSeq = opts.remessasSeq ?? [null];
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'cnab_configuracoes':
        return makeChain({ data: opts.config ?? null, error: null });
      case 'folha_itens':
        return opts.folhaItensUpdate ?? makeChain({ data: opts.itens ?? [], error: null });
      case 'contas_bancarias':
        return makeChain({ data: opts.contas ?? [], error: null });
      case 'cnab_remessas': {
        const r = remessasSeq[Math.min(remessaCalls, remessasSeq.length - 1)];
        remessaCalls++;
        return r;
      }
      case 'cnab_itens':
        return opts.cnabItens ?? makeChain({ data: null, error: null });
      default:
        return makeChain({ data: null, error: null });
    }
  });
}

// ─── generateCNAB240 ─────────────────────────────────────────────────────────

describe('cnabService.generateCNAB240', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 7, error: null });
  });

  it('gera arquivo CNAB 240 completo: header, lote, segmentos A/B e trailers de 240 colunas', async () => {
    const itensChain = makeChain({ data: REMESSA, error: null });
    const updRemessa = makeChain({ data: null, error: null });
    const remessaInsert = makeChain({ data: REMESSA, error: null });
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), remessaInsert, updRemessa],
      cnabItens: itensChain,
    });

    const file = await cnabService.generateCNAB240(EMP, FOLHA);
    const lines = file.split('\r\n');

    // 2 cabeçalhos + segA×2 + segB×1 (só col-2 tem PIX) + 2 trailers = 7 linhas
    expect(lines).toHaveLength(7);
    for (const l of lines) expect(l).toHaveLength(240);

    // Header de arquivo: banco 001 + lote 00000 + tipo '2' + convenio + data + sequencial RPC
    expect(lines[0].startsWith('00100000')).toBe(true);
    expect(lines[0]).toContain('EMPRESA TESTE');
    expect(lines[0]).toContain('000007'); // next_cnab_sequencial → 7
    expect(lines[0]).toContain('081');
    expect(mockRpc).toHaveBeenCalledWith('next_cnab_sequencial', {
      p_empresa_id: EMP,
      p_banco_codigo: '001',
    });

    // Segmentos A: valores em centavos com 15 dígitos
    expect(lines[2]).toContain('000000000123456'); // 1234.56
    expect(lines[2]).toContain('João Silva');
    expect(lines[3]).toContain('000000000076544'); // 765.44

    // Segmento B só existe para quem tem PIX
    expect(lines[4].charAt(13)).toBe('B');
    expect(lines[4]).toContain('maria@pix.com');

    // cnab_itens persistidos ANTES do update 'enviado'
    expect(itensChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        remessa_id: REMESSA.id,
        colaborador_id: 'col-1',
        seu_numero: 'abcdef12-1',
        valor_pagamento: 1234.56,
        data_pagamento: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        status: 'processando',
      }),
      expect.objectContaining({
        colaborador_id: 'col-2',
        seu_numero: 'abcdef12-2',
        valor_pagamento: 765.44,
      }),
    ]);
    // remessa criada já com sequencial_arquivo (NOT NULL no canônico)
    expect(remessaInsert.insert).toHaveBeenCalledWith([expect.objectContaining({ sequencial_arquivo: 7 })]);
    expect(updRemessa.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'enviado', sequencial_arquivo: 7, arquivo_remessa: file })
    );
  });

  it('aborta sem marcar enviado quando o insert de cnab_itens falha', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null }), updRemessa],
      cnabItens: makeChain({ data: null, error: { message: 'violates not-null' } }),
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow();
    expect(updRemessa.update).not.toHaveBeenCalled();
  });

  it('retorna arquivo em cache quando remessa já está enviada (idempotência)', async () => {
    mockTables({
      config: CONFIG,
      remessasSeq: [makeChain({ data: REMESSA_ENVIADA, error: null })],
    });
    const file = await cnabService.generateCNAB240(EMP, FOLHA);
    expect(file).toBe('ARQUIVO_CACHED');
    // folha_itens nunca consultada — retorno precoce
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('propaga falha da RPC de sequencial em vez de reutilizar o número 1', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null }), updRemessa],
    });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('rpc down');
    expect(updRemessa.update).not.toHaveBeenCalled();
  });

  it('corrida de insert (23505) retorna o arquivo da remessa vencedora', async () => {
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: null, error: null }),
        makeChain({ data: null, error: { message: 'dup', code: '23505' } }),
        makeChain({
          data: { status: 'enviado', arquivo_remessa: 'ARQ_CONCORRENTE', banco_codigo: '001' },
          error: null,
        }),
      ],
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).resolves.toBe('ARQ_CONCORRENTE');
  });

  it('corrida de insert rejeita remessa enviada de outro banco', async () => {
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: null, error: null }),
        makeChain({ data: null, error: { message: 'dup', code: '23505' } }),
        makeChain({ data: { status: 'enviado', arquivo_remessa: 'ARQ_OUTRO', banco_codigo: '237' }, error: null }),
      ],
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('outro banco');
  });

  it('corrida de insert (23505) com remessa pendente aborta com em-andamento', async () => {
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: null, error: null }),
        makeChain({ data: null, error: { message: 'dup', code: '23505' } }),
        makeChain({ data: { status: 'pendente' }, error: null }),
      ],
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('sendo gerada');
  });

  it('reutiliza remessa pendente sem criar nova (recuperação de tentativa falha)', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    const claim = makeChain({ data: [REMESSA], error: null });
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: REMESSA, error: null }), claim, updRemessa],
    });
    const file = await cnabService.generateCNAB240(EMP, FOLHA);
    expect(file.split('\r\n').length).toBeGreaterThan(0);
    expect(claim.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processando' }));
    expect(updRemessa.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'enviado' }));
  });

  it('retry concorrente sem claim aborta com em-andamento', async () => {
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: REMESSA, error: null }),
        makeChain({ data: [], error: null }), // claim pendente: perdeu
        makeChain({ data: [], error: null }), // claim processando>10min: perdeu
        makeChain({ data: { status: 'processando' }, error: null }), // re-query
      ],
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('sendo gerada');
  });

  it('lança erro quando não há configuração CNAB', async () => {
    mockTables({ config: null });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('Configuração CNAB não encontrada');
  });

  it('lança erro quando a folha não tem itens', async () => {
    mockTables({
      config: CONFIG,
      itens: [],
      remessasSeq: [makeChain({ data: null, error: null })],
    });
    await expect(cnabService.generateCNAB240(EMP, FOLHA)).rejects.toThrow('Nenhum pagamento');
  });

  it('pula itens sem conta bancária principal — arquivo sai só com quem tem conta', async () => {
    const itensChain = makeChain({ data: null, error: null });
    mockTables({
      config: CONFIG,
      itens: ITENS,
      contas: [CONTAS[1]], // só col-2 tem conta
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
      cnabItens: itensChain,
    });
    const file = await cnabService.generateCNAB240(EMP, FOLHA);
    const lines = file.split('\r\n');
    // 2 cabeçalhos + segA + segB (col-2 tem PIX) + 2 trailers = 6
    expect(lines).toHaveLength(6);
    expect(itensChain.insert).toHaveBeenCalledWith([expect.objectContaining({ colaborador_id: 'col-2' })]);
  });
});

// ─── generatePIXBatch ────────────────────────────────────────────────────────

describe('cnabService.generatePIXBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gera CSV apenas com colaboradores que têm chave PIX', async () => {
    mockTables({ itens: ITENS, contas: CONTAS });
    const csv = await cnabService.generatePIXBatch(EMP, FOLHA);
    const rows = csv.split('\n');
    expect(rows[0]).toBe('Nome;CPF/CNPJ;Chave Pix;Tipo Chave;Valor;Descricao;ID_Folha_Item');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe('Maria Souza;11144477735;maria@pix.com;EMAIL;765,44;Pagamento Salarial;fi-2');
  });

  it('usa pix_tipo CPF como default quando ausente', async () => {
    const contas = [{ ...CONTAS[1], pix_tipo: undefined }];
    mockTables({ itens: [ITENS[1]], contas });
    const csv = await cnabService.generatePIXBatch(EMP, FOLHA);
    expect(csv.split('\n')[1]).toContain(';CPF;');
  });

  it('lança erro quando ninguém na folha tem chave PIX', async () => {
    mockTables({ itens: ITENS, contas: [CONTAS[0]] });
    await expect(cnabService.generatePIXBatch(EMP, FOLHA)).rejects.toThrow('chave PIX');
  });

  it('lança erro quando a folha está vazia', async () => {
    mockTables({ itens: [], contas: [] });
    await expect(cnabService.generatePIXBatch(EMP, FOLHA)).rejects.toThrow('Nenhum pagamento');
  });
});

// ─── generateCNAB400 ─────────────────────────────────────────────────────────

describe('cnabService.generateCNAB400', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 7, error: null });
  });

  it('gera arquivo CNAB 400 com todas as linhas de exatamente 400 colunas', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    const itensChain = makeChain({ data: null, error: null });
    const remessaInsert = makeChain({ data: REMESSA, error: null });
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), remessaInsert, updRemessa],
      cnabItens: itensChain,
    });

    const file = await cnabService.generateCNAB400(EMP, FOLHA, {
      banco_codigo: '001',
      nome_empresa: 'EMPRESA TESTE',
    });
    const lines = file.split('\r\n');

    // header + 2 detalhes + trailer = 4 linhas de 400 colunas
    expect(lines).toHaveLength(4);
    for (const l of lines) expect(l).toHaveLength(400);

    // Header: tipo 0 + operação 1 + REMESSA + serviço 01 + banco 001 + nome
    expect(lines[0].startsWith('01REMESSA01001')).toBe(true);
    expect(lines[0]).toContain('EMPRESA TESTE');
    expect(lines[0].substring(59, 65)).toMatch(/^\d{6}$/); // data DDMMAA

    // Detalhes: tipo 1, CPF padded a 14, valor em centavos 15 dígitos
    expect(lines[1].charAt(0)).toBe('1');
    expect(lines[1]).toContain('JOÃO SILVA');
    expect(lines[1]).toContain('00052998224725');
    expect(lines[1]).toContain('000000000123456');
    expect(lines[2]).toContain('MARIA SOUZA');

    // Trailer: tipo 9 + soma 2000.00 (200000) em 17 dígitos + total de registros
    expect(lines[3].charAt(0)).toBe('9');
    expect(lines[3].endsWith('00000000000200000' + '000004')).toBe(true);

    // Itens persistidos e remessa marcada como enviada com o arquivo
    expect(itensChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        seu_numero: 'abcdef0001',
        nome_favorecido: 'JOÃO SILVA',
        data_pagamento: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.objectContaining({ seu_numero: 'abcdef0002', nome_favorecido: 'MARIA SOUZA' }),
    ]);
    // remessa criada já com sequencial_arquivo vindo da RPC (não hardcoded)
    expect(remessaInsert.insert).toHaveBeenCalledWith([expect.objectContaining({ sequencial_arquivo: 7 })]);
    expect(updRemessa.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'enviado', sequencial_arquivo: 7, arquivo_remessa: file })
    );
  });

  it('aborta sem marcar enviado quando o insert de cnab_itens falha', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null }), updRemessa],
      cnabItens: makeChain({ data: null, error: { message: 'violates not-null' } }),
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow();
    expect(updRemessa.update).not.toHaveBeenCalled();
  });

  it('busca config do banco quando opts.banco_codigo não informado', async () => {
    mockTables({
      config: CONFIG,
      itens: [ITENS[0]],
      contas: [CONTAS[0]],
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
    });
    const file = await cnabService.generateCNAB400(EMP, FOLHA);
    expect(file.split('\r\n')).toHaveLength(3);
  });

  it('retorna arquivo em cache quando remessa já enviada (idempotência)', async () => {
    mockTables({ remessasSeq: [makeChain({ data: REMESSA_ENVIADA, error: null })] });
    const file = await cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' });
    expect(file).toBe('ARQUIVO_CACHED');
  });

  it('rejeita CPF inválido com cnabErrors detalhados', async () => {
    const itens = [{ ...ITENS[0], colaborador: { id: 'col-1', nome_completo: 'Inválido', cpf: '12345678900' } }];
    mockTables({
      itens,
      contas: [CONTAS[0]],
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
    });
    const err = await cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('CPF inválido');
    expect((err as Error & { cnabErrors: string[] }).cnabErrors[0]).toContain('CPF inválido');
  });

  it('rejeita item com valor zero', async () => {
    const itens = [{ ...ITENS[0], total_liquido: 0 }];
    mockTables({
      itens,
      contas: [CONTAS[0]],
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow('deve ser > 0');
  });

  it('lança erro quando nenhum item tem conta bancária', async () => {
    mockTables({
      itens: ITENS,
      contas: [],
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow(
      'Nenhum pagamento válido'
    );
  });

  it('lança erro quando a folha está vazia', async () => {
    mockTables({
      itens: [],
      remessasSeq: [makeChain({ data: null, error: null })],
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow('Nenhum pagamento');
  });

  it('propaga falha da RPC de sequencial em vez de reutilizar o número 1', async () => {
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: null, error: null }), makeChain({ data: REMESSA, error: null })],
    });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow('rpc down');
  });

  it('corrida de insert (23505) retorna o arquivo da remessa vencedora', async () => {
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: null, error: null }),
        makeChain({ data: null, error: { message: 'dup', code: '23505' } }),
        makeChain({
          data: { status: 'enviado', arquivo_remessa: 'ARQ_CONCORRENTE', banco_codigo: '001' },
          error: null,
        }),
      ],
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).resolves.toBe('ARQ_CONCORRENTE');
  });

  it('corrida de insert rejeita remessa enviada de outro banco', async () => {
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [
        makeChain({ data: null, error: null }),
        makeChain({ data: null, error: { message: 'dup', code: '23505' } }),
        makeChain({ data: { status: 'enviado', arquivo_remessa: 'ARQ_OUTRO', banco_codigo: '237' }, error: null }),
      ],
    });
    await expect(cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' })).rejects.toThrow('outro banco');
  });

  it('reutiliza remessa pendente no retry em vez de colidir com o índice único', async () => {
    const updRemessa = makeChain({ data: null, error: null });
    const claim = makeChain({ data: [REMESSA], error: null });
    const itensDel = makeChain({ data: null, error: null });
    mockTables({
      itens: ITENS,
      contas: CONTAS,
      remessasSeq: [makeChain({ data: REMESSA, error: null }), claim, updRemessa],
      cnabItens: itensDel,
    });
    const file = await cnabService.generateCNAB400(EMP, FOLHA, { banco_codigo: '001' });
    expect(file.split('\r\n').length).toBeGreaterThan(0);
    expect(claim.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processando' }));
    expect(itensDel.delete).toHaveBeenCalled();
    expect(itensDel.insert).toHaveBeenCalled();
    expect(updRemessa.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'enviado' }));
  });
});
