const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Mínimo de ${MIN_LENGTH} caracteres`);
  }
  if (password.length > MAX_LENGTH) {
    errors.push(`Máximo de ${MAX_LENGTH} caracteres`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial');
  }

  return { valid: errors.length === 0, errors };
}

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!res.ok) return { breached: false, count: 0 };

    const body = await res.text();
    const lines = body.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix?.trim() === suffix) {
        const count = parseInt(countStr?.trim() || '0', 10);
        return { breached: count > 0, count };
      }
    }

    return { breached: false, count: 0 };
  } catch {
    return { breached: false, count: 0 };
  }
}

export async function validatePasswordFull(password: string): Promise<PasswordValidation> {
  const base = validatePassword(password);
  if (!base.valid) return base;

  const { breached, count } = await checkPasswordBreach(password);
  const warnings: string[] = [];

  if (breached) {
    warnings.push(
      `Esta senha apareceu em ${count.toLocaleString('pt-BR')} vazamentos de dados. Considere usar outra.`
    );
  }

  return { ...base, warnings };
}
