import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparacaoCenarios, type LinhaComparacao } from '../premiacoes/ComparacaoCenarios';

const linhas: LinhaComparacao[] = [
  {
    chave: 'employees',
    rotulo: 'Colaboradores',
    base: '50',
    selecionados: [{ id: 'c1', nome: 'Cenário 1', valor: '50' }],
    variacao: '0',
    corVariacao: 'text-success',
  },
  {
    chave: 'avgSalary',
    rotulo: 'Salário médio',
    base: 'R$ 4.500,00',
    selecionados: [{ id: 'c1', nome: 'Cenário 1', valor: 'R$ 5.200,00' }],
    variacao: '+15,6%',
    corVariacao: 'text-success',
  },
  {
    chave: 'resultadoLiquido',
    rotulo: 'Resultado líquido',
    base: '-R$ 14.062,50',
    selecionados: [{ id: 'c1', nome: 'Cenário 1', valor: '-R$ 61.776,00' }],
    variacao: '-339,3%',
    corVariacao: 'text-success',
  },
];

describe('ComparacaoCenarios', () => {
  it('expõe o contêiner de teste e as quatro colunas', () => {
    render(<ComparacaoCenarios linhas={linhas} cenarios={[{ id: 'c1', nome: 'Cenário 1' }]} />);
    expect(screen.getByTestId('scenario-comparison')).toHaveAttribute('data-comparison-layout', 'table-v3');
    const tabela = screen.getByRole('table', { name: 'Comparação de cenários' });
    expect(tabela).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Indicador',
      'Cenário base',
      'Cenário 1',
      'Variação',
    ]);
  });

  it('renderiza todos os valores, inclusive negativos, com a variação em verde', () => {
    render(<ComparacaoCenarios linhas={linhas} cenarios={[{ id: 'c1', nome: 'Cenário 1' }]} />);
    expect(screen.getAllByText('Colaboradores').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 4.500,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-R$ 14.062,50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+15,6%')[0]).toHaveClass('text-success', 'font-semibold');
    expect(screen.getAllByText('-339,3%')[0]).toHaveClass('text-success', 'font-semibold');
  });

  it('acomoda dois cenários com cinco colunas', () => {
    const duas = linhas.map((l) => ({
      ...l,
      selecionados: [
        { id: 'c1', nome: 'Cenário 1', valor: l.base },
        { id: 'c2', nome: 'Expansão Comercial', valor: l.base },
      ],
    }));
    render(
      <ComparacaoCenarios
        linhas={duas}
        cenarios={[
          { id: 'c1', nome: 'Cenário 1' },
          { id: 'c2', nome: 'Expansão Comercial' },
        ]}
      />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.getAllByText('Expansão Comercial').length).toBeGreaterThan(0);
  });
});
