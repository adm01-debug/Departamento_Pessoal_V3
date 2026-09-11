import { describe, expect, it } from 'vitest';
import { buildFolhaResumo } from '../folhaResumo';

describe('buildFolhaResumo', () => {
  it('aggregates only the item rows attached to the selected payroll header', () => {
    const resumo = buildFolhaResumo({
      id: 'folha-mensal-empresa-a',
      status: 'calculada',
      folha_itens: [
        {
          folha_id: 'folha-mensal-empresa-a',
          total_proventos: 3_000,
          total_descontos: 500,
          inss_mes: 300,
          irrf_mes: 200,
          fgts_mes: 240,
        },
        {
          folha_id: 'folha-mensal-empresa-a',
          total_proventos: 2_000,
          total_descontos: 200,
          inss_mes: 180,
          irrf_mes: 20,
          fgts_mes: 160,
        },
      ],
    });

    expect(resumo).toMatchObject({
      id: 'folha-mensal-empresa-a',
      colaboradores: 2,
      totalProventos: 5_000,
      totalDescontos: 700,
      liquido: 4_300,
      inss: 480,
      irrf: 220,
      fgts: 400,
      status: expect.objectContaining({ calculo: 'executado', fechamento: 'calculada' }),
    });
  });

  it('keeps the selected header identity and state when it has no item rows', () => {
    const resumo = buildFolhaResumo({
      id: 'folha-vazia',
      status: 'aberta',
      folha_itens: null,
    });

    expect(resumo).toMatchObject({
      id: 'folha-vazia',
      colaboradores: 0,
      totalProventos: 0,
      totalDescontos: 0,
      status: expect.objectContaining({ calculo: 'pendente', fechamento: 'aberta' }),
    });
  });
});
