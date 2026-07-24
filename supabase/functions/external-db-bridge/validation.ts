// external-db-bridge — camada de validação de segurança (extraída para ser
// testável em isolamento). Fonte única da verdade: index.ts importa daqui e a
// suíte validation.test.ts exercita centenas de cenários adversariais.

// -------------------- Validação de identificadores --------------------
// Permite: letras, dígitos, _, ponto (schema.tab), vírgula/espaço (colunas
// múltiplas em select), !, *, (, ) e :: para casts. Bloqueia ;, --, /*, comentários.
export const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export const COLUMNS_RE = /^[a-zA-Z0-9_,.\s*!():"-]+$/;
// Endurecido (auditoria 23/07): além de DDL/comentários, bloqueia keywords de
// subquery/DML que não aparecem em tokens legítimos do PostgREST (colunas,
// embeds `tabela(col)`, casts `col::tipo`, JSON `->`). Fecha o buraco de aceitar
// algo como "(select senha from secrets)" na expressão de colunas.
export const DANGEROUS_TOKENS = /(;|--|\/\*|\*\/|\bDROP\b|\bTRUNCATE\b|\bALTER\b|\bGRANT\b|\bSELECT\b|\bUNION\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bEXEC(UTE)?\b|\bMERGE\b|\bCOPY\b|\bFROM\b|\bWHERE\b)/i;

export function isSafeTableName(t: unknown): t is string {
  return typeof t === "string" && t.length > 0 && t.length <= 63 && IDENTIFIER_RE.test(t);
}
export function isSafeColumnsExpr(c: unknown): c is string {
  if (typeof c !== "string") return false;
  if (c.length === 0 || c.length > 2000) return false;
  if (DANGEROUS_TOKENS.test(c)) return false;
  return COLUMNS_RE.test(c);
}
export function isSafeOrderColumn(c: unknown): c is string {
  if (typeof c !== "string") return false;
  if (c.length === 0 || c.length > 120) return false;
  if (DANGEROUS_TOKENS.test(c)) return false;
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(c);
}

// -------------------- Denylist de tabelas --------------------
// Estas tabelas nunca podem ser acessadas via bridge (nem leitura). Contêm
// dados de segurança/roles que devem ser gerenciados apenas server-side.
export const TABLE_DENYLIST = new Set<string>([
  "user_roles",
  "secrets",
  "vault",
  "ip_whitelist",
  "blocked_ips",
  "rate_limit_config",
  "rate_limit_logs",
  "login_attempts",
  "login_lockouts",
  "login_rate_limits",
  "password_policies",
  "security_alerts",
  "audit_log",
  "geo_blocking_config",
  "geo_allowed_countries",
  "govbr_auth_state",
]);

// Tabelas em que writes são permitidos apenas com auth+tenant válido.
// (Todas as tabelas de negócio; para leitura, RLS externo protege.)
export const TENANT_SCOPED_TABLES = new Set<string>([
  "colaboradores", "empresas", "folhas_pagamento", "holerites", "batidas_ponto",
  "registros_ponto", "admissoes", "candidaturas", "ferias_solicitacoes",
  "periodos_aquisitivos", "provisoes_mensais", "provisoes_folha", "beneficios",
  "documentos", "notificacoes", "workflows_execucoes", "workflows_definicoes",
  "auditoria_logs", "ferias_audit_log", "esocial_eventos", "guias_impostos",
]);

// -------------------- Allowlist de RPCs --------------------
// Somente RPCs explicitamente listadas são invocáveis via bridge.
export const RPC_ALLOWLIST = new Set<string>([
  // segurança / login
  "check_login_lock", "record_failed_login", "reset_login_attempts",
  "check_account_lockout", "record_login_attempt", "reset_account_lockout",
  "check_brute_force", "check_rate_limit", "is_ip_blocked", "is_ip_whitelisted",
  "is_country_allowed",
  // roles / tenant
  "has_role", "is_admin", "get_user_roles", "get_user_empresas",
  "get_user_default_empresa", "get_user_scope_empresas", "user_belongs_to_empresa",
  "get_auth_empresa_id",
  // gestão de papéis — único caminho de leitura/escrita para user_roles (a
  // tabela está na TABLE_DENYLIST); as funções verificam is_admin(auth.uid())
  // por dentro. Ver 20260718230000_admin_role_management_rpc.sql (achado R1).
  "admin_set_user_role", "admin_list_user_roles",
  // negócio
  "get_personnel_cost_projection", "get_colaborador_banco_horas",
  "calcular_dias_ferias", "fn_calculate_periodo_aquisitivo",
  "fn_link_gov_br_account", "processar_ajuste_aprovado",
  "gerar_alertas_preditivos_ia",
  "run_rls_tests",
  // rescisão — bloqueio de pagamento sem homologação/assinatura (achado
  // N25); ambas verificam is_admin(auth.uid()) por dentro. Ver
  // 20260719000000_bloqueio_pagamento_rescisao_lgpd.sql.
  "assinar_desligamento", "pagar_desligamento",
  // onboarding público (candidato) — lookup exato por token, ver
  // 20260718220000_rls_remediacao_auditoria.sql (achado L3 da auditoria)
  "get_admissao_por_token",
]);

// -------------------- Allowlist de operadores --------------------
export const FILTER_OPS = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte",
  "like", "ilike", "in", "is", "or", "not", "contains", "match",
]);
export const NOT_EXTRA_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "is"]);

// Validação de expressões .or() — permite apenas operadores seguros sobre colunas válidas
// Formato PostgREST: "col.op.val,col.op.val" — bloqueia subqueries, parênteses aninhados, SQL keywords
export const OR_SAFE_OPS = /^(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\./;
export const OR_DANGEROUS = /(;|--|\/\*|\*\/|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bEXEC\b)/i;
export function isSafeOrExpression(expr: unknown): boolean {
  if (typeof expr !== "string" || expr.length === 0 || expr.length > 500) return false;
  if (OR_DANGEROUS.test(expr)) return false;
  const parts = expr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) return false;
    // Each part must be: column_name.operator.value (or nested and/or with parens)
    // Allow parentheses for grouping but validate each leaf
    const leaf = trimmed.replace(/^\(+/, "").replace(/\)+$/, "");
    const dotIdx = leaf.indexOf(".");
    if (dotIdx < 1) return false;
    const colName = leaf.substring(0, dotIdx);
    if (!IDENTIFIER_RE.test(colName)) return false;
    const rest = leaf.substring(dotIdx + 1);
    if (!OR_SAFE_OPS.test(rest)) return false;
  }
  return true;
}

// Coluna de filtro (usada no handler para SELECT). Mantido aqui para teste.
// NB: a versão anterior usava /^[a-zA-Z0-9_.,()->\s"-]+$/ — o trecho `)->`
// formava um RANGE acidental de `)`(0x29) a `>`(0x3E), aceitando `;`, `*`, `<`,
// `=` etc. Aqui `-` fica no fim (literal) e `>` é literal: sem range indesejado.
export function isSafeFilterColumn(c: unknown): c is string {
  return typeof c === "string" && /^[A-Za-z0-9_.,"()>\s-]+$/.test(c);
}
