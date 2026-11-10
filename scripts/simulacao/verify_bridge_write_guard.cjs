// Verificação exaustiva do write-guard do external-db-bridge (B1).
// Regra: update/delete só são permitidos com filtros exclusivamente eq.
//        Qualquer filtro não-eq em update/delete → bloqueado.
//        update/delete sem nenhum filtro → bloqueado.
//        select/insert não são restritos pelo guard.
//
// Cenários: 42 casos cobrindo todos os operadores Supabase, combinações mistas,
//           contagem de filtros e todas as actions. Auto-validação: exit 1 se FAIL.

function checkWriteFilters(action, filters) {
  if (action === 'update' || action === 'delete') {
    if (filters.length === 0) return { ok: false, code: 'WRITE_REQUIRES_FILTER' };
    const nonEq = filters.find((f) => f.op !== 'eq');
    if (nonEq) return { ok: false, code: 'UNSUPPORTED_FILTER_FOR_WRITE' };
  }
  return { ok: true };
}

// Todos os operadores conhecidos do Supabase PostgREST
const OPS_NAO_EQ = ['neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs', 'cd', 'fts', 'plfts', 'phfts', 'wfts', 'sl', 'sr'];

const cases = [
  // ── DELETE: bloqueados (filtro único não-eq) ──────────────────────────────
  { action: 'delete', filters: [{ column: 'id', op: 'neq', value: 'x' }],     expectOk: false, desc: 'delete neq único' },
  { action: 'delete', filters: [{ column: 'id', op: 'gt',  value: '0' }],     expectOk: false, desc: 'delete gt único' },
  { action: 'delete', filters: [{ column: 'id', op: 'gte', value: '0' }],     expectOk: false, desc: 'delete gte único' },
  { action: 'delete', filters: [{ column: 'id', op: 'lt',  value: '999' }],   expectOk: false, desc: 'delete lt único' },
  { action: 'delete', filters: [{ column: 'id', op: 'lte', value: '999' }],   expectOk: false, desc: 'delete lte único' },
  { action: 'delete', filters: [{ column: 'nome', op: 'like', value: '%x%' }], expectOk: false, desc: 'delete like único' },
  { action: 'delete', filters: [{ column: 'nome', op: 'ilike', value: '%x%' }], expectOk: false, desc: 'delete ilike único' },
  { action: 'delete', filters: [{ column: 'ativo', op: 'is', value: 'true' }], expectOk: false, desc: 'delete is único' },
  { action: 'delete', filters: [{ column: 'id', op: 'in', value: '(a,b)' }],  expectOk: false, desc: 'delete in único' },
  // ── DELETE: bloqueados (filtro misto eq+não-eq) ───────────────────────────
  { action: 'delete', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'id', op: 'neq', value: 'x' }], expectOk: false, desc: 'delete eq+neq' },
  { action: 'delete', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'ativo', op: 'is', value: 'true' }], expectOk: false, desc: 'delete eq+is' },
  { action: 'delete', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'id', op: 'gt', value: '0' }], expectOk: false, desc: 'delete eq+gt' },
  // ── DELETE: bloqueados (sem filtro) ──────────────────────────────────────
  { action: 'delete', filters: [], expectOk: false, desc: 'delete sem filtro (table wipe)' },
  // ── DELETE: permitidos (apenas eq) ───────────────────────────────────────
  { action: 'delete', filters: [{ column: 'id', op: 'eq', value: 'abc' }], expectOk: true, desc: 'delete id=eq único' },
  { action: 'delete', filters: [{ column: 'dependente_id', op: 'eq', value: 'a' }, { column: 'beneficio_id', op: 'eq', value: 'b' }], expectOk: true, desc: 'delete 2 filtros eq compostos' },
  { action: 'delete', filters: [{ column: 'a', op: 'eq', value: '1' }, { column: 'b', op: 'eq', value: '2' }, { column: 'c', op: 'eq', value: '3' }], expectOk: true, desc: 'delete 3 filtros eq' },
  // ── UPDATE: bloqueados (filtro único não-eq) ──────────────────────────────
  { action: 'update', filters: [{ column: 'id', op: 'gt',  value: '0' }],     expectOk: false, desc: 'update gt único (B1 exploit)' },
  { action: 'update', filters: [{ column: 'id', op: 'neq', value: 'x' }],     expectOk: false, desc: 'update neq único' },
  { action: 'update', filters: [{ column: 'id', op: 'gte', value: '0' }],     expectOk: false, desc: 'update gte único' },
  { action: 'update', filters: [{ column: 'id', op: 'lt',  value: '999' }],   expectOk: false, desc: 'update lt único' },
  { action: 'update', filters: [{ column: 'id', op: 'lte', value: '999' }],   expectOk: false, desc: 'update lte único' },
  { action: 'update', filters: [{ column: 'nome', op: 'like', value: '%x%' }], expectOk: false, desc: 'update like único' },
  { action: 'update', filters: [{ column: 'ativo', op: 'is', value: 'true' }], expectOk: false, desc: 'update is único' },
  { action: 'update', filters: [{ column: 'id', op: 'in', value: '(a,b)' }],  expectOk: false, desc: 'update in único' },
  // ── UPDATE: bloqueados (filtro misto eq+não-eq) ───────────────────────────
  { action: 'update', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'id', op: 'in', value: '(a,b)' }], expectOk: false, desc: 'update eq+in' },
  { action: 'update', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'id', op: 'neq', value: 'x' }], expectOk: false, desc: 'update eq+neq' },
  // ── UPDATE: bloqueados (sem filtro) ──────────────────────────────────────
  { action: 'update', filters: [], expectOk: false, desc: 'update sem filtro (mass update)' },
  // ── UPDATE: permitidos (apenas eq) ───────────────────────────────────────
  { action: 'update', filters: [{ column: 'jornada_id', op: 'eq', value: 'x' }], expectOk: true, desc: 'update FK eq único' },
  { action: 'update', filters: [{ column: 'id', op: 'eq', value: 'abc' }], expectOk: true, desc: 'update id=eq único' },
  { action: 'update', filters: [{ column: 'empresa_id', op: 'eq', value: '1' }, { column: 'colaborador_id', op: 'eq', value: 'x' }], expectOk: true, desc: 'update 2 filtros eq' },
  // ── SELECT: nunca afetado pelo guard ─────────────────────────────────────
  { action: 'select', filters: [], expectOk: true, desc: 'select sem filtro (read-all legítimo)' },
  { action: 'select', filters: [{ column: 'id', op: 'neq', value: 'x' }], expectOk: true, desc: 'select neq (válido em leitura)' },
  { action: 'select', filters: [{ column: 'id', op: 'in', value: '(a,b)' }], expectOk: true, desc: 'select in (válido em leitura)' },
  { action: 'select', filters: [{ column: 'ativo', op: 'is', value: 'true' }], expectOk: true, desc: 'select is (válido em leitura)' },
  { action: 'select', filters: [{ column: 'nome', op: 'like', value: '%x%' }], expectOk: true, desc: 'select like (válido em leitura)' },
  { action: 'select', filters: [{ column: 'id', op: 'gt', value: '0' }], expectOk: true, desc: 'select gt (válido em leitura)' },
  // ── INSERT: nunca afetado pelo guard ─────────────────────────────────────
  { action: 'insert', filters: [], expectOk: true, desc: 'insert sem filtro (esperado)' },
  { action: 'insert', filters: [{ column: 'id', op: 'neq', value: 'x' }], expectOk: true, desc: 'insert com filtro não-eq (raro mas permitido pelo guard)' },
  // ── Todos os operadores não-eq em delete (exaustivo) ─────────────────────
  ...OPS_NAO_EQ.map(op => ({
    action: 'delete', filters: [{ column: 'id', op, value: 'x' }],
    expectOk: false, desc: `delete op=${op} deve ser bloqueado`,
  })),
];

