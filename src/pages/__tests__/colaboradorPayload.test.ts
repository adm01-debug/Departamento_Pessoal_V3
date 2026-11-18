import { describe, it, expect } from 'vitest';
import { NULLABLE_TEXT_FIELDS, normalizarPayloadColaborador } from '../colaboradorPayload';

/**
 * O caso que dá nome a tudo isto: `public.colaboradores` tem índice ÚNICO em
 * `matricula` sozinha (`colaboradores_matricula_key`), sem cláusula parcial.
 * Com `''`, o PRIMEIRO colaborador salvo sem matrícula ocupa o valor e o
 * SEGUNDO falha com violação de unicidade. Com `NULL`, não há conflito.
 */

const preenchido = {
  nome_completo: 'Colaborador de Teste',
  cpf: '12345678900',
  email: 'teste@empresa.com',
  cargo: 'Analista',
  departamento: 'RH',
  nome_mae: 'Mãe do Colaborador',
  salario_base: 3500.5,
  data_admissao: '2026-01-02',
  status: 'ativo',
};

function comTodosVazios() {
  const vazios: Record<string, unknown> = { ...preenchido };
  for (const campo of NULLABLE_TEXT_FIELDS) vazios[campo] = '';
  return vazios;
}

describe('normalizarPayloadColaborador', () => {
  it.each([...NULLABLE_TEXT_FIELDS])('converte "%s" vazio para null', (campo) => {
    const payload = normalizarPayloadColaborador(comTodosVazios());
    expect(payload[campo]).toBeNull();
  });

  it('matricula em branco vira null — é o que evita a colisão no índice único', () => {
    expect(normalizarPayloadColaborador({ ...preenchido, matricula: '' }).matricula).toBeNull();
    // Só espaços também: o usuário pode ter batido a barra de espaço no campo.
    expect(normalizarPayloadColaborador({ ...preenchido, matricula: '   ' }).matricula).toBeNull();
  });

  it('não mexe em campo preenchido', () => {
    const payload = normalizarPayloadColaborador({
      ...comTodosVazios(),
      matricula: 'R-001',
      nome_social: 'Aninha',
      telefone: '1122223333',
    });
    expect(payload.matricula).toBe('R-001');
    expect(payload.nome_social).toBe('Aninha');
    expect(payload.telefone).toBe('1122223333');
  });

  it('não toca em campo obrigatório nem em coluna NOT NULL', () => {
    // `cargo`, `departamento` e `nome_mae` são NOT NULL no banco: virar null
    // trocaria um "" inofensivo por um erro de constraint.
    const payload = normalizarPayloadColaborador({
      ...preenchido,
      cargo: '',
      departamento: '',
      nome_mae: '',
      nome_completo: '',
      cpf: '',
    });
    expect(payload.cargo).toBe('');
    expect(payload.departamento).toBe('');
    expect(payload.nome_mae).toBe('');
    expect(payload.nome_completo).toBe('');
    expect(payload.cpf).toBe('');
  });

  it('preserva tipos que não são string e não inventa chave', () => {
    const payload = normalizarPayloadColaborador({
      ...preenchido,
      salario_base: 0,
      ativo: false,
      observacao: undefined,
    });
    expect(payload.salario_base).toBe(0);
    expect(payload.ativo).toBe(false);
    expect(payload.observacao).toBeUndefined();
    expect(Object.keys(payload)).toContain('observacao');
  });

  it('devolve uma cópia — o objeto do formulário não é mutado', () => {
    const original = { ...preenchido, matricula: '' };
    const payload = normalizarPayloadColaborador(original);
    expect(payload).not.toBe(original);
    expect(original.matricula).toBe('');
  });

  it('a lista cobre só colunas nullable que o formulário coleta', () => {
    // Guarda contra alguém incluir aqui uma coluna NOT NULL por engano.
    for (const proibido of ['cargo', 'departamento', 'nome_mae', 'nome_completo', 'cpf', 'email']) {
      expect(NULLABLE_TEXT_FIELDS).not.toContain(proibido);
    }
    expect(NULLABLE_TEXT_FIELDS).toContain('matricula');
    expect(new Set(NULLABLE_TEXT_FIELDS).size).toBe(NULLABLE_TEXT_FIELDS.length);
  });
});
