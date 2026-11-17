import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { criarCandidatura, criarVaga } from './candidatosFixture';

/**
 * Composição da aba: garante que as QUATRO faixas e os SETE painéis existem,
 * inclusive nos estados vazios. O Recharts é substituído por contêineres
 * simples — a matemática é testada em `analyticsComum.test.ts` e o gráfico real
 * é validado no navegador.
 */
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="grafico">{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { AnalyticsRecrutamento } from '../AnalyticsRecrutamento';

function cenario() {
  const vaga = criarVaga({
    id: 'vaga-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    status: 'aberta',
    data_abertura: '2026-08-01',
    created_at: '2026-08-01T12:00:00Z',
  });
  const triagem = criarCandidatura({
    id: 'candt-1',
    etapa: 'triagem',
    vaga_id: 'vaga-1',
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
  });
  const contratado = criarCandidatura({
    id: 'candt-2',
    etapa: 'contratado',
    status: 'contratado',
    vaga_id: 'vaga-1',
    candidato_id: 'pessoa-2',
    created_at: '2026-08-05T12:00:00Z',
    updated_at: '2026-08-05T12:00:00Z',
  });
  contratado.candidato = {
    ...contratado.candidato!,
    id: 'pessoa-2',
    nome: 'Bruno Carvalho',
    email: 'bruno@email.com',
    origem: 'Gupy',
  };
  return {
    candidaturas: [triagem, contratado],
    vagas: [vaga],
    candidatos: [triagem.candidato!, contratado.candidato!],
  };
}

describe('AnalyticsRecrutamento', () => {
  it('renderiza KPIs, funil, evolução, origens, operação e indicadores', () => {
    const dados = cenario();
    render(<AnalyticsRecrutamento {...dados} />);

    expect(screen.getByText('Visão analítica do recrutamento')).toBeInTheDocument();
    ['Vagas abertas', 'Total de candidatos', 'Processos ativos', 'Taxa de conversão'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    [
      'Funil de recrutamento',
      'Evolução de candidaturas',
      'Principais origens',
      'Tempo médio por etapa',
      'Pontos de atenção',
      'Desempenho por vaga',
      'Principais indicadores',
    ].forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeInTheDocument();
    });
    expect(screen.getByTestId('grafico')).toBeInTheDocument();
    expect(screen.getAllByText('Desenvolvedor(a) Full Stack Sênior').length).toBeGreaterThan(0);
  });

  it('não apresenta retenção quando ninguém está na entrada do funil', () => {
    const dados = cenario();
    const soContratado = dados.candidaturas.filter((candidatura) => candidatura.etapa === 'contratado');
    render(<AnalyticsRecrutamento {...dados} candidaturas={soContratado} />);

    // Triagem vazia: 0% "da entrada" seria percentual sobre denominador vazio.
    expect(screen.getAllByText('sem base de entrada').length).toBeGreaterThan(0);
    expect(screen.queryByText(/da entrada chegar/)).not.toBeInTheDocument();
  });

  it('mostra a falha da consulta em vez de um painel de zeros', () => {
    render(
      <AnalyticsRecrutamento
        candidaturas={[]}
        vagas={[]}
        candidatos={[]}
        erro="Não foi possível consultar as candidaturas."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar as candidaturas.');
    expect(screen.queryByText('Nenhum gargalo crítico')).not.toBeInTheDocument();
    expect(screen.queryByText('Taxa de conversão')).not.toBeInTheDocument();
  });

  it('não afirma nada enquanto a base está sendo carregada', () => {
    render(<AnalyticsRecrutamento candidaturas={[]} vagas={[]} candidatos={[]} carregando />);

    expect(screen.getByText('Carregando a base do recrutamento…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum gargalo crítico')).not.toBeInTheDocument();
    expect(screen.queryByText('Vagas abertas')).not.toBeInTheDocument();
  });

  it('mostra estados vazios coerentes quando a base está vazia', () => {
    render(<AnalyticsRecrutamento candidaturas={[]} vagas={[]} candidatos={[]} />);
    expect(screen.getByText('Nenhuma candidatura no funil')).toBeInTheDocument();
    expect(screen.getByText('Sem movimentações no período')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma origem registrada')).toBeInTheDocument();
    expect(screen.getByText('Sem tempo registrado')).toBeInTheDocument();
    expect(screen.getByText('Nenhum gargalo crítico')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma vaga cadastrada')).toBeInTheDocument();
  });
});
