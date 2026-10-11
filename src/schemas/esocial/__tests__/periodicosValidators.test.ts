import { describe, it, expect } from 'vitest';
import {
  validarS1298,
  validarS1299,
  validarS5001,
  validarS5011,
  validarS1000,
  validarS1005,
  validarS1010,
  validarS1020,
  validarS1070,
  validarS1200,
  validarS1210,
  validarS1260,
  validarS1270,
  validarS1280,
} from '../periodicosValidators';

const VALID_CPF = '11144477735';
const VALID_CNPJ = '11222333000181';

// ─── S1000 ────────────────────────────────────────────────────────────────────

describe('validarS1000', () => {
  const VALID: Record<string, unknown> = {
    tpInsc: 1,
    nrInsc: VALID_CNPJ,
    nmRazao: 'Empresa Teste Ltda',
    classTrib: '01',
    natJurid: '2062',
    indCoop: 0,
    indConstr: 0,
    indDesFolha: 0,
    indOptRegEletron: 0,
    iniValid: '2025-01',
    contato: { nmCtt: 'Contato' },
  };

  it('returns valid=true for complete correct data', () => {
    const r = validarS1000(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('returns error when tpInsc is missing', () => {
    const r = validarS1000({ ...VALID, tpInsc: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.campo === 'tpInsc')).toBe(true);
  });

  it('returns error when tpInsc is invalid enum', () => {
    const r = validarS1000({ ...VALID, tpInsc: 9 });
    expect(r.errors.some((e) => e.campo === 'tpInsc')).toBe(true);
  });

  it('returns error when nmRazao is missing', () => {
    const r = validarS1000({ ...VALID, nmRazao: undefined });
    expect(r.errors.some((e) => e.campo === 'nmRazao')).toBe(true);
  });

  it('returns error when nmRazao exceeds 115 characters', () => {
    const r = validarS1000({ ...VALID, nmRazao: 'A'.repeat(116) });
    expect(r.errors.some((e) => e.campo === 'nmRazao')).toBe(true);
  });

  it('validates CNPJ when tpInsc=1', () => {
    const r = validarS1000({ ...VALID, tpInsc: 1, nrInsc: '00000000000000' });
    expect(r.errors.some((e) => e.campo === 'nrInsc')).toBe(true);
  });

  it('validates CPF when tpInsc=2', () => {
    const r = validarS1000({ ...VALID, tpInsc: 2, nrInsc: '11111111111' });
    expect(r.errors.some((e) => e.campo === 'nrInsc')).toBe(true);
  });

  it('returns warning when contato.nmCtt is missing', () => {
    const r = validarS1000({ ...VALID, contato: {} });
    expect(r.warnings.some((w) => w.campo === 'contato.nmCtt')).toBe(true);
  });

  it('returns error for missing indCoop', () => {
    const r = validarS1000({ ...VALID, indCoop: undefined });
    expect(r.errors.some((e) => e.campo === 'indCoop')).toBe(true);
  });

  it('returns error for invalid indCoop enum', () => {
    const r = validarS1000({ ...VALID, indCoop: 9 });
    expect(r.errors.some((e) => e.campo === 'indCoop')).toBe(true);
  });
});

// ─── S1005 ────────────────────────────────────────────────────────────────────

describe('validarS1005', () => {
  const VALID: Record<string, unknown> = {
    tpInsc: 1,
    nrInsc: VALID_CNPJ,
    iniValid: '2025-01',
    cnaePrep: '4711301',
    aliqRat: 1,
    fap: 1.0,
  };

  it('returns valid=true for complete correct data', () => {
    expect(validarS1005(VALID).valid).toBe(true);
  });

  it('returns error when cnaePrep missing', () => {
    const r = validarS1005({ ...VALID, cnaePrep: undefined });
    expect(r.errors.some((e) => e.campo === 'cnaePrep')).toBe(true);
  });

  it('returns error when cnaePrep is not 7 digits', () => {
    const r = validarS1005({ ...VALID, cnaePrep: '123' });
    expect(r.errors.some((e) => e.campo === 'cnaePrep')).toBe(true);
  });

  it('returns error when aliqRat is invalid enum', () => {
    const r = validarS1005({ ...VALID, aliqRat: 5 });
    expect(r.errors.some((e) => e.campo === 'aliqRat')).toBe(true);
  });

  it('returns error when fap < 0.5', () => {
    const r = validarS1005({ ...VALID, fap: 0.4 });
    expect(r.errors.some((e) => e.campo === 'fap')).toBe(true);
  });

  it('returns error when fap > 2.0', () => {
    const r = validarS1005({ ...VALID, fap: 2.1 });
    expect(r.errors.some((e) => e.campo === 'fap')).toBe(true);
  });

  it('allows fap at boundary 0.5', () => {
    const r = validarS1005({ ...VALID, fap: 0.5 });
    expect(r.errors.some((e) => e.campo === 'fap')).toBe(false);
  });

  it('allows fap at boundary 2.0', () => {
    const r = validarS1005({ ...VALID, fap: 2.0 });
    expect(r.errors.some((e) => e.campo === 'fap')).toBe(false);
  });

  it('allows missing fap (optional)', () => {
    const r = validarS1005({ ...VALID, fap: undefined });
    expect(r.errors.some((e) => e.campo === 'fap')).toBe(false);
  });
});

// ─── S1010 ────────────────────────────────────────────────────────────────────

describe('validarS1010', () => {
  const VALID: Record<string, unknown> = {
    codRubr: 'RUB001',
    ideTabRubr: 'S',
    iniValid: '2025-01',
    dscRubr: 'Salário base',
    natRubr: '1000',
    tpRubr: 1,
    codIncCP: '11',
    codIncIRRF: '13',
    codIncFGTS: '15',
  };

  it('returns valid=true for complete data', () => {
    expect(validarS1010(VALID).valid).toBe(true);
  });

  it('returns error when codRubr missing', () => {
    const r = validarS1010({ ...VALID, codRubr: undefined });
    expect(r.errors.some((e) => e.campo === 'codRubr')).toBe(true);
  });

  it('returns error when codRubr exceeds 30 chars', () => {
    const r = validarS1010({ ...VALID, codRubr: 'R'.repeat(31) });
    expect(r.errors.some((e) => e.campo === 'codRubr')).toBe(true);
  });

  it('returns error when dscRubr exceeds 100 chars', () => {
    const r = validarS1010({ ...VALID, dscRubr: 'D'.repeat(101) });
    expect(r.errors.some((e) => e.campo === 'dscRubr')).toBe(true);
  });

  it('returns error for invalid tpRubr', () => {
    const r = validarS1010({ ...VALID, tpRubr: 9 });
    expect(r.errors.some((e) => e.campo === 'tpRubr')).toBe(true);
  });
});

// ─── S1020 ────────────────────────────────────────────────────────────────────

describe('validarS1020', () => {
  const VALID: Record<string, unknown> = {
    codLotacao: 'LOT001',
    iniValid: '2025-01',
    tpLotacao: '01',
  };

  it('returns valid=true for correct data', () => {
    expect(validarS1020(VALID).valid).toBe(true);
  });

  it('returns error when codLotacao missing', () => {
    const r = validarS1020({ ...VALID, codLotacao: undefined });
    expect(r.errors.some((e) => e.campo === 'codLotacao')).toBe(true);
  });

  it('returns error when tpLotacao is invalid', () => {
    const r = validarS1020({ ...VALID, tpLotacao: '11' });
    expect(r.errors.some((e) => e.campo === 'tpLotacao')).toBe(true);
  });

  it('accepts tpLotacao 01', () => {
    expect(validarS1020({ ...VALID, tpLotacao: '01' }).valid).toBe(true);
  });
});

// ─── S1070 ────────────────────────────────────────────────────────────────────

describe('validarS1070', () => {
  const VALID: Record<string, unknown> = {
    tpProc: 1,
    nrProc: '1234567890123456789012',
    iniValid: '2025-01',
    indAutoria: 1,
  };

  it('returns valid=true for correct data', () => {
    // nrProc trimmed to 21 chars
    expect(validarS1070({ ...VALID, nrProc: 'A'.repeat(21) }).valid).toBe(true);
  });

  it('returns error when tpProc missing', () => {
    const r = validarS1070({ ...VALID, tpProc: undefined });
    expect(r.errors.some((e) => e.campo === 'tpProc')).toBe(true);
  });

  it('returns error when nrProc exceeds 21 chars', () => {
    const r = validarS1070({ ...VALID, nrProc: 'N'.repeat(22) });
    expect(r.errors.some((e) => e.campo === 'nrProc')).toBe(true);
  });

  it('returns error for invalid indAutoria', () => {
    const r = validarS1070({ ...VALID, indAutoria: 9 });
    expect(r.errors.some((e) => e.campo === 'indAutoria')).toBe(true);
  });
});

// ─── S1200 ────────────────────────────────────────────────────────────────────

describe('validarS1200', () => {
  const VALID: Record<string, unknown> = {
    perApur: '2025-06',
    cpfTrab: VALID_CPF,
    dmDev: [
      {
        ideDmDev: 'DM001',
        infoPerApur: {
          ideEstabLot: [
            {
              codLotacao: 'LOT001',
              detVerbas: [{ codRubr: 'RUB001', vrRubr: 1000 }],
            },
          ],
        },
      },
    ],
  };

  it('returns valid=true for complete data', () => {
    expect(validarS1200(VALID).valid).toBe(true);
  });

  it('returns error when perApur format is wrong', () => {
    const r = validarS1200({ ...VALID, perApur: '2025/06' });
    expect(r.errors.some((e) => e.campo === 'perApur')).toBe(true);
  });

  it('returns error when cpfTrab is invalid', () => {
    const r = validarS1200({ ...VALID, cpfTrab: '11111111111' });
    expect(r.errors.some((e) => e.campo === 'cpfTrab')).toBe(true);
  });

  it('returns error when dmDev is not an array', () => {
    const r = validarS1200({ ...VALID, dmDev: null });
    expect(r.errors.some((e) => e.campo === 'dmDev')).toBe(true);
  });

  it('returns error when vrRubr is negative', () => {
    const r = validarS1200({
      ...VALID,
      dmDev: [
        {
          ideDmDev: 'DM001',
          infoPerApur: {
            ideEstabLot: [{ codLotacao: 'LOT001', detVerbas: [{ codRubr: 'R1', vrRubr: -100 }] }],
          },
        },
      ],
    });
    expect(r.errors.some((e) => e.campo === 'vrRubr')).toBe(true);
  });
});

// ─── S1210 ────────────────────────────────────────────────────────────────────

describe('validarS1210', () => {
  const VALID: Record<string, unknown> = {
    perApur: '2025-06',
    cpfTrab: VALID_CPF,
    infoPgto: [{ dtPgto: '2025-06-05', tpPgto: '1' }],
  };

  it('returns valid=true for correct data', () => {
    expect(validarS1210(VALID).valid).toBe(true);
  });

  it('returns error when infoPgto is missing', () => {
    const r = validarS1210({ ...VALID, infoPgto: null });
    expect(r.errors.some((e) => e.campo === 'infoPgto')).toBe(true);
  });

  it('returns error when dtPgto is invalid date', () => {
    const r = validarS1210({ ...VALID, infoPgto: [{ dtPgto: 'not-a-date', tpPgto: '1' }] });
    expect(r.errors.some((e) => e.campo.includes('dtPgto'))).toBe(true);
  });

  it('returns error when tpPgto is invalid', () => {
    const r = validarS1210({ ...VALID, infoPgto: [{ dtPgto: '2025-06-05', tpPgto: '99' }] });
    expect(r.errors.some((e) => e.campo.includes('tpPgto'))).toBe(true);
  });
});

// ─── S1260 ────────────────────────────────────────────────────────────────────

describe('validarS1260', () => {
  const VALID: Record<string, unknown> = {
    perApur: '2025-06',
    nrInsc: VALID_CNPJ,
    indComerc: 2,
    vrTotCom: 5000,
  };

  it('returns valid=true for correct data', () => {
    expect(validarS1260(VALID).valid).toBe(true);
  });

  it('returns error when indComerc is invalid', () => {
    const r = validarS1260({ ...VALID, indComerc: 1 });
    expect(r.errors.some((e) => e.campo === 'indComerc')).toBe(true);
  });

  it('returns error when vrTotCom missing', () => {
    const r = validarS1260({ ...VALID, vrTotCom: undefined });
    expect(r.errors.some((e) => e.campo === 'vrTotCom')).toBe(true);
  });
});

// ─── S1270 ────────────────────────────────────────────────────────────────────

describe('validarS1270', () => {
  const VALID: Record<string, unknown> = {
    perApur: '2025-06',
    nrInsc: VALID_CNPJ,
    codLotacao: 'LOT001',
  };

  it('returns valid=true for correct data', () => {
    expect(validarS1270(VALID).valid).toBe(true);
  });

  it('returns error when perApur missing', () => {
    const r = validarS1270({ ...VALID, perApur: undefined });
    expect(r.errors.some((e) => e.campo === 'perApur')).toBe(true);
  });

  it('returns error when codLotacao missing', () => {
    const r = validarS1270({ ...VALID, codLotacao: undefined });
    expect(r.errors.some((e) => e.campo === 'codLotacao')).toBe(true);
  });
});

// ─── S1280 ────────────────────────────────────────────────────────────────────

describe('validarS1280', () => {
  const VALID: Record<string, unknown> = {
    perApur: '2025-06',
    indSubstPatr: 1,
    percRedContrib: 50,
  };

  it('returns valid=true for correct data', () => {
    expect(validarS1280(VALID).valid).toBe(true);
  });

  it('returns error when indSubstPatr is invalid', () => {
    const r = validarS1280({ ...VALID, indSubstPatr: 9 });
    expect(r.errors.some((e) => e.campo === 'indSubstPatr')).toBe(true);
  });

  it('returns error when percRedContrib < 0', () => {
    const r = validarS1280({ ...VALID, percRedContrib: -1 });
    expect(r.errors.some((e) => e.campo === 'percRedContrib')).toBe(true);
  });

  it('returns error when percRedContrib > 100', () => {
    const r = validarS1280({ ...VALID, percRedContrib: 101 });
    expect(r.errors.some((e) => e.campo === 'percRedContrib')).toBe(true);
  });

  it('allows percRedContrib at boundary 0', () => {
    const r = validarS1280({ ...VALID, percRedContrib: 0 });
    expect(r.errors.some((e) => e.campo === 'percRedContrib')).toBe(false);
  });

  it('allows percRedContrib at boundary 100', () => {
    const r = validarS1280({ ...VALID, percRedContrib: 100 });
    expect(r.errors.some((e) => e.campo === 'percRedContrib')).toBe(false);
  });

  it('allows missing percRedContrib (optional)', () => {
    const r = validarS1280({ ...VALID, percRedContrib: undefined });
    expect(r.errors.some((e) => e.campo === 'percRedContrib')).toBe(false);
  });
});

// ─── Onda 11: S-1298 / S-1299 / S-5001 / S-5011 (único bloco sem cobertura) ────

const CNPJ2 = '12345678000195';
const COMP_PASSADA = '2026-01';
const EMPREGADOR = { tpInsc: 1, nrInsc: VALID_CNPJ };
const EVENTO = { perApur: COMP_PASSADA, tpAmb: 1, procEmi: 1, verProc: '1.0' };

describe('validarS1298 — reabertura de período', () => {
  const VALIDO = { ...EMPREGADOR, ...EVENTO, iniValid: '2026-02' };

  it('aceita payload válido', () => {
    const r = validarS1298(VALIDO);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejeita payload vazio com todos os obrigatórios', () => {
    const r = validarS1298({});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(6);
  });

  it('rejeita perApur fora do formato AAAA-MM', () => {
    expect(validarS1298({ ...VALIDO, perApur: '2026/01' }).errors.some((e) => e.campo === 'ideEvento.perApur')).toBe(
      true
    );
  });

  it('rejeita perApur futuro', () => {
    const r = validarS1298({ ...VALIDO, perApur: '2099-12', iniValid: '2100-01' });
    expect(r.errors.some((e) => e.mensagem.includes('futuro'))).toBe(true);
  });

  it('rejeita novaValid anterior ao perApur', () => {
    const r = validarS1298({ ...VALIDO, iniValid: '2020-01' });
    expect(r.errors.some((e) => e.campo === 'novaValid' && e.regra === 'REGRA_VALIDADE_INVALIDA')).toBe(true);
  });

  it('rejeita nrInsc com CNPJ inválido', () => {
    const r = validarS1298({ ...VALIDO, nrInsc: '00000000000000' });
    expect(r.errors.some((e) => e.campo === 'ideEmpregador.nrInsc')).toBe(true);
  });

  it('valida nrInsc como CPF quando tpInsc=2', () => {
    const r = validarS1298({ ...VALIDO, tpInsc: 2, nrInsc: VALID_CPF });
    expect(r.errors.filter((e) => e.campo === 'ideEmpregador.nrInsc')).toEqual([]);
    expect(
      validarS1298({ ...VALIDO, tpInsc: 2, nrInsc: '123' }).errors.some((e) => e.campo === 'ideEmpregador.nrInsc')
    ).toBe(true);
  });

  it('tpAmb=2 emite warning de produção restrita', () => {
    const r = validarS1298({ ...VALIDO, tpAmb: '2' });
    expect(r.warnings.some((w) => w.mensagem.includes('produção restrita'))).toBe(true);
  });
});

describe('validarS1299 — fechamento de período', () => {
  const VALIDO = { ...EMPREGADOR, ...EVENTO, evtRemun: true };

  it('aceita payload válido', () => {
    expect(validarS1299(VALIDO).valid).toBe(true);
  });

  it('exige evtRemun', () => {
    const r = validarS1299({ ...VALIDO, evtRemun: undefined });
    expect(r.errors.some((e) => e.campo === 'evtRemun')).toBe(true);
  });

  it('evtRemun=false gera warning de competência sem remuneração', () => {
    const r = validarS1299({ ...VALIDO, evtRemun: 'false' });
    expect(r.warnings.some((w) => w.campo === 'evtRemun')).toBe(true);
  });

  it('evtRemur booleano gera warning de confirmação S-1200', () => {
    const r = validarS1299({ ...VALIDO, evtRemur: true });
    expect(r.warnings.some((w) => w.campo === 'evtRemur')).toBe(true);
  });
});

describe('validarS5001 — IRRF', () => {
  const BASE = {
    ...EMPREGADOR,
    perApur: COMP_PASSADA,
    infoIRRF: [
      {
        cpfBenef: VALID_CPF,
        nitPasep: '12345678901',
        nomeBenef: 'Maria Silva',
        infoIRRF: [{ codCateg: '101', tpCR: '001', vrTotalBasRet: 1000, vrTotalIRRF: 100, vrTotalDeducao: 0 }],
      },
    ],
  };

  it('aceita beneficiário completo', () => {
    expect(validarS5001(BASE).valid).toBe(true);
  });

  it('rejeita infoIRRF ausente ou vazio', () => {
    expect(validarS5001({ ...EMPREGADOR, perApur: COMP_PASSADA }).errors.some((e) => e.campo === 'infoIRRF')).toBe(
      true
    );
    expect(
      validarS5001({ ...EMPREGADOR, perApur: COMP_PASSADA, infoIRRF: [] }).errors.some(
        (e) => e.regra === 'REGRA_ARRAY_VAZIO'
      )
    ).toBe(true);
  });

  it('exige cpfBenef ou cnpjBenef', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [{ nomeBenef: 'X', infoIRRF: [{ vrTotalBasRet: 0, vrTotalIRRF: 0 }] }],
    });
    expect(r.errors.some((e) => e.campo.includes('cpfBenef'))).toBe(true);
  });

  it('aceita cnpjBenef no lugar de cpfBenef', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [{ cnpjBenef: CNPJ2, nomeBenef: 'PJ', infoIRRF: [{ vrTotalBasRet: 0, vrTotalIRRF: 0 }] }],
    });
    expect(r.errors).toEqual([]);
  });

  it('rejeita NIT/PASEP inválido', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [
        { cpfBenef: VALID_CPF, nitPasep: '123', nomeBenef: 'X', infoIRRF: [{ vrTotalBasRet: 0, vrTotalIRRF: 0 }] },
      ],
    });
    expect(r.errors.some((e) => e.campo.includes('nitPasep'))).toBe(true);
  });

  it('base > 0 com IRRF = 0 gera warning (não erro)', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [
        { cpfBenef: VALID_CPF, nomeBenef: 'X', infoIRRF: [{ tpCR: '001', vrTotalBasRet: 500, vrTotalIRRF: 0 }] },
      ],
    });
    expect(r.warnings.some((w) => w.mensagem.includes('sem retenção'))).toBe(true);
    expect(r.valid).toBe(true);
  });

  it('dedução maior que a base é erro', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [
        {
          cpfBenef: VALID_CPF,
          nomeBenef: 'X',
          infoIRRF: [{ tpCR: '001', vrTotalBasRet: 100, vrTotalIRRF: 0, vrTotalDeducao: 150 }],
        },
      ],
    });
    expect(r.errors.some((e) => e.regra === 'REGRA_LIMITE')).toBe(true);
  });

  it('exige tpCR quando há base de retenção', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [{ cpfBenef: VALID_CPF, nomeBenef: 'X', infoIRRF: [{ vrTotalBasRet: 100, vrTotalIRRF: 10 }] }],
    });
    expect(r.errors.some((e) => e.campo.endsWith('tpCR'))).toBe(true);
  });

  it('valores negativos são erro', () => {
    const r = validarS5001({
      ...BASE,
      infoIRRF: [{ cpfBenef: VALID_CPF, nomeBenef: 'X', infoIRRF: [{ vrTotalBasRet: -5, vrTotalIRRF: -1 }] }],
    });
    expect(r.errors.filter((e) => e.regra === 'REGRA_VALOR').length).toBeGreaterThanOrEqual(2);
  });
});

