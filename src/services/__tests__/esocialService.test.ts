import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEventoDescricao,
  listarEventos,
  listarEventosPorCompetencia,
  obterEstatisticas,
  listarEventosValidaveis,
  validarAnteDeEnviar,
} from '../esocialService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

/**
 * Chain canônico: aceita qualquer encadeamento (`select → order → limit → eq`,
 * `select → eq → eq`, etc.) sem precisar prever a forma exata da query.
 */
function buildChain(data: any, error: any = null) {
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
  beforeEach(() => { vi.clearAllMocks(); });

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
    buildEventosChain(null as any);
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
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('counts enviados, pendentes, erros correctly', async () => {
    buildEventosChain([
      { status: 'enviado' },
      { status: 'enviado' },
      { status: 'pendente' },
      { status: 'erro' },
    ]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.enviados).toBe(2);
    expect(stats.pendentes).toBe(1);
    expect(stats.erros).toBe(1);
  });

  it('conformidade = 100% when no eventos', async () => {
    buildEventosChain([]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.conformidade).toBe(100);
  });

  it('conformidade = 75% with 1 error in 4 events', async () => {
    buildEventosChain([
      { status: 'enviado' },
      { status: 'enviado' },
      { status: 'pendente' },
      { status: 'erro' },
    ]);
    const stats = await obterEstatisticas(EMPRESA_ID);
    expect(stats.conformidade).toBe(75);
  });

  it('conformidade = 100% when all enviado', async () => {
    buildEventosChain([
      { status: 'enviado' },
      { status: 'enviado' },
    ]);
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
