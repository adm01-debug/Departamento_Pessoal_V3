#!/usr/bin/env node
/**
 * Gate de CI — sintaxe das Edge Functions (Deno).
 *
 * Contexto: as edge functions ficam fora do `tsconfig` do app (runtime Deno,
 * imports por URL), então `tsgo --noEmit` nunca as enxerga. Consequência real
 * observada em 31/07/2026: quatro funções (`calcular-rescisao`, `OCR`,
 * `metrics`, `reabrir-folha`) estavam com erro de sintaxe e falhavam no bundle
 * do deploy — em produção continuavam rodando a versão antiga, silenciosamente.
 *
 * Este script faz o parse de todo `supabase/functions/**` com o esbuild (já
 * presente via Vite), sem resolver imports remotos: só valida sintaxe e
 * declarações duplicadas, que é exatamente a classe de falha que quebra o
 * bundler do Supabase.
 *
 * Uso: node scripts/audit-edge-syntax.mjs   (exit 1 em caso de falha)
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { transform } from 'esbuild';

const ROOT = 'supabase/functions';

/** Lista recursivamente todos os arquivos .ts sob `dir`. */
function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = listTsFiles(ROOT);
const failures = [];

for (const file of files) {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(file, 'utf8'));
  try {
    // `transform` não resolve imports (nada de rede) — apenas faz o parse.
    await transform(source, { loader: 'ts', sourcefile: file });
  } catch (error) {
    const message = error?.errors?.[0]
      ? `${error.errors[0].text} (linha ${error.errors[0].location?.line ?? '?'})`
      : String(error?.message ?? error);
    failures.push({ file, message });
  }
}

if (failures.length > 0) {
  console.error(`[edge-syntax] ${failures.length} arquivo(s) com erro de sintaxe:\n`);
  for (const { file, message } of failures) console.error(`  ✗ ${file}: ${message}`);
  console.error('\nEssas funções falhariam no bundle do deploy Supabase.');
  process.exit(1);
}

console.log(`[edge-syntax] OK — ${files.length} arquivo(s) de edge function sem erro de sintaxe.`);
