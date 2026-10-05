import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateInput, validateTablePayload } from '../validate';
import { feriasSchema } from '../ferias';
import { uuidPg } from '../common';

describe('validateInput', () => {
  const schema = z.object({
    nome: z.string().min(1),
    idade: z.number().int().min(0).optional(),
    status: z.enum(['ativo', 'inativo']).optional(),
  });

  it('rejeita payload vazio', () => {
    expect(() => validateInput(schema, {}, 'ctx')).toThrow(/payload vazio/);
  });

  it('aceita payload parcial válido (update)', () => {
    expect(() => validateInput(schema, { status: 'ativo' }, 'ctx')).not.toThrow();
  });

  it('rejeita valor fora de domínio mesmo em payload parcial', () => {
    expect(() => validateInput(schema, { status: 'zumbi' }, 'ctx')).toThrow(/status/);
  });

  it('rejeita tipo errado', () => {
    expect(() => validateInput(schema, { idade: 'abc' }, 'ctx')).toThrow(/idade/);
  });
});

describe('validateInput — refinements de schema completo', () => {
  const base = {
    colaborador_id: '550e8400-e29b-41d4-a716-446655440000',
    data_inicio: '2026-10-05', // segunda-feira
    data_fim: '2026-10-15',
    dias_gozo: 10,
  };

  it('roda superRefine quando o payload cobre as chaves obrigatórias (data_fim < data_inicio)', () => {
    expect(() => validateInput(feriasSchema, { ...base, data_fim: '2026-10-01' }, 'ferias')).toThrow(/data_fim/);
  });

  it('roda superRefine para férias iniciando em domingo', () => {
    // 2026-10-04 é domingo
    expect(() => validateInput(feriasSchema, { ...base, data_inicio: '2026-10-04' }, 'ferias')).toThrow(
      /domingo|data_inicio/
    );
  });

  it('aceita payload completo válido', () => {
    expect(() => validateInput(feriasSchema, { ...base }, 'ferias')).not.toThrow();
  });

  it('payload parcial não exige refinements (update de status-only)', () => {
    expect(() => validateInput(feriasSchema, { observacoes: 'ok' }, 'ferias')).not.toThrow();
  });
});

describe('uuidPg', () => {
  it('aceita uuid real', () => {
    expect(uuidPg().safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejeita valores inválidos', () => {
    expect(uuidPg().safeParse('').success).toBe(false);
    expect(uuidPg().safeParse(123).success).toBe(false);
    expect(uuidPg().safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('validateTablePayload', () => {
  it('rejeita coluna desconhecida', () => {
    expect(() => validateTablePayload('ferias', { coluna_inventada: 1 }, 'ctx')).toThrow(/coluna_inventada/);
  });

  it('rejeita array vazio', () => {
    expect(() => validateTablePayload('ferias', [], 'ctx')).toThrow(/payload vazio/);
  });

  it('rejeita objeto vazio', () => {
    expect(() => validateTablePayload('ferias', {}, 'ctx')).toThrow(/payload vazio/);
  });

  it('aceita payload com colunas reais e retorna o payload', () => {
    const p = { colaborador_id: 'x', data_inicio: '2026-10-05' };
    expect(validateTablePayload('ferias', p, 'ctx')).toBe(p);
  });

  it('tabela fora do mapa é fail-open (passa sem validar)', () => {
    const p = { qualquer: 'coisa' };
    expect(validateTablePayload('tabela_que_nao_existe_xyz', p, 'ctx')).toBe(p);
  });
});

describe('validateInput — schema sem shape (não-objeto)', () => {
  const unionSchema = z.union([
    z.object({ tipo: z.literal('a'), valor: z.string() }),
    z.object({ tipo: z.literal('b'), valor: z.number() }),
  ]);

  it('não lança TypeError — usa parse completo quando não há shape', () => {
    expect(() => validateInput(unionSchema, { tipo: 'a', valor: 'x' }, 'ctx')).not.toThrow();
  });

  it('rejeita variant inválida', () => {
    expect(() => validateInput(unionSchema, { tipo: 'a', valor: 5 }, 'ctx')).toThrow();
  });
});
