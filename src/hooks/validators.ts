/**
 * Validators para useActionStateHelper
 * Funções utilitárias para validação de formulários
 */

/**
 * Valida campo obrigatório
 */
export function required(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') {
    return 'Este campo é obrigatório';
  }
  return undefined;
}

/**
 * Valida email
 */
export function isValidEmail(value: string): string | undefined {
  if (!value) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Email inválido';
  }
  return undefined;
}

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): string | undefined {
  if (!cpf) return undefined;

  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) {
    return 'CPF deve ter 11 dígitos';
  }

  // Valida dígitos verificadores
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10), 10)) {
    return 'CPF inválido';
  }

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11), 10)) {
    return 'CPF inválido';
  }

  return undefined;
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): string | undefined {
  if (!cnpj) return undefined;

  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) {
    return 'CNPJ deve ter 14 dígitos';
  }

  // Validação simplificada
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return 'CNPJ inválido';
  }

  return undefined;
}

/**
 * Valida data no formato ISO
 */
export function isValidDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Data inválida';
  }
  return undefined;
}

/**
 * Valida número positivo
 */
export function isPositiveNumber(value: number): string | undefined {
  if (isNaN(value) || value < 0) {
    return 'Valor deve ser um número positivo';
  }
  return undefined;
}
