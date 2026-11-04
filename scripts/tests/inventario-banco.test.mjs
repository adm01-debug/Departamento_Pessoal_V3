// Contrato de scripts/inventario/gerar-banco.mjs (porte do Zapp Web V2 para o DP V3): secoes
// independentes, credencial somente-leitura, origem conferida e nenhum segredo na saida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lerSecoes, montarDado, lerEntrada, montarInventario, conferirOrigem, conferirUrl, compararEdges,
  tabelasDoTypes, versoesDoRepo, contarUsoNoCodigo, rodaTodoDia, limparErro, PARECE_CREDENCIAL,
  consultarViaPsql, SECOES_OBRIGATORIAS,
} from '../inventario/gerar-banco.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQL = fs.readFileSync(path.join(raiz, 'scripts/inventario/banco.sql'), 'utf8');

const tabela = (nome, extra = {}) => ({
  nome, rls: true, rls_forcado: false, policies: 1, policy_cita_empresa_id: false, tem_empresa_id: false,
  soft_delete: false, triggers: 0, linhas: 10, linhas_exatas: false, bytes: 8192, citada_no_banco: false, ...extra,
});
const respostas = (extra = {}) => ({
  resumo: { postgres: '17.6', papel: 'ci_auditor', papel_ignora_rls: false, tabelas_public: 2 },
  tabelas: [tabela('colaboradores', { tem_empresa_id: true, policy_cita_empresa_id: true }), tabela('empresas')],
  ...extra,
});
const semUso = (dado) => Object.fromEntries(dado.tabelas.map((t) => [t.nome, { src: 1, edges: 0 }]));

test('banco.sql tem as secoes esperadas e cada uma devolve a coluna j', () => {
  const secoes = lerSecoes(SQL);
  assert.deepEqual(secoes.map((s) => s.nome), ['resumo', 'tabelas', 'cron_jobs', 'cron_execucoes', 'ledger']);
  for (const s of secoes) assert.match(s.sql, /\bAS j\b/, `secao ${s.nome} sem "AS j"`);
  for (const s of SECOES_OBRIGATORIAS) assert.ok(secoes.some((x) => x.nome === s));
});

test('banco.sql so le: nenhum comando de escrita e nada do command do cron', () => {
  const semComentario = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(semComentario, /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COPY)\b/i);
  assert.doesNotMatch(semComentario, /'command'|'comando'|return_message'/);
  assert.match(SQL, /regexp_matches\(j\.command, '\(\(\?:public\|net\|cron\)/, 'do command so sai o nome das funcoes chamadas');
});

test('secao obrigatoria ausente aborta; opcional ausente vira coleta_parcial com o motivo', () => {
  assert.throws(() => montarDado({ tabelas: [tabela('a')] }), /secao obrigatoria "resumo"/);
  assert.throws(() => montarDado({ resumo: {}, tabelas: [] }), /entrada sem tabelas/);
  const dado = montarDado(respostas(), { ledger: 'ERROR: permission denied for schema supabase_migrations' }, '2026-11-04T10:00:00.123Z');
  assert.equal(dado.medido_em, '2026-11-04T10:00:00Z');
  assert.equal(dado.ledger, null);
  assert.deepEqual(dado.coleta.secoes_indisponiveis.map((s) => s.secao), ['cron_jobs', 'cron_execucoes', 'ledger']);
  const inv = montarInventario(dado, semUso(dado));
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'coleta_parcial').detalhe, ['cron_jobs', 'cron_execucoes', 'ledger']);
});

test('lerEntrada aceita objeto por secao, resposta do MCP por secao e envelope tools/call', () => {
  const direto = lerEntrada(JSON.stringify(respostas()));
  assert.equal(direto.tabelas.length, 2);
  const mcp = lerEntrada(JSON.stringify({ resumo: { rows: [{ j: { postgres: '17' } }] }, tabelas: { rows: [{ j: JSON.stringify([tabela('x')]) }] } }));
  assert.equal(mcp.resumo.postgres, '17');
  assert.equal(mcp.tabelas[0].nome, 'x');
  const envelope = lerEntrada(JSON.stringify({ result: { content: [{ type: 'text', text: JSON.stringify({ inventario: respostas() }) }] } }));
  assert.equal(envelope.resumo.papel, 'ci_auditor');
});

