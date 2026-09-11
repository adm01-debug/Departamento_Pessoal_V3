#!/usr/bin/env node

/**
 * Gate estático para impedir que configuração executável volte a apontar para
 * o projeto Supabase legado. A referência do projeto não é segredo; tratá-la
 * como constante auditável evita que proxy, E2E e deploy operem em bancos
 * diferentes por engano.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const CANONICAL_REF = 'frjbfeamybqsejlvmqbl';
const LEGACY_REF = 'ciziytrrjjotlsjzshnm';
const canonicalUrl = `https://${CANONICAL_REF}.supabase.co`;

const read = async (relativePath) => readFile(resolve(root, relativePath), 'utf8');

const failures = [];
const expect = (condition, message) => {
  if (condition) {
    console.log(`  ✅ ${message}`);
  } else {
    console.error(`  ❌ ${message}`);
    failures.push(message);
  }
};

const [configToml, viteConfig, deployScript, publicApiSpec, safeUrl, workflow] = await Promise.all([
  read('supabase/config.toml'),
  read('vite.config.ts'),
  read('scripts/deploy-functions-novo-projeto.sh'),
  read('e2e/public/api-auth-errors.spec.ts'),
  read('src/utils/safeUrl.ts'),
  read('.github/workflows/e2e.yml'),
]);

console.log('1. Projeto da CLI');
expect(
  new RegExp(`^project_id\\s*=\\s*"${CANONICAL_REF}"\\s*$`, 'm').test(configToml),
  `supabase/config.toml usa exclusivamente ${CANONICAL_REF}`
);

console.log('2. Proxy de desenvolvimento');
expect(viteConfig.includes(canonicalUrl), 'vite.config.ts encaminha Edge Functions ao projeto canônico');
expect(!viteConfig.includes(LEGACY_REF), 'vite.config.ts não referencia o projeto legado');

console.log('3. Deploy de Edge Functions');
expect(
  deployScript.includes(`CANONICAL_PROJECT_REF="${CANONICAL_REF}"`),
  'deploy usa o projeto canônico como padrão explícito'
);
expect(!deployScript.includes(LEGACY_REF), 'deploy não referencia o projeto legado');
expect(!deployScript.includes('--no-verify-jwt'), 'deploy preserva verify_jwt do config.toml (sem bypass global)');
expect(
  deployScript.includes('ALLOW_NON_CANONICAL_PROJECT=1'),
  'deploy exige opt-in explícito para um projeto não canônico'
);

console.log('4. Teste E2E de API');
expect(publicApiSpec.includes("process.env.VITE_SUPABASE_URL ?? ''"), 'E2E não possui fallback para endpoint remoto');
expect(!publicApiSpec.includes(LEGACY_REF), 'E2E não referencia o projeto legado');
expect(
  publicApiSpec.includes('VITE_SUPABASE_PUBLISHABLE_KEY'),
  'E2E usa a mesma nomenclatura de chave pública da workflow'
);

console.log('5. Allowlist de URL');
expect(safeUrl.includes(CANONICAL_REF), 'allowlist nomeia o host Supabase canônico');
expect(!safeUrl.includes(LEGACY_REF), 'allowlist não nomeia o host legado');
expect(!safeUrl.includes("'.supabase.co'"), 'allowlist não libera projetos Supabase arbitrários por sufixo');

console.log('6. Contrato da workflow E2E');
expect(
  workflow.includes('VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}'),
  'workflow recebe URL exclusivamente de GitHub Secrets'
);
expect(
  workflow.includes('VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY'),
  'workflow recebe chave pública exclusivamente de GitHub Secrets'
);

if (failures.length > 0) {
  console.error(`\n❌ Gate de projeto canônico reprovado: ${failures.length} falha(s).`);
  process.exit(1);
}

console.log('\n✅ Projeto canônico consistente nas superfícies executáveis.');
