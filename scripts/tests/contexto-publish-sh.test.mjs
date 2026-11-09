// publish.sh (uso standalone) contra remotos bare temporários: nunca toca o remoto real.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../regras_negocio/publish.sh', import.meta.url));
const env = {
  ...process.env, HUSKY: '0', GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'file',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid',
};
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: 'pipe' }).trim();
const put = (root, file, text) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); };

// Remoto com `main` e, opcionalmente, uma branch `contexto` onde outro produtor já publicou docs/outro/.
function fixture(t, { derived = true } = {}) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'contexto-publish-sh-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const remote = path.join(tmp, 'remote.git');
  git(tmp, 'init', '-q', '--bare', '-b', 'main', remote);
  const seed = path.join(tmp, 'seed');
  git(tmp, 'clone', '-q', remote, seed);
  put(seed, 'README.md', '# repo\n');
  git(seed, 'add', '-A'); git(seed, 'commit', '-q', '-m', 'feat: base'); git(seed, 'push', '-q', 'origin', 'HEAD:main');
  if (derived) {
    git(seed, 'checkout', '-q', '-b', 'contexto');
    put(seed, 'docs/outro/dado.md', 'do outro produtor\n');
    git(seed, 'add', '-A'); git(seed, 'commit', '-q', '-m', 'outro produtor'); git(seed, 'push', '-q', 'origin', 'contexto');
  }
  const files = (branch) => git(tmp, '--git-dir', remote, 'ls-tree', '-r', '--name-only', branch).split('\n');
  const publish = (work, vars) => spawnSync('bash', [script], { cwd: work, env: { ...env, ...vars }, encoding: 'utf8' });
  return { tmp, remote, files, publish };
}

test('branch derivada: clone raso single-branch preserva as pastas dos outros produtores', (t) => {
  const { tmp, remote, files, publish } = fixture(t);
  const work = path.join(tmp, 'work');
  git(tmp, 'clone', '-q', '--single-branch', '--branch', 'main', '--depth', '1', `file://${remote}`, work);
  put(work, 'docs/ai-context/00-INDEX.md', 'novo\n');
  const result = publish(work, { MODE: 'branch', KEEP_DIRS: 'docs/outro' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(files('contexto'), ['README.md', 'docs/ai-context/00-INDEX.md', 'docs/outro/dado.md']);
});

test('branch derivada: falha ao consultar o remoto aborta em vez de publicar por cima', (t) => {
  const { tmp, remote, files, publish } = fixture(t);
  const work = path.join(tmp, 'work');
  git(tmp, 'clone', '-q', '--branch', 'main', remote, work);
  put(work, 'docs/ai-context/00-INDEX.md', 'novo\n');
  const before = git(tmp, '--git-dir', remote, 'rev-parse', 'contexto');
  const result = publish(work, { MODE: 'branch', KEEP_DIRS: 'docs/outro', PUSH_URL: path.join(tmp, 'inacessivel.git') });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /não foi possível consultar a branch contexto/);
  assert.equal(git(tmp, '--git-dir', remote, 'rev-parse', 'contexto'), before);
  assert.equal(git(work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');

  // Leitura e escrita pela PUSH_URL (origin sem credencial): publica e mantém docs/outro.
  git(work, 'remote', 'set-url', 'origin', path.join(tmp, 'sem-credencial.git'));
  put(work, 'docs/ai-context/00-INDEX.md', 'novo\n');
  const retry = publish(work, { MODE: 'branch', KEEP_DIRS: 'docs/outro', PUSH_URL: remote });
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  assert.deepEqual(files('contexto'), ['README.md', 'docs/ai-context/00-INDEX.md', 'docs/outro/dado.md']);
});

test('push direto usa PUSH_URL quando origin não aceita escrita', (t) => {
  const { tmp, remote, files, publish } = fixture(t, { derived: false });
  const work = path.join(tmp, 'work');
  git(tmp, 'clone', '-q', '--branch', 'main', remote, work);
  git(work, 'remote', 'set-url', '--push', 'origin', path.join(tmp, 'somente-leitura.git'));
  put(work, 'docs/ai-context/00-INDEX.md', 'novo\n');
  const result = publish(work, { MODE: 'push', PUSH_URL: remote, GEN_CMD: 'true' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(files('main'), ['README.md', 'docs/ai-context/00-INDEX.md']);
});
