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
  'registro_id',
  'tabela',
  'user_agent',
  'user_email',
  'user_id',
]);
const requiredKeys = ['acao', 'registro_id', 'tabela'];
const failures = [];
let checked = 0;

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

function isAuditLogInsert(node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== 'insert') return false;
  const receiver = node.expression.expression;
  if (!ts.isCallExpression(receiver) || !ts.isPropertyAccessExpression(receiver.expression)) return false;
  if (receiver.expression.name.text !== 'from') return false;
  return receiver.arguments.length === 1 && ts.isStringLiteral(receiver.arguments[0]) && receiver.arguments[0].text === 'audit_log';
}

for (const file of walk(functionsRoot)) {
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  function visit(node) {
    if (isAuditLogInsert(node)) {
      checked += 1;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const location = `${relative(root, file)}:${line}`;
      const argument = node.arguments[0];
      if (!argument || !ts.isObjectLiteralExpression(argument)) {
        failures.push(`${location}: INSERT em audit_log deve usar objeto literal auditável`);
      } else {
        const keys = new Set();
        for (const property of argument.properties) {
          if (ts.isSpreadAssignment(property)) {
            failures.push(`${location}: spread impede validar colunas de audit_log`);
            continue;
          }
          const key = propertyName(property.name);
          if (key) keys.add(key);
        }
        for (const key of keys) {
          if (!allowedKeys.has(key)) failures.push(`${location}: coluna inexistente em audit_log: ${key}`);
        }
        for (const key of requiredKeys) {
          if (!keys.has(key)) failures.push(`${location}: coluna obrigatória ausente em audit_log: ${key}`);
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
