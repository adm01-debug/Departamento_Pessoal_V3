import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assinaturaDe } from './github-settings-guard.mjs';

// Contratos do settings-guard para DP V3. O guard é executado de VERDADE (child
// process) com `fetch` stubbed. O guard é portado de Zapp Web V2 com as diferenças:
//   - DP V3 usa rulesets (não classic BP) → branch protection sempre 404 (NaoVerificavel)
//   - workflow_permissions.default = 'read' (não 'write')
//   - squash_merge_commit_message = 'COMMIT_MESSAGES' (não 'PR_BODY')
//   - selected_actions_patterns: wildcards de org (denoland/*, supabase/*, etc.)
//   - environments: copilot, Preview, Production (3 items)

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'github-settings-guard.mjs');
const TITULO = '[settings-guard] perimeter regression detected';

// DP V3: branch protection clássica sempre retorna 404.
const SEM_ESCOPO = "send({ message: 'Resource not accessible by integration' }, 403)";
const BP_404 = "send({ message: 'Branch not protected' }, 404)";

const REPO_OK =
  "send({ allow_auto_merge: true, allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false, delete_branch_on_merge: true, squash_merge_commit_message: 'COMMIT_MESSAGES', squash_merge_commit_title: 'COMMIT_OR_PR_TITLE', security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } })";

// regressao: allow_auto_merge=false (auto-restaurável pelo guard)
const REPO_REGRESSAO =
  "send({ allow_auto_merge: false, allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false, delete_branch_on_merge: true, squash_merge_commit_message: 'COMMIT_MESSAGES', squash_merge_commit_title: 'COMMIT_OR_PR_TITLE', security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } })";

const ACTIONS_OK = "send({ enabled: true, allowed_actions: 'selected', sha_pinning_required: true })";
const WORKFLOW_PERMS_OK = "send({ default_workflow_permissions: 'read', can_approve_pull_request_reviews: true })";

// DP V3: wildcards de org (denoland/*, supabase/*, etc.)
const SELECTED_PATTERNS = "['denoland/*','supabase/*','ossf/*','dorny/*','zizmorcore/*','gitleaks/*']";
const SELECTED_OK = "send({ patterns_allowed: ['denoland/*@*','supabase/*@*','ossf/*@*','dorny/*@*','zizmorcore/*@*','gitleaks/*@*'], verified_allowed: true, github_owned_allowed: true })";
const SELECTED_API = SELECTED_OK;

// DP V3: 3 environments
const ENVS_OK =
  "send({ environments: [{ name: 'copilot' },{ name: 'Preview' },{ name: 'Production' }] })";

/**
 * Stub de `fetch`. `modo`:
 *   ok        — tudo conforme o baseline (branch protection sempre 404 em DP V3)
 *   regressao — allow_auto_merge=false (auto-restaurável)
 *   tokenReal — GITHUB_TOKEN: 403 em actions/workflow; GET /repos sem campos de merge
 *   parcial   — GET /repos com PARTE dos campos de merge
 *   injecao   — valores com \n vindos da API
 */
