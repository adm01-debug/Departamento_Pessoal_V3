// Validadores eSocial — eventos não periódicos
//
// Regras cross-field adicionadas conforme Manual do eSocial v2.5.01 / layout S-1.3.
// Princípio de projeto: os campos historicamente obrigatórios permanecem como
// `required` (erro), enquanto campos novos são validados de forma CONDICIONAL —
// só geram erro quando presentes e inconsistentes. Campos meramente recomendados
// viram `warning`. Isso evita reprovar payloads legados válidos ao mesmo tempo em
// que impede o envio de dados logicamente impossíveis (ex.: término antes do início).
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  required,
  maxLen,
  cpfValido,
  dataValida,
  enumValido,
  ESocialData,
} from './helpers';

const finish = (
  errors: ValidationError[],
  warnings: ValidationWarning[] = [],
): ValidationResult => ({
  valid: errors.length === 0,
  errors,
  warnings,
});

/** Converte para timestamp; retorna null se ausente ou inválido. */
function ts(val: unknown): number | null {
  if (typeof val !== 'string' || val === '') return null;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Garante que `fim` não seja anterior a `inicio`.
 * Só dispara quando AMBAS as datas são válidas — datas ausentes são tratadas
 * pelas checagens de obrigatoriedade, não aqui.
 */
function ordemCronologica(
  inicio: unknown,
  fim: unknown,
  campoFim: string,
  mensagem: string,
  errors: ValidationError[],
): void {
  const a = ts(inicio);
  const b = ts(fim);
  if (a !== null && b !== null && b < a) {
    errors.push({ campo: campoFim, mensagem, regra: 'REGRA_CRONOLOGIA' });
  }
}

/** Rejeita datas no futuro (fatos já ocorridos, como admissão e desligamento). */
function naoFutura(val: unknown, campo: string, errors: ValidationError[]): void {
  const t = ts(val);
  if (t !== null && t > Date.now() + 86_400_000) {
    errors.push({
      campo,
      mensagem: `${campo} não pode ser uma data futura`,
      regra: 'REGRA_DATA_FUTURA',
    });
  }
}

/** Bloco comum a todos os eventos de trabalhador: CPF obrigatório e válido. */
function validarTrabalhador(dados: ESocialData, errors: ValidationError[]): void {
  required(dados.cpfTrab, 'cpfTrab', errors);
  cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
}

/** S-2190 — Admissão Preliminar (registro prévio ao S-2200). */
export function validarS2190(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);
  required(dados.dtAdm, 'dtAdm', errors);
  dataValida(dados.dtAdm as string, 'dtAdm', errors);
  naoFutura(dados.dtAdm, 'dtAdm', errors);

  if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNascto !== '') {
    dataValida(dados.dtNascto as string, 'dtNascto', errors);
    ordemCronologica(
      dados.dtNascto,
      dados.dtAdm,
      'dtAdm',
      'Data de admissão não pode ser anterior à data de nascimento',
      errors,
    );
  }

  return finish(errors, warnings);
}

