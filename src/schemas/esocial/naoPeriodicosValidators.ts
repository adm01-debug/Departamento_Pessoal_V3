// Validadores eSocial — eventos não periódicos
import { ValidationResult, ValidationError, required, cpfValido, dataValida, ESocialData } from './helpers';

const finishValidation = (errors: ValidationError[]): ValidationResult => ({
  valid: errors.length === 0,
  errors,
  warnings: []
});

export function validarS2190(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtAdm, 'dtAdm', errors);
  dataValida(dados.dtAdm as string, 'dtAdm', errors);
  return finishValidation(errors);
}

export function validarS2200(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.nmTrab, 'nmTrab', errors);
  required(dados.dtAdm, 'dtAdm', errors);
  dataValida(dados.dtAdm as string, 'dtAdm', errors);
  return finishValidation(errors);
}

export function validarS2205(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  return finishValidation(errors);
}

export function validarS2206(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtAlteracao, 'dtAlteracao', errors);
  return finishValidation(errors);
}

export function validarS2230(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.codMotAfast, 'codMotAfast', errors);
  required(dados.dtIniAfast, 'dtIniAfast', errors);
  return finishValidation(errors);
}

export function validarS2299(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtDeslig, 'dtDeslig', errors);
  return finishValidation(errors);
}

export function validarS2300(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtInicio, 'dtInicio', errors);
  return finishValidation(errors);
}

export function validarS2306(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  return finishValidation(errors);
}

export function validarS2399(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtTerm, 'dtTerm', errors);
  return finishValidation(errors);
}

export function validarS2400(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  return finishValidation(errors);
}

export function validarS3000(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  required(dados.nrRecEvt, 'nrRecEvt', errors);
  required(dados.tpEvt, 'tpEvt', errors);
  return finishValidation(errors);
}