function stub(
  modo,
  {
    issue = false,
    ultimoMarcador = '',
    idadeMs = 0,
    comentarioDepois = false,
    autorMarcador = 'github-actions[bot]',
    patchStatus = 200,
    selected = SELECTED_OK,
  } = {},
) {
  // DP V3: branch protection clássica sempre 404
  const prot = BP_404;

  const workflowPerms = modo === 'tokenReal' ? SEM_ESCOPO : WORKFLOW_PERMS_OK;

  const repo = {
    injecao:
      "send({ allow_auto_merge: true, allow_squash_merge: 'true\\n::error::forged3', allow_merge_commit: false, allow_rebase_merge: false, delete_branch_on_merge: true, squash_merge_commit_message: 'COMMIT_MESSAGES', squash_merge_commit_title: 'COMMIT_OR_PR_TITLE' })",
    tokenReal: "send({ id: 1, name: 'r', full_name: 'o/r', private: false, default_branch: 'main' })",
    parcial: "send({ id: 1, allow_auto_merge: true, delete_branch_on_merge: true })",
    regressao: REPO_REGRESSAO,
  }[modo] ?? REPO_OK;

  const actions = modo === 'tokenReal' ? SEM_ESCOPO : ACTIONS_OK;

  const criadoEm = new Date(Date.now() - idadeMs).toISOString();
  const totalComentarios = comentarioDepois ? 2 : 1;
  const GUARD = 'github-actions[bot]';
  const issues = issue
    ? `send([{ number: 42, title: ${JSON.stringify(TITULO)}, comments: ${totalComentarios}, created_at: '2026-10-01T00:00:00Z', body: '', user: { login: '${GUARD}' } }])`
    : 'send([])';
  const listaComentarios = [
    `{ body: ${JSON.stringify(`${ultimoMarcador}\n(comentario com marcador)`)}, created_at: '${criadoEm}', user: { login: ${JSON.stringify(autorMarcador)} } }`,
  ];
  if (comentarioDepois) {
    listaComentarios.push(
      `{ body: 'comentario humano sem marcador, posterior ao do guard', created_at: '${new Date().toISOString()}', user: { login: 'humano' } }`,
    );
  }
  const comentarios = `send([${listaComentarios.join(', ')}])`;

  return [
    'const send = (obj, status) => {',
    '  status = status || 200;',
    '  return {',
    '    ok: status >= 200 && status < 300,',
    '    status: status,',
    "    headers: { get: () => (obj == null ? '0' : '1') },",
    '    json: async () => obj,',
    '    text: async () => JSON.stringify(obj),',
    '  };',
    '};',
    'globalThis.fetch = async (url, opts) => {',
    '  opts = opts || {};',
    "  const p = String(url).replace('https://api.github.com', '');",
    "  const method = String(opts.method || 'GET').toUpperCase();",
    "  if (p.indexOf('/issues?labels=') !== -1) return " + issues + ';',
    "  if (method === 'GET' && p.indexOf('/issues/42/comments') !== -1) return " + comentarios + ';',
    "  if (p.endsWith('/branches/main/protection')) return " + prot + ';',
    "  if (p.endsWith('/actions/permissions/workflow')) return " + workflowPerms + ';',
    "  if (p.endsWith('/actions/permissions/selected-actions')) return " + selected + ';',
    "  if (p.indexOf('/actions/permissions') !== -1) return " + actions + ';',
    "  if (method === 'GET' && p.endsWith('/rulesets')) return send([{ id: 1 }]);",
    "  if (p.indexOf('/environments') !== -1) return " + ENVS_OK + ';',
    "  if (method === 'GET' && p === '/repos/o/r') return " + repo + ';',
    "  if (method === 'GET') return send({});",
    `  if (method === 'PATCH') return send({ message: 'patch' }, ${Number(patchStatus)});`,
    "  if (method === 'POST' && p.indexOf('/comments') !== -1) return send({ id: 7 });",
    "  if (method === 'POST' && p.indexOf('/issues') !== -1) return send({ number: '999\\n::error::forged2' });",
    '  return send({});',
    '};',
    '',
  ].join('\n');
}

function rodarGuard(modo, opts) {
  const arquivo = 'data:text/javascript,' + encodeURIComponent(stub(modo, opts));
  const res = spawnSync(process.execPath, ['--import', arquivo, SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: 'x', GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '1' },
  });
  return {
    code: res.status,
    out: `${res.stdout}${res.stderr}`,
    linhas: `${res.stdout}${res.stderr}`.split('\n'),
  };
}

// DP V3: branch protection sempre 404 → sempre ha um NaoVerificavel.
// Assinatura do modo 'ok': sem divergencias, 1 ponto cego (branch protection 404).
const CEGOS_BP = [{ nome: 'branch protection', campos: ['404'] }];
const MARCADOR_OK = `<!-- causa:${assinaturaDe([], CEGOS_BP)} -->`;

// Assinatura do modo 'tokenReal': sem divergencias, 4 pontos cegos.
const CEGOS_TOKEN_REAL = [
  { nome: 'branch protection', campos: ['404'] },
  { nome: 'merge/repo', campos: ['200'] },
  { nome: 'actions', campos: ['403'] },
  { nome: 'workflow permissions', campos: ['403'] },
];
const MARCADOR_TOKEN_REAL = `<!-- causa:${assinaturaDe([], CEGOS_TOKEN_REAL)} -->`;

