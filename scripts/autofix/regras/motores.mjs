// Carrega os motores de cálculo REAIS do sistema (TypeScript) sem build do projeto: empacota com o
// empacotador que já está em node_modules (esbuild se existir; senão o rolldown, que vem com o Vite 8),
// resolvendo o alias "@/". Nada é executado além de funções puras.
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  const req = createRequire(join(cwd, 'package.json'));
  // O esbuild não é mais instalado (no Vite 8 é só peer opcional): sem ele, TODAS as regras de cálculo saíam "não verificável".
  let esbuild = null;
  try {
    esbuild = req('esbuild');
  } catch {}
  const dir = mkdtempSync(join(tmpdir(), 'dp-regras-'));
  const out = join(dir, 'motores.mjs');
  // Valores falsos: os cálculos são puros; o cliente do Supabase só precisa existir para o import não lançar.
  // Nunca usa o .env real nem faz chamada de rede.
  const env = JSON.stringify({ VITE_SUPABASE_URL: 'http://127.0.0.1:1', VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-falsa-para-verificacao', MODE: 'test', DEV: false, PROD: true, BASE_URL: '/' });
  try {
    if (!esbuild) {
      const { build } = await import(pathToFileURL(req.resolve('rolldown')).href);
      writeFileSync(join(dir, 'entrada.ts'), ENTRADA);
      await build({
        input: join(dir, 'entrada.ts'),
        platform: 'node',
        resolve: { alias: { '@': join(cwd, 'src') } },
        transform: { define: { 'import.meta.env': env } },
        logLevel: 'silent',
        output: { file: out, format: 'esm', codeSplitting: false },
      });
      return await import(pathToFileURL(out).href);
    }
    await esbuild.build({
      stdin: { contents: ENTRADA, resolveDir: cwd, loader: 'ts', sourcefile: 'entrada.ts' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node22',
      outfile: out,
      alias: { '@': join(cwd, 'src') },
      define: { 'import.meta.env': env },
      logLevel: 'silent',
    });
    return await import(pathToFileURL(out).href);
  } finally {
    // O módulo já está em memória depois do import. (Remoção imediata: o setTimeout+unref nunca disparava antes do
    // process.exit do verificador e cada execução deixava ~1 MB em /tmp/dp-regras-*.)
    rmSync(dir, { recursive: true, force: true });
  }
}
