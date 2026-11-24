export const PAYROLL_AUDIT_READ_ACTIONS = [
  'PAYROLL_CALC',
  'PAYROLL_CLOSE',
  'PAYROLL_REOPEN',
  // Read-only compatibility for rows created before the physical CHECK was
  // aligned with the Edge Function writers.
  'CLOSE',
  'REOPEN',
] as const;

export function normalizePayrollAuditAction(action: string | null | undefined): string {
  if (action === 'CLOSE') return 'PAYROLL_CLOSE';
  if (action === 'REOPEN') return 'PAYROLL_REOPEN';
  return action ?? 'unknown';
}
