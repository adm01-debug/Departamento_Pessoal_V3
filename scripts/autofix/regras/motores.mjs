// Carrega os motores de cálculo REAIS do sistema (TypeScript) sem build do projeto: empacota com o
// esbuild que já está em node_modules, resolvendo o alias "@/". Nada é executado além de funções puras.
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRADA = `
export * as impostos from '@/calculators/impostos';
export * as tabelas from '@/calculators/tabelas';
export * as beneficios from '@/calculators/beneficios';
export * as base from '@/calculators/trabalhista-base';
export * as rescisaoSync from '@/calculators/rescisao';
export * as rescisaoAsync from '@/utils/rescisaoCalc';
export { calculoFerias } from '@/utils/calculoFerias';
export { folhaCalc } from '@/utils/folhaCalc';
`;

export async function carregarMotores(cwd) {
  const esbuild = createRequire(join(cwd, 'package.json'))('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'dp-regras-'));
  const out = join(dir, 'motores.mjs');
  try {
    await esbuild.build({
      stdin: { contents: ENTRADA, resolveDir: cwd, loader: 'ts', sourcefile: 'entrada.ts' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node22',
      outfile: out,
      alias: { '@': join(cwd, 'src') },
      // Valores falsos: os cálculos são puros; o cliente do Supabase só precisa existir para o import não lançar.
      // Nunca usa o .env real nem faz chamada de rede.
      define: {
        'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'http://127.0.0.1:1', VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-falsa-para-verificacao', MODE: 'test', DEV: false, PROD: true, BASE_URL: '/' }),
      },
      logLevel: 'silent',
    });
    return await import(pathToFileURL(out).href);
  } finally {
    // O módulo já está em memória depois do import.
    setTimeout(() => rmSync(dir, { recursive: true, force: true }), 2000).unref();
  }
}
