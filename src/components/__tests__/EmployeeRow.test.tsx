import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OrgColaborador } from '@/lib/organogramaTree';

// O e-mail corporativo de todo colaborador da empresa aparece nesta row, uma
// por pessoa, na tela aberta do organograma: é o caminho de PII mais exposto da
// árvore. `canViewPii` é controlado por caso para cobrir os dois lados.
const { mockCanViewPii } = vi.hoisted(() => ({ mockCanViewPii: { valor: true } }));

vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: mockCanViewPii.valor,
    // Mesma forma do hook real: com permissão devolve o valor; sem, mascara.
    email: (v: string | null | undefined) => (mockCanViewPii.valor ? (v ?? '') : 'a***@example.com'),
    cpf: (v: string) => v,
    pis: (v: string) => v,
    phone: (v: string) => v,
    bankAccount: (v: string) => v,
    pix: (_t: string, v: string) => v,
    deep: <T,>(v: T) => v,
  }),
}));

import { EmployeeRow } from '../organograma/EmployeeRow';

const COLABORADOR: OrgColaborador = {
  id: 'c1',
  nome_completo: 'Ana Lima',
  cargo: 'Analista',
  email: 'ana@example.com',
  foto_url: null,
};

beforeEach(() => {
  mockCanViewPii.valor = true;
});

describe('EmployeeRow', () => {
  it('mostra nome e cargo', () => {
    render(<EmployeeRow colaborador={COLABORADOR} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
  });

  it('com permissão de PII: e-mail por inteiro e link mailto', () => {
    render(<EmployeeRow colaborador={COLABORADOR} />);
    const link = screen.getByText('ana@example.com').closest('a');
    expect(link).toHaveAttribute('href', 'mailto:ana@example.com');
  });

  it('sem permissão de PII: e-mail mascarado e NENHUM mailto', () => {
    mockCanViewPii.valor = false;
    const { container } = render(<EmployeeRow colaborador={COLABORADOR} />);

    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('a***@example.com')).toBeInTheDocument();
    // O href é o vazamento real: mailto embute o endereço mesmo com o texto
    // escondido pelo `hidden lg:inline`.
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('sem e-mail: não renderiza link nem texto de contato', () => {
    const { container } = render(<EmployeeRow colaborador={{ ...COLABORADOR, email: null }} />);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('fallback de iniciais quando não há foto', () => {
    render(<EmployeeRow colaborador={{ ...COLABORADOR, foto_url: null }} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('mostra "Membro" quando o cargo está vazio', () => {
    render(<EmployeeRow colaborador={{ ...COLABORADOR, cargo: null }} />);
    expect(screen.getByText('Membro')).toBeInTheDocument();
  });
});
