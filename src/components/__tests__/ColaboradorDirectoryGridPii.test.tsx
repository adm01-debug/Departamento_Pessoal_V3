import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// A grade chama `usePiiMask` internamente (de propósito: nenhum chamador pode
// esquecer a máscara). Para provar que ela respeita o papel do usuário sem
// subir o AuthProvider inteiro, o mock do hook é a fronteira do teste.
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

const { ColaboradorDirectoryGrid } = await import('@/components/colaboradores/ColaboradorDirectoryGrid');

const COLABORADOR = {
  id: 'c1',
  nome_completo: 'Pessoa de Teste',
  email: 'pessoa.teste@exemplo.com.br',
  cpf: '12345678901',
  status: 'ativo',
  cargo: 'Analista',
  departamento: 'TI',
} as unknown as Parameters<typeof ColaboradorDirectoryGrid>[0]['items'][number];

function montar() {
  render(
    <MemoryRouter>
      <ColaboradorDirectoryGrid items={[COLABORADOR]} />
    </MemoryRouter>
  );
}

describe('ColaboradorDirectoryGrid — máscara de PII', () => {
  it('sem permissão de ver PII, não imprime o e-mail real', () => {
    mockCanViewPii.valor = false;
    montar();
    expect(screen.queryByText('pessoa.teste@exemplo.com.br')).not.toBeInTheDocument();
    expect(screen.getByText('a***@***')).toBeInTheDocument();
  });

  it('com permissão, mostra o e-mail completo', () => {
    mockCanViewPii.valor = true;
    montar();
    expect(screen.getByText('pessoa.teste@exemplo.com.br')).toBeInTheDocument();
  });

  it('o nome não é PII mascarável e aparece nos dois casos', () => {
    mockCanViewPii.valor = false;
    montar();
    expect(screen.getByText('Pessoa de Teste')).toBeInTheDocument();
  });
});
