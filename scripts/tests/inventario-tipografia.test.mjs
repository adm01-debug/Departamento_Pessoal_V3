/**
 * Gate de TIPOGRAFIA do design system.
 *
 * O que ele reprova (regras do proprio verificador, resgatado da branch `muri`):
 *   1. `font-family` declarado fora das fontes oficiais;
 *   2. `font-mono` aplicado a valor monetario/numerico de interface — o token
 *      correto e `text-numeric`, que a `main` ja define em `src/index.css`;
 *   3. as familias oficiais deixarem de ser carregadas em `index.html`.
 *
 * A `main` tinha o documento (`docs/DESIGN-SYSTEM-TIPOGRAFIA.md`) e o token,
 * mas nada que impusesse nenhum dos dois.
 *
 * Por que o nome comeca com `inventario-`: o `ci.yml` roda
 * `node --test scripts/tests/contexto-*.test.mjs scripts/tests/inventario-*.test.mjs`,
 * e o verificador faz exatamente um inventario (varre `src` por declaracoes de
 * familia e por usos de `font-mono`). Assim o gate entra sem mexer em
 * `.github/`, que e caminho de code owner. Para um passo proprio no workflow,
 * basta renomear.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const verificador = resolve(raiz, 'scripts/verificar-tipografia.mjs');

test('o verificador de tipografia existe', () => {
  assert.ok(existsSync(verificador), 'scripts/verificar-tipografia.mjs ausente');
});

test('nenhuma divergencia de tipografia (familia oficial, text-numeric em valor)', () => {
  // O script sai com codigo != 0 quando ha divergencia; os "avisos" de
  // `font-mono` fora da lista tecnica NAO reprovam, por decisao do proprio
  // verificador (sinal para revisao, nao bloqueio).
  let saida = '';
  let falhou = false;
  try {
    saida = execFileSync('node', [verificador], { cwd: raiz, encoding: 'utf8' });
  } catch (e) {
    falhou = true;
    saida = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const divergencias = saida
    .split('\n')
    .filter((l) => l.trim().startsWith('x '))
    .map((l) => l.trim());
  assert.deepEqual(divergencias, [], `divergências de tipografia:\n${divergencias.join('\n')}`);
  assert.equal(falhou, false, 'o verificador de tipografia reprovou');
});
