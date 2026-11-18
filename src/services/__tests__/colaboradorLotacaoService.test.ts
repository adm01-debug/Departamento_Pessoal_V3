import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { colaboradorLotacaoService } from '../colaboradorLotacaoService';

type Resultado = { data: unknown; error: unknown };
interface Chamada {
  metodo: string;
  args: unknown[];
}
interface Builder {
  tabela: string;
  chamadas: Chamada[];
  builder: Record<string, unknown>;
}

/**
 * Mock do query builder do supabase-js: cada método encadeável devolve o
 * próprio builder e o objeto é *thenable* — é assim que `await
 * supabase.from(x).select(y).eq(...)` resolve na biblioteca real, sem um
 * `.then()` explícito no fim da cadeia.
 */
function criarBuilder(tabela: string, resultado: Resultado): Builder {
  const chamadas: Chamada[] = [];
  const builder: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'neq', 'or', 'order', 'update', 'upsert']) {
    builder[metodo] = vi.fn((...args: unknown[]) => {
      chamadas.push({ metodo, args });
      return builder;
    });
  }
  builder.maybeSingle = vi.fn((...args: unknown[]) => {
    chamadas.push({ metodo: 'maybeSingle', args });
    return Promise.resolve(resultado);
  });
  builder.then = (ok?: (v: Resultado) => unknown, erro?: (e: unknown) => unknown) =>
    Promise.resolve(resultado).then(ok, erro);
  return { tabela, chamadas, builder };
}

let criados: Builder[] = [];

/** Encadeia resultados na ordem em que `from()` é chamado. */
function prepararFrom(...resultados: Resultado[]) {
  criados = [];
  let i = 0;
  vi.mocked(supabase.from).mockImplementation(((tabela: string) => {
    const b = criarBuilder(tabela, resultados[Math.min(i, resultados.length - 1)]);
    i += 1;
    criados.push(b);
    return b.builder;
  }) as unknown as typeof supabase.from);
}

const argsDe = (b: Builder, metodo: string) => b.chamadas.filter((c) => c.metodo === metodo).map((c) => c.args);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarCatalogo', () => {
  it('filtra pela empresa e exclui só o ativa=false (NULL continua valendo)', async () => {
    prepararFrom({ data: [{ id: 'l1', nome: 'Matriz', codigo: null }], error: null });
    const r = await colaboradorLotacaoService.listarCatalogo('emp-1');
    expect(r).toEqual([{ id: 'l1', nome: 'Matriz', codigo: null }]);
    expect(criados[0].tabela).toBe('lotacoes');
    expect(argsDe(criados[0], 'eq')).toEqual([['empresa_id', 'emp-1']]);
    expect(argsDe(criados[0], 'or')).toEqual([['ativa.eq.true,ativa.is.null']]);
    // `.neq('ativa', false)` descartaria as linhas NULL — por isso não é usado.
    expect(argsDe(criados[0], 'neq')).toEqual([]);
  });

  it('propaga o erro do banco', async () => {
    prepararFrom({ data: null, error: new Error('rls') });
    await expect(colaboradorLotacaoService.listarCatalogo('emp-1')).rejects.toThrow('rls');
  });
});

describe('buscarPrincipal', () => {
  it('devolve null quando o colaborador ainda não tem vínculo', async () => {
    prepararFrom({ data: null, error: null });
    await expect(colaboradorLotacaoService.buscarPrincipal('col-1', 'emp-1')).resolves.toBeNull();
    expect(argsDe(criados[0], 'eq')).toEqual([
      ['colaborador_id', 'col-1'],
      ['empresa_id', 'emp-1'],
      ['principal', true],
    ]);
  });

  it('escopa pela empresa — não só pelo colaborador', async () => {
    prepararFrom({ data: { id: 'v1', lotacao_id: 'l1', principal: true }, error: null });
    await colaboradorLotacaoService.buscarPrincipal('col-1', 'emp-1');
    expect(argsDe(criados[0], 'eq')).toContainEqual(['empresa_id', 'emp-1']);
  });
});

describe('definirPrincipal', () => {
  it('desmarca a principal anterior ANTES do upsert e poupa a lotação alvo', async () => {
    prepararFrom({ data: null, error: null }, { data: null, error: null });
    await colaboradorLotacaoService.definirPrincipal('col-1', 'l2', 'emp-1');

    // Ordem: o índice único parcial (ON colaborador_id WHERE principal)
    // rejeitaria a segunda principal se o upsert viesse primeiro.
    expect(criados).toHaveLength(2);
    expect(argsDe(criados[0], 'update')).toEqual([[{ principal: false }]]);
    expect(argsDe(criados[0], 'neq')).toEqual([['lotacao_id', 'l2']]);
    expect(argsDe(criados[1], 'upsert')).toEqual([
      [
        { empresa_id: 'emp-1', colaborador_id: 'col-1', lotacao_id: 'l2', principal: true },
        { onConflict: 'colaborador_id,lotacao_id' },
      ],
    ]);
  });

  it('não roda o upsert se o desmarque falhar', async () => {
    prepararFrom({ data: null, error: new Error('falha no update') });
    await expect(colaboradorLotacaoService.definirPrincipal('col-1', 'l2', 'emp-1')).rejects.toThrow('falha no update');
    expect(criados).toHaveLength(1);
  });

  it('propaga o erro do upsert (estado fica com zero principal, nunca com duas)', async () => {
    prepararFrom({ data: null, error: null }, { data: null, error: new Error('conflito') });
    await expect(colaboradorLotacaoService.definirPrincipal('col-1', 'l2', 'emp-1')).rejects.toThrow('conflito');
    expect(criados).toHaveLength(2);
  });
});
