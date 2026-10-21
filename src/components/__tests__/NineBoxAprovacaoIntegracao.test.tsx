import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { NineBoxFocoBanner } from '@/components/avaliacao/NineBoxFocoBanner';
import { lerAtencao, type PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * APROVAÇÃO → NINE-BOX: o estado de aprovação é aplicado pelo motor. O banner
 * legado de “aguardando RH” permanece disponível para registros históricos, mas
 * a aprovação vigente do gestor já classifica no quadrante.
 */
function ponto(extra: Partial<PontoNineBox> = {}): PontoNineBox {
  return {
    id: 'p1',
    colaboradorId: 'c1',
    nome: 'Beatriz Silva Cardoso',
    cargo: 'Analista',
    departamento: 'RH',
    foto: null,
    nota: 4,
    potencial: 4,
    desempenho: 3,
    potencialFaixa: 3,
    quadrante: null,
    nomeQuadrante: null,
    criadoEm: 0,
    pontuacao: null,
    temPdi: false,
    pendencias: 'sem_potencial',
    quantidadeAvaliacoes: 1,
    quantidadeAvaliacoesValidas: 1,
    sinalizados: 0,
    registrosSinalizados: [],
    selecionadoId: 'f1',
    notasForaDaEscala: 0,
    feedbackIdsUtilizados: ['f1'],
    statusConsolidacao: 'incompleto',
    tiposAvaliadores: ['gestor'],
    ...extra,
  } as PontoNineBox;
}

describe('Nine-Box × aprovação — estado intermediário visível', () => {
  it('lerAtencao separa “aguardando RH” e “aguardando aprovação” do “sem dado”', () => {
    const atencao = lerAtencao([
      ponto({ aguardandoValidacaoRh: true }),
      ponto({ id: 'p2', colaboradorId: 'c2', nome: 'Lucas', aguardandoAprovacao: true }),
      ponto({ id: 'p3', colaboradorId: 'c3', nome: 'Sem dados' }),
    ]);

    expect(atencao.aguardandoRh).toBe(1);
    expect(atencao.nomesAguardandoRh).toEqual(['Beatriz Silva Cardoso']);
    expect(atencao.aguardandoAprovacao).toBe(1);
    expect(atencao.nomesAguardandoAprovacao).toEqual(['Lucas']);
    expect(atencao.semClassificacao).toBe(1);
  });

  it('o banner existente apresenta o nome de quem aguarda o RH (sem “Ver detalhes” de risco)', () => {
    render(
      <NineBoxFocoBanner
        total={0}
        emRisco={0}
        semPdi={0}
        aguardandoRh={1}
        nomesAguardandoRh={['Beatriz Silva Cardoso']}
      />
    );

    expect(screen.getByText(/etapa obrigatória do fluxo/i)).toBeInTheDocument();
    expect(screen.getByText(/Beatriz Silva Cardoso/)).toBeInTheDocument();
    expect(screen.getByText(/validação do Potencial pelo RH/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver detalhes/i })).toBeNull();
  });

  it('o banner apresenta o nome e o CICLO de quem aguarda o RH', () => {
    render(
      <NineBoxFocoBanner
        total={0}
        emRisco={0}
        semPdi={0}
        aguardandoRh={1}
        nomesAguardandoRh={['Beatriz Silva Cardoso']}
        cicloNome="Ciclo Anual 2025"
      />
    );

    expect(screen.getByText(/Beatriz Silva Cardoso/)).toBeInTheDocument();
    expect(screen.getByText(/Ciclo Anual 2025/)).toBeInTheDocument();
  });

  it('sem pendências de fluxo nem risco, o banner continua ausente', () => {
    const { container } = render(<NineBoxFocoBanner total={0} emRisco={0} semPdi={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
