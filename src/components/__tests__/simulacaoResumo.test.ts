import { describe, it, expect } from 'vitest';
import { resumoSimulacao } from '../obrigacoes/simulacaoResumo';

describe('resumoSimulacao', () => {
  it('usa custoTotal salvo pelo SimuladorWhatIf', () => {
    const resultado = {
      salario: 5000,
      totalEncargos: 1500,
      totalProvisoes: 800,
      beneficios: 700,
      custoTotal: 8000,
      multiplicador: '1.60',
      breakdown: {},
    };
    expect(resumoSimulacao(resultado)).toEqual({ rotulo: 'Custo Total Estimado', valor: 8000 });
  });

  it('cai no impacto_total legado', () => {
    expect(resumoSimulacao({ impacto_total: 1234 })).toEqual({ rotulo: 'Impacto Estimado', valor: 1234 });
  });

  it('retorna 0 para resultado nulo ou sem valores', () => {
    expect(resumoSimulacao(null)).toEqual({ rotulo: 'Impacto Estimado', valor: 0 });
    expect(resumoSimulacao({})).toEqual({ rotulo: 'Impacto Estimado', valor: 0 });
  });
});
