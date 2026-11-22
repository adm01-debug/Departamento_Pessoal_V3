/**
 * Contrato de portabilidade das chaves de baseline dos gates.
 *
 * `ratchet-any.mjs` e `audit-bridge-frontend-contract.mjs` comparam a chave
 * calculada em runtime com uma chave escrita à mão em JSON (sempre com `/`).
 * No Windows `relative()` devolve `\`, então qualquer chave derivada de path
 * sem normalização deixa de casar com o baseline e o gate reprova por
 * "regressão" que não existe. Estes testes travam a normalização.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RATCHET = readFileSync(join(ROOT, 'scripts/ratchet-any.mjs'), 'utf8');
const BRIDGE = readFileSync(join(ROOT, 'scripts/audit-bridge-frontend-contract.mjs'), 'utf8');

test('ratchet-any deriva a chave do baseline separando os dois tipos de separador', () => {
  // A chave do baseline é o 2º segmento sob src/ ("types"). Num path Windows
  // (`src\types\uiRecord.ts`) split('/') devolve o path inteiro e a chave vira
  // "src\types\uiRecord.ts" — o baseline nunca casa.
  const splitLine = RATCHET.match(/const parts = relPath\.split\(([^)]*)\)/);
  assert.ok(splitLine, 'ratchet-any.mjs: não achei o cálculo de `parts`');
  assert.ok(
    /[\\/\\\\]/.test(splitLine[1]),
    `ratchet-any.mjs: split do relPath precisa aceitar \\\\ e / — hoje: ${splitLine[1]}`
  );

  const parts = `src${sep}types${sep}uiRecord.ts`.split(/[\\/]/);
  assert.equal(parts[0], 'src');
  assert.equal(parts[1], 'types', 'chave do baseline precisa ser o 2º segmento sob src/');
});

test('ratchet-any mantém o baseline real casando com a chave normalizada', () => {
  const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts/.any-baseline.json'), 'utf8'));
  for (const key of Object.keys(baseline)) {
    assert.ok(!key.includes('/') && !key.includes('\\'), `chave de baseline não pode ser path: ${key}`);
  }
});

test('bridge-contract normaliza call.file para posix antes de montar a chave', () => {
  // O baseline .bridge-base-baseline.json é escrito com '/' (ex.:
  // "src/services/securityService.ts"). No Windows `relative()` devolve '\'.
  // Basta que `file:` normalize o separador na origem.
  assert.ok(
    /file:\s*relative\(root,\s*file\)\.split\(sep\)\.join\('\/'\)/.test(BRIDGE),
    'audit-bridge-frontend-contract.mjs: `file:` precisa normalizar o separador nativo para "/" ' +
      '(__dirname), senão a chave nunca casa com o baseline no Windows'
  );
  assert.match(BRIDGE, /import\s*\{[^}]*\bsep\b[^}]*\}\s*from\s*'node:path'/, 'falta importar `sep` de node:path');
});

test('baseline do bridge usa apenas separador posix', () => {
  const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts/.bridge-base-baseline.json'), 'utf8'));
  for (const entry of baseline) {
    assert.ok(!entry.file.includes('\\'), `baseline com separador nativo: ${entry.file}`);
    assert.equal(entry.file, entry.file.split('/').join('/'));
  }
});
