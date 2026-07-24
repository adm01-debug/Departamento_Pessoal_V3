import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S2205AlteracaoCadastral } from '../esocial/S2205AlteracaoCadastral';
import { S2206AlteracaoContratual } from '../esocial/S2206AlteracaoContratual';
import { S2230Afastamento } from '../esocial/NaoPeriodicos';

const S2205_DADOS = {
  nmTrab: 'João Silva',
  cpfTrab: '111.222.333-44',
  dtAlteracao: '2024-03-15',
  alteracao: {
    dadosTrabalhador: {
      estadoCivil: 'Casado',
      grauInstr: 'Superior Completo',
    },
  },
};

const S2206_DADOS = {
  cpfTrab: '555.666.777-88',
  matricula: 'MAT-001',
  dtAlteracao: '2024-04-01',
  vrSalFx: 7500,
  undSalFixo: 'Mensal',
  nmCargo: 'Gerente de TI',
  cbos: '1425-00',
  qtdHrsSem: 40,
};

const S2230_DADOS = {
  cpfTrab: '999.888.777-66',
  codMotAfast: '01',
  dtIniAfast: '2024-05-10',
  dtTermAfast: '2024-05-20',
};

describe('S2205AlteracaoCadastral', () => {
  it('renders trabalhador name', () => {
    render(<S2205AlteracaoCadastral dados={S2205_DADOS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders CPF', () => {
    render(<S2205AlteracaoCadastral dados={S2205_DADOS} />);
    expect(screen.getByText(/111\.222\.333-44/)).toBeInTheDocument();
  });

  it('renders data de alteração', () => {
    render(<S2205AlteracaoCadastral dados={S2205_DADOS} />);
    expect(screen.getByText('2024-03-15')).toBeInTheDocument();
  });

  it('renders estado civil when provided', () => {
    render(<S2205AlteracaoCadastral dados={S2205_DADOS} />);
    expect(screen.getByText('Casado')).toBeInTheDocument();
  });

  it('renders escolaridade when provided', () => {
    render(<S2205AlteracaoCadastral dados={S2205_DADOS} />);
    expect(screen.getByText('Superior Completo')).toBeInTheDocument();
  });
});

describe('S2206AlteracaoContratual', () => {
  it('renders CPF', () => {
    render(<S2206AlteracaoContratual dados={S2206_DADOS} />);
    expect(screen.getByText(/555\.666\.777-88/)).toBeInTheDocument();
  });

  it('renders vigência da alteração', () => {
    render(<S2206AlteracaoContratual dados={S2206_DADOS} />);
    expect(screen.getByText('2024-04-01')).toBeInTheDocument();
  });

  it('renders novo cargo', () => {
    render(<S2206AlteracaoContratual dados={S2206_DADOS} />);
    expect(screen.getByText('Gerente de TI')).toBeInTheDocument();
  });

  it('renders Detalhamento das Mudanças label', () => {
    render(<S2206AlteracaoContratual dados={S2206_DADOS} />);
    expect(screen.getByText('Detalhamento das Mudanças')).toBeInTheDocument();
  });
});

describe('S2230Afastamento', () => {
  it('renders CPF', () => {
    render(<S2230Afastamento dados={S2230_DADOS} />);
    expect(screen.getByText(/999\.888\.777-66/)).toBeInTheDocument();
  });

  it('renders início do afastamento', () => {
    render(<S2230Afastamento dados={S2230_DADOS} />);
    expect(screen.getByText('2024-05-10')).toBeInTheDocument();
  });

  it('renders término do afastamento', () => {
    render(<S2230Afastamento dados={S2230_DADOS} />);
    expect(screen.getByText('2024-05-20')).toBeInTheDocument();
  });

  it('renders motivo code', () => {
    render(<S2230Afastamento dados={S2230_DADOS} />);
    expect(screen.getByText(/Cód: 01/)).toBeInTheDocument();
  });

  it('shows Em Aberto when no term date', () => {
    render(<S2230Afastamento dados={{ ...S2230_DADOS, dtTermAfast: undefined }} />);
    expect(screen.getByText('Em Aberto')).toBeInTheDocument();
  });
});
