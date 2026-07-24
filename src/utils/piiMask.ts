const MASK_CHAR = '•';

export function maskCpfDisplay(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return MASK_CHAR.repeat(11);
  return `${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(3)}-${digits.slice(9)}`;
}

export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return '';
  const clean = account.replace(/\D/g, '');
  if (clean.length < 4) return MASK_CHAR.repeat(clean.length);
  return MASK_CHAR.repeat(clean.length - 4) + clean.slice(-4);
}

export function maskPisDisplay(pis: string | null | undefined): string {
  if (!pis) return '';
  const digits = pis.replace(/\D/g, '');
  if (digits.length !== 11) return MASK_CHAR.repeat(11);
  return `${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(5)}.${MASK_CHAR.repeat(2)}-${digits.slice(10)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return MASK_CHAR.repeat(email.length);
  const visibleLocal = local.length <= 2 ? MASK_CHAR.repeat(local.length) : local[0] + MASK_CHAR.repeat(local.length - 2) + local[local.length - 1];
  return `${visibleLocal}@${domain}`;
}
