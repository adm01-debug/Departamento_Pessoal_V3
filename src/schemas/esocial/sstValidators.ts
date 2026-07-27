/**
 * Validadores eSocial — Eventos SST (S-2210, S-2220, S-2240)
 *
 * Endurecidos conforme Manual do eSocial v2.5.01 e a NR-07 (PCMSO).
 * Regra de compatibilidade: campos historicamente obrigatórios seguem como erro;
 * campos novos só são validados quando presentes, e recomendações viram warnings.
 */
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  required,
  maxLen,
  cpfValido,
  enumValido,
  dataValida,
  ESocialData,
} from './helpers';

/** Hora no formato HHMM (padrão eSocial) ou HH:MM (uso interno). */
const HORA_RE = /^([01]\d|2[0-3]):?([0-5]\d)$/;

/** Converte para timestamp; null quando ausente ou inválida. */
function ts(val: unknown): number | null {
  if (typeof val !== 'string' || val === '') return null;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? null : t;
}

function presente(val: unknown): boolean {
  return val !== undefined && val !== null && val !== '';
}

/**
 * S-2210 — Comunicação de Acidente de Trabalho (CAT)
 * Prazo legal: até o 1º dia útil seguinte ao acidente; imediato em caso de óbito
 * (Lei 8.213/91, art. 22).
 */
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
  if (presente(dados.hrAcid) && !HORA_RE.test(String(dados.hrAcid))) {
    errors.push({
      campo: 'hrAcid',
      mensagem: 'Hora do acidente deve estar no formato HHMM ou HH:MM',
      regra: 'REGRA_HORA',
    });
  }

  // Acidente não pode ter ocorrido no futuro.
  const acid = ts(dados.dtAcid);
  if (acid !== null && acid > Date.now() + 86_400_000) {
    errors.push({
      campo: 'dtAcid',
      mensagem: 'Data do acidente não pode ser futura',
      regra: 'REGRA_DATA_FUTURA',
    });
  }

  // tpCat: 1 = inicial, 2 = reabertura, 3 = comunicação de óbito
  if (presente(dados.tpCat)) {
    enumValido(String(dados.tpCat), ['1', '2', '3'], 'tpCat', errors);
    if (String(dados.tpCat) === '3' && !presente(dados.dtObito)) {
      errors.push({
        campo: 'dtObito',
        mensagem: 'CAT de óbito (tpCat=3) exige a data do óbito',
        regra: 'REGRA_OBRIGATORIO',
      });
    }
  }

  if (presente(dados.dtObito)) {
    dataValida(dados.dtObito as string, 'dtObito', errors);
    const obito = ts(dados.dtObito);
    if (acid !== null && obito !== null && obito < acid) {
      errors.push({
        campo: 'dtObito',
        mensagem: 'Data do óbito não pode ser anterior à data do acidente',
        regra: 'REGRA_CRONOLOGIA',
      });
    }
  }

  // Prazo de comunicação: alerta quando o registro passa de 1 dia útil.
  if (acid !== null) {
    const diasDecorridos = (Date.now() - acid) / 86_400_000;
    if (diasDecorridos > 1) {
      warnings.push({
        campo: 'dtAcid',
        mensagem:
          'CAT fora do prazo legal (Lei 8.213/91, art. 22): comunicação devida até o 1º dia útil seguinte',
      });
    }
  }

  // codCNAE / codParteAting / codAgntCausador seguem tabelas oficiais.
  if (presente(dados.codSitGeradora) && !/^\d{6}$/.test(String(dados.codSitGeradora))) {
    errors.push({
      campo: 'codSitGeradora',
      mensagem: 'Código da situação geradora deve ter 6 dígitos (Tabela 14)',
      regra: 'REGRA_ENUM',
    });
  }

  if (presente(dados.tpLocal)) {
    enumValido(String(dados.tpLocal), ['1', '2', '3', '4', '5', '6', '9'], 'tpLocal', errors);
  }

  if (presente(dados.iniciatCAT)) {
    enumValido(String(dados.iniciatCAT), ['1', '2', '3'], 'iniciatCAT', errors);
  }

  if (presente(dados.obsCAT)) {
    maxLen(String(dados.obsCAT), 999, 'obsCAT', errors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-2220 — Monitoramento da Saúde do Trabalhador (ASO)
 * tpExame conforme Tabela 27: 0=admissional, 1=periódico, 2=retorno ao trabalho,
 * 3=mudança de risco, 4=monitoração pontual, 9=demissional.
 */
export function validarS2220(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);

  required(dados.dtExame, 'dtExame', errors);
  dataValida(dados.dtExame as string, 'dtExame', errors);

  required(dados.tpExame, 'tpExame', errors);
  enumValido(dados.tpExame?.toString(), ['0', '1', '2', '3', '4', '9'], 'tpExame', errors);

  const exame = ts(dados.dtExame);
  if (exame !== null && exame > Date.now() + 86_400_000) {
    errors.push({
      campo: 'dtExame',
      mensagem: 'Data do exame não pode ser futura',
      regra: 'REGRA_DATA_FUTURA',
    });
  }

  // resAso: 1 = apto, 2 = inapto (NR-07)
  if (presente(dados.resAso)) {
    enumValido(String(dados.resAso), ['1', '2'], 'resAso', errors);
    if (String(dados.resAso) === '2' && String(dados.tpExame) === '0') {
      warnings.push({
        campo: 'resAso',
        mensagem: 'ASO admissional com resultado INAPTO — a admissão não deve ser efetivada',
      });
    }
  }

  // Dados do médico emitente do ASO são exigidos pela NR-07.
  const medico = dados.medico as Record<string, unknown> | undefined;
  const nrCRM = medico?.nrCRM ?? dados.nrCRM;
  const ufCRM = medico?.ufCRM ?? dados.ufCRM;

  if (presente(nrCRM)) {
    if (!/^\d{4,10}$/.test(String(nrCRM).replace(/\D/g, ''))) {
      errors.push({
        campo: 'nrCRM',
        mensagem: 'Número do CRM inválido',
        regra: 'REGRA_CRM',
      });
    }
    if (!presente(ufCRM)) {
      errors.push({
        campo: 'ufCRM',
        mensagem: 'UF do CRM é obrigatória quando o CRM é informado',
        regra: 'REGRA_OBRIGATORIO',
      });
    }
  } else {
    warnings.push({
      campo: 'nrCRM',
      mensagem: 'CRM do médico emitente do ASO não informado (exigido pela NR-07)',
    });
  }

  if (presente(ufCRM)) {
    const UFS = [
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
      'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
    ];
    enumValido(String(ufCRM).toUpperCase(), UFS, 'ufCRM', errors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-2240 — Condições Ambientais do Trabalho / Agentes Nocivos
 * Base para a aposentadoria especial e para o LTCAT.
 */
export function validarS2240(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);

  required(dados.dtIniCondic, 'dtIniCondic', errors);
  dataValida(dados.dtIniCondic as string, 'dtIniCondic', errors);

  if (presente(dados.dtFimCondic)) {
    dataValida(dados.dtFimCondic as string, 'dtFimCondic', errors);
    const ini = ts(dados.dtIniCondic);
    const fim = ts(dados.dtFimCondic);
    if (ini !== null && fim !== null && fim < ini) {
      errors.push({
        campo: 'dtFimCondic',
        mensagem: 'Fim da condição não pode ser anterior ao início',
        regra: 'REGRA_CRONOLOGIA',
      });
    }
  }

  if (presente(dados.codCBO) && !/^\d{6}$/.test(String(dados.codCBO))) {
    errors.push({
      campo: 'codCBO',
      mensagem: 'CBO deve conter exatamente 6 dígitos',
      regra: 'REGRA_CBO',
    });
  }

  if (Array.isArray(dados.infoExpRisco)) {
    if (dados.infoExpRisco.length === 0) {
      warnings.push({
        campo: 'infoExpRisco',
        mensagem: 'Nenhum agente nocivo informado — verifique se o código 09.01.001 se aplica',
      });
    }
    (dados.infoExpRisco as Record<string, unknown>[]).forEach((item, i) => {
      required(item?.codAgNoc, `infoExpRisco[${i}].codAgNoc`, errors);

      // Códigos de agente nocivo seguem o padrão XX.XX.XXX da Tabela 24.
      if (presente(item?.codAgNoc) && !/^\d{2}\.\d{2}\.\d{3}$/.test(String(item.codAgNoc))) {
        errors.push({
          campo: `infoExpRisco[${i}].codAgNoc`,
          mensagem: 'Código do agente nocivo deve seguir o padrão XX.XX.XXX (Tabela 24)',
          regra: 'REGRA_ENUM',
        });
      }

      // tpAval: 1 = quantitativa, 2 = qualitativa
      if (presente(item?.tpAval)) {
        enumValido(String(item.tpAval), ['1', '2'], `infoExpRisco[${i}].tpAval`, errors);
        // Avaliação quantitativa exige intensidade/concentração e limite de tolerância.
        if (String(item.tpAval) === '1' && !presente(item?.intConc)) {
          errors.push({
            campo: `infoExpRisco[${i}].intConc`,
            mensagem: 'Avaliação quantitativa exige intensidade/concentração medida',
            regra: 'REGRA_OBRIGATORIO',
          });
        }
      }

      // EPC/EPI eficazes (S/N) — impactam o direito à aposentadoria especial.
      for (const campo of ['utilizEPC', 'utilizEPI'] as const) {
        if (presente(item?.[campo])) {
          enumValido(
            String(item[campo]),
            ['0', '1', '2', 'S', 'N'],
            `infoExpRisco[${i}].${campo}`,
            errors,
          );
        }
      }
    });
  }

  // Responsável pelos registros ambientais (LTCAT/PPRA).
  const resp = dados.respReg as Record<string, unknown>[] | undefined;
  if (!Array.isArray(resp) || resp.length === 0) {
    warnings.push({
      campo: 'respReg',
      mensagem: 'Responsável pelos registros ambientais não informado (exigido para o LTCAT)',
    });
  } else {
    resp.forEach((r, i) => {
      if (presente(r?.cpfResp)) {
        cpfValido(String(r.cpfResp), `respReg[${i}].cpfResp`, errors);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
