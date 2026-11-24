import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { normalizePayrollAuditAction, PAYROLL_AUDIT_READ_ACTIONS } from './auditActions.ts';

Deno.test('lê ações atuais e mantém compatibilidade com fechamento legado', () => {
  assertEquals(PAYROLL_AUDIT_READ_ACTIONS, [
    'PAYROLL_CALC',
    'PAYROLL_CLOSE',
    'PAYROLL_REOPEN',
    'CLOSE',
    'REOPEN',
  ]);
});

Deno.test('normaliza nomes legados sem alterar ações atuais', () => {
  assertEquals(normalizePayrollAuditAction('CLOSE'), 'PAYROLL_CLOSE');
  assertEquals(normalizePayrollAuditAction('REOPEN'), 'PAYROLL_REOPEN');
  assertEquals(normalizePayrollAuditAction('PAYROLL_CALC'), 'PAYROLL_CALC');
  assertEquals(normalizePayrollAuditAction(null), 'unknown');
});
