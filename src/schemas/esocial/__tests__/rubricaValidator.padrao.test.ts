import { describe, it, expect } from 'vitest';
import { RUBRICAS_PADRAO } from '@/constants/rubricas';
import { validarRubricaESocial, sugerirCorrecaoRubrica } from '../rubricaValidator';

describe('validarRubricaESocial com RUBRICAS_PADRAO reais', () => {
  it("aceita 'informativo' (enum do banco) para rubrica padrão 'informativa'", () => {
    const r = validarRubricaESocial({
      codigo: '7000',
      descricao: 'FGTS (Base)',
      tipo: 'informativo',
      incide_inss: false,
      incide_fgts: false,
      incide_irrf: false,
    });
    expect(r.valid).toBe(true);
  });

  it('rubricas padrão como gravadas pela importação ficam conformes', () => {
    for (const p of RUBRICAS_PADRAO) {
      const gravada = { ...p, tipo: p.tipo === 'informativa' ? 'informativo' : p.tipo };
      expect(validarRubricaESocial(gravada).valid).toBe(true);
    }
  });

  it('correção sugerida resulta em rubrica conforme', () => {
    const corrigida = sugerirCorrecaoRubrica({ codigo: '7000', descricao: 'X', tipo: 'provento' });
    expect(corrigida).not.toBeNull();
    expect(validarRubricaESocial(corrigida!).valid).toBe(true);
  });
});
