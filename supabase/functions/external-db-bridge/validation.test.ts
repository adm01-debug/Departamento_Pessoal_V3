// Bateria adversarial da camada de validação do external-db-bridge.
// Roda com: deno test validation.test.ts
// Objetivo: provar que injeção/bypass são rejeitados e que os identificadores
// legítimos do PostgREST continuam aceitos. Centenas de cenários.

import {
  isSafeTableName,
  isSafeColumnsExpr,
  isSafeOrderColumn,
  isSafeOrExpression,
  isSafeFilterColumn,
  TABLE_DENYLIST,
  TENANT_SCOPED_TABLES,
  RPC_ALLOWLIST,
  FILTER_OPS,
  NOT_EXTRA_OPS,
} from "./validation.ts";

let CASES = 0;
function ok(cond: boolean, msg: string) {
  CASES++;
  if (!cond) throw new Error("FALHOU: " + msg);
}

// ---------------------------------------------------------------------------
// 1. Nomes de tabela — injeção deve ser rejeitada
// ---------------------------------------------------------------------------
const SQLI_TABLE = [
  "users; DROP TABLE users", "users--", "users/*c*/", "users#", "1users",
  "users users", "users,secrets", "user_roles;", "users'", 'users"',
  "users`", "users\\x", "pg_catalog.pg_tables", "public.users", "users.col",
  "users UNION SELECT", "users OR 1=1", "users)", "(users", "users*",
  "users=1", "users\n", "users\t", "users ", " users", "users$", "users@",
  "sec rets", "táble", "üsers", "users\u0000", "a".repeat(64), "",
  "'; SELECT * FROM secrets;--", "%27", "0x414243",
];
Deno.test("tabela: injeção rejeitada", () => {
  for (const t of SQLI_TABLE) ok(!isSafeTableName(t), `tabela deveria ser rejeitada: ${JSON.stringify(t)}`);
  // tipos não-string
  for (const t of [null, undefined, 1, true, {}, [], NaN]) ok(!isSafeTableName(t as unknown), `não-string rejeitado: ${String(t)}`);
});

Deno.test("tabela: nomes legítimos aceitos", () => {
  const valid = [
    "colaboradores", "empresas", "ferias_solicitacoes", "a", "_x", "Table123",
    "folhas_pagamento", "x".repeat(63), "_", "A1_b2_C3",
  ];
  for (const t of valid) ok(isSafeTableName(t), `tabela legítima deveria passar: ${t}`);
});

// ---------------------------------------------------------------------------
// 2. Denylist — tabelas sensíveis sempre negadas (independe do regex)
// ---------------------------------------------------------------------------
Deno.test("denylist: tabelas sensíveis presentes", () => {
  const mustDeny = [
    "user_roles", "secrets", "vault", "ip_whitelist", "blocked_ips",
    "rate_limit_config", "rate_limit_logs", "login_attempts", "login_lockouts",
    "login_rate_limits", "password_policies", "security_alerts", "audit_log",
    "geo_blocking_config", "geo_allowed_countries", "govbr_auth_state",
  ];
  for (const t of mustDeny) ok(TABLE_DENYLIST.has(t), `denylist deveria conter: ${t}`);
  // sanity: uma tabela de negócio não está na denylist
  for (const t of ["colaboradores", "empresas", "ferias_solicitacoes"]) ok(!TABLE_DENYLIST.has(t), `negócio não deveria estar na denylist: ${t}`);
});

