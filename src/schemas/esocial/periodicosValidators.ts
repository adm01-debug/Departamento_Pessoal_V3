/**
 * Validadores eSocial — Eventos Periódicos Complementares
 *
 * P5-082: Implementação dos eventos faltantes:
 *   S-1298 — Reabertura de período de apuração
 *   S-1299 — Fechamento de período de apuração
 *   S-5001 — Informações de IRRF (bases, deduções, retenções por beneficiário)
 *   S-5011 — Informações de contribuição previdenciária substitutiva
 *
 * Fontes: Manual do eSocial v2.5.01 (S-1298/S-1299) e layout IRRF v3.1 (S-5001/S-5011)
 *
 * Validações comuns a todos:
 *   - tpInsc / nrInsc (empresa)
 *   - ideEvento (perApur, tpAmb)
 *   - Integridade referencial (perApur futuro, fechamento antes de reabertura)
 */

import {
  ValidationResult, ValidationError, ValidationWarning,
  required, maxLen, cpfValido, cnpjValido, enumValido,
  dataValida, ESocialData,
} from './helpers';

/**
 * S-1298 — Reabertura de Período de Apuração
 *
 * Reabre um período que havia sido fechado com S-1299.
 * Pré-requisito: período fechado com S-1299.
 *
 * Campos obrigatórios:
 *   ideEmpregador(tpInsc + nrInsc)
 *   ideEvento(perApur + tpAmb + procEmi + verProc)
 *   novaValid (nova competência de validade)
 *
 * Regras:
 *   - perApur não pode ser futuro
 *   - novaValid deve ser >= perApur
 *   - tpAmb = 1 (produção) ou 2 (produção restrita)
 */
