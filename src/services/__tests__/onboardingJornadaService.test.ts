import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => deepChain(mockFrom(...args)) },
}));

import { listarKits, criarKit, definirAtivoKit } from '../onboardingJornadaService';

interface Resposta {
  data: unknown;
  error: unknown;
}

/** Chain thenable que registra `eq`/`order` e resolve sempre a mesma resposta. */
function makeChain(response: Resposta) {
  const chain = {
    eq: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn),
    catch: (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn),
    finally: (fn: () => void) => Promise.resolve(response).finally(fn),
  };
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
}

const KIT_LINHA = {
  id: 'kit-1',
  nome: 'Kit Administrativo',
  itens: ['Crachá', 'Notebook'],
  ativo: true,
  created_at: '2026-01-02T03:04:05Z',
};

describe('listarKits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra por empresa_id e por ativo quando não inclui inativos', async () => {
    const chain = makeChain({ data: [KIT_LINHA], error: null });
    const selectFn = vi.fn().mockReturnValue(chain);
    mockFrom.mockReturnValue({ select: selectFn });

    const kits = await listarKits('emp-1');

    expect(mockFrom).toHaveBeenCalledWith('onboarding_kits');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('ativo', true);
    expect(chain.order).toHaveBeenCalledWith('nome');
    expect(kits).toEqual([
      {
        id: 'kit-1',
        nome: 'Kit Administrativo',
        itens: ['Crachá', 'Notebook'],
        ativo: true,
        created_at: '2026-01-02T03:04:05Z',
        imagem_url: null,
      },
    ]);
  });

  it('mantém o recorte de empresa e dispensa o filtro de ativo no modo gerenciador', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    await listarKits('emp-1', true);

    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(chain.eq).not.toHaveBeenCalledWith('ativo', true);
  });

  it('normaliza `itens` (JSONB) descartando valores que não são texto', async () => {
    const chain = makeChain({ data: [{ ...KIT_LINHA, itens: ['Crachá', 42, null] }], error: null });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    const kits = await listarKits('emp-1');

    expect(kits[0].itens).toEqual(['Crachá']);
  });

  it('lança o erro da query em vez de devolver lista vazia', async () => {
    const chain = makeChain({ data: null, error: { message: 'permission denied' } });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    await expect(listarKits('emp-1')).rejects.toEqual({ message: 'permission denied' });
  });
});

describe('criarKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grava empresa_id junto com nome/itens e ignora imagem_url (sem coluna no banco)', async () => {
    const chain = makeChain({ data: KIT_LINHA, error: null });
    const insertFn = vi.fn().mockReturnValue(chain);
    mockFrom.mockReturnValue({ insert: insertFn });

    const kit = await criarKit('emp-1', {
      nome: 'Kit Administrativo',
      itens: ['Crachá', 'Notebook'],
      imagem_url: 'https://exemplo/kit.png',
    });

    expect(mockFrom).toHaveBeenCalledWith('onboarding_kits');
    expect(insertFn).toHaveBeenCalledWith({
      empresa_id: 'emp-1',
      nome: 'Kit Administrativo',
      itens: ['Crachá', 'Notebook'],
      ativo: true,
    });
    expect(kit.id).toBe('kit-1');
  });

  it('recusa empresaId vazio antes de tocar no banco', async () => {
    await expect(criarKit('', { nome: 'Kit', itens: [] })).rejects.toThrow(/empresa_id/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('lança quando o insert não devolve linha', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue(chain) });

    await expect(criarKit('emp-1', { nome: 'Kit', itens: [] })).rejects.toThrow(
      'Não foi possível criar o perfil de kit.'
    );
  });
});

describe('definirAtivoKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('alterna apenas o campo ativo da linha pedida', async () => {
    const chain = makeChain({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue(chain);
    mockFrom.mockReturnValue({ update: updateFn });

    await definirAtivoKit('kit-1', false);

    expect(mockFrom).toHaveBeenCalledWith('onboarding_kits');
    expect(updateFn).toHaveBeenCalledWith({ ativo: false });
    expect(chain.eq).toHaveBeenCalledWith('id', 'kit-1');
  });

  it('propaga o erro do update', async () => {
    const chain = makeChain({ data: null, error: { message: 'row level security' } });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue(chain) });

    await expect(definirAtivoKit('kit-1', true)).rejects.toEqual({ message: 'row level security' });
  });
});
