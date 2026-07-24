import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ESocialTimeline } from '../esocial/ESocialTimeline';

const EVENTOS = [
  {
    id: '1',
    tipo_evento: 'S-2200',
    status: 'pendente',
    created_at: '2024-07-01T10:00:00',
    updated_at: '2024-07-01T10:00:00',
    data_envio: null,
    protocolo: null,
    erros: null,
  },
  {
    id: '2',
    tipo_evento: 'S-2299',
    status: 'enviado',
    created_at: '2024-07-02T09:00:00',
    updated_at: '2024-07-02T09:30:00',
    data_envio: '2024-07-02T09:30:00',
    protocolo: 'PROTO-12345',
    erros: null,
  },
];

describe('ESocialTimeline', () => {
  it('shows empty state when no eventos', () => {
    render(<ESocialTimeline eventos={[]} />);
    expect(screen.getByText('Sem histórico recente')).toBeInTheDocument();
    expect(screen.getByText('Gere ou envie eventos para ver a timeline.')).toBeInTheDocument();
  });

  it('renders created event labels', () => {
    render(<ESocialTimeline eventos={EVENTOS} />);
    expect(screen.getByText('Evento S-2200 gerado')).toBeInTheDocument();
    expect(screen.getByText('Evento S-2299 gerado')).toBeInTheDocument();
  });

  it('renders transmission success label for enviado status', () => {
    render(<ESocialTimeline eventos={EVENTOS} />);
    expect(screen.getByText('Sucesso na transmissão S-2299')).toBeInTheDocument();
  });

  it('renders protocol for sent evento', () => {
    render(<ESocialTimeline eventos={EVENTOS} />);
    expect(screen.getByText(/Protocolo: PROTO-12345/)).toBeInTheDocument();
  });

  it('renders failure label for erro status', () => {
    const erroEvento = [
      {
        id: '3',
        tipo_evento: 'S-1200',
        status: 'erro',
        created_at: '2024-07-03T08:00:00',
        updated_at: '2024-07-03T08:05:00',
        data_envio: '2024-07-03T08:05:00',
        protocolo: null,
        erros: { mensagem: 'Timeout no webservice' },
      },
    ];
    render(<ESocialTimeline eventos={erroEvento} />);
    expect(screen.getByText('Falha no envio S-1200')).toBeInTheDocument();
  });
});