// ---------------------------------------------------------------------------
// 3. Expressão de colunas — injeção/subquery rejeitada, embeds legítimos aceitos
// ---------------------------------------------------------------------------
const SQLI_COLUMNS = [
  "id; DROP TABLE x", "id--comment", "id/*c*/", "*/x", "id,(select senha from secrets)",
  "(SELECT password FROM users)", "id UNION SELECT senha FROM secrets", "id FROM secrets",
  "id WHERE 1=1", "id;--", "1; DELETE FROM x", "id INSERT", "col UPDATE set",
  "EXEC sp", "id\\g", "id;SELECT", "id/**/UNION", "senha,(select * from vault)",
];
Deno.test("colunas: injeção/subquery rejeitada", () => {
  for (const c of SQLI_COLUMNS) ok(!isSafeColumnsExpr(c), `colunas deveria ser rejeitada: ${JSON.stringify(c)}`);
  ok(!isSafeColumnsExpr("a".repeat(2001)), "colunas > 2000 rejeitada");
  ok(!isSafeColumnsExpr(""), "colunas vazia rejeitada");
  for (const c of [null, 1, {}, []]) ok(!isSafeColumnsExpr(c as unknown), "colunas não-string rejeitada");
});
Deno.test("colunas: PostgREST legítimo aceito", () => {
  const valid = [
    "*", "id", "id,nome", "id, empresa_id, created_at", "count(*)", "id::text",
    "*,empresas(nome)", "colaboradores(id,nome)", "nome,cargo,salario",
    "id,empresa:empresas(razao_social)", "valor::numeric", 'a,"coluna com espaco"',
  ];
  for (const c of valid) ok(isSafeColumnsExpr(c), `colunas legítimas deveriam passar: ${c}`);
});

// ---------------------------------------------------------------------------
// 4. ORDER BY — injeção rejeitada, coluna simples aceita
// ---------------------------------------------------------------------------
Deno.test("order: injeção rejeitada", () => {
  const bad = [
    "id; DROP", "id--", "id/*", "(select 1)", "id,secrets", "id desc; DELETE",
    "1", "id ASC", "id nulls first", "id)", "*", "id||", "id SELECT", "id FROM x",
  ];
  for (const c of bad) ok(!isSafeOrderColumn(c), `order deveria ser rejeitada: ${JSON.stringify(c)}`);
  ok(!isSafeOrderColumn("a".repeat(121)), "order > 120 rejeitada");
});
Deno.test("order: colunas simples aceitas", () => {
  for (const c of ["id", "created_at", "empresa_id", "tabela.coluna", "_x", "A1"]) ok(isSafeOrderColumn(c), `order legítima deveria passar: ${c}`);
});

// ---------------------------------------------------------------------------
// 5. Expressão .or() — subquery/keyword rejeitada, formato PostgREST aceito
// ---------------------------------------------------------------------------
const SQLI_OR = [
  "id.eq.1;DROP TABLE x", "id.eq.(select 1)", "id.eq.1--", "col.foo.1",
  "id.eq.1,SELECT senha", "(select * from secrets).eq.1", "id.exec.1",
  "id.eq.1/*c*/", "1.eq.1", ".eq.1", "id.eq.1,id.delete.2", "x".repeat(501),
  "id.union.1", "id.eq.1 UNION SELECT", "col.eq.1,;--",
];
Deno.test("or(): injeção rejeitada", () => {
  for (const e of SQLI_OR) ok(!isSafeOrExpression(e), `or() deveria ser rejeitada: ${JSON.stringify(e)}`);
  for (const e of [null, 1, {}, ""]) ok(!isSafeOrExpression(e as unknown), "or() inválida rejeitada");
});
Deno.test("or(): formato PostgREST legítimo aceito", () => {
  const valid = [
    "status.eq.ativo", "idade.gte.18,idade.lte.65", "nome.ilike.joao",
    "empresa_id.eq.abc,tipo.neq.x", "valor.gt.100", "col.is.null",
    "id.in.(1,2,3)".replace("(1,2,3)", "1"), // in simplificado
    "a.eq.1,b.eq.2,c.eq.3",
  ];
  for (const e of valid) ok(isSafeOrExpression(e), `or() legítima deveria passar: ${e}`);
});

// ---------------------------------------------------------------------------
// 6. Coluna de filtro (SELECT) — aceita JSON path/embeds, rejeita injeção óbvia
// ---------------------------------------------------------------------------
Deno.test("coluna de filtro: básico", () => {
  for (const c of ["empresa_id", "data->>chave", "tabela.coluna", "id,nome"]) ok(isSafeFilterColumn(c), `filtro legítimo: ${c}`);
  for (const c of ["id;DROP", "id`", "id\\", "id$", "id*"]) ok(!isSafeFilterColumn(c), `filtro injeção rejeitado: ${JSON.stringify(c)}`);
});

