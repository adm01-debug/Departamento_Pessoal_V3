import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// A grade já sabia desenhar o selo de recontratação, mas a página não passava
// `passagensPorId` — então ele nunca aparecia. Estes casos travam o contrato
// dos dois lados: com o dado, aparece; sem, não inventa.

vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: true,
    cpf: (v?: string | null) => v ?? '',
    email: (v?: string | null) => v ?? '',
    pis: (v?: string | null) => v ?? '',
    bankAccount: (v?: string | null) => v ?? '',
    phone: (v?: string | null) => v ?? '',
    pix: (_t?: string | null, c?: string | null) => c ?? '',
    deep: (v: unknown) => v,
  }),
}));

const { ColaboradorDirectoryGrid } = await import('@/components/colaboradores/ColaboradorDirectoryGrid');

type ItemDaGrade = Parameters<typeof ColaboradorDirectoryGrid>[0]['items'][number];

const COLABORADOR = {
  id: 'c1',
  nome_completo: 'Pessoa de Teste',
  email: 'pessoa@exemplo.com.br',
  cpf: '12345678901',
  status: 'ativo',
  cargo: 'Analista',
  departamento: 'TI',
  data_admissao: '2026-01-15',
} as unknown as ItemDaGrade;

function montar(passagens?: Record<string, { quantidadePassagens: number }>) {
  render(
    <MemoryRouter>
      <ColaboradorDirectoryGrid
        items={[COLABORADOR]}
        passagensPorId={passagens as unknown as Parameters<typeof ColaboradorDirectoryGrid>[0]['passagensPorId']}
      />
    </MemoryRouter>
  );
}

describe('selo de recontratação na grade de colaboradores', () => {
  it('com 2 passagens, mostra "2ª passagem"', () => {
    montar({ c1: { quantidadePassagens: 2 } });
    expect(screen.getByText('2ª passagem')).toBeInTheDocument();
  });

  it('com 3 passagens, mostra o número real e não um fixo', () => {
    montar({ c1: { quantidadePassagens: 3 } });
    expect(screen.getByText('3ª passagem')).toBeInTheDocument();
  });

  it('na primeira passagem não há selo — não há o que sinalizar', () => {
    montar({ c1: { quantidadePassagens: 1 } });
    expect(screen.queryByText(/passagem/)).not.toBeInTheDocument();
  });

  // O caso que deixou o selo invisível em produção: o dado simplesmente não
  // chegava. Sem `passagensPorId` o componente não pode inventar um número.
  it('sem passagensPorId, não mostra selo nenhum', () => {
    montar(undefined);
    expect(screen.queryByText(/passagem/)).not.toBeInTheDocument();
  });
});