describe('validarS5011 — contribuição substitutiva', () => {
  const BASE = {
    ...EMPREGADOR,
    perApur: COMP_PASSADA,
    infoPerApurPos: [{ cnpjPrestador: CNPJ2, vrTotalBaseAP: 1000, vrTotalTetoAP: 800, vrTotalAliquotaAP: 0.02 }],
  };

  it('aceita payload válido', () => {
    expect(validarS5011(BASE).valid).toBe(true);
  });

  it('exige tpInsc=1', () => {
    const r = validarS5011({ ...BASE, tpInsc: 2 });
    expect(r.errors.some((e) => e.campo === 'IDEEvento.tpInsc')).toBe(true);
  });

  it('rejeita infoPerApurPos ausente/vazio', () => {
    expect(
      validarS5011({ ...EMPREGADOR, perApur: COMP_PASSADA }).errors.some((e) => e.campo === 'infoPerApurPos')
    ).toBe(true);
    expect(validarS5011({ ...BASE, infoPerApurPos: [] }).errors.some((e) => e.regra === 'REGRA_ARRAY_VAZIO')).toBe(
      true
    );
  });

  it('alíquota fora de 0..1 é erro', () => {
    const r = validarS5011({
      ...BASE,
      infoPerApurPos: [{ cnpjPrestador: CNPJ2, vrTotalBaseAP: 100, vrTotalTetoAP: 50, vrTotalAliquotaAP: 1.5 }],
    });
    expect(r.errors.some((e) => e.regra === 'REGRA_ALIQUOTA')).toBe(true);
  });

  it('teto > base gera warning', () => {
    const r = validarS5011({
      ...BASE,
      infoPerApurPos: [{ cnpjPrestador: CNPJ2, vrTotalBaseAP: 100, vrTotalTetoAP: 500, vrTotalAliquotaAP: 0.1 }],
    });
    expect(r.warnings.some((w) => w.campo.includes('vrTotalTetoAP'))).toBe(true);
  });
});
