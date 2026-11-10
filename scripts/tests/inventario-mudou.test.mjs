// Contrato de scripts/inventario/mudou-conteudo.mjs: o workflow semanal so abre PR quando o
// inventario mudou alem das datas e da telemetria viva (inclusive no edges.json, gravado numa linha so).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mudou, semCarimbos } from '../inventario/mudou-conteudo.mjs';

const SCRIPT = fileURLToPath(new URL('../inventario/mudou-conteudo.mjs', import.meta.url));

/** Repo git temporario com o script dentro (ele e chamado como no workflow: `node scripts/inventario/mudou-conteudo.mjs`). */
function repoGit(t, arquivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-mudou-'));
  t.after(() => fs.rmSync(raiz, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', HUSKY: '0' };
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: raiz, env, stdio: 'ignore' });
  git('init', '-q');
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
    fs.writeFileSync(path.join(raiz, rel), conteudo);
  }
  fs.mkdirSync(path.join(raiz, 'scripts/inventario'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(raiz, 'scripts/inventario/mudou-conteudo.mjs'));
  git('add', '-A');
  git('commit', '-q', '-m', 'inventario');
  return raiz;
}
const cli = (cwd, script, ...args) => execFileSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' }).trim();
const ESTADO = {
  'inventario/estado/banco.json': '{"medido_em":"1","tabelas":[{"nome":"t","rls":true}]}',
  'inventario/estado/rotas.json': '{"urls":[]}',
  'inventario/estado/edges.json': '{"gerado_em":"1","total":65}',
};

const ler = (mapa) => (f) => (f in mapa ? mapa[f] : null);
const um = (antes, depois) => mudou(['f'], ler({ f: JSON.stringify(antes) }), ler({ f: JSON.stringify(depois) }));

test('so a data mudou (edges.json numa linha so): nao abre PR', () => {
  assert.equal(um({ gerado_em: '2026-11-01T00:00:00Z', total: 65 }, { gerado_em: '2026-11-08T00:00:00Z', total: 65 }), false);
  assert.equal(um({ medido_em: '1', resumo: { medido_em: '1' } }, { medido_em: '2', resumo: { medido_em: '2' } }), false);
});

test('mudanca real no mesmo arquivo da data: abre PR', () => {
  assert.equal(um({ gerado_em: '1', total: 65 }, { gerado_em: '2', total: 66 }), true);
});

test('arquivo novo ou apagado conta como mudanca', () => {
  assert.equal(mudou(['f'], ler({}), ler({ f: '{}' })), true);
  assert.equal(mudou(['f'], ler({ f: '{}' }), ler({})), true);
});

test('telemetria do cron e estimativas de linhas/bytes nao abrem PR', () => {
  const base = (n) => ({
    resumo: { tamanho_bytes: 1000 * n },
    tabelas: [{ nome: 'colaboradores', linhas: 10 * n, bytes: 8192 * n, rls: true }],
    cron_execucoes: { por_job: [{ nome: 'x', taxa_falha_7d_pct: n, execucoes_24h: 280 + n }], horas_paradas_7d: [], historico: { linhas: n, bytes: n, mais_de_7_dias: n } },
    alertas: [{ tipo: 'cron_falhando', detalhe: [`x (${n}.5% em 7d)`] }],
  });
  assert.equal(um(base(1), base(2)), false);
});

test('mudanca estrutural (RLS, alerta novo, job saindo da lista) abre PR', () => {
  const a = { tabelas: [{ nome: 't', rls: true }], alertas: [] };
  assert.equal(um(a, { tabelas: [{ nome: 't', rls: false }], alertas: [] }), true);
  assert.equal(um(a, { ...a, alertas: [{ tipo: 'tabela_sem_rls', detalhe: ['t'] }] }), true);
  const c = (jobs) => ({ alertas: [{ tipo: 'cron_falhando', detalhe: jobs }] });
  assert.equal(um(c(['a (9% em 7d)', 'b (6% em 7d)']), c(['a (12% em 7d)'])), true);
});

test('texto que nao e JSON volta como esta', () => {
  assert.equal(semCarimbos('nao json'), 'nao json');
  assert.equal(semCarimbos(null), null);
});

test('CLI: o resultado nao depende do cwd (subpasta do repo ou fora dele)', (t) => {
  const raiz = repoGit(t, ESTADO);
  const script = path.join(raiz, 'scripts/inventario/mudou-conteudo.mjs');
  assert.equal(cli(raiz, 'scripts/inventario/mudou-conteudo.mjs'), 'false');
  assert.equal(cli(path.join(raiz, 'scripts'), 'inventario/mudou-conteudo.mjs'), 'false', 'de uma subpasta, sem mudanca');
  assert.equal(cli(os.tmpdir(), script), 'false', 'de fora do repo, sem mudanca');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/rotas.json'), '{"urls":[{"caminho":"/nova"}]}');
  assert.equal(cli(path.join(raiz, 'scripts'), 'inventario/mudou-conteudo.mjs'), 'true', 'de uma subpasta, com mudanca');
  assert.equal(cli(os.tmpdir(), script, 'inventario/estado/banco.json'), 'false', 'arquivo explicito sem mudanca');
});

test('CLI: arquivo com mais de 1 MiB no HEAD e so a data mudando nao abre PR', (t) => {
  const grande = (data) => JSON.stringify({ medido_em: data, tabelas: Array.from({ length: 20000 }, (_, i) => ({ nome: `tabela_${i}`, rls: true, policies: 3, obs: 'x'.repeat(30) })) });
  assert.ok(grande('1').length > 1024 * 1024, 'a fixture precisa passar do maxBuffer padrao do execFileSync');
  const raiz = repoGit(t, { ...ESTADO, 'inventario/estado/banco.json': grande('1') });
  assert.equal(cli(raiz, 'scripts/inventario/mudou-conteudo.mjs'), 'false', 'nada mudou');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/banco.json'), grande('2'));
  assert.equal(cli(raiz, 'scripts/inventario/mudou-conteudo.mjs'), 'false', 'so medido_em mudou');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/banco.json'), grande('2').replace('"rls":true', '"rls":false'));
  assert.equal(cli(raiz, 'scripts/inventario/mudou-conteudo.mjs'), 'true', 'mudanca real continua abrindo PR');
});
