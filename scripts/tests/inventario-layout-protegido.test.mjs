/**
 * Gate do LAYOUT PROTEGIDO da Gestao de Desempenho.
 *
 * Por que este arquivo existe: a `main` ja versiona o contrato visual
 * (`docs/protegido/desempenho-layout.baseline.json`) e o documento que o
 * descreve, mas nunca teve o codigo que o APLICA — o proprio doc admitia:
 * "por ora este baseline e inventario conferido, nao protecao automatizada".
 * O verificador (`scripts/verificar-layout-protegido.mjs`) foi resgatado da
 * branch `muri` e este teste e o que o transforma em gate.
 *
 * Por que o nome comeca com `inventario-`: o `ci.yml` roda
 * `node --test scripts/tests/contexto-*.test.mjs scripts/tests/inventario-*.test.mjs`,
 * e o baseline e, pela definicao do proprio doc, um inventario conferido.
 * Assim o gate entra sem precisar mexer em `.github/`, que e caminho de code
 * owner. Se preferir um passo proprio no workflow, mover e so renomear.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const verificador = resolve(raiz, 'scripts/verificar-layout-protegido.mjs');
const baseline = resolve(raiz, 'docs/protegido/desempenho-layout.baseline.json');

test('o verificador e o baseline existem', () => {
  assert.ok(existsSync(verificador), 'scripts/verificar-layout-protegido.mjs ausente');
  assert.ok(existsSync(baseline), 'docs/protegido/desempenho-layout.baseline.json ausente');
});

test('o baseline declara arquivos e ancoras', () => {
  const json = JSON.parse(readFileSync(baseline, 'utf8'));
  const arquivos = json.arquivos ?? json.files ?? [];
  assert.ok(Array.isArray(arquivos) && arquivos.length > 0, 'baseline sem lista de arquivos');
});

test('nenhuma ancora visual protegida foi alterada', () => {
  // `--sem-diff` porque o modo padrao imprime `git diff` do working tree, que
  // na CI e sempre vazio e so gasta tempo. `--json` para falha legivel.
  const saida = execFileSync('node', [verificador, '--json', '--sem-diff'], {
    cwd: raiz,
    encoding: 'utf8',
  });
  const r = JSON.parse(saida);
  assert.equal(r.ok, true, `ancoras visuais perdidas em: ${(r.falhas ?? []).map((f) => f.arquivo ?? f).join(', ')}`);
  assert.ok(r.verificados > 0, 'o verificador nao conferiu nenhum arquivo');
});
