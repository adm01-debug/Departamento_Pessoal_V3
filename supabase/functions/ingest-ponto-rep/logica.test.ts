// deno test supabase/functions/ingest-ponto-rep/logica.test.ts
import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { classificaErroVinculo, diasAlterados, envioSchema, sha256Hex, tokenPlausivel, vincular } from './logica.ts';

const func = (extra: Record<string, unknown> = {}) => ({
  codigo: 7, nome: 'A', matricula: null, cpf: null, pis: null, situacao: 'ATIVO',
  empresa_codigo: 1, horario_codigo: 1, data_admissao: null, data_desligamento: null, ...extra,
});
const colab = (id: string, extra: Record<string, unknown> = {}) => ({
  id, cpf: null, pis_pasep: null, matricula: null, ...extra,
});
const dia = (extra: Record<string, unknown> = {}) => ({
  funcionario_codigo: 7, data: '2026-11-20', marcacoes: [], abono: null, abono_negativo: null,
  folga: false, neutro: false, justificativa_abono: null, horario_codigo: 1, hash: 'a'.repeat(64), ...extra,
});
const envio = (extra: Record<string, unknown> = {}) => ({
  versao_coletor: '1.0.0', periodo: { inicio: '2026-10-07', fim: '2026-11-21' }, parte: 1, partes: 1,
  funcionarios: [], justificativas: [], dias: [], ...extra,
});

Deno.test('vincula por CPF mesmo com formatação diferente', () => {
  const v = vincular(func({ cpf: '12345678909' }), [colab('c1', { cpf: '123.456.789-09' }), colab('c2', { cpf: '111' })]);
  assertEquals(v, { colaborador_id: 'c1', metodo: 'cpf' });
});

Deno.test('CPF sem zero à esquerda casa com CPF completo', () => {
  const v = vincular(func({ cpf: '1234567809' }), [colab('c1', { cpf: '012.345.678-09' })]);
  assertEquals(v, { colaborador_id: 'c1', metodo: 'cpf' });
});

Deno.test('sem CPF cai para PIS e depois matrícula', () => {
  assertEquals(vincular(func({ pis: '12045678901' }), [colab('c1', { pis_pasep: '120.45678.90-1' })]),
    { colaborador_id: 'c1', metodo: 'pis' });
  assertEquals(vincular(func({ matricula: ' 0012 ' }), [colab('c1', { matricula: '0012' })]),
    { colaborador_id: 'c1', metodo: 'matricula' });
});

Deno.test('chave ambígua não vincula e não tenta a próxima', () => {
  const v = vincular(func({ cpf: '12345678909', matricula: '9' }),
    [colab('c1', { cpf: '12345678909' }), colab('c2', { cpf: '12345678909', matricula: '9' })]);
  assertEquals(v, null);
});

Deno.test('chave vazia ou zerada não identifica ninguém; nome nunca é usado', () => {
  assertEquals(vincular(func({ cpf: '00000000000' }), [colab('c1', { cpf: '00000000000' })]), null);
  assertEquals(vincular(func({ nome: 'Maria' }), [colab('c1')]), null);
});

Deno.test('só dias com hash diferente ou novos são alterados', () => {
  const recebidos = [dia(), dia({ data: '2026-11-21', hash: 'b'.repeat(64) }), dia({ funcionario_codigo: 8 })];
  const gravados = [
    { funcionario_codigo: 7, data: '2026-11-20', hash_conteudo: 'a'.repeat(64) },
    { funcionario_codigo: 7, data: '2026-11-21', hash_conteudo: 'c'.repeat(64) },
  ];
  assertEquals(diasAlterados(recebidos, gravados).map((d) => `${d.funcionario_codigo}|${d.data}`),
    ['7|2026-11-21', '8|2026-11-20']);
});

Deno.test('contrato aceita o envio do coletor e o sinal de vida vazio', () => {
  assert(envioSchema.safeParse(envio()).success);
  const cheio = envio({
    funcionarios: [func({ cpf: '12345678909' })],
    justificativas: [{ codigo: 1, nome: 'Atestado', considera_normal: true, considera_falta: false }],
    dias: [dia({ marcacoes: [{ pos: 'E1', hora: '07:58:00', data: null, ref: null, obs: null, justificativa: null, equip: 4 }] })],
  });
  assert(envioSchema.safeParse(cheio).success);
});

Deno.test('contrato recusa campo extra, data torta e empresa_id vindo do coletor', () => {
  assert(!envioSchema.safeParse(envio({ empresa_id: 'x' })).success);
  assert(!envioSchema.safeParse(envio({ dias: [dia({ data: '20/11/2026' })] })).success);
  assert(!envioSchema.safeParse(envio({ dias: [dia({ hash: 'curto' })] })).success);
  assert(!envioSchema.safeParse(envio({ dias: [dia({ tipo: 'falta' })] })).success);
});

Deno.test('token: forma mínima e hash', async () => {
  assert(!tokenPlausivel(null));
  assert(!tokenPlausivel('curto'));
  assert(!tokenPlausivel('a'.repeat(31)));
  assert(!tokenPlausivel('com espaco ' + 'a'.repeat(32)));
  assert(tokenPlausivel('a'.repeat(32)));
  assertEquals(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

Deno.test('violacao da unicidade reversa deixa o vinculo pendente em vez de abortar o lote', () => {
  // ux_ponto_rep_funcionarios_colaborador_por_empresa: o colaborador ja esta
  // vinculado a outro funcionario_codigo. E ambiguidade (codigo reaproveitado),
  // nao falha de infra: o lote segue e o funcionario fica pendente.
  assertEquals(classificaErroVinculo({ code: '23505' }), 'ambiguidade');
});

Deno.test('erro que nao e de unicidade aborta o lote', () => {
  assertEquals(classificaErroVinculo({ code: '08006' }), 'abortar');
  assertEquals(classificaErroVinculo({ code: '42501' }), 'abortar');
  assertEquals(classificaErroVinculo({}), 'abortar');
  assertEquals(classificaErroVinculo(null), 'abortar');
});