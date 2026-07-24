import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  },
}));

import { DesligamentoChecklist } from '../desligamentos/DesligamentoChecklist';

const ALL_UNCHECKED = {
  checklist_comunicacao: false,
  checklist_documentacao: false,
  checklist_calculo_rescisao: false,
  checklist_revogacao_acessos: false,
  checklist_devolucao_equipamentos: false,
  checklist_esocial: false,
  checklist_homologacao: false,
  checklist_pagamento: false,
};

const ALL_CHECKED = Object.fromEntries(
  Object.keys(ALL_UNCHECKED).map((k) => [k, true])
);

describe('DesligamentoChecklist', () => {
  it('renders progress counter 0/8 when all unchecked', () => {
    render(<DesligamentoChecklist desligamento={ALL_UNCHECKED} />);
    expect(screen.getByText('0/8')).toBeInTheDocument();
  });

  it('renders progress counter 8/8 when all checked', () => {
    render(<DesligamentoChecklist desligamento={ALL_CHECKED} />);
    expect(screen.getByText('8/8')).toBeInTheDocument();
  });

  it('renders all 8 checklist items', () => {
    render(<DesligamentoChecklist desligamento={ALL_UNCHECKED} />);
    expect(screen.getByText('Comunicação ao colaborador')).toBeInTheDocument();
    expect(screen.getByText('Documentação preparada')).toBeInTheDocument();
    expect(screen.getByText('Envio eSocial (S-2299)')).toBeInTheDocument();
    expect(screen.getByText('Pagamento efetuado')).toBeInTheDocument();
  });

  it('calls onToggle with correct key when item clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DesligamentoChecklist
        desligamento={ALL_UNCHECKED}
        onToggle={onToggle}
      />
    );
    await user.click(screen.getByText('Comunicação ao colaborador'));
    expect(onToggle).toHaveBeenCalledWith('checklist_comunicacao', true);
  });

  it('does not call onToggle when readOnly', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DesligamentoChecklist
        desligamento={ALL_UNCHECKED}
        onToggle={onToggle}
        readOnly
      />
    );
    await user.click(screen.getByText('Comunicação ao colaborador'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows progress text', () => {
    render(<DesligamentoChecklist desligamento={{ ...ALL_UNCHECKED, checklist_comunicacao: true, checklist_pagamento: true }} />);
    expect(screen.getByText('2/8')).toBeInTheDocument();
  });
});