// Assinatura do modo 'regressao': allow_auto_merge=false, 1 ponto cego (branch protection).
const MARCADOR_REGRESSAO = `<!-- causa:${assinaturaDe([{ campo: 'merge.allow_auto_merge', encontrado: false }], CEGOS_BP)} -->`;

describe('settings-guard DP V3: perimetro conforme o baseline', () => {
  it('perimetro OK com blind spot de branch protection: sai 0 com ::warning::', () => {
    // DP V3 usa rulesets — branch protection classica sempre 404 => NaoVerificavel.
    // Com so ponto cego e nenhuma divergencia, o guard sai 0 mas emite ::warning::.
    const r = rodarGuard('ok');
    assert.equal(r.code, 0, `esperava exit 0, veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('::warning::'), `faltou o aviso de ponto cego:\n${r.out}`);
    assert.ok(!r.out.includes('Perimetro OK'), `nunca atinge o estado limpo em DP V3:\n${r.out}`);
    assert.ok(r.linhas.some((l) => l.startsWith('Issue #')), `issue de blind spot precisa ser aberta:\n${r.out}`);
  });

  it('selected-actions no formato da API (@* e wildcards de org) confere com o baseline', () => {
    const r = rodarGuard('ok', { selected: SELECTED_API });
    assert.equal(r.code, 0, `esperava exit 0, veio ${r.code}:\n${r.out}`);
    assert.ok(!r.out.includes('selected_actions.patterns_allowed'), `divergencia falsa:\n${r.out}`);
  });

  it('acao a mais em selected-actions e divergencia', () => {
    const r = rodarGuard('ok', { selected: "send({ patterns_allowed: ['evil/acao@*'], verified_allowed: true, github_owned_allowed: true })" });
    assert.equal(r.code, 1, `esperava exit 1, veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('selected_actions.patterns_allowed'), `nao apontou o campo:\n${r.out}`);
  });

  it('ref restritivo (@v1) e detectado como divergencia (nao e stripped)', () => {
    const selV1 = SELECTED_API.replace('denoland/*@*', 'denoland/setup-deno@v2');
    const r = rodarGuard('ok', { selected: selV1 });
    assert.equal(r.code, 1, `esperava exit 1 (ref restritivo diverge), veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('selected_actions.patterns_allowed'), `nao apontou o campo:\n${r.out}`);
  });

  it('allow_auto_merge=false e detectado como divergencia e restaurado', () => {
    const r = rodarGuard('regressao');
    assert.equal(r.code, 1, `esperava exit 1, veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('merge.allow_auto_merge'), `nao apontou o campo divergente:\n${r.out}`);
    assert.ok(r.out.includes('Restaurado'), `nao tentou restaurar o que sabe restaurar:\n${r.out}`);
  });
});

