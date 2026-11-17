import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Esta tabela veio da branch `muri` imprimindo e-mail e CPF CRUS. Ela chama
// `usePiiMask` internamente (de propósito: nenhum chamador pode esquecer a
// máscara), então o mock do hook é a fronteira do teste — os dois primeiros
// casos são justamente o que impede a regressão de voltar.
const mockCanViewPii = vi.hoisted(() => ({ valor: false }));

vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: mockCanViewPii.valor,
    cpf: (v: string | null | undefined) => (mockCanViewPii.valor ? (v ?? '') : '***.***.***-**'),
    email: (v: string | null | undefined) => (mockCanViewPii.valor ? (v ?? '') : 'a***@***'),
    pis: (v: string | null | undefined) => v ?? '',
    bankAccount: (v: string | null | undefined) => v ?? '',
    phone: (v: string | null | undefined) => v ?? '',
    pix: (_t: string | null | undefined, c: string | null | undefined) => c ?? '',
    deep: (v: unknown) => v,
  }),
}));

const { ColaboradorTable } = await import('@/components/colaboradores/ColaboradorTable');

type Item = Parameters<typeof ColaboradorTable>[0]['items'][number];

const COLABORADOR = {
  id: 'c1',
  nome_completo: 'Pessoa de Teste',
  email: 'pessoa.teste@exemplo.com.br',
  cpf: '12345678901',
  matricula: '0042',
  status: 'ativo',
  cargo: 'Analista',
  departamento: 'TI',
  data_admissao: '2024-03-05',
} as unknown as Item;

function montar(passagens?: Record<string, { quantidadePassagens: number }>) {
  render(
    <MemoryRouter>
      <ColaboradorTable
        items={[COLABORADOR]}
        passagensPorId={passagens as Parameters<typeof ColaboradorTable>[0]['passagensPorId']}
      />
    </MemoryRouter>
  );
}

describe('ColaboradorTable — máscara de PII', () => {
  it('sem permissão de ver PII, não imprime o e-mail real', () => {
    mockCanViewPii.valor = false;
    montar();
    expect(screen.queryByText('pessoa.teste@exemplo.com.br')).not.toBeInTheDocument();
    expect(screen.getByText('a***@***')).toBeInTheDocument();
  });

  it('sem permissão de ver PII, não imprime o CPF real', () => {
    mockCanViewPii.valor = false;
    montar();
    expect(screen.queryByText(/12345678901/)).not.toBeInTheDocument();
    expect(screen.getByText('CPF: ***.***.***-**')).toBeInTheDocument();
  });

  it('com permissão, mostra e-mail e CPF completos', () => {
    mockCanViewPii.valor = true;
    montar();
    expect(screen.getByText('pessoa.teste@exemplo.com.br')).toBeInTheDocument();
    expect(screen.getByText('CPF: 12345678901')).toBeInTheDocument();
  });
});

describe('ColaboradorTable — colunas que a tabela anterior não tinha', () => {
  it('mostra a admissão em dd/MM/yyyy sem shift de fuso', () => {
    mockCanViewPii.valor = true;
    montar();
    // `data_admissao` é DATE: '2024-03-05' tem de virar 05/03/2024, não 04/03.
    expect(screen.getByText('05/03/2024')).toBeInTheDocument();
  });

  it('mostra o selo de recontratação a partir de 2 passagens', () => {
    mockCanViewPii.valor = true;
    montar({ c1: { quantidadePassagens: 3 } });
    expect(screen.getByText('3ª passagem')).toBeInTheDocument();
  });

  it('sem passagensPorId não inventa selo', () => {
    mockCanViewPii.valor = true;
    montar();
    expect(screen.queryByText(/passagem/)).not.toBeInTheDocument();
  });
});
