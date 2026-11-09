#!/usr/bin/env node
// eslint --fix RESTRITO às regras pedidas. `eslint --fix --rule X:error` aplica TODA regra corrigível do projeto
// (muda `new Array(1,2)`, `let t: Number`, etc.); aqui a função `fix` do ESLint só deixa passar as regras da lista.
// Uso: node eslint-safe-fix.mjs <cwd> <regra1,regra2,...> <alvo> [alvo...]   (sai 0 ok; 2 = falha de configuração/execução)
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [cwd, regrasArg, ...alvos] = process.argv.slice(2);
if (!cwd || !regrasArg || !alvos.length) { console.error('uso: eslint-safe-fix.mjs <cwd> <regras> <alvos...>'); process.exit(2); }
const regras = new Set(regrasArg.split(',').filter(Boolean));
try {
  const { ESLint } = createRequire(resolve(cwd, 'package.json'))('eslint');
  const eslint = new ESLint({
    cwd,
    fix: (m) => regras.has(m.ruleId),
    overrideConfig: { rules: Object.fromEntries([...regras].map((r) => [r, 'error'])) },
  });
  const results = await eslint.lintFiles(alvos);
  await ESLint.outputFixes(results);
  const fatais = results.flatMap((r) => r.messages.filter((m) => m.fatal).map((m) => `${r.filePath}: ${m.message}`));
  if (fatais.length) { console.error(`eslint: erro fatal de parsing em ${fatais.length} arquivo(s):\n${fatais.slice(0, 5).join('\n')}`); process.exit(2); }
  process.exit(0);
} catch (e) {
  console.error(`eslint-safe-fix falhou: ${e?.message ?? e}`);
  process.exit(2);
}