describe('settings-guard DP V3: ponto cego (E95, W04, W05)', () => {
  it('404 na branch protection vira NAO VERIFICAVEL, nao falha silenciosa', () => {
    const r = rodarGuard('ok');
    assert.ok(r.out.includes('NAO VERIFICAVEL'), `o ponto cego nao foi declarado:\n${r.out}`);
    assert.ok(r.out.includes('404'), `o motivo (404) precisa aparecer no log:\n${r.out}`);
  });

  it('abre a issue tambem quando o problema e falta de escopo (branch protection 404)', () => {
    const r = rodarGuard('ok');
    assert.ok(r.linhas.some((l) => l.startsWith('Issue #')), `nenhuma issue foi aberta:\n${r.out}`);
  });

  it('W05: so ponto cego sai 0 com ::warning::', () => {
    const r = rodarGuard('ok');
    assert.equal(r.code, 0, `esperava exit 0 (so ponto cego), veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('::warning::'), `faltou o aviso de ponto cego:\n${r.out}`);
  });

  it('W04: GET /repos sem os campos de merge e ponto cego, nao "7 divergencias"', () => {
    const r = rodarGuard('tokenReal');
    assert.equal(r.code, 0, `esperava exit 0, veio ${r.code}:\n${r.out}`);
    assert.ok(!r.out.includes('divergencia:'), `acusou divergencia em campo nao lido:\n${r.out}`);
    assert.ok(!r.out.includes('encontrado=null'), `null virou divergencia:\n${r.out}`);
    assert.ok(r.out.includes('merge/repo: NAO VERIFICAVEL'), `merge/repo nao foi declarado cego:\n${r.out}`);
    assert.ok(!r.out.includes('Restaurado'), `tentou restaurar o que nao conseguiu ler:\n${r.out}`);
    assert.ok(r.linhas.some((l) => l.startsWith('Issue #')), `a issue de ponto cego precisa existir:\n${r.out}`);
  });

  it('W04: GET /repos com PARTE dos campos e parcialmente verificavel; o que veio e conferido', () => {
    const r = rodarGuard('parcial');
    assert.equal(r.code, 0, `esperava exit 0, veio ${r.code}:\n${r.out}`);
    assert.ok(r.out.includes('merge/repo: PARCIALMENTE VERIFICAVEL'), `cegueira parcial nao declarada:\n${r.out}`);
    assert.ok(r.out.includes('allow_squash_merge'), `nao listou qual campo faltou:\n${r.out}`);
    assert.ok(!r.out.includes('divergencia:'), `campo ausente virou divergencia:\n${r.out}`);
  });

  it('W05: issue aberta com a MESMA causa ha menos de 7 dias nao recebe comentario novo', () => {
    const r = rodarGuard('ok', { issue: true, ultimoMarcador: MARCADOR_OK, idadeMs: 60_000 });
    assert.equal(r.code, 0, r.out);
    assert.ok(r.out.includes('Dedupe'), `deveria suprimir o comentario repetido:\n${r.out}`);
    assert.ok(!r.out.includes('atualizada com novo comentario'), `comentou de novo a mesma causa:\n${r.out}`);
  });

  it('W05: um comentario alheio DEPOIS do marcador nao zera o dedupe', () => {
    const r = rodarGuard('ok', { issue: true, ultimoMarcador: MARCADOR_OK, idadeMs: 60_000, comentarioDepois: true });
    assert.equal(r.code, 0, r.out);
    assert.ok(r.out.includes('Dedupe'), `comentario alheio zerou o dedupe:\n${r.out}`);
  });

  it('W05: marcador colado por OUTRO autor nao conta para o dedupe (repo publico)', () => {
    const r = rodarGuard('ok', { issue: true, ultimoMarcador: MARCADOR_OK, idadeMs: 60_000, autorMarcador: 'curioso' });
    assert.equal(r.code, 0, r.out);
    assert.ok(!r.out.includes('Dedupe'), `marcador de terceiro silenciou o guard:\n${r.out}`);
    assert.ok(r.out.includes('Issue #42 atualizada com novo comentario'), `o guard nao registrou a causa:\n${r.out}`);
  });

  it('W05: mesma causa com mais de 7 dias volta a comentar (lembrete semanal)', () => {
    const r = rodarGuard('ok', { issue: true, ultimoMarcador: MARCADOR_OK, idadeMs: 8 * 24 * 3600 * 1000 });
    assert.equal(r.code, 0, r.out);
    assert.ok(r.out.includes('Issue #42 atualizada com novo comentario'), `nao renovou o lembrete:\n${r.out}`);
  });

  it('W05: causa diferente da ultima comenta de novo', () => {
    const r = rodarGuard('ok', { issue: true, ultimoMarcador: '<!-- causa:outra -->', idadeMs: 60_000 });
    assert.ok(r.out.includes('Issue #42 atualizada com novo comentario'), `causa nova sem comentario:\n${r.out}`);
  });

  it('W05: divergencia real com restauracao EFETIVA sempre comenta (mesmo com dedupe)', () => {
    const r = rodarGuard('regressao', { issue: true, ultimoMarcador: MARCADOR_REGRESSAO, idadeMs: 60_000 });
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes('Restaurado:'), `a restauracao precisa ter acontecido:\n${r.out}`);
    assert.ok(r.out.includes('Issue #42 atualizada com novo comentario'), `restauracao sem registro:\n${r.out}`);
  });

  it('W05: restauracao que FALHOU nao forca comentario — o dedupe de 6 h vale', () => {
    const r = rodarGuard('regressao', { issue: true, ultimoMarcador: MARCADOR_REGRESSAO, idadeMs: 60_000, patchStatus: 403 });
    assert.equal(r.code, 1, r.out);
    assert.ok(!r.out.includes('Restaurado:'), `declarou restaurado um PATCH que falhou:\n${r.out}`);
    assert.ok(r.out.includes('Dedupe'), `tentativa falha forcou comentario repetido:\n${r.out}`);
  });
});

describe('settings-guard DP V3: assinatura da causa', () => {
  it('e estavel e independe da ordem', () => {
    const a = assinaturaDe([{ campo: 'x', encontrado: 1 }, { campo: 'y', encontrado: 2 }], [{ nome: 'b' }, { nome: 'a' }]);
    const b = assinaturaDe([{ campo: 'y', encontrado: 2 }, { campo: 'x', encontrado: 1 }], [{ nome: 'a' }, { nome: 'b' }]);
    assert.equal(a, b);
    assert.notEqual(a, assinaturaDe([{ campo: 'x', encontrado: 3 }], []));
  });

  it('distingue QUAIS campos ficaram cegos, nao so a checagem', () => {
    const a = assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_auto_merge'] }]);
    const b = assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_squash_merge'] }]);
    assert.notEqual(a, b);
    const c = assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_squash_merge', 'allow_auto_merge'] }]);
    const d = assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_auto_merge', 'allow_squash_merge'] }]);
    assert.equal(c, d, 'a ordem dos campos nao pode mudar a assinatura');
  });
});

describe('settings-guard DP V3: log injection (jssecurity:S5145)', () => {
  it('neutraliza quebras de linha vindas da API', () => {
    const r = rodarGuard('injecao');

    const linhaDiv = r.linhas.find((l) => l.includes('divergencia:'));
    assert.ok(linhaDiv, `linha de divergencia ausente:\n${r.out}`);
    assert.ok(
      linhaDiv.includes('::error::forged'),
      `o valor nao chegou (stub quebrado?) ou foi apagado: ${JSON.stringify(linhaDiv)}`,
    );

    const linhaIssue = r.linhas.find((l) => l.startsWith('Issue #'));
    assert.ok(linhaIssue, `linha da issue ausente:\n${r.out}`);
    assert.ok(
      linhaIssue.includes('Issue #999 ::error::forged2 aberta.'),
      `valor nao-confiavel vazou cru: ${JSON.stringify(linhaIssue)}`,
    );

    assert.ok(
      !r.linhas.includes('::error::forged') && !r.linhas.includes('::error::forged2'),
      `linha de log forjada emitida:\n${r.out}`,
    );
  });
});

function rodarComEnvsExtra(extras) {
  const todos = ['copilot', 'Preview', 'Production', ...extras];
  const envsStub =
    'send({ environments: [' +
    todos.map((n) => `{ name: ${JSON.stringify(n)} }`).join(',') +
    '] })';
  const stb = stub('ok').replace(
    /if \(p\.indexOf\('\/environments'\).*?return .*?;/,
    `if (p.indexOf('/environments') !== -1) return ${envsStub};`,
  );
  const arq = 'data:text/javascript,' + encodeURIComponent(stb);
  const res = spawnSync(process.execPath, ['--import', arq, SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: 'x', GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '1' },
  });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

describe('settings-guard DP V3: W13 — environments extras', () => {
  it('extras Vercel-managed (Preview –/Production –) emitem ::warning::, nao divergencia', () => {
    const r = rodarComEnvsExtra(['Preview – dp_pessoal_v3', 'Production – dp_pessoal_v3']);
    assert.equal(r.code, 0, `esperava exit 0 (vercel-managed nao e regressao):\n${r.out}`);
    assert.ok(r.out.includes('::warning::'), `warning W13 nao emitido:\n${r.out}`);
    assert.ok(!r.out.includes('extras_inesperados'), `classific. incorreta como inesperado:\n${r.out}`);
  });

  it('extras inesperados (nao-Vercel) sao reportados como divergencia', () => {
    const r = rodarComEnvsExtra(['meu-ambiente-desconhecido']);
    assert.equal(r.code, 1, `esperava exit 1 (extra inesperado e regressao):\n${r.out}`);
    assert.ok(r.out.includes('extras_inesperados'), `divergencia nao apontada:\n${r.out}`);
    assert.ok(r.out.includes('meu-ambiente-desconhecido'), `nome do ambiente ausente:\n${r.out}`);
  });
});