test('sem problema nenhum (e coleta completa), nenhum alerta', () => {
  const dado = montarDado(respostas({ cron_jobs: { visivel: true, jobs: [] }, cron_execucoes: { por_job: [], horas_paradas_7d: [], historico: { mais_de_7_dias: 0 } }, ledger: { registros: 1, versao_max: '1' } }));
  assert.deepEqual(montarInventario(dado, semUso(dado)).alertas, []);
});

test('alertas de RLS: sem RLS, RLS sem policy e empresa_id fora das policies', () => {
  const dado = montarDado(respostas({
    tabelas: [
      tabela('aberta', { rls: false }),
      tabela('trancada', { policies: 0 }),
      tabela('folha_itens', { tem_empresa_id: true, policies: 2, policy_cita_empresa_id: false }),
      tabela('ok', { tem_empresa_id: true, policies: 2, policy_cita_empresa_id: true }),
    ],
  }));
  const tipos = Object.fromEntries(montarInventario(dado, semUso(dado)).alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(tipos.tabela_sem_rls, ['aberta']);
  assert.deepEqual(tipos.rls_sem_policy, ['trancada']);
  assert.deepEqual(tipos.empresa_id_fora_das_policies, ['folha_itens']);
});

test('cron: invisivel por RLS do pg_cron, falhando, sem execucao e historico sem limpeza', () => {
  const jobs = [
    { nome: 'processar-agendamentos', agenda: '*/5 * * * *', ativo: true, chama: [] },
    { nome: 'mudo', agenda: '0 3 * * *', ativo: true, chama: [] },
    { nome: 'semanal', agenda: '0 3 * * 0', ativo: true, chama: [] },
    { nome: 'desligado', agenda: '* * * * *', ativo: false, chama: [] },
  ];
  const dado = montarDado(respostas({
    cron_jobs: { visivel: false, jobs },
    cron_execucoes: {
      por_job: [
        { nome: 'processar-agendamentos', execucoes_24h: 288, taxa_falha_7d_pct: 10 },
        { nome: 'mudo', execucoes_24h: 0, taxa_falha_7d_pct: 0 },
        { nome: 'semanal', execucoes_24h: 0, taxa_falha_7d_pct: 0 },
      ],
      horas_paradas_7d: [{ hora: '2026-11-03T04:00Z', execucoes: 12, falhas: 12 }],
      historico: { mais_de_7_dias: 60000 },
    },
  }));
  const tipos = Object.fromEntries(montarInventario(dado, semUso(dado)).alertas.map((a) => [a.tipo, a.detalhe]));
  assert.ok(tipos.cron_invisivel_para_o_papel);
  assert.deepEqual(tipos.cron_falhando, ['processar-agendamentos (10% em 7d)']);
  assert.deepEqual(tipos.cron_sem_execucao, ['mudo'], 'semanal e desligado nao contam');
  assert.deepEqual(tipos.cron_parado, ['2026-11-03T04:00Z']);
  assert.ok(tipos.historico_cron_sem_limpeza);
  assert.equal(rodaTodoDia('30 seconds'), true);
  assert.equal(rodaTodoDia('0 3 1 * *'), false);
});

test('orfa = 0 linhas, nao citada no banco e sem .from() no codigo', () => {
  const dado = montarDado(respostas({ tabelas: [tabela('vazia', { linhas: 0 }), tabela('citada', { linhas: 0, citada_no_banco: true }), tabela('usada', { linhas: 0 })] }));
  const inv = montarInventario(dado, { vazia: { src: 0, edges: 0 }, citada: { src: 0, edges: 0 }, usada: { src: 0, edges: 2 } });
  assert.deepEqual(inv.tabelas_orfas.lista, ['vazia']);
});

test('saida tem chaves ordenadas (diff estavel entre execucoes)', () => {
  const dado = montarDado(respostas());
  const inv = montarInventario(dado, semUso(dado));
  assert.deepEqual(Object.keys(inv), [...Object.keys(inv)].sort());
  assert.deepEqual(Object.keys(inv.tabelas[0]), [...Object.keys(inv.tabelas[0])].sort());
});

test('URL: aceita so o projeto canonico (direta ou pooler) e nunca devolve a senha', () => {
  assert.deepEqual(conferirUrl('postgresql://ci_auditor.frjbfeamybqsejlvmqbl:segredo@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'),
    { conexao: 'pooler', papel: 'ci_auditor' });
  assert.equal(conferirUrl('postgresql://postgres:x@db.frjbfeamybqsejlvmqbl.supabase.co:5432/postgres').conexao, 'direta');
  assert.throws(() => conferirUrl('postgresql://postgres.outroprojeto:x@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'), /canonico/);
  assert.throws(() => conferirUrl('nao-e-url'), /URI valida/);
  assert.equal(limparErro('psql: error: connection to postgresql://u:senha@h/db failed\nFATAL: x'), 'psql: error: connection to <dsn> failed');
});

test('origem: tabelas do types.ts presentes e ledger coerente; outro banco e recusado', () => {
  const types = '  public: {\n    Tables: {\n      colaboradores: {\n        Row: {\n      }\n      empresas: {\n      }\n    }\n    Views: {\n      v: {\n';
  assert.deepEqual(tabelasDoTypes(types), ['colaboradores', 'empresas']);
  const dado = montarDado(respostas());
  assert.equal(conferirOrigem(dado, ['colaboradores', 'empresas']).ledger_conferido, false);
  assert.throws(() => conferirOrigem(dado, ['colaboradores', 'empresas', 'folha', 'ferias']), /nao parece ser do banco canonico/);
  const versoes = Array.from({ length: 30 }, (_, i) => String(20261000000000 + i));
  const comLedger = { ...dado, ledger: { registros: 30, versao_max: versoes[29] } };
  assert.equal(conferirOrigem(comLedger, ['colaboradores'], versoes).ledger_conferido, true);
  assert.throws(() => conferirOrigem({ ...dado, ledger: { registros: 30, versao_max: versoes[2] } }, ['colaboradores'], versoes), /ledger/);
  const reais = versoesDoRepo(raiz);
  // O DP mistura 001_, AAAAMMDDHHMMSS e versoes de 16/17 digitos: so prefixo numerico.
  assert.ok(reais.length > 500 && reais.every((v) => /^\d+$/.test(v)), 'versoes reais saem so dos .sql do topo');
  const tiposReais = tabelasDoTypes(fs.readFileSync(path.join(raiz, 'src/integrations/supabase/types.ts'), 'utf8'));
  assert.ok(tiposReais.length > 100 && tiposReais.includes('colaboradores'), 'types.ts real tem as tabelas do DP');
});

test('edges: publicadas x repo, e sem token fica explicito que nao foi consultado', () => {
  assert.deepEqual(compararEdges(null, ['a', 'b']), { publicadas: null, no_repo: 2, publicadas_sem_codigo_no_repo: null, no_repo_sem_deploy: null });
  const r = compararEdges([{ slug: 'a', version: 3, status: 'ACTIVE', verify_jwt: true, updated_at: 1762250000000 }, { slug: 'z', version: 1 }], ['a', 'b']);
  assert.deepEqual(r.no_repo_sem_deploy, ['b']);
  assert.deepEqual(r.publicadas_sem_codigo_no_repo, ['z']);
});

test('trava de credencial reconhece Bearer, JWT, sb_secret_ e DSN com senha', () => {
  for (const s of ['Bearer abcdefghijklmnopqrstuvwxyz012345', 'eyJabcdefghijklmnopqrstu.eyJx.y', 'sb_secret_abc', 'postgresql://ci_auditor:senha@host/db']) {
    assert.match(s, PARECE_CREDENCIAL);
  }
  assert.doesNotMatch('{"nome":"colaboradores","linhas":10,"chama":["public.fn"]}', PARECE_CREDENCIAL);
});

test('consultarViaPsql: secao que falha vira motivo limpo, as outras seguem', () => {
  const secoes = lerSecoes(SQL);
  const executar = (_bin, args) => {
    const sql = args[args.length - 1];
    if (sql.includes('supabase_migrations')) {
      const e = new Error('falhou'); e.stderr = 'ERROR:  permission denied for schema supabase_migrations\n'; throw e;
    }
    return 'SET\n{"ok":true}\n';
  };
  const { respostas: r, falhas } = consultarViaPsql('postgresql://u:p@h/db', secoes, executar);
  assert.deepEqual(r.resumo, { ok: true });
  assert.deepEqual(Object.keys(falhas), ['ledger']);
  assert.match(falhas.ledger, /permission denied/);
});

test('contarUsoNoCodigo conta .from() de verdade no DP (src e edges) e ignora storage.from', () => {
  const uso = contarUsoNoCodigo(raiz, ['colaboradores', 'tabela_que_nao_existe']);
  assert.ok(uso.colaboradores.src > 0);
  assert.deepEqual(uso.tabela_que_nao_existe, { src: 0, edges: 0 });
});
