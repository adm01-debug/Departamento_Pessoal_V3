/**
 * Testes das regras cross-field adicionadas aos validadores eSocial.
 * Cobrem cronologia, tabelas oficiais e regras legais (CF/88, CLT, NR-07, Lei 8.213/91).
 */
import { describe, it, expect } from 'vitest';
import {
  validarS2190,
  validarS2200,
  validarS2230,
  validarS2299,
  validarS2399,
  validarS3000,
} from '../naoPeriodicosValidators';
import { validarS2210, validarS2220, validarS2240 } from '../sstValidators';

const CPF = '11144477735';

describe('cronologia de datas', () => {
  it('S-2200 rejeita admissão anterior ao nascimento', () => {
    const r = validarS2200({
      cpfTrab: CPF,
      nmTrab: 'João',
      dtAdm: '1990-01-01',
      dtNascto: '2000-01-01',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.regra === 'REGRA_CRONOLOGIA')).toBe(true);
  });

  it('S-2230 rejeita término de afastamento anterior ao início', () => {
    const r = validarS2230({
      cpfTrab: CPF,
      codMotAfast: '01',
      dtIniAfast: '2024-06-10',
      dtTermAfast: '2024-06-01',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.campo === 'dtTermAfast')).toBe(true);
  });

  it('S-2299 rejeita desligamento anterior à admissão', () => {
    const r = validarS2299({ cpfTrab: CPF, dtAdm: '2024-05-01', dtDeslig: '2024-01-01' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.regra === 'REGRA_CRONOLOGIA')).toBe(true);
  });

  it('S-2399 rejeita término anterior ao início', () => {
    const r = validarS2399({ cpfTrab: CPF, dtInicio: '2024-08-01', dtTerm: '2024-07-01' });
    expect(r.valid).toBe(false);
  });

  it('S-2190 rejeita admissão em data futura', () => {
    const futuro = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const r = validarS2190({ cpfTrab: CPF, dtAdm: futuro });
    expect(r.errors.some((e) => e.regra === 'REGRA_DATA_FUTURA')).toBe(true);
  });
});

describe('regras legais trabalhistas', () => {
  it('S-2200 bloqueia admissão de menor de 14 anos (CF/88 art. 7º, XXXIII)', () => {
    const r = validarS2200({
      cpfTrab: CPF,
      nmTrab: 'Menor',
      dtAdm: '2024-01-01',
      dtNascto: '2015-01-01',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.regra === 'REGRA_IDADE_MINIMA')).toBe(true);
  });

  it('S-2200 apenas alerta para faixa de aprendiz (14-16 anos)', () => {
    const r = validarS2200({
      cpfTrab: CPF,
      nmTrab: 'Aprendiz',
      dtAdm: '2024-01-01',
      dtNascto: '2009-01-01',
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.campo === 'dtNascto')).toBe(true);
  });

  it('S-2230 alerta sobre transferência ao INSS após 15 dias (CLT art. 476)', () => {
    const r = validarS2230({
      cpfTrab: CPF,
      codMotAfast: '01',
      dtIniAfast: '2024-06-01',
      dtTermAfast: '2024-07-15',
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.mensagem.includes('INSS'))).toBe(true);
  });

  it('S-2210 exige data de óbito em CAT de óbito (tpCat=3)', () => {
    const r = validarS2210({
      cpfTrab: CPF,
      dtAcid: '2024-05-10',
      tpAcid: '1',
      hrAcid: '08:30',
      tpCat: '3',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.campo === 'dtObito')).toBe(true);
  });

  it('S-2220 alerta quando ASO admissional resulta INAPTO', () => {
    const r = validarS2220({
      cpfTrab: CPF,
      dtExame: '2024-05-10',
      tpExame: '0',
      resAso: '2',
      nrCRM: '123456',
      ufCRM: 'SP',
    });
    expect(r.warnings.some((w) => w.campo === 'resAso')).toBe(true);
  });
});

describe('formatos de tabelas oficiais', () => {
  it('S-2200 rejeita CBO com dígitos insuficientes', () => {
    const r = validarS2200({ cpfTrab: CPF, nmTrab: 'A', dtAdm: '2024-01-01', codCBO: '123' });
    expect(r.errors.some((e) => e.regra === 'REGRA_CBO')).toBe(true);
  });

  it('S-2200 rejeita salário zerado ou negativo', () => {
    const r = validarS2200({ cpfTrab: CPF, nmTrab: 'A', dtAdm: '2024-01-01', vrSalFx: -100 });
    expect(r.errors.some((e) => e.campo === 'vrSalFx')).toBe(true);
  });

  it('S-3000 rejeita tipo de evento fora do padrão S-XXXX', () => {
    const r = validarS3000({ nrRecEvt: 'REC001', tpEvt: 'EVENTO' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.campo === 'tpEvt')).toBe(true);
  });

  it('S-2210 rejeita hora de acidente malformada', () => {
    const r = validarS2210({ cpfTrab: CPF, dtAcid: '2024-05-10', tpAcid: '1', hrAcid: '99:99' });
    expect(r.errors.some((e) => e.regra === 'REGRA_HORA')).toBe(true);
  });

  it('S-2220 exige UF quando o CRM é informado', () => {
    const r = validarS2220({ cpfTrab: CPF, dtExame: '2024-05-10', tpExame: '1', nrCRM: '123456' });
    expect(r.errors.some((e) => e.campo === 'ufCRM')).toBe(true);
  });

  it('S-2240 rejeita agente nocivo fora do padrão XX.XX.XXX', () => {
    const r = validarS2240({
      cpfTrab: CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: '0201' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.regra === 'REGRA_ENUM')).toBe(true);
  });

  it('S-2240 exige intensidade em avaliação quantitativa', () => {
    const r = validarS2240({
      cpfTrab: CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: '02.01.001', tpAval: '1' }],
    });
    expect(r.errors.some((e) => e.campo === 'infoExpRisco[0].intConc')).toBe(true);
  });

  it('S-2240 aceita avaliação qualitativa sem intensidade', () => {
    const r = validarS2240({
      cpfTrab: CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: '02.01.001', tpAval: '2' }],
    });
    expect(r.valid).toBe(true);
  });
});
