/**
 * Validadores eSocial — Eventos SST (S-2210, S-2220, S-2240)
 */
import { ValidationResult, ValidationError, ValidationWarning, required, maxLen, cpfValido, enumValido, dataValida, ESocialData } from './helpers';

export function validarS2210(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtAcid, 'dtAcid', errors);
  dataValida(dados.dtAcid as string, 'dtAcid', errors);
  required(dados.tpAcid, 'tpAcid', errors);
  enumValido(dados.tpAcid?.toString(), ['1', '2', '3'], 'tpAcid', errors);
  required(dados.hrAcid, 'hrAcid', errors);
  return { valid: errors.length === 0, errors, warnings };
}

export function validarS2220(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtExame, 'dtExame', errors);
  dataValida(dados.dtExame as string, 'dtExame', errors);
  required(dados.tpExame, 'tpExame', errors);
  enumValido(dados.tpExame?.toString(), ['0', '1', '2', '3', '4', '9'], 'tpExame', errors);
  return { valid: errors.length === 0, errors, warnings };
}

export function validarS2240(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  required(dados.dtIniCondic, 'dtIniCondic', errors);
  dataValida(dados.dtIniCondic as string, 'dtIniCondic', errors);
  if (Array.isArray(dados.infoExpRisco)) {
    dados.infoExpRisco.forEach((item: any, i: number) => {
      required(item.codAgNoc, `infoExpRisco[${i}].codAgNoc`, errors);
    });
  }
  return { valid: errors.length === 0, errors, warnings };
}
