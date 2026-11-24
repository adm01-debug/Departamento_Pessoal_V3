#!/usr/bin/env node

// Regressão do gate de autorização das Edge Functions: cada caso monta um
// supabase/functions descartável com todas as funções sensíveis corretas e
// troca o index.ts de uma delas.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = resolve('scripts/audit-edge-authz.mjs');
const sensitive = [
  ...readFileSync(checker, 'utf8')
    .match(/const SENSIVEIS = new Set\(\[([\s\S]*?)\]\)/)[1]
    .matchAll(/'([^']+)'/g),
].map((match) => match[1]);

const SR = "const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);\n";
const AUTH = 'const { data } = await userClient.auth.getUser(token);\n';
const RH = 'const authz = await requireRh(admin, userId, empresaId);\nif (authz.denied) return authz.denied;\n';
const HAS_ROLE = "await admin.rpc('has_role', { _user_id: userId, _role: 'rh' });\n";
const OK = SR + AUTH + RH;

function run(overrides = {}, rename = {}) {
  const root = mkdtempSync(join(tmpdir(), 'edge-authz-'));
  try {
    for (const name of sensitive) {
      const dir = join(root, 'supabase/functions', rename[name] ?? name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.ts'), overrides[name] ?? OK);
    }
    return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const target = 'pix-lote';
const cases = [
  ['todas corretas', 0, {}],
  [
    'string com barra-asterisco não esconde o anti-padrão',
    1,
    { [target]: SR + AUTH + HAS_ROLE + "const h = { Accept: '*/*' };\nif (!belongs && !isAdmin) return forbidden();\n/** doc */\n" },
  ],
  ['string com barra-asterisco não apaga o requireRh', 0, { [target]: SR + AUTH + "const h = { Accept: '*/*' };\n" + RH + '/** doc */\n' }],
  ['string com // não apaga o resto da linha', 0, { [target]: SR + AUTH + 'const sep = "//"; const authz = await requireRh(admin, userId, e);\n' }],
  ['anti-padrão só em comentário não reprova', 0, { [target]: OK + '// antes: if (!belongs && !isAdmin) return 403\n' }],
  [
    'comentário dentro de ${} de template não vale como requireRh',
    1,
    { [target]: SR + AUTH + 'const label = `user: ${/* requireRh(admin, userId, empresaId) */ userId}`;\n' },
  ],
  [
    'regex após => com aspa não desalinha e o comentário não vale como requireRh',
    1,
    { [target]: SR + AUTH + 'const check = (s) => /"/.test(s); /* requireRh(admin, userId, empresaId) */ const label = "";\n' },
  ],
  ['operandos invertidos', 1, { [target]: SR + AUTH + HAS_ROLE + 'if (!isAdmin && !belongs) return forbidden();\n' }],
  ['função sensível renomeada', 1, {}, { [target]: `${target}-v2` }],
];

for (const [name, expected, overrides, rename] of cases) {
  const result = run(overrides, rename);
  const flagged = result.stderr.includes(`✗ ${target}\n`);
  if (result.status !== expected || flagged !== (expected === 1)) {
    throw new Error(`${name}: esperado exit ${expected}, obtido ${result.status}\n${result.stdout}${result.stderr}`);
  }
}
console.log(`EDGE_AUTHZ_TEST_OK cases=${cases.length}`);
