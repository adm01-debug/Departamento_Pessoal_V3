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
// Aceita: "id", "id.desc", "id.desc.nullsfirst", "created_at.asc.nullslast"
// Bloqueia: ; -- /* */ SQL keywords, espaços, caracteres especiais
const ORDER_FULL_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?(\.(nullsfirst|nullslast))?$/;
export function isSafeOrderColumn(c: unknown): c is string {
  if (typeof c !== "string") return false;
  if (c.length === 0 || c.length > 120) return false;
  if (DANGEROUS_TOKENS.test(c)) return false;
  return ORDER_FULL_RE.test(c);
}

// -------------------- Keyset cursor (P1-020) --------------------
// Cursor base64-encoded: "<column>:<value>". Validamos column com
// isSafeOrderColumn e value como string|number (tamanho limitado).
const CURSOR_VALUE_RE = /^[A-Za-z0-9_.:@\-]{1,128}$/;
export interface ParsedCursor {
  column: string;
  value: string | number;
}
export function parseCursor(c: unknown): ParsedCursor | null {
  if (typeof c !== "string" || c.length === 0 || c.length > 200) return null;
  let decoded: string;
  try {
    decoded = atob(c);
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 1) return null;
  const column = decoded.substring(0, idx);
  const value = decoded.substring(idx + 1);
  if (!isSafeOrderColumn(column)) return null;
  if (!CURSOR_VALUE_RE.test(value)) return null;
  const asNumber = Number(value);
  return { column, value: Number.isFinite(asNumber) && value !== "" ? asNumber : value };
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

// -------------------- Colunas secretas — nunca trafegam pela ponte ----
// Credenciais/segredos que pertencem exclusivamente ao servidor. `select *`
// continua permitido, mas essas colunas são REMOVIDAS do resultado antes de
// responder — pedir a coluna explicitamente retorna 403. Writes com valor
// real são igualmente bloqueados (a ponte não é caminho de credencial).
// Quem precisa ler/escrever esses campos usa edge dedicada com service_role.
import { TABLE_ALLOWLIST } from "./tableCatalog.ts";

export const SECRET_COLUMNS: Record<string, ReadonlySet<string>> = {
  certificados_digitais: new Set(["senha_encriptada", "arquivo_base64"]),
  contas_bancarias: new Set([
    "agencia_encrypted", "conta_encrypted", "digito_encrypted", "pix_chave_encrypted",
  ]),
  pix_itens: new Set(["chave_pix_encrypted"]),
  user_mfa: new Set(["mfa_secret", "backup_codes"]),
  user_sessions: new Set(["session_token"]),
  admissao_tokens: new Set(["token"]),
  contrato_assinatura_tokens: new Set(["token_hash"]),
  medidas_ciencia_tokens: new Set(["token_hash"]),
  idempotency_keys: new Set(["key_hash", "request_hash", "response_body"]),
  password_history: new Set(["password_hash"]),
  auth_gov_br_sessions: new Set(["access_token", "id_token"]),
  configuracoes: new Set(["vapid_private_key"]),
  webhooks: new Set(["secret"]),
  webhooks_config: new Set(["secret"]),
  whatsapp_config: new Set(["api_key"]),
  esocial_eventos: new Set(["transmission_claim_token"]),
  relatorios_agendados: new Set(["dispatch_claim_token"]),
  report_dispatch_attempts: new Set(["dispatch_key_hash", "request_hash", "response_body"]),
};

// Tokeniza a expressão de colunas do PostgREST em itens de primeiro nível,
// respeitando parênteses de embeds/funções: "id, emb(col), alias:x, *".
function topLevelSelectTokens(expr: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let token = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (token.trim()) tokens.push(token.trim());
      token = "";
    } else {
      token += ch;
    }
  }
  if (token.trim()) tokens.push(token.trim());
  return tokens;
}

export interface SelectColumnsVerdict {
  ok: boolean;
  code?: string;
  message?: string;
}

// Valida a projeção de um SELECT genérico:
//  - coluna secreta pedida explicitamente: negada (`*` é respondido com as
//    colunas secretas removidas — não é erro);
//  - embeds `tabela(col,...)`: a tabela embutida passa pelas mesmas regras
//    (denylist + allowlist + secret columns), fechando o desvio via join.
export function checkSelectColumns(
  table: string,
  columns: string | undefined,
  isAllowedTable: (t: string) => boolean,
  isDeniedTable: (t: string) => boolean,
): SelectColumnsVerdict {
  const secrets = SECRET_COLUMNS[table];
  const expr = columns ?? "*";
  for (const token of topLevelSelectTokens(expr)) {
    const embedMatch = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:!hint|![a-z_]+)?\((.*)\)$/s);
    if (embedMatch) {
      const embedTable = embedMatch[1].toLowerCase();
      const embedCols = embedMatch[2];
      if (isDeniedTable(embedTable)) {
        return { ok: false, code: "TABLE_DENIED", message: `Recurso embutido '${embedTable}' não é acessível via bridge` };
      }
      if (!isAllowedTable(embedTable)) {
        return { ok: false, code: "TABLE_NOT_CATALOGED", message: `Recurso embutido '${embedTable}' fora do catálogo` };
      }
      const embedVerdict = checkSelectColumns(embedTable, embedCols, isAllowedTable, isDeniedTable);
      if (!embedVerdict.ok) return embedVerdict;
      continue;
    }
    // Remove hints (`col!inner`), aliases PostgREST (`alias:col`) e casts
    const name = token.split("!")[0].split(":").pop()!.replace(/["'`]/g, "").trim();
    if (name === "*") continue;
    if (secrets?.has(name.toLowerCase())) {
      return { ok: false, code: "SECRET_COLUMN", message: `Coluna '${name}' de '${table}' não é acessível via bridge` };
    }
  }
  return { ok: true };
}

// Exceções controladas — o client precisa ESCREVER o valor (a leitura segue
// bloqueada/removida): token de admissão gerado no onboarding, segredo de
// webhook e api_key do WhatsApp configurados na tela de integrações.
export const WRITEABLE_SECRET_COLUMNS: Record<string, ReadonlySet<string>> = {
  admissao_tokens: new Set(["token"]),
  webhooks_config: new Set(["secret"]),
  whatsapp_config: new Set(["api_key"]),
};

// Bloqueia writes genéricos que carreguem coluna secreta com valor real.
// Escrever NULL (limpeza, ex.: MFASetup desmarcando mfa_secret) é permitido.
export function findSecretWriteColumn(table: string, row: Record<string, unknown>): string | null {
  const secrets = SECRET_COLUMNS[table];
  if (!secrets) return null;
  const writable = WRITEABLE_SECRET_COLUMNS[table];
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    const k = key.toLowerCase();
    if (secrets.has(k) && !writable?.has(k)) return key;
  }
  return null;
}

// Remove colunas secretas das linhas devolvidas por select e por writes
// (o `.select()` pós-write do PostgREST retorna a linha inteira por default).
// Colunas write-allowed permanecem — o chamador as acabou de enviar.
export function stripSecretColumns<T>(table: string, rows: T): T {
  const secrets = SECRET_COLUMNS[table];
  if (!secrets || !Array.isArray(rows)) return rows;
  const writable = WRITEABLE_SECRET_COLUMNS[table];
  for (const row of rows) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        const k = key.toLowerCase();
        if (secrets.has(k) && !writable?.has(k)) delete (row as Record<string, unknown>)[key];
      }
    }
  }
  return rows;
}
