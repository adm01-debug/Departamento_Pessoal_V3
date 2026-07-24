// Reimplementação mínima da guarda nova do external-db-bridge (B1) para
// verificar o comportamento sem depender do runtime Deno.
function checkWriteFilters(action, filters) {
  if (action === 'update' || action === 'delete') {
    const nonEq = filters.find((f) => f.op !== 'eq');
    if (nonEq) return { ok: false, code: 'UNSUPPORTED_FILTER_FOR_WRITE' };
    if (filters.length === 0) return { ok: false, code: 'WRITE_REQUIRES_FILTER' };
  }
  return { ok: true };
}

const cases = [
  { action: 'delete', filters: [{ column: 'id', op: 'neq', value: 'x' }], expectOk: false, desc: 'B1 exploit: delete com filtro neq único (antes: dropava e apagava tudo)' },
  { action: 'update', filters: [{ column: 'id', op: 'gt', value: '0' }], expectOk: false, desc: 'B1 exploit: update com filtro gt único' },
  { action: 'delete', filters: [{ column: 'id', op: 'eq', value: 'abc' }], expectOk: true, desc: 'delete legítimo por id (eq único)' },
  { action: 'delete', filters: [], expectOk: false, desc: 'delete sem filtro algum' },
  { action: 'update', filters: [{ column: 'jornada_id', op: 'eq', value: 'x' }], expectOk: true, desc: 'update legítimo por FK (eq)' },
  { action: 'delete', filters: [{ column: 'dependente_id', op: 'eq', value: 'a' }, { column: 'beneficio_id', op: 'eq', value: 'b' }], expectOk: true, desc: 'delete legítimo com 2 filtros eq compostos' },
  { action: 'select', filters: [{ column: 'id', op: 'neq', value: 'x' }], expectOk: true, desc: 'select não é afetado pela nova guarda (neq é válido em leitura)' },
];

let pass = 0;
for (const c of cases) {
  const result = checkWriteFilters(c.action, c.filters);
  const ok = result.ok === c.expectOk;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${c.desc} => ${JSON.stringify(result)}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${cases.length} cenários conforme esperado.`);
process.exit(pass === cases.length ? 0 : 1);
