/**
 * Helpers de validação eSocial
 */

export type ESocialData = Record<string, unknown>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  campo: string;
  mensagem: string;
  regra: string;
}

export interface ValidationWarning {
  campo: string;
  mensagem: string;
}

export function required(val: unknown, campo: string, errors: ValidationError[]) {
  if (val === null || val === undefined || val === '') {
    errors.push({ campo, mensagem: `${campo} é obrigatório`, regra: 'REGRA_OBRIGATORIO' });
  }
}

export function maxLen(val: string | null | undefined, max: number, campo: string, errors: ValidationError[]) {
  if (val && val.length > max) {
    errors.push({ campo, mensagem: `${campo} excede ${max} caracteres`, regra: 'REGRA_TAMANHO_MAX' });
  }
}

export function cpfValido(cpf: string | null | undefined, campo: string, errors: ValidationError[]) {
  if (!cpf) return;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) {
    errors.push({ campo, mensagem: 'CPF inválido', regra: 'REGRA_CPF' });
    return;
  }
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(clean[i], 10) * (10 - i);
  let d = 11 - (s % 11); if (d >= 10) d = 0;
  if (parseInt(clean[9], 10) !== d) { errors.push({ campo, mensagem: 'CPF inválido', regra: 'REGRA_CPF' }); return; }
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(clean[i], 10) * (11 - i);
  d = 11 - (s % 11); if (d >= 10) d = 0;
  if (parseInt(clean[10], 10) !== d) errors.push({ campo, mensagem: 'CPF inválido', regra: 'REGRA_CPF' });
}

export function cnpjValido(cnpj: string | null | undefined, campo: string, errors: ValidationError[]) {
  if (!cnpj) return;
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) {
    errors.push({ campo, mensagem: 'CNPJ inválido', regra: 'REGRA_CNPJ' });
    return;
  }
  const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(clean[i], 10) * pesos1[i];
  let d = s % 11 < 2 ? 0 : 11 - (s % 11);
  if (parseInt(clean[12], 10) !== d) { errors.push({ campo, mensagem: 'CNPJ inválido', regra: 'REGRA_CNPJ' }); return; }
  s = 0;
  for (let i = 0; i < 13; i++) s += parseInt(clean[i], 10) * pesos2[i];
  d = s % 11 < 2 ? 0 : 11 - (s % 11);
  if (parseInt(clean[13], 10) !== d) errors.push({ campo, mensagem: 'CNPJ inválido', regra: 'REGRA_CNPJ' });
}

export function dataValida(val: string | null | undefined, campo: string, errors: ValidationError[]) {
  if (!val) return;
  const d = new Date(val);
  if (isNaN(d.getTime())) errors.push({ campo, mensagem: 'Data inválida', regra: 'REGRA_DATA' });
}

export function enumValido(val: string | null | undefined, opcoes: string[], campo: string, errors: ValidationError[]) {
  if (val && !opcoes.includes(val)) {
    errors.push({ campo, mensagem: `Valor '${val}' não permitido. Opções: ${opcoes.join(', ')}`, regra: 'REGRA_ENUM' });
  }
}
