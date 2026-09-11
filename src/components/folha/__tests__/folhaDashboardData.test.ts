import { describe, expect, it } from 'vitest';
import {
  competenciaAnterior,
  competenciaParaBanco,
  criarDadosComposicao,
  criarDadosTendencia,
} from '../folhaDashboardData';

describe('folhaDashboardData', () => {
  it('normalizes UI competences and crosses year boundaries safely', () => {
    expect(competenciaParaBanco('09/2026')).toBe('2026-09');
    expect(competenciaParaBanco('2026-09')).toBe('2026-09');
    expect(competenciaParaBanco('2026/09')).toBeNull();
    expect(competenciaAnterior('01/2026', 5)).toBe('2025-08');
  });

  it('builds trend data from the database rows instead of fixed chart values', () => {
    expect(
      criarDadosTendencia([
        { competencia: '2026-09', total_proventos: 7_000, total_colaboradores: 3 },
        { competencia: '2026-08', total_proventos: 5_000, total_colaboradores: 2 },
      ])
    ).toEqual([
      { month: '08/26', total: 5_000, colaboradores: 2, proventosMedios: 2_500 },
      { month: '09/26', total: 7_000, colaboradores: 3, proventosMedios: 7_000 / 3 },
    ]);
  });

  it('omits zero-valued composition slices instead of presenting mock percentages', () => {
    expect(criarDadosComposicao({ totalProventos: 3_000, totalDescontos: 0, fgts: 240 })).toEqual([
      { name: 'Proventos', value: 3_000, color: 'hsl(var(--primary))' },
      { name: 'FGTS', value: 240, color: '#10b981' },
    ]);
  });
});
