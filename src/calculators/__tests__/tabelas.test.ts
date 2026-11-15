import { describe, it, expect } from 'vitest';
import {
  SALARIO_MINIMO_2026,
  FAIXAS_INSS_2026,
  TETO_INSS_2026,
  FAIXAS_IRRF_2026,
  DEDUCAO_SIMPLIFICADA_IRRF_2026,
  DEDUCAO_DEPENDENTE_IRRF,
  ALIQUOTA_FGTS,
  SALARIO_FAMILIA_TETO,
  SALARIO_FAMILIA_VALOR,
  FAIXAS_PLR_2026,
  ENCARGOS_PADRAO,
  ALIQUOTA_ENCARGOS_PROVISAO,
  aliquotaEncargosProvisao,
} from '../tabelas';

describe('tabelas 2026 — integridade dos dados', () => {
  describe('salário mínimo', () => {
    it('SALARIO_MINIMO_2026 é positivo', () => {
      expect(SALARIO_MINIMO_2026).toBeGreaterThan(0);
    });

    it('SALARIO_MINIMO_2026 vale R$ 1.621,00', () => {
      expect(SALARIO_MINIMO_2026).toBe(1621.0);
    });
  });

  describe('FAIXAS_INSS_2026', () => {
    it('tem 4 faixas', () => {
      expect(FAIXAS_INSS_2026).toHaveLength(4);
    });

    it('limites são crescentes', () => {
      for (let i = 1; i < FAIXAS_INSS_2026.length; i++) {
        expect(FAIXAS_INSS_2026[i].limite).toBeGreaterThan(FAIXAS_INSS_2026[i - 1].limite);
      }
    });

    it('alíquotas são crescentes (progressividade)', () => {
      for (let i = 1; i < FAIXAS_INSS_2026.length; i++) {
        expect(FAIXAS_INSS_2026[i].aliquota).toBeGreaterThan(FAIXAS_INSS_2026[i - 1].aliquota);
      }
    });

    it('alíquotas estão entre 0 e 1 (decimal)', () => {
      for (const f of FAIXAS_INSS_2026) {
        expect(f.aliquota).toBeGreaterThan(0);
        expect(f.aliquota).toBeLessThanOrEqual(1);
      }
    });

    it('última faixa limite equals TETO_INSS_2026', () => {
      const lastFaixa = FAIXAS_INSS_2026[FAIXAS_INSS_2026.length - 1];
      expect(lastFaixa.limite).toBe(TETO_INSS_2026);
    });

    it('primeira faixa coincide com SALARIO_MINIMO_2026', () => {
      expect(FAIXAS_INSS_2026[0].limite).toBe(SALARIO_MINIMO_2026);
    });
  });

  describe('FAIXAS_IRRF_2026', () => {
    it('tem 5 faixas incluindo a isenta', () => {
      expect(FAIXAS_IRRF_2026).toHaveLength(5);
    });

    it('primeira faixa tem alíquota zero (isenção)', () => {
      expect(FAIXAS_IRRF_2026[0].aliquota).toBe(0);
    });

    it('última faixa tem limite Infinity', () => {
      expect(FAIXAS_IRRF_2026[FAIXAS_IRRF_2026.length - 1].limite).toBe(Infinity);
    });

    it('alíquotas são não-decrescentes', () => {
      for (let i = 1; i < FAIXAS_IRRF_2026.length; i++) {
        expect(FAIXAS_IRRF_2026[i].aliquota).toBeGreaterThanOrEqual(FAIXAS_IRRF_2026[i - 1].aliquota);
      }
    });

    it('deduções são não-negativas', () => {
      for (const f of FAIXAS_IRRF_2026) {
        expect(f.deducao).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('deduções IRRF', () => {
    it('DEDUCAO_SIMPLIFICADA_IRRF_2026 é positivo', () => {
      expect(DEDUCAO_SIMPLIFICADA_IRRF_2026).toBeGreaterThan(0);
    });

    it('DEDUCAO_DEPENDENTE_IRRF é positivo', () => {
      expect(DEDUCAO_DEPENDENTE_IRRF).toBeGreaterThan(0);
    });

    it('desconto simplificado é maior que desconto por dependente', () => {
      expect(DEDUCAO_SIMPLIFICADA_IRRF_2026).toBeGreaterThan(DEDUCAO_DEPENDENTE_IRRF);
    });
  });

  describe('FGTS', () => {
    it('ALIQUOTA_FGTS = 8%', () => {
      expect(ALIQUOTA_FGTS).toBe(0.08);
    });
  });

  describe('Salário Família', () => {
    it('teto positivo', () => {
      expect(SALARIO_FAMILIA_TETO).toBeGreaterThan(0);
    });

    it('valor do benefício positivo', () => {
      expect(SALARIO_FAMILIA_VALOR).toBeGreaterThan(0);
    });

    it('teto maior que salário mínimo (elegibilidade começa no mínimo)', () => {
      expect(SALARIO_FAMILIA_TETO).toBeGreaterThan(SALARIO_MINIMO_2026);
    });
  });

  describe('FAIXAS_PLR_2026', () => {
    it('tem 5 faixas', () => {
      expect(FAIXAS_PLR_2026).toHaveLength(5);
    });

    it('primeira faixa tem alíquota zero (isenção PLR)', () => {
      expect(FAIXAS_PLR_2026[0].aliquota).toBe(0);
    });

    it('última faixa tem limite Infinity', () => {
      expect(FAIXAS_PLR_2026[FAIXAS_PLR_2026.length - 1].limite).toBe(Infinity);
    });
  });

  describe('ENCARGOS_PADRAO', () => {
    it('INSS patronal = 20%', () => {
      expect(ENCARGOS_PADRAO.inssPatronal).toBe(0.2);
    });

    it('FGTS = 8%', () => {
      expect(ENCARGOS_PADRAO.fgts).toBe(0.08);
    });

    it('todos os encargos são positivos', () => {
      for (const [, value] of Object.entries(ENCARGOS_PADRAO)) {
        expect(value).toBeGreaterThan(0);
      }
    });
  });

  describe('aliquotaEncargosProvisao — encargos da provisão por regime', () => {
    it('alíquota cheia = CPP + RAT + Terceiros + FGTS (~36,8%)', () => {
      expect(ALIQUOTA_ENCARGOS_PROVISAO.padrao).toBeCloseTo(0.368, 10);
    });

    it('Simples Nacional recolhe apenas FGTS 8%', () => {
      expect(aliquotaEncargosProvisao('simples_nacional')).toBe(0.08);
      expect(aliquotaEncargosProvisao('simples_nacional', null)).toBe(0.08);
      expect(aliquotaEncargosProvisao('simples_nacional', 'III')).toBe(0.08);
    });

    it('Simples Anexo IV recolhe CPP + RAT + FGTS, sem Terceiros (31%)', () => {
      expect(aliquotaEncargosProvisao('simples_nacional', 'IV')).toBe(0.31);
    });

    it('Lucro Presumido e Lucro Real mantêm a alíquota cheia de hoje', () => {
      expect(aliquotaEncargosProvisao('lucro_presumido')).toBe(ALIQUOTA_ENCARGOS_PROVISAO.padrao);
      expect(aliquotaEncargosProvisao('lucro_real')).toBe(ALIQUOTA_ENCARGOS_PROVISAO.padrao);
      expect(aliquotaEncargosProvisao('lucro_real', 'IV')).toBe(ALIQUOTA_ENCARGOS_PROVISAO.padrao);
    });

    it('regime ausente ou desconhecido cai na alíquota cheia, nunca na menor', () => {
      for (const regime of [null, undefined, '', 'mei', 'regime_inexistente']) {
        expect(aliquotaEncargosProvisao(regime)).toBe(ALIQUOTA_ENCARGOS_PROVISAO.padrao);
        expect(aliquotaEncargosProvisao(regime)).toBeGreaterThan(ALIQUOTA_ENCARGOS_PROVISAO.simplesNacional);
      }
    });

    it('provisão de R$ 1.000 — Simples provisiona 28,8 p.p. menos que Lucro Presumido', () => {
      const base = 1000;
      const simples = base * aliquotaEncargosProvisao('simples_nacional');
      const presumido = base * aliquotaEncargosProvisao('lucro_presumido');
      expect(simples).toBeCloseTo(80, 10);
      expect(presumido).toBeCloseTo(368, 10);
      expect(presumido - simples).toBeCloseTo(288, 10);
    });
  });
});
