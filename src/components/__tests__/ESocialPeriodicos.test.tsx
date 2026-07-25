import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/utils/piiMask', () => ({
  maskCpfDisplay: vi.fn((cpf: string) => '***.' + (cpf || '').slice(-6)),
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

import { S1200Remuneracao, S1210Pagamentos } from '../esocial/Periodicos';

const DADOS_S1200 = {
  cpfTrab: '12345678900',
  perApur: '2024-07',
  dmDev: [
    {
      ideDmDev: 'DM-001',
      infoPerApur: {
        ideEstabLot: [
          {
            detVerbas: [
              { codRubr: '0001', vrRubr: 5000 },
              { codRubr: '0002', vrRubr: 400 },
            ],
          },
        ],
      },
    },
  ],
};

const DADOS_S1210 = {
  cpfTrab: '12345678900',
  infoPgto: [
    { dtPgto: '2024-07-05', tpPgto: '2', perRef: '2024-07', vrLiq: 4200 },
  ],
};

describe('S1200Remuneracao', () => {
  it('renders Trabalhador label', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText('Trabalhador')).toBeInTheDocument();
  });

  it('renders Período Apuração label', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText('Período Apuração')).toBeInTheDocument();
  });

  it('renders perApur value', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText('2024-07')).toBeInTheDocument();
  });

  it('renders rubrica codes', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText('0001')).toBeInTheDocument();
  });

  it('renders demonstrativo id', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText(/DM-001/i)).toBeInTheDocument();
  });

  it('handles empty dmDev array', () => {
    const { container } = render(<S1200Remuneracao dados={{ cpfTrab: '123', perApur: '2024-07', dmDev: [] }} />);
    expect(container).toBeInTheDocument();
  });

  it('renders Cód. Rubrica table header', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText(/Cód\. Rubrica/i)).toBeInTheDocument();
  });

  it('renders Valor Informado table header', () => {
    render(<S1200Remuneracao dados={DADOS_S1200} />);
    expect(screen.getByText(/Valor Informado/i)).toBeInTheDocument();
  });
});

describe('S1210Pagamentos', () => {
  it('renders Rendimentos Pagos header', () => {
    render(<S1210Pagamentos dados={DADOS_S1210} />);
    expect(screen.getByText(/Rendimentos Pagos/i)).toBeInTheDocument();
  });

  it('renders payment date', () => {
    render(<S1210Pagamentos dados={DADOS_S1210} />);
    expect(screen.getByText(/2024-07-05/)).toBeInTheDocument();
  });

  it('renders empty state for no payments', () => {
    const { container } = render(<S1210Pagamentos dados={{ cpfTrab: '123', infoPgto: [] }} />);
    expect(container).toBeInTheDocument();
  });
});
