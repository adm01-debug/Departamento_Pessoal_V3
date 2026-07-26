import { ValidationResult, ValidationError, required, enumValido, ESocialData } from './helpers';
import { RUBRICAS_PADRAO } from '@/constants/rubricas';

/**
 * Validação de Rubricas vs Tabela de Referência do eSocial
 */
export function validarRubricaESocial(rubrica: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  
  required(rubrica.codigo, 'codigo', errors);
  required(rubrica.descricao, 'descricao', errors);
  required(rubrica.tipo, 'tipo', errors);
  enumValido(rubrica.tipo as string, ['provento', 'desconto', 'informativa', 'informativo'], 'tipo', errors);

  // Validação contra rubricas padrão (se o código for um dos conhecidos)
  const padrao = RUBRICAS_PADRAO.find(r => r.codigo === rubrica.codigo);
  
  if (padrao) {
    if (rubrica.tipo !== padrao.tipo) {
      errors.push({ 
        campo: 'tipo', 
        mensagem: `Tipo divergente do eSocial. Esperado: ${padrao.tipo}`, 
        regra: 'REGRA_DIVERGENCIA_ESOCIAL' 
      });
    }

    if (rubrica.incide_inss !== padrao.incide_inss) {
      errors.push({ 
        campo: 'incide_inss', 
        mensagem: `Incidência INSS divergente. Esperado: ${padrao.incide_inss}`, 
        regra: 'REGRA_INCIDENCIA' 
      });
    }

    if (rubrica.incide_fgts !== padrao.incide_fgts) {
      errors.push({ 
        campo: 'incide_fgts', 
        mensagem: `Incidência FGTS divergente. Esperado: ${padrao.incide_fgts}`, 
        regra: 'REGRA_INCIDENCIA' 
      });
    }

    if (rubrica.incide_irrf !== padrao.incide_irrf) {
      errors.push({ 
        campo: 'incide_irrf', 
        mensagem: `Incidência IRRF divergente. Esperado: ${padrao.incide_irrf}`, 
        regra: 'REGRA_INCIDENCIA' 
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

/**
 * Sugere correções automáticas para uma rubrica com base no eSocial
 */
export function sugerirCorrecaoRubrica(rubrica: ESocialData) {
  const padrao = RUBRICAS_PADRAO.find(r => r.codigo === rubrica.codigo);
  if (!padrao) return null;

  return {
    ...rubrica,
    tipo: (padrao.tipo === 'informativa' ? 'informativo' : padrao.tipo) as any,
    incide_inss: padrao.incide_inss,
    incide_fgts: padrao.incide_fgts,
    incide_irrf: padrao.incide_irrf,
    descricao: padrao.descricao
  };
}
