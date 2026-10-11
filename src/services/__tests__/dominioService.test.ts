import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  buscarCBO,
  buscarCNAE,
  getFeriados,
  getINSSTable,
  getIRRFTable,
  getRubricas,
  invalidateDomainCache,
} from '../dominioService';

const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

function dominioResult(rows: unknown[]) {
  return { data: { data: rows }, error: null };
}

describe('dominioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDomainCache();
    invoke.mockResolvedValue(dominioResult([]));
  });

  it('buscarCBO ignora termo curto sem chamar a função', async () => {
    expect(await buscarCBO('')).toEqual([]);
    expect(await buscarCBO('a')).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('buscarCBO filtra por código ou descrição (case-insensitive) e limita a 20', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      codigo: `000${i}`,
      descricao: i % 2 === 0 ? 'Pedreiro de obras' : 'Outro',
      grupo: null,
    }));
    invoke.mockResolvedValue(dominioResult(rows));
    const porCodigo = await buscarCBO('0005');
    expect(porCodigo.map((r) => r.codigo)).toEqual(['0005']);

    invalidateDomainCache();
    const porDescricao = await buscarCBO('PEDREIRO');
    expect(porDescricao).toHaveLength(15);
  });

  it('buscarCNAE filtra por código/descrição', async () => {
    invoke.mockResolvedValue(
      dominioResult([
        { codigo: '6201-5', descricao: 'Desenvolvimento de programas', subclasse: null },
        { codigo: '4711-3', descricao: 'Comércio varejista', subclasse: null },
      ])
    );
    const res = await buscarCNAE('6201');
    expect(res).toHaveLength(1);
    expect(res[0].descricao).toContain('Desenvolvimento');
  });

  it('cache local evita segunda chamada dentro do TTL', async () => {
    await getIRRFTable();
    await getIRRFTable();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('tabelas-dominio', { body: { type: 'irrf' } });
  });

  it('invalidateDomainCache força nova busca', async () => {
    await getINSSTable();
    invalidateDomainCache('inss');
    await getINSSTable();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('invalidateDomainCache() sem tipo limpa todos os domínios', async () => {
    await getRubricas();
    invalidateDomainCache();
    await getRubricas();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('getFeriados filtra pelo ano informado (ou corrente)', async () => {
    invoke.mockResolvedValue(
      dominioResult([
        { data: '2026-01-01', nome: 'Confraternização', tipo: 'nacional', municipio: null, estado: null },
        { data: '2025-12-25', nome: 'Natal', tipo: 'nacional', municipio: null, estado: null },
      ])
    );
    const fer2026 = await getFeriados(2026);
    expect(fer2026).toHaveLength(1);
    expect(fer2026[0].data).toBe('2026-01-01');
  });

  it('propaga erro da edge function', async () => {
    const err = new Error('boom');
    invoke.mockResolvedValue({ data: null, error: err });
    await expect(getRubricas()).rejects.toThrow('boom');
  });
});
