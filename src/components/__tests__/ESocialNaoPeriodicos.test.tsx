import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/utils/piiMask', () => ({
  maskCpfDisplay: vi.fn((cpf: string) => '***.' + (cpf || '').slice(-6)),
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

import { S2200Admissao, S2230Afastamento } from '../esocial/NaoPeriodicos';

const DADOS_S2200 = {
  nmTrab: 'Maria Oliveira',
  cpfTrab: '12345678900',
  matricula: 'MAT-001',
  codCateg: '101',
  dtAdm: '2024-01-15',
  tpRegTrab: '1',
  nmCargo: 'Analista de TI',
  cbos: '2124-05',
  vrSalFx: 6000,
  undSalFixo: 'Mensal',
  qtdHrsSem: 44,
  tpRegPrev: '1',
};

const DADOS_S2230 = {
  cpfTrab: '12345678900',
  codMotAfast: '01',
  dtIniAfast: '2024-07-01',
  dtTermAfast: '2024-07-15',
};

describe('S2200Admissao', () => {
  it('renders trabalhador name', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
  });

  it('renders Identificação do Trabalhador label', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText(/Identificação do Trabalhador/i)).toBeInTheDocument();
  });

  it('renders Dados da Admissão label', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText(/Dados da Admissão/i)).toBeInTheDocument();
  });

  it('renders dtAdm value', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('renders CLT vínculo type', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText(/CLT/)).toBeInTheDocument();
  });

  it('renders Informações Contratuais section', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText(/Informações Contratuais/i)).toBeInTheDocument();
  });

  it('renders cargo name', () => {
    render(<S2200Admissao dados={DADOS_S2200} />);
    expect(screen.getByText('Analista de TI')).toBeInTheDocument();
  });

  it('shows Não informado for missing nmTrab', () => {
    render(<S2200Admissao dados={{ ...DADOS_S2200, nmTrab: undefined }} />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });
});

describe('S2230Afastamento', () => {
  it('renders Identificação do Trabalhador label', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText(/Identificação do Trabalhador/i)).toBeInTheDocument();
  });

  it('renders Motivo do Afastamento label', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText(/Motivo do Afastamento/i)).toBeInTheDocument();
  });

  it('renders codMotAfast value', () => {
    const { container } = render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(container.textContent).toMatch(/Cód: 01/);
  });

  it('renders Início label', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('renders dtIniAfast value', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText('2024-07-01')).toBeInTheDocument();
  });

  it('renders Término Previsto label', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText(/Término Previsto/i)).toBeInTheDocument();
  });

  it('shows Em Aberto when dtTermAfast is missing', () => {
    render(<S2230Afastamento dados={{ ...DADOS_S2230, dtTermAfast: undefined }} />);
    expect(screen.getByText('Em Aberto')).toBeInTheDocument();
  });

  it('renders eSocial S-2230 reference', () => {
    render(<S2230Afastamento dados={DADOS_S2230} />);
    expect(screen.getByText(/S-2230/)).toBeInTheDocument();
  });
});
