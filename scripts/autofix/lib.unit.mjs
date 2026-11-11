import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prettierCheck, eslintJson } from './lib.mjs';

async function withTool(name, body, check) {
  const cwd = mkdtempSync(join(tmpdir(), 'autofix-gate-'));
  try {
    mkdirSync(join(cwd, 'node_modules', '.bin'), { recursive: true });
    writeFileSync(join(cwd, 'node_modules', '.bin', name), `#!/bin/sh\n${body}\n`, { mode: 0o700 });
    await check(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('falha do formatador com stderr não passa como ausência de diferenças', async () => {
  await withTool('prettier', 'echo "configuração inválida" >&2\nexit 2', async (cwd) => {
    await assert.rejects(prettierCheck(cwd, ['src/exemplo.ts']), /exit 2/);
  });
});

test('arquivo fora do padrão continua sendo reportado com exit 1', async () => {
  await withTool('prettier', 'echo src/exemplo.ts\nexit 1', async (cwd) => {
    assert.deepEqual(await prettierCheck(cwd, ['src/exemplo.ts']), ['src/exemplo.ts']);
  });
});

test('exit 1 sem lista de arquivos é inconclusivo e bloqueia o gate', async () => {
  await withTool('prettier', 'exit 1', async (cwd) => {
    await assert.rejects(prettierCheck(cwd, ['src/exemplo.ts']), /exit 1/);
  });
});

test('exit 0 sem diferenças aprova o formato', async () => {
  await withTool('prettier', 'exit 0', async (cwd) => {
    assert.deepEqual(await prettierCheck(cwd, ['src/exemplo.ts']), []);
  });
});

test('falha de execução do ESLint não passa mesmo com JSON vazio', async () => {
  await withTool('eslint', 'echo "[]"\nexit 2', async (cwd) => {
    await assert.rejects(eslintJson(cwd, ['src']), /exit 2/);
  });
});
