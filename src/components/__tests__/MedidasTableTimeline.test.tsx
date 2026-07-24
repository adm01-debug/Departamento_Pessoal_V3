import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    tr: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  },
}));

import { MedidasTable } from '../medidas-disciplinares/MedidasTable';
import { MedidasTimeline } from '../medidas-disciplinares/MedidasTimeline';

const MEDIDAS = [
  {
    id: '1',
    tipo: 'advertencia_verbal',
    data_ocorrencia: '2024-07-01T08:00:00',
    descricao: 'Atraso frequente',
    colaborador: { nome_completo: 'João Silva' },
    colaborador_ciente: false,
    recusa_assinatura: false,
    base_legal: null,
    testemunhas: null,
    numero_ocorrencia: 1,
  },
  {
    id: '2',
    tipo: 'suspensao',
    data_ocorrencia: '2024-06-15T08:00:00',
    descricao: 'Reincidência em faltas',
    colaborador: { nome_completo: 'Maria Santos' },
    colaborador_ciente: true,
    recusa_assinatura: false,
    base_legal: null,
    testemunhas: null,
    numero_ocorrencia: 2,
  },
];

describe('MedidasTable', () => {
  it('shows empty state when no data (desktop)', () => {
    render(<MedidasTable data={[]} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getByText('Nenhuma medida disciplinar encontrada')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<MedidasTable data={MEDIDAS} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('calls onExcluir when delete button clicked', async () => {
    const user = userEvent.setup();
    const onExcluir = vi.fn();
    render(<MedidasTable data={MEDIDAS} onMarcarCiencia={vi.fn()} onExcluir={onExcluir} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await user.click(deleteButtons[0]);
    expect(onExcluir).toHaveBeenCalledWith('1');
  });
});

describe('MedidasTimeline', () => {
  it('returns nothing when medidas is empty', () => {
    const { container } = render(<MedidasTimeline medidas={[]} onMarcarCiencia={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Linha do Tempo title', () => {
    render(<MedidasTimeline medidas={MEDIDAS} onMarcarCiencia={vi.fn()} />);
    expect(screen.getByText(/Linha do Tempo/)).toBeInTheDocument();
  });

  it('renders tipo labels for each medida', () => {
    render(<MedidasTimeline medidas={MEDIDAS} onMarcarCiencia={vi.fn()} />);
    expect(screen.getByText('Adv. Verbal')).toBeInTheDocument();
    expect(screen.getByText('Suspensão')).toBeInTheDocument();
  });
});