// ---------------------------------------------------------------------------
// 7. Operadores — apenas allowlist; 'not' exige extraOp válido
// ---------------------------------------------------------------------------
Deno.test("operadores: allowlist", () => {
  for (const op of ["eq","neq","gt","gte","lt","lte","like","ilike","in","is","or","not","contains","match"]) ok(FILTER_OPS.has(op), `op permitido: ${op}`);
  for (const op of ["exec","drop","select","union",";","--","sql","raw","cast","any","all"]) ok(!FILTER_OPS.has(op), `op proibido: ${op}`);
  for (const op of ["eq","neq","gt","gte","lt","lte","in","is"]) ok(NOT_EXTRA_OPS.has(op), `not.extraOp válido: ${op}`);
  for (const op of ["like","ilike","or","not","contains","match"]) ok(!NOT_EXTRA_OPS.has(op), `not.extraOp inválido: ${op}`);
});

// ---------------------------------------------------------------------------
// 8. RPC allowlist — só listadas passam; nomes sensíveis/injeção fora
// ---------------------------------------------------------------------------
Deno.test("rpc allowlist", () => {
  for (const r of ["has_role","is_admin","admin_set_user_role","assinar_desligamento","get_admissao_por_token"]) ok(RPC_ALLOWLIST.has(r), `rpc permitida: ${r}`);
  for (const r of ["pg_sleep","drop_table","exec","delete_all_users","'; DROP","set_config","pg_read_file","dblink"]) ok(!RPC_ALLOWLIST.has(r), `rpc proibida: ${r}`);
});

// ---------------------------------------------------------------------------
// 9. Fuzz combinatório — gera centenas de payloads e garante rejeição
// ---------------------------------------------------------------------------
Deno.test("fuzz: payloads combinatórios de injeção sempre rejeitados", () => {
  const bases = ["id", "nome", "col", "x", "senha"];
  const injections = [
    "; DROP TABLE t", "--", "/*", "*/", " UNION SELECT", " OR 1=1", ";SELECT",
    ")", "(", "'", '"', "`", "\\", ";DELETE", " FROM secrets", " WHERE 1=1",
    "\n;", "\t--", "%3B",
  ];
  let fuzz = 0;
  for (const b of bases) {
    for (const inj of injections) {
      const payload = b + inj;
      // Nenhuma dessas combinações pode passar como tabela nem como order.
      ok(!isSafeTableName(payload), `fuzz tabela: ${JSON.stringify(payload)}`);
      ok(!isSafeOrderColumn(payload), `fuzz order: ${JSON.stringify(payload)}`);
      fuzz += 2;
      // Como coluna: só é aceitável se NENHUM token perigoso — a maioria cai.
      if (isSafeColumnsExpr(payload)) {
        // se passou, não pode conter token perigoso óbvio
        ok(!/(;|--|\/\*|\bDROP\b|\bUNION\b|\bSELECT\b|\bDELETE\b|\bFROM\b|\bWHERE\b)/i.test(payload), `fuzz coluna aceita não deve ter token perigoso: ${JSON.stringify(payload)}`);
        fuzz += 1;
      }
    }
  }
  ok(fuzz >= 200, `fuzz deveria exercitar >=200 casos, exercitou ${fuzz}`);
});

// ---------------------------------------------------------------------------
// 10. Coerência das listas
// ---------------------------------------------------------------------------
Deno.test("listas: sanidade e disjunção", () => {
  ok(TABLE_DENYLIST.size >= 15, "denylist com tamanho esperado");
  ok(RPC_ALLOWLIST.size >= 30, "rpc allowlist com tamanho esperado");
  // nenhuma tabela de negócio (tenant-scoped) pode estar simultaneamente na denylist
  for (const t of TENANT_SCOPED_TABLES) ok(!TABLE_DENYLIST.has(t), `tabela tenant-scoped não pode estar na denylist: ${t}`);
});

// Relatório final do total de cenários exercitados
globalThis.addEventListener("unload", () => {
  console.log(`\n[bateria adversarial] cenários exercitados: ${CASES}`);
});
