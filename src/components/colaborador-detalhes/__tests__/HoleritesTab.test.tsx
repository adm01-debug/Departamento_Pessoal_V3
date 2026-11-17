import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HoleriteResumoColaborador } from '@/services/colaboradorDetalhesService';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useHoleritesColaborador: vi.fn(),
}));

import { useHoleritesColaborador } from '@/hooks/useColaboradorDetalhes';
import { HoleritesTab } from '../HoleritesTab';

const BASE: HoleriteResumoColaborador = {
  id: 'h1',
  competencia: '2026-10',
  total_liquido: 3200.5,
  total_proventos: 4000,
  total_descontos: 799.5,
  assinado: true,
  created_at: '2026-10-31T12:00:00Z',
  colaborador_nome: 'Maria Silva',
  colaborador_cpf: '12345678901',
  colaborador_cargo: 'Analista de RH',
  salario_base: 4000,
  valor_inss: 440,
  valor_irrf: 259.5,
  valor_fgts: 320,
};

// Mesma formatação do componente (`formatCurrency`). O `\u00a0` que o Intl
// insere depois de "R$" é colapsado em espaço comum pelo normalizador do
// testing-library, então o esperado passa pelo mesmo tratamento.
function formatado(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(valor)
    .replace(/\s/g, ' ');
}

function renderizar(estado: { data?: HoleriteResumoColaborador[]; isLoading?: boolean; isError?: boolean }) {
  vi.mocked(useHoleritesColaborador).mockReturnValue({
    data: estado.data,
    isLoading: estado.isLoading ?? false,
    isError: estado.isError ?? false,
  } as never);
  return render(<HoleritesTab colaboradorId="col-1" />);
}

describe('HoleritesTab', () => {
  it('mostra skeleton enquanto carrega, sem estado vazio', () => {
    renderizar({ isLoading: true });
    expect(screen.getByTestId('holerites-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum holerite disponível/i)).not.toBeInTheDocument();
  });

  it('em falha de consulta mostra erro honesto, não "nenhum holerite"', () => {
    renderizar({ isError: true, data: undefined });
    expect(screen.getByText(/Não foi possível carregar os holerites/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum holerite disponível/i)).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando a consulta não traz holerite', () => {
    renderizar({ data: [] });
    expect(screen.getByText('Nenhum holerite disponível para este colaborador.')).toBeInTheDocument();
  });

  it('formata competência e valores em pt-BR e marca a assinatura', () => {
    renderizar({ data: [BASE] });
    expect(screen.getByText('10/2026')).toBeInTheDocument();
    expect(screen.getByText(formatado(4000))).toBeInTheDocument();
    expect(screen.getByText(formatado(799.5))).toBeInTheDocument();
    expect(screen.getByText(formatado(3200.5))).toBeInTheDocument();
    expect(screen.getByText('Assinado')).toBeInTheDocument();
  });

  it('não expõe o CPF do colaborador', () => {
    const { container } = renderizar({ data: [BASE] });
    expect(container.textContent).not.toContain('12345678901');
  });

  it('competência ausente cai no travessão que o serviço devolve', () => {
    renderizar({ data: [{ ...BASE, id: 'h2', competencia: '—' }] });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('assinado nulo não vira "Pendente"', () => {
    renderizar({ data: [{ ...BASE, id: 'h3', assinado: null }] });
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
    expect(screen.queryByText('Assinado')).not.toBeInTheDocument();
  });
});
