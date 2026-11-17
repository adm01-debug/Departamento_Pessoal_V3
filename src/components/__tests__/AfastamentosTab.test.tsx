import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Resgate da `muri`. A sub-aba da `main` se chama "Férias & Afastamentos" e
// mostrava só férias. O caso mais importante aqui é o último: a tabela
// `afastamentos` guarda CID, descrição do CID, médico e CRM, e esta aba NÃO
// pode imprimir nada disso.

const estado = vi.hoisted(() => ({
  data: [] as unknown[],
  isLoading: false,
  isError: false,
}));

vi.mock('@/hooks', () => ({
  useAfastamentosRecentes: () => estado,
}));

const { AfastamentosTab } = await import('@/components/colaborador-detalhes/AfastamentosTab');

beforeEach(() => {
  estado.data = [];
  estado.isLoading = false;
  estado.isError = false;
});

describe('AfastamentosTab', () => {
  it('sem afastamento, diz que não há em andamento e histórico vazio', () => {
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText('Nenhum afastamento em andamento.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum afastamento concluído nos últimos 12 meses.')).toBeInTheDocument();
  });

  it('afastamento sem data_fim_real é a situação ATUAL', () => {
    estado.data = [
      { id: 'a1', tipo: 'Auxílio-doença', status: 'ativo', data_inicio: '2026-03-05', data_fim_prevista: '2026-04-05' },
    ];
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText('Auxílio-doença')).toBeInTheDocument();
    expect(screen.getByText('Início: 05/03/2026')).toBeInTheDocument();
    expect(screen.getByText('Previsão de retorno: 05/04/2026')).toBeInTheDocument();
  });

  it('datas saem em dd/MM/yyyy, sem shift de fuso', () => {
    estado.data = [{ id: 'a1', tipo: 'Licença', data_inicio: '2026-03-05' }];
    render(<AfastamentosTab colaboradorId="c1" />);
    // A origem imprimia o ISO cru. '2026-03-05' tem de virar 05/03, não 04/03.
    expect(screen.getByText('Início: 05/03/2026')).toBeInTheDocument();
    expect(screen.queryByText(/2026-03-05/)).not.toBeInTheDocument();
  });

  it('afastamento com data_fim_real vai para o histórico, não para a situação atual', () => {
    estado.data = [
      { id: 'a1', tipo: 'Licença', status: 'encerrado', data_inicio: '2026-01-10', data_fim_real: '2026-01-20' },
    ];
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText('Nenhum afastamento em andamento.')).toBeInTheDocument();
    expect(screen.getByText('Licença — 10/01/2026 até 20/01/2026')).toBeInTheDocument();
  });

  it('sem previsão de retorno não inventa data', () => {
    estado.data = [{ id: 'a1', tipo: 'Suspensão', data_inicio: '2026-02-01', data_fim_prevista: null }];
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText('Previsão de retorno: não informada')).toBeInTheDocument();
  });

  it('erro na consulta NÃO aparece como "nenhum afastamento"', () => {
    estado.isError = true;
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText(/Não foi possível carregar os afastamentos/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum afastamento em andamento.')).not.toBeInTheDocument();
  });

  // O caso que protege dado de saúde.
  it('NÃO imprime CID, descrição do CID, médico nem CRM', () => {
    estado.data = [
      {
        id: 'a1',
        tipo: 'Auxílio-doença',
        status: 'ativo',
        data_inicio: '2026-03-05',
        cid_descricao: 'Transtorno de ansiedade',
        medico_nome: 'Dra. Fulana de Teste',
        medico_crm: 'CRM/SP 123456',
      },
    ];
    render(<AfastamentosTab colaboradorId="c1" />);
    expect(screen.getByText('Auxílio-doença')).toBeInTheDocument();
    expect(screen.queryByText(/Transtorno de ansiedade/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fulana de Teste/)).not.toBeInTheDocument();
    expect(screen.queryByText(/123456/)).not.toBeInTheDocument();
  });
});