export function validarS1298(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── ideEmpregador ────────────────────────────────────────────────────
  required(dados.tpInsc, 'ideEmpregador.tpInsc', errors);
  enumValido(String(dados.tpInsc), ['1', '2', '3', '4', '5', '6'], 'ideEmpregador.tpInsc', errors);
  required(dados.nrInsc, 'ideEmpregador.nrInsc', errors);
  if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'ideEmpregador.nrInsc', errors);
  if (dados.tpInsc === 2) cpfValido(String(dados.nrInsc ?? ''), 'ideEmpregador.nrInsc', errors);

  // ── ideEvento ─────────────────────────────────────────────────────────
  required(dados.perApur, 'ideEvento.perApur', errors);
  if (typeof dados.perApur === 'string') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.perApur)) {
      errors.push({ campo: 'ideEvento.perApur', mensagem: 'perApur deve estar no formato AAAA-MM', regra: 'REGRA_PERIODO' });
    } else {
      const [year, month] = dados.perApur.split('-').map(Number);
      const apurDate = new Date(year, month - 1);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth());
      if (apurDate > thisMonth) {
        errors.push({ campo: 'ideEvento.perApur', mensagem: 'perApur não pode ser futuro', regra: 'REGRA_PERIODO_FUTURO' });
      }
    }
  }

  required(dados.tpAmb, 'ideEvento.tpAmb', errors);
  enumValido(String(dados.tpAmb), ['1', '2'], 'ideEvento.tpAmb', errors);

  required(dados.procEmi, 'ideEvento.procEmi', errors);
  enumValido(String(dados.procEmi), ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'ideEvento.procEmi', errors);

  required(dados.verProc, 'ideEvento.verProc', errors);
  maxLen(String(dados.verProc ?? ''), 20, 'ideEvento.verProc', errors);

  // ── novaValid ─────────────────────────────────────────────────────────
  required(dados.iniValid, 'novaValid', errors);
  if (typeof dados.iniValid === 'string') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.iniValid)) {
      errors.push({ campo: 'novaValid', mensagem: 'novaValid deve estar no formato AAAA-MM', regra: 'REGRA_PERIODO' });
    } else if (typeof dados.perApur === 'string' && dados.iniValid < dados.perApur) {
      errors.push({ campo: 'novaValid', mensagem: 'novaValid deve ser >= perApur', regra: 'REGRA_VALIDADE_INVALIDA' });
    }
  }

  // ── Warnings ──────────────────────────────────────────────────────────
  if (dados.tpAmb === '2') {
    warnings.push({ campo: 'ideEvento.tpAmb', mensagem: 'Ambiente de produção restrita — evento não produz efeitos legais' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1299 — Fechamento de Período de Apuração
 *
 * Encerra um período de apuração antes do envio dos eventos finais.
 * Deve ser enviado APÓS todos os eventos periódicos da competência.
 *
 * Campos obrigatórios:
 *   ideEmpregador(tpInsc + nrInsc)
 *   ideEvento(perApur + tpAmb)
 *   evtRemun (indicação de existência de S-1200/S-1202/S-1207)
 *
 * Regras:
 *   - perApur não pode ser futuro
 *   - evtRemun é booleano: true = há evento de remuneração
 *   - dateFecha deve ser <= data atual
 */
export function validarS1299(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── ideEmpregador ────────────────────────────────────────────────────
  required(dados.tpInsc, 'ideEmpregador.tpInsc', errors);
  enumValido(String(dados.tpInsc), ['1', '2', '3', '4', '5', '6'], 'ideEmpregador.tpInsc', errors);
  required(dados.nrInsc, 'ideEmpregador.nrInsc', errors);
  if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'ideEmpregador.nrInsc', errors);

  // ── ideEvento ─────────────────────────────────────────────────────────
  required(dados.perApur, 'ideEvento.perApur', errors);
  if (typeof dados.perApur === 'string') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.perApur)) {
      errors.push({ campo: 'ideEvento.perApur', mensagem: 'perApur deve estar no formato AAAA-MM', regra: 'REGRA_PERIODO' });
    } else {
      const [year, month] = dados.perApur.split('-').map(Number);
      const apurDate = new Date(year, month - 1);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth());
      if (apurDate > thisMonth) {
        errors.push({ campo: 'ideEvento.perApur', mensagem: 'perApur não pode ser futuro', regra: 'REGRA_PERIODO_FUTURO' });
      }
    }
  }

  required(dados.tpAmb, 'ideEvento.tpAmb', errors);
  enumValido(String(dados.tpAmb), ['1', '2'], 'ideEvento.tpAmb', errors);

  required(dados.procEmi, 'ideEvento.procEmi', errors);
  enumValido(String(dados.procEmi), ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'ideEvento.procEmi', errors);

  required(dados.verProc, 'ideEvento.verProc', errors);
  maxLen(String(dados.verProc ?? ''), 20, 'ideEvento.verProc', errors);

  // ── evtRemun ──────────────────────────────────────────────────────────
  required(dados.evtRemun, 'evtRemun', errors);
  if (dados.evtRemur !== undefined && typeof dados.evtRemur === 'boolean') {
    warnings.push({ campo: 'evtRemur', mensagem: 'Confirme o envio de S-1200 antes de fechar a competência' });
  }

  // ── Warnings ──────────────────────────────────────────────────────────
  if (dados.tpAmb === '2') {
    warnings.push({ campo: 'ideEvento.tpAmb', mensagem: 'Ambiente de produção restrita — evento não produz efeitos legais' });
  }

  // Aviso sobreevtRemun = false: fechamento sem remuneração pode indicar problema
  if (dados.evtRemur === false || dados.evtRemun === 'false') {
    warnings.push({ campo: 'evtRemun', mensagem: 'evtRemun=false — confirme que não há remuneração na competência' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-5001 — Informações de IRRF (Retenção de Imposto de Renda)
 *
 * Evento periódico de informações complementares ao S-1210.
 * Contém os totais de IRRF por beneficiário (trabalhador ou PJ).
 *
 * Grupos:
 *   IDEEvento / InfoIRRF
 *     - tpInsc / nrInsc (responsável pela retenção)
 *     - perApur
 *     - InfoIRRF (array)
 *       - cpfBenef | cnpjBenef
 *       - NitPasep (opcional)
 *       - nomeBenef
 *       - infoIRRF (array de bases)
 *         - codCateg
 *         - tpCR
 *         - vrTotalBasRet (base de retenção)
 *         - vrTotalIRRF (valor retido)
 *         - vrTotalDeducao (deduções)
 *
 * Regras:
 *   - vrTotalBasRet >= 0
 *   - vrTotalIRRF >= 0
 *   - Se vrTotalBasRet > 0 então vrTotalIRRF > 0 (lógica de retenção)
 *   - cpfBenef ou cnpjBenef obrigatório
 */
export function validarS5001(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── IDEEvento ─────────────────────────────────────────────────────────
  required(dados.tpInsc, 'IDEEvento.tpInsc', errors);
  enumValido(String(dados.tpInsc), ['1', '2'], 'IDEEvento.tpInsc', errors);
  required(dados.nrInsc, 'IDEEvento.nrInsc', errors);
  if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'IDEEvento.nrInsc', errors);

  required(dados.perApur, 'IDEEvento.perApur', errors);
  if (typeof dados.perApur === 'string' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.perApur)) {
    errors.push({ campo: 'IDEEvento.perApur', mensagem: 'perApur deve estar no formato AAAA-MM', regra: 'REGRA_PERIODO' });
  }

  // ── InfoIRRF (array de beneficiários) ──────────────────────────────────
  const infoIRRF = dados.infoIRRF as ESocialData[] | undefined;
  if (!infoIRRF || !Array.isArray(infoIRRF)) {
    errors.push({ campo: 'infoIRRF', mensagem: 'infoIRRF é obrigatório e deve ser um array', regra: 'REGRA_OBRIGATORIO' });
    return { valid: errors.length === 0, errors, warnings };
  }

  if (infoIRRF.length === 0) {
    errors.push({ campo: 'infoIRRF', mensagem: 'infoIRRF deve conter ao menos um beneficiário', regra: 'REGRA_ARRAY_VAZIO' });
  }

  infoIRRF.forEach((benef: ESocialData, i: number) => {
    const prefix = `infoIRRF[${i}]`;

    // cpfBenef ou cnpjBenef (ao menos um)
    const cpfBenef = benef.cpfBenef as string | undefined;
    const cnpjBenef = benef.cnpjBenef as string | undefined;
    if (!cpfBenef && !cnpjBenef) {
      errors.push({ campo: `${prefix}.cpfBenef|cnpjBenef`, mensagem: 'Ao menos cpfBenef ou cnpjBenef é obrigatório', regra: 'REGRA_OBRIGATORIO' });
    }
    if (cpfBenef) cpfValido(cpfBenef, `${prefix}.cpfBenef`, errors);
    if (cnpjBenef) cnpjValido(cnpjBenef, `${prefix}.cnpjBenef`, errors);

    // NitPasep
    const nitPasep = benef.nitPasep as string | undefined;
    if (nitPasep && !/^\d{11}$/.test(nitPasep.replace(/\D/g, ''))) {
      errors.push({ campo: `${prefix}.nitPasep`, mensagem: 'NIT/PASEP inválido (deve ter 11 dígitos)', regra: 'REGRA_NIT' });
    }

    // nomeBenef
    required(benef.nomeBenef, `${prefix}.nomeBenef`, errors);
    maxLen(String(benef.nomeBenef ?? ''), 70, `${prefix}.nomeBenef`, errors);

    // Bases de retenção (array)
    const basesRet = benef.infoIRRF as ESocialData[] | undefined;
    if (!basesRet || !Array.isArray(basesRet)) {
      errors.push({ campo: `${prefix}.infoIRRF`, mensagem: `${prefix}.infoIRRF é obrigatório`, regra: 'REGRA_OBRIGATORIO' });
      return;
    }

    if (basesRet.length === 0) {
      errors.push({ campo: `${prefix}.infoIRRF`, mensagem: `${prefix}.infoIRRF deve conter ao menos uma base`, regra: 'REGRA_ARRAY_VAZIO' });
    }

    basesRet.forEach((base: ESocialData, j: number) => {
      const p2 = `${prefix}.infoIRRF[${j}]`;

      // vrTotalBasRet >= 0
      const basRet = Number(base.vrTotalBasRet ?? -1);
      if (isNaN(basRet) || basRet < 0) {
        errors.push({ campo: `${p2}.vrTotalBasRet`, mensagem: 'vrTotalBasRet deve ser numérico >= 0', regra: 'REGRA_VALOR' });
      }

      // vrTotalIRRF >= 0
      const irrf = Number(base.vrTotalIRRF ?? -1);
      if (isNaN(irrf) || irrf < 0) {
        errors.push({ campo: `${p2}.vrTotalIRRF`, mensagem: 'vrTotalIRRF deve ser numérico >= 0', regra: 'REGRA_VALOR' });
      }

      // Lógica: se base > 0, deve haver retenção (IRRF > 0)
      if (basRet > 0 && irrf === 0) {
        warnings.push({ campo: `${p2}.vrTotalIRRF`, mensagem: `Base ${basRet} > 0 sem retenção — verifique tabela IRRF` });
      }

      // vrTotalDeducao >= 0
      const deducao = Number(base.vrTotalDeducao ?? 0);
      if (deducao < 0) {
        errors.push({ campo: `${p2}.vrTotalDeducao`, mensagem: 'vrTotalDeducao deve ser >= 0', regra: 'REGRA_VALOR' });
      }

      // Dedução não pode exceder base
      if (deducao > basRet) {
        errors.push({ campo: `${p2}.vrTotalDeducao`, mensagem: 'vrTotalDeducao não pode exceder vrTotalBasRet', regra: 'REGRA_LIMITE' });
      }

      // tpCR (código de receita) obrigatório se base > 0
      if (basRet > 0 && !base.tpCR) {
        errors.push({ campo: `${p2}.tpCR`, mensagem: 'tpCR é obrigatório quando há base de retenção', regra: 'REGRA_OBRIGATORIO' });
      }

      if (base.tpCR) maxLen(String(base.tpCR), 6, `${p2}.tpCR`, errors);
      if (base.codCateg) maxLen(String(base.codCateg), 3, `${p2}.codCateg`, errors);
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-5011 — Informações de Contribuição Previdencial Substitutiva
 *
 * Evento periódico complementar ao S-1280.
 * Contém informações sobre contribuição previdenciária patronal substitutiva.
 *
 * Grupos:
 *   IDEEvento
 *   InfoCompl
 *     - tpInsc / nrInsc
 *     - perApur
 *     - InfoPerApurPos
 *       - cnpjPrestador
 *       - vrTotalBaseAP
 *       - vrTotalTetoAP
 *       - vrTotalAliquotaAP
 *
 * Regras:
 *   - cnpjPrestador válido
 *   - vrTotalBaseAP >= 0
 *   - vrTotalTetoAP >= 0
 *   - vrTotalAliquotaAP entre 0 e 1
 */
export function validarS5011(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── IDEEvento ─────────────────────────────────────────────────────────
  required(dados.tpInsc, 'IDEEvento.tpInsc', errors);
  enumValido(String(dados.tpInsc), ['1'], 'IDEEvento.tpInsc', errors);
  required(dados.nrInsc, 'IDEEvento.nrInsc', errors);
  cnpjValido(String(dados.nrInsc ?? ''), 'IDEEvento.nrInsc', errors);

  required(dados.perApur, 'IDEEvento.perApur', errors);
  if (typeof dados.perApur === 'string' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.perApur)) {
    errors.push({ campo: 'IDEEvento.perApur', mensagem: 'perApur deve estar no formato AAAA-MM', regra: 'REGRA_PERIODO' });
  }

  // ── InfoPerApurPos ────────────────────────────────────────────────────
  const infoPos = dados.infoPerApurPos as ESocialData[] | undefined;
  if (!infoPos || !Array.isArray(infoPos)) {
    errors.push({ campo: 'infoPerApurPos', mensagem: 'infoPerApurPos é obrigatório e deve ser um array', regra: 'REGRA_OBRIGATORIO' });
    return { valid: errors.length === 0, errors, warnings };
  }

  if (infoPos.length === 0) {
    errors.push({ campo: 'infoPerApurPos', mensagem: 'infoPerApurPos deve conter ao menos um registro', regra: 'REGRA_ARRAY_VAZIO' });
  }

  infoPos.forEach((item: ESocialData, i: number) => {
    const p = `infoPerApurPos[${i}]`;

    required(item.cnpjPrestador, `${p}.cnpjPrestador`, errors);
    cnpjValido(String(item.cnpjPrestador ?? ''), `${p}.cnpjPrestador`, errors);

    const baseAP = Number(item.vrTotalBaseAP ?? -1);
    if (isNaN(baseAP) || baseAP < 0) {
      errors.push({ campo: `${p}.vrTotalBaseAP`, mensagem: 'vrTotalBaseAP deve ser numérico >= 0', regra: 'REGRA_VALOR' });
    }

    const tetoAP = Number(item.vrTotalTetoAP ?? -1);
    if (isNaN(tetoAP) || tetoAP < 0) {
      errors.push({ campo: `${p}.vrTotalTetoAP`, mensagem: 'vrTotalTetoAP deve ser numérico >= 0', regra: 'REGRA_VALOR' });
    }

    if (tetoAP > baseAP) {
      warnings.push({ campo: `${p}.vrTotalTetoAP`, mensagem: 'vrTotalTetoAP > vrTotalBaseAP — verifique aplicação do teto' });
    }

    const aliquota = Number(item.vrTotalAliquotaAP ?? -1);
    if (isNaN(aliquota) || aliquota < 0 || aliquota > 1) {
      errors.push({ campo: `${p}.vrTotalAliquotaAP`, mensagem: 'vrTotalAliquotaAP deve estar entre 0 e 1 (0.00 a 1.00)', regra: 'REGRA_ALIQUOTA' });
    }

    if (baseAP > 0 && aliquota === 0) {
      warnings.push({ campo: `${p}.vrTotalAliquotaAP`, mensagem: 'Base > 0 com aliquota 0 — verifique configuração' });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

// ── Eventos periódicos e de tabela (implementação real) ───────────────────────
// P5-082 concluído: os stubs que retornavam `{ valid: true }` para qualquer
// payload foram substituídos por validação conforme o Manual do eSocial
// v2.5.01 / layout S-1.3. Um stub permissivo é pior que ausência de
// validação: dá falsa garantia de conformidade antes da transmissão.

/** Formato de competência AAAA-MM (perApur / iniValid). */
const COMPETENCIA_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Valida um campo de competência AAAA-MM. */
function competenciaValida(
  val: unknown,
  campo: string,
  errors: ValidationError[],
): void {
  if (typeof val === 'string' && !COMPETENCIA_RE.test(val)) {
    errors.push({
      campo,
      mensagem: `${campo} deve estar no formato AAAA-MM`,
      regra: 'REGRA_PERIODO',
    });
  }
}

/** Valida o par tpInsc/nrInsc do empregador (CNPJ quando 1, CPF quando 2). */
function validarInscricao(
  dados: ESocialData,
  errors: ValidationError[],
  campoTp = 'tpInsc',
  campoNr = 'nrInsc',
): void {
  required(dados[campoTp], campoTp, errors);
  enumValido(String(dados[campoTp] ?? ''), ['1', '2', '3', '4', '5', '6'], campoTp, errors);
  required(dados[campoNr], campoNr, errors);
  if (Number(dados[campoTp]) === 1) cnpjValido(String(dados[campoNr] ?? ''), campoNr, errors);
  if (Number(dados[campoTp]) === 2) cpfValido(String(dados[campoNr] ?? ''), campoNr, errors);
}

/**
 * S-1000 — Informações do Empregador/Contribuinte/Órgão Público
 * Evento de tabela; abre o cadastro do empregador no ambiente eSocial.
 */
export function validarS1000(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarInscricao(dados, errors);

  required(dados.nmRazao, 'nmRazao', errors);
  maxLen(String(dados.nmRazao ?? ''), 115, 'nmRazao', errors);

  required(dados.classTrib, 'classTrib', errors);
  maxLen(String(dados.classTrib ?? ''), 2, 'classTrib', errors);

  // Indicadores binários obrigatórios (0 = não, 1 = sim)
  for (const campo of ['indCoop', 'indConstr', 'indDesFolha', 'indOptRegEletron'] as const) {
    required(dados[campo], campo, errors);
    if (dados[campo] !== undefined && dados[campo] !== null && dados[campo] !== '') {
      enumValido(String(dados[campo]), ['0', '1', '2', '3', '4'], campo, errors);
    }
  }
  // indCoop aceita apenas 0..4; indConstr/indDesFolha/indOptRegEletron só 0 ou 1
  for (const campo of ['indConstr', 'indDesFolha', 'indOptRegEletron'] as const) {
    if (dados[campo] !== undefined && dados[campo] !== null && dados[campo] !== '') {
      enumValido(String(dados[campo]), ['0', '1'], campo, errors);
    }
  }

  required(dados.iniValid, 'iniValid', errors);
  competenciaValida(dados.iniValid, 'iniValid', errors);

  const contato = dados.contato as Record<string, unknown> | undefined;
  if (!contato || !contato.nmCtt) {
    warnings.push({
      campo: 'contato.nmCtt',
      mensagem: 'Nome do contato não informado — recomendado pelo eSocial',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1005 — Tabela de Estabelecimentos, Obras ou Unidades de Órgãos Públicos
 * Traz CNAE preponderante, alíquota RAT e FAP do estabelecimento.
 */
export function validarS1005(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarInscricao(dados, errors);

  required(dados.iniValid, 'iniValid', errors);
  competenciaValida(dados.iniValid, 'iniValid', errors);

  required(dados.cnaePrep, 'cnaePrep', errors);
  if (dados.cnaePrep !== undefined && dados.cnaePrep !== null && dados.cnaePrep !== '') {
    if (!/^\d{7}$/.test(String(dados.cnaePrep))) {
      errors.push({
        campo: 'cnaePrep',
        mensagem: 'CNAE preponderante deve ter exatamente 7 dígitos',
        regra: 'REGRA_CNAE',
      });
    }
  }

  required(dados.aliqRat, 'aliqRat', errors);
  enumValido(String(dados.aliqRat ?? ''), ['1', '2', '3'], 'aliqRat', errors);

  // FAP é opcional, mas quando informado deve estar entre 0,5000 e 2,0000
  if (dados.fap !== undefined && dados.fap !== null && dados.fap !== '') {
    const fap = Number(dados.fap);
    if (!Number.isFinite(fap) || fap < 0.5 || fap > 2.0) {
      errors.push({
        campo: 'fap',
        mensagem: 'FAP deve estar entre 0,5000 e 2,0000',
        regra: 'REGRA_FAP',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1010 — Tabela de Rubricas
 * Define códigos de rubrica e suas incidências (CP, IRRF, FGTS).
 */
export function validarS1010(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.codRubr, 'codRubr', errors);
  maxLen(String(dados.codRubr ?? ''), 30, 'codRubr', errors);

  required(dados.ideTabRubr, 'ideTabRubr', errors);
  maxLen(String(dados.ideTabRubr ?? ''), 8, 'ideTabRubr', errors);

  required(dados.iniValid, 'iniValid', errors);
  competenciaValida(dados.iniValid, 'iniValid', errors);

  required(dados.dscRubr, 'dscRubr', errors);
  maxLen(String(dados.dscRubr ?? ''), 100, 'dscRubr', errors);

  required(dados.natRubr, 'natRubr', errors);

  // tpRubr: 1=vencimento, 2=desconto, 3=informativa, 4=informativa dedutora
  required(dados.tpRubr, 'tpRubr', errors);
  enumValido(String(dados.tpRubr ?? ''), ['1', '2', '3', '4'], 'tpRubr', errors);

  required(dados.codIncCP, 'codIncCP', errors);
  required(dados.codIncIRRF, 'codIncIRRF', errors);
  required(dados.codIncFGTS, 'codIncFGTS', errors);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1020 — Tabela de Lotações Tributárias
 */
export function validarS1020(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.codLotacao, 'codLotacao', errors);
  maxLen(String(dados.codLotacao ?? ''), 30, 'codLotacao', errors);

  required(dados.iniValid, 'iniValid', errors);
  competenciaValida(dados.iniValid, 'iniValid', errors);

  // tpLotacao conforme Tabela 10 do eSocial (01..10, 21..24, 90..91)
  required(dados.tpLotacao, 'tpLotacao', errors);
  enumValido(
    String(dados.tpLotacao ?? ''),
    ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '21', '22', '24', '90', '91'],
    'tpLotacao',
    errors,
  );

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1070 — Tabela de Processos Administrativos/Judiciais
 */
export function validarS1070(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // tpProc: 1=administrativo, 2=judicial, 3=judicial do trabalhador
  required(dados.tpProc, 'tpProc', errors);
  enumValido(String(dados.tpProc ?? ''), ['1', '2', '3'], 'tpProc', errors);

  required(dados.nrProc, 'nrProc', errors);
  maxLen(String(dados.nrProc ?? ''), 21, 'nrProc', errors);

  required(dados.iniValid, 'iniValid', errors);
  competenciaValida(dados.iniValid, 'iniValid', errors);

  // indAutoria: 1=próprio contribuinte, 2=outra entidade/empresa
  required(dados.indAutoria, 'indAutoria', errors);
  enumValido(String(dados.indAutoria ?? ''), ['1', '2'], 'indAutoria', errors);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1200 — Remuneração de Trabalhador vinculado ao RGPS
 * Percorre dmDev → infoPerApur → ideEstabLot → detVerbas validando as rubricas.
 */
export function validarS1200(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.perApur, 'perApur', errors);
  competenciaValida(dados.perApur, 'perApur', errors);

  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(String(dados.cpfTrab ?? ''), 'cpfTrab', errors);

  if (!Array.isArray(dados.dmDev) || dados.dmDev.length === 0) {
    errors.push({
      campo: 'dmDev',
      mensagem: 'dmDev deve ser uma lista com ao menos um demonstrativo',
      regra: 'REGRA_ESTRUTURA',
    });
    return { valid: false, errors, warnings };
  }

  (dados.dmDev as Record<string, unknown>[]).forEach((dm, i) => {
    if (!dm?.ideDmDev) {
      errors.push({
        campo: `dmDev[${i}].ideDmDev`,
        mensagem: 'Identificador do demonstrativo é obrigatório',
        regra: 'REGRA_OBRIGATORIO',
      });
    }

    const infoPerApur = dm?.infoPerApur as Record<string, unknown> | undefined;
    const estabs = infoPerApur?.ideEstabLot;
    if (!Array.isArray(estabs) || estabs.length === 0) {
      errors.push({
        campo: `dmDev[${i}].infoPerApur.ideEstabLot`,
        mensagem: 'Ao menos um estabelecimento/lotação é obrigatório',
        regra: 'REGRA_ESTRUTURA',
      });
      return;
    }

    (estabs as Record<string, unknown>[]).forEach((estab) => {
      if (!estab?.codLotacao) {
        errors.push({
          campo: 'codLotacao',
          mensagem: 'Código de lotação é obrigatório',
          regra: 'REGRA_OBRIGATORIO',
        });
      }
      const verbas = estab?.detVerbas;
      if (!Array.isArray(verbas) || verbas.length === 0) {
        errors.push({
          campo: 'detVerbas',
          mensagem: 'Ao menos uma rubrica é obrigatória',
          regra: 'REGRA_ESTRUTURA',
        });
        return;
      }
      (verbas as Record<string, unknown>[]).forEach((v) => {
        if (!v?.codRubr) {
          errors.push({
            campo: 'codRubr',
            mensagem: 'Código da rubrica é obrigatório',
            regra: 'REGRA_OBRIGATORIO',
          });
        }
        const valor = Number(v?.vrRubr);
        if (!Number.isFinite(valor) || valor < 0) {
          errors.push({
            campo: 'vrRubr',
            mensagem: 'Valor da rubrica deve ser numérico e não negativo',
            regra: 'REGRA_VALOR',
          });
        }
      });
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1210 — Pagamentos de Rendimentos do Trabalho
 */
export function validarS1210(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.perApur, 'perApur', errors);
  competenciaValida(dados.perApur, 'perApur', errors);

  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(String(dados.cpfTrab ?? ''), 'cpfTrab', errors);

  if (!Array.isArray(dados.infoPgto) || dados.infoPgto.length === 0) {
    errors.push({
      campo: 'infoPgto',
      mensagem: 'infoPgto deve ser uma lista com ao menos um pagamento',
      regra: 'REGRA_ESTRUTURA',
    });
    return { valid: false, errors, warnings };
  }

  (dados.infoPgto as Record<string, unknown>[]).forEach((pgto, i) => {
    required(pgto?.dtPgto, `infoPgto[${i}].dtPgto`, errors);
    dataValida(pgto?.dtPgto as string, `infoPgto[${i}].dtPgto`, errors);

    // tpPgto conforme Tabela 26: 1..5
    required(pgto?.tpPgto, `infoPgto[${i}].tpPgto`, errors);
    enumValido(
      String(pgto?.tpPgto ?? ''),
      ['1', '2', '3', '4', '5'],
      `infoPgto[${i}].tpPgto`,
      errors,
    );
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1260 — Comercialização da Produção Rural Pessoa Física
 */
export function validarS1260(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.perApur, 'perApur', errors);
  competenciaValida(dados.perApur, 'perApur', errors);

  required(dados.nrInsc, 'nrInsc', errors);

  // indComerc conforme Tabela 13 — 1 não é código válido para este evento
  required(dados.indComerc, 'indComerc', errors);
  enumValido(
    String(dados.indComerc ?? ''),
    ['2', '3', '5', '6', '7', '8', '9'],
    'indComerc',
    errors,
  );

  required(dados.vrTotCom, 'vrTotCom', errors);
  if (dados.vrTotCom !== undefined && dados.vrTotCom !== null && dados.vrTotCom !== '') {
    const total = Number(dados.vrTotCom);
    if (!Number.isFinite(total) || total < 0) {
      errors.push({
        campo: 'vrTotCom',
        mensagem: 'Valor total da comercialização deve ser numérico e não negativo',
        regra: 'REGRA_VALOR',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1270 — Contratação de Trabalhadores Avulsos Não Portuários
 */
export function validarS1270(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.perApur, 'perApur', errors);
  competenciaValida(dados.perApur, 'perApur', errors);

  required(dados.nrInsc, 'nrInsc', errors);

  required(dados.codLotacao, 'codLotacao', errors);
  maxLen(String(dados.codLotacao ?? ''), 30, 'codLotacao', errors);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * S-1280 — Informações Complementares aos Eventos Periódicos
 * (desoneração da folha / substituição da contribuição patronal)
 */
export function validarS1280(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.perApur, 'perApur', errors);
  competenciaValida(dados.perApur, 'perApur', errors);

  // indSubstPatr: 1=integral, 2=proporcional
  if (dados.indSubstPatr !== undefined && dados.indSubstPatr !== null && dados.indSubstPatr !== '') {
    enumValido(String(dados.indSubstPatr), ['1', '2'], 'indSubstPatr', errors);
  }

  if (
    dados.percRedContrib !== undefined &&
    dados.percRedContrib !== null &&
    dados.percRedContrib !== ''
  ) {
    const perc = Number(dados.percRedContrib);
    if (!Number.isFinite(perc) || perc < 0 || perc > 100) {
      errors.push({
        campo: 'percRedContrib',
        mensagem: 'Percentual de redução deve estar entre 0 e 100',
        regra: 'REGRA_PERCENTUAL',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