let pass = 0;
let fail = 0;
const failures = [];

for (const c of cases) {
  const result = checkWriteFilters(c.action, c.filters);
  const ok = result.ok === c.expectOk;
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push(`FAIL — ${c.desc}: esperava ok=${c.expectOk}, obteve ok=${result.ok} code=${result.code ?? '—'}`);
  }
}

console.log(`=== VERIFICAÇÃO write-guard external-db-bridge (B1) ===`);
console.log(`Cenários: ${cases.length}`);
console.log(`  OK   : ${pass}`);
console.log(`  FAIL : ${fail}`);

if (failures.length) {
  console.error('\nFalhas:');
  for (const f of failures) console.error(' ', f);
  process.exit(1);
}

// Auto-validação extra: todos os operadores não-eq em UPDATE também devem bloquear
let extraPass = 0;
for (const op of OPS_NAO_EQ) {
  const r = checkWriteFilters('update', [{ column: 'id', op, value: 'x' }]);
  if (!r.ok) extraPass++;
}
if (extraPass !== OPS_NAO_EQ.length) {
  console.error(`ASSERT: ${OPS_NAO_EQ.length - extraPass} operador(es) não-eq em UPDATE não estão sendo bloqueados`);
  process.exit(1);
}

// A função acima é uma CÓPIA do guard. Sem conferir o código real, o script
// continuava verde mesmo com o guard removido do bridge.
const bridgeSrc = require('fs').readFileSync(
  require('path').resolve(__dirname, '../../supabase/functions/external-db-bridge/index.ts'),
  'utf8',
);
const guardReal =
  /if \(action === "update" \|\| action === "delete"\) \{\s*const nonEq = filters\.find\(\(f\) => f\.op !== "eq"\);\s*if \(nonEq\) \{\s*return jsonError\(\s*400,\s*"UNSUPPORTED_FILTER_FOR_WRITE",[\s\S]*?\);\s*\}\s*if \(filters\.length === 0\) \{\s*return jsonError\(400, "WRITE_REQUIRES_FILTER",/;
if (!guardReal.test(bridgeSrc)) {
  console.error('ASSERT: write-guard não encontrado em supabase/functions/external-db-bridge/index.ts — a cópia simulada não corresponde mais ao código real');
  process.exit(1);
}

console.log(`\nAuto-validação extra: ${OPS_NAO_EQ.length} operadores não-eq em UPDATE — todos bloqueados ✅`);
console.log(`\n✅ ${pass}/${cases.length} cenários conforme esperado.`);
