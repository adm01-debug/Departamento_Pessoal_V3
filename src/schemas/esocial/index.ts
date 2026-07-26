/**
 * Barrel re-export — validadores eSocial
 */
export type { ValidationResult, ValidationError, ValidationWarning } from './helpers';
export { 
  validarS1000, validarS1005, validarS1010, validarS1020, validarS1070, 
  validarS1200, validarS1210, validarS1260, validarS1270, validarS1280 
} from './periodicosValidators';
export { 
  validarS2190, validarS2200, validarS2205, validarS2206, 
  validarS2230, validarS2299, validarS2300, validarS2306, 
  validarS2399, validarS2400, validarS3000 
} from './naoPeriodicosValidators';
export { validarS2210, validarS2220, validarS2240 } from './sstValidators';
export { validarRubricaESocial, sugerirCorrecaoRubrica } from './rubricaValidator';

import { ValidationResult, ESocialData } from './helpers';
import { 
  validarS1000, validarS1005, validarS1010, validarS1020, validarS1070, 
  validarS1200, validarS1210, validarS1260, validarS1270, validarS1280 
} from './periodicosValidators';
import { 
  validarS2190, validarS2200, validarS2205, validarS2206, 
  validarS2230, validarS2299, validarS2300, validarS2306, 
  validarS2399, validarS2400, validarS3000 
} from './naoPeriodicosValidators';
import { validarS2210, validarS2220, validarS2240 } from './sstValidators';

const validadores: Record<string, (dados: ESocialData) => ValidationResult> = {
  'S-1000': validarS1000, 'S-1005': validarS1005, 'S-1010': validarS1010,
  'S-1020': validarS1020, 'S-1070': validarS1070, 'S-1200': validarS1200,
  'S-1210': validarS1210, 'S-1260': validarS1260, 'S-1270': validarS1270,
  'S-1280': validarS1280, 'S-2190': validarS2190, 'S-2200': validarS2200,
  'S-2205': validarS2205, 'S-2206': validarS2206, 'S-2210': validarS2210,
  'S-2220': validarS2220, 'S-2230': validarS2230, 'S-2240': validarS2240,
  'S-2299': validarS2299, 'S-2300': validarS2300, 'S-2306': validarS2306,
  'S-2399': validarS2399, 'S-2400': validarS2400, 'S-3000': validarS3000,
};

export function validarEvento(tipo: string, dados: ESocialData): ValidationResult {
  const fn = validadores[tipo];
  if (!fn) {
    return { 
      valid: false, 
      errors: [{ 
        campo: 'tpEvento', 
        mensagem: `Validador não encontrado para ${tipo}. Verifique se este evento é suportado.`, 
        regra: 'REGRA_TIPO_EVENTO' 
      }], 
      warnings: [] 
    };
  }
  return fn(dados);
}

export function getValidadoresDisponiveis(): string[] {
  return Object.keys(validadores);
}
