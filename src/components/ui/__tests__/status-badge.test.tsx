import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColaboradorStatus } from '../status-badge';

// PARTE 2B: os cinco status reais do enum `status_colaborador` (ativo,
// pendente, desligado, ferias, afastado) precisam de representação visual
// própria — sem cair no fallback de "status desconhecido".
describe('ColaboradorStatus', () => {
  it.each([
    ['ativo', 'Ativo'],
    ['pendente', 'Pendente'],
    ['desligado', 'Desligado'],
    ['ferias', 'Férias'],
    ['afastado', 'Afastado'],
  ])('renders a known label for status "%s"', (status, expectedLabel) => {
    render(<ColaboradorStatus status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('does not render the raw "pendente" string as an unknown-status fallback', () => {
    render(<ColaboradorStatus status="pendente" />);
    // Se caísse no fallback, o texto renderizado seria o valor cru ("pendente"
    // em minúsculo) em vez do label mapeado ("Pendente").
    expect(screen.queryByText('pendente')).not.toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
