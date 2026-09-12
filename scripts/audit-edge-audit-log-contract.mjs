#!/usr/bin/env node

/**
 * Validates the physical contract of Edge Function inserts into the legacy
 * public.audit_log table. The Supabase client is intentionally untyped in
 * Deno functions, so invalid columns otherwise fail only at runtime.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const functionsRoot = join(root, 'supabase/functions');
const allowedKeys = new Set([
  'acao',
  'campos_alterados',
  'created_at',
  'dados_anteriores',
  'dados_novos',
  'id',
  'ip_address',
  'empresa_id',
  'registro_id',
  'tabela',
  'user_agent',
  'user_email',
  'user_id',
]);
const requiredKeys = ['acao', 'registro_id', 'tabela'];
const allowedActions = new Set([
  'INSERT',
  'UPDATE',
  'DELETE',
  'PAYROLL_CALC',
  'PAYROLL_CALC_BLOCKED',
  'PAYROLL_CLOSE',
  'PAYROLL_REOPEN',
  'FERIAS_CALC',
  'FERIAS_CANCEL',
  'RESCISAO_CALC',
  'PROVISOES_CALC',
  'ESOCIAL_SEND',
  'DECIMO_CALC',
  'IDEMPOTENCY_REPLAY',
  'IDEMPOTENCY_CONFLICT',
  'BACKUP_CREATED',
  'BACKUP_FAILED',
  'SYSTEM_ACTION',
  'AUTH_ACTION',
  'EXPORT',
  'IMPORT',
  'VISUALIZACAO',
  'EXECUTE_CALC',
  'SIGN',
  'STATUS_CHANGE',
]);
const failures = [];
let checked = 0;

// Prevent the static Edge gate from drifting away from PostgreSQL. The
// allowlist stays explicitly reviewed here, while the comparison below makes
// either side fail if a migration or writer changes independently.
const actionContractPath = join(root, 'supabase/migrations/20260912206000_p1_audit_action_contract.sql');
const actionContractSql = readFileSync(actionContractPath, 'utf8');
const actionConstraint = actionContractSql.match(
  /ADD CONSTRAINT\s+audit_log_acao_check\s+CHECK\s*\(\s*acao\s+IN\s*\(([\s\S]*?)\)\s*\)/i
);
if (!actionConstraint) {
  failures.push(`${relative(root, actionContractPath)}: definição audit_log_acao_check não encontrada`);
} else {
  const physicalActions = new Set([...actionConstraint[1].matchAll(/'([A-Z][A-Z0-9_]*)'/g)].map((match) => match[1]));
  for (const action of allowedActions) {
    if (!physicalActions.has(action)) failures.push(`audit_log_acao_check não aceita ação revisada: ${action}`);
  }
  for (const action of physicalActions) {
    if (!allowedActions.has(action)) failures.push(`audit_log_acao_check contém ação não revisada: ${action}`);
  }
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (name.endsWith('.ts') && !/\.(?:test|spec)\.ts$/.test(name)) files.push(path);
  }
  return files;
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

function staticStringValues(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isConditionalExpression(node)) {
    const left = staticStringValues(node.whenTrue);
    const right = staticStringValues(node.whenFalse);
    return left && right ? [...left, ...right] : null;
  }
  return null;
}

function isAuditLogSource(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'from' &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === 'audit_log'
  );
}

function collectAuditLogAliases(source) {
  const aliases = new Set();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isAuditLogSource(node.initializer)
    ) {
      aliases.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return aliases;
}

function isAuditLogInsert(node, aliases) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== 'insert') return false;
  const receiver = node.expression.expression;
  if (ts.isIdentifier(receiver) && aliases.has(receiver.text)) return true;
  if (!ts.isCallExpression(receiver) || !ts.isPropertyAccessExpression(receiver.expression)) return false;
  return isAuditLogSource(receiver);
}

for (const file of walk(functionsRoot)) {
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const auditLogAliases = collectAuditLogAliases(source);

  function visit(node) {
    if (isAuditLogInsert(node, auditLogAliases)) {
      checked += 1;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const location = `${relative(root, file)}:${line}`;
      const argument = node.arguments[0];
      if (!argument || !ts.isObjectLiteralExpression(argument)) {
        failures.push(`${location}: INSERT em audit_log deve usar objeto literal auditável`);
      } else {
        const keys = new Set();
        let actionInitializer = null;
        for (const property of argument.properties) {
          if (ts.isSpreadAssignment(property)) {
            failures.push(`${location}: spread impede validar colunas de audit_log`);
            continue;
          }
          const key = propertyName(property.name);
          if (key) keys.add(key);
          if (key === 'acao') {
            if (ts.isPropertyAssignment(property)) actionInitializer = property.initializer;
            else failures.push(`${location}: acao de audit_log deve ser uma constante auditável`);
          }
        }
        for (const key of keys) {
          if (!allowedKeys.has(key)) failures.push(`${location}: coluna inexistente em audit_log: ${key}`);
        }
        for (const key of requiredKeys) {
          if (!keys.has(key)) failures.push(`${location}: coluna obrigatória ausente em audit_log: ${key}`);
        }
        const actionValues = actionInitializer ? staticStringValues(actionInitializer) : null;
        if (actionInitializer && !actionValues) {
          failures.push(`${location}: acao de audit_log deve ser uma constante auditável`);
        }
        for (const action of actionValues ?? []) {
          if (!allowedActions.has(action))
            failures.push(`${location}: acao incompatível com audit_log_acao_check: ${action}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (failures.length) {
  console.error(`EDGE_AUDIT_LOG_CONTRACT_FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`EDGE_AUDIT_LOG_CONTRACT_OK checked_inserts=${checked}`);