/** S-2200 — Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador. */
export function validarS2200(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.nmTrab, 'nmTrab', errors);
  maxLen(dados.nmTrab as string, 70, 'nmTrab', errors);

  required(dados.dtAdm, 'dtAdm', errors);
  dataValida(dados.dtAdm as string, 'dtAdm', errors);
  naoFutura(dados.dtAdm, 'dtAdm', errors);

  // Data de nascimento: consistência com a admissão + idade mínima constitucional.
  if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNascto !== '') {
    dataValida(dados.dtNascto as string, 'dtNascto', errors);
    const nasc = ts(dados.dtNascto);
    const adm = ts(dados.dtAdm);
    if (nasc !== null && adm !== null) {
      if (adm < nasc) {
        errors.push({
          campo: 'dtAdm',
          mensagem: 'Data de admissão não pode ser anterior à data de nascimento',
          regra: 'REGRA_CRONOLOGIA',
        });
      } else {
        const idade = (adm - nasc) / (365.25 * 86_400_000);
        // CF/88 art. 7º, XXXIII: proibido trabalho a menores de 16, salvo aprendiz a partir de 14.
        if (idade < 14) {
          errors.push({
            campo: 'dtNascto',
            mensagem: 'Trabalhador com menos de 14 anos na admissão (CF/88 art. 7º, XXXIII)',
            regra: 'REGRA_IDADE_MINIMA',
          });
        } else if (idade < 16) {
          warnings.push({
            campo: 'dtNascto',
            mensagem:
              'Trabalhador entre 14 e 16 anos: admissão permitida somente na condição de aprendiz',
          });
        }
      }
    }
  } else {
    warnings.push({ campo: 'dtNascto', mensagem: 'Data de nascimento não informada' });
  }

  if (dados.matricula !== undefined && dados.matricula !== null && dados.matricula !== '') {
    maxLen(String(dados.matricula), 30, 'matricula', errors);
  } else {
    warnings.push({
      campo: 'matricula',
      mensagem: 'Matrícula não informada — exigida para vincular eventos posteriores',
    });
  }

  // tpRegTrab: 1 = CLT, 2 = Estatutário
  if (dados.tpRegTrab !== undefined && dados.tpRegTrab !== null && dados.tpRegTrab !== '') {
    enumValido(String(dados.tpRegTrab), ['1', '2'], 'tpRegTrab', errors);
  }

  // tpRegPrev: 1 = RGPS, 2 = RPPS, 3 = Regime Previdenciário no Exterior
  if (dados.tpRegPrev !== undefined && dados.tpRegPrev !== null && dados.tpRegPrev !== '') {
    enumValido(String(dados.tpRegPrev), ['1', '2', '3'], 'tpRegPrev', errors);
  }

  // CBO possui exatamente 6 dígitos na Classificação Brasileira de Ocupações.
  if (dados.codCBO !== undefined && dados.codCBO !== null && dados.codCBO !== '') {
    if (!/^\d{6}$/.test(String(dados.codCBO))) {
      errors.push({
        campo: 'codCBO',
        mensagem: 'CBO deve conter exatamente 6 dígitos',
        regra: 'REGRA_CBO',
      });
    }
  }

  if (dados.vrSalFx !== undefined && dados.vrSalFx !== null && dados.vrSalFx !== '') {
    const salario = Number(dados.vrSalFx);
    if (!Number.isFinite(salario) || salario <= 0) {
      errors.push({
        campo: 'vrSalFx',
        mensagem: 'Salário deve ser um valor numérico maior que zero',
        regra: 'REGRA_VALOR',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2205 — Alteração de Dados Cadastrais do Trabalhador. */
export function validarS2205(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  if (dados.dtAlteracao !== undefined && dados.dtAlteracao !== null && dados.dtAlteracao !== '') {
    dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors);
  } else {
    warnings.push({ campo: 'dtAlteracao', mensagem: 'Data de alteração não informada' });
  }

  if (dados.nmTrab !== undefined && dados.nmTrab !== null && dados.nmTrab !== '') {
    maxLen(dados.nmTrab as string, 70, 'nmTrab', errors);
  }

  return finish(errors, warnings);
}

/** S-2206 — Alteração de Contrato de Trabalho / Relação Estatutária. */
export function validarS2206(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.dtAlteracao, 'dtAlteracao', errors);
  dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors);

  if (dados.codCBO !== undefined && dados.codCBO !== null && dados.codCBO !== '') {
    if (!/^\d{6}$/.test(String(dados.codCBO))) {
      errors.push({
        campo: 'codCBO',
        mensagem: 'CBO deve conter exatamente 6 dígitos',
        regra: 'REGRA_CBO',
      });
    }
  }

  if (dados.vrSalFx !== undefined && dados.vrSalFx !== null && dados.vrSalFx !== '') {
    const salario = Number(dados.vrSalFx);
    if (!Number.isFinite(salario) || salario <= 0) {
      errors.push({
        campo: 'vrSalFx',
        mensagem: 'Salário deve ser um valor numérico maior que zero',
        regra: 'REGRA_VALOR',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2230 — Afastamento Temporário. */
export function validarS2230(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.codMotAfast, 'codMotAfast', errors);
  required(dados.dtIniAfast, 'dtIniAfast', errors);
  dataValida(dados.dtIniAfast as string, 'dtIniAfast', errors);

  if (dados.dtTermAfast !== undefined && dados.dtTermAfast !== null && dados.dtTermAfast !== '') {
    dataValida(dados.dtTermAfast as string, 'dtTermAfast', errors);
    ordemCronologica(
      dados.dtIniAfast,
      dados.dtTermAfast,
      'dtTermAfast',
      'Término do afastamento não pode ser anterior ao início',
      errors,
    );

    // Afastamento por acidente/doença acima de 15 dias migra para o INSS (CLT art. 476).
    const ini = ts(dados.dtIniAfast);
    const fim = ts(dados.dtTermAfast);
    const motivosPrevidenciarios = ['01', '03'];
    if (
      ini !== null &&
      fim !== null &&
      motivosPrevidenciarios.includes(String(dados.codMotAfast)) &&
      (fim - ini) / 86_400_000 > 15
    ) {
      warnings.push({
        campo: 'dtTermAfast',
        mensagem:
          'Afastamento superior a 15 dias: a partir do 16º dia o benefício é de responsabilidade do INSS',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2299 — Desligamento. */
export function validarS2299(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.dtDeslig, 'dtDeslig', errors);
  dataValida(dados.dtDeslig as string, 'dtDeslig', errors);

  if (dados.dtAdm !== undefined && dados.dtAdm !== null && dados.dtAdm !== '') {
    ordemCronologica(
      dados.dtAdm,
      dados.dtDeslig,
      'dtDeslig',
      'Data de desligamento não pode ser anterior à data de admissão',
      errors,
    );
  }

  if (dados.mtvDeslig !== undefined && dados.mtvDeslig !== null && dados.mtvDeslig !== '') {
    if (!/^\d{2}$/.test(String(dados.mtvDeslig))) {
      errors.push({
        campo: 'mtvDeslig',
        mensagem: 'Motivo de desligamento deve ter 2 dígitos (Tabela 19 do eSocial)',
        regra: 'REGRA_ENUM',
      });
    }
  } else {
    warnings.push({
      campo: 'mtvDeslig',
      mensagem: 'Motivo do desligamento não informado (Tabela 19 do eSocial)',
    });
  }

  // Aviso prévio indenizado: a projeção altera a data de baixa na CTPS.
  if (dados.indPagtoAPI !== undefined && dados.indPagtoAPI !== null && dados.indPagtoAPI !== '') {
    enumValido(String(dados.indPagtoAPI), ['S', 'N'], 'indPagtoAPI', errors);
    if (String(dados.indPagtoAPI) === 'S' && !dados.dtProjFimAPI) {
      warnings.push({
        campo: 'dtProjFimAPI',
        mensagem: 'Aviso prévio indenizado exige a data projetada de término',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2300 — Trabalhador Sem Vínculo de Emprego/Estatutário — Início. */
export function validarS2300(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.dtInicio, 'dtInicio', errors);
  dataValida(dados.dtInicio as string, 'dtInicio', errors);

  if (dados.codCateg !== undefined && dados.codCateg !== null && dados.codCateg !== '') {
    // Categorias TSVE ficam na faixa 7xx/9xx da Tabela 1 do eSocial.
    if (!/^\d{3}$/.test(String(dados.codCateg))) {
      errors.push({
        campo: 'codCateg',
        mensagem: 'Código de categoria deve ter 3 dígitos (Tabela 1 do eSocial)',
        regra: 'REGRA_ENUM',
      });
    }
  } else {
    warnings.push({ campo: 'codCateg', mensagem: 'Categoria do trabalhador não informada' });
  }

  return finish(errors, warnings);
}

/** S-2306 — TSVE — Alteração Contratual. */
export function validarS2306(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  if (dados.dtAlteracao !== undefined && dados.dtAlteracao !== null && dados.dtAlteracao !== '') {
    dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors);
  } else {
    warnings.push({ campo: 'dtAlteracao', mensagem: 'Data de alteração não informada' });
  }

  if (dados.codCBO !== undefined && dados.codCBO !== null && dados.codCBO !== '') {
    if (!/^\d{6}$/.test(String(dados.codCBO))) {
      errors.push({
        campo: 'codCBO',
        mensagem: 'CBO deve conter exatamente 6 dígitos',
        regra: 'REGRA_CBO',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2399 — TSVE — Término. */
export function validarS2399(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  required(dados.dtTerm, 'dtTerm', errors);
  dataValida(dados.dtTerm as string, 'dtTerm', errors);

  if (dados.dtInicio !== undefined && dados.dtInicio !== null && dados.dtInicio !== '') {
    ordemCronologica(
      dados.dtInicio,
      dados.dtTerm,
      'dtTerm',
      'Data de término não pode ser anterior à data de início',
      errors,
    );
  }

  if (dados.mtvDesligTSV !== undefined && dados.mtvDesligTSV !== null && dados.mtvDesligTSV !== '') {
    if (!/^\d{2}$/.test(String(dados.mtvDesligTSV))) {
      errors.push({
        campo: 'mtvDesligTSV',
        mensagem: 'Motivo de término deve ter 2 dígitos',
        regra: 'REGRA_ENUM',
      });
    }
  }

  return finish(errors, warnings);
}

/** S-2400 — Cadastro de Beneficiário — Entes Públicos. */
export function validarS2400(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validarTrabalhador(dados, errors);

  if (dados.nmBenefic !== undefined && dados.nmBenefic !== null && dados.nmBenefic !== '') {
    maxLen(dados.nmBenefic as string, 70, 'nmBenefic', errors);
  }

  if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNascto !== '') {
    dataValida(dados.dtNascto as string, 'dtNascto', errors);
    naoFutura(dados.dtNascto, 'dtNascto', errors);
  }

  if (dados.sexo !== undefined && dados.sexo !== null && dados.sexo !== '') {
    enumValido(String(dados.sexo), ['M', 'F'], 'sexo', errors);
  }

  return finish(errors, warnings);
}

/** S-3000 — Exclusão de Eventos. */
export function validarS3000(dados: ESocialData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  required(dados.nrRecEvt, 'nrRecEvt', errors);
  maxLen(dados.nrRecEvt as string, 40, 'nrRecEvt', errors);

  required(dados.tpEvt, 'tpEvt', errors);
  if (dados.tpEvt !== undefined && dados.tpEvt !== null && dados.tpEvt !== '') {
    // Apenas eventos não periódicos e periódicos podem ser excluídos via S-3000.
    if (!/^S-\d{4}$/.test(String(dados.tpEvt))) {
      errors.push({
        campo: 'tpEvt',
        mensagem: 'Tipo de evento deve seguir o padrão S-XXXX',
        regra: 'REGRA_ENUM',
      });
    }
  }

  return finish(errors, warnings);
}
