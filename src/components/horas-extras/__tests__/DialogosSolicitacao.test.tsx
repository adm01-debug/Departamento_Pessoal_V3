import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NovaSolicitacaoDialog } from '../NovaSolicitacaoDialog';
import { SolicitacaoDetalhesDialog } from '../SolicitacaoDetalhesDialog';
import type { SolicitacaoHoraExtra } from '../horasExtrasComum';

function linha(over: Partial<SolicitacaoHoraExtra> = {}): SolicitacaoHoraExtra {
  return {
    id: 'sol-1',
    data: '2026-10-20',
    horas_solicitadas: 2.5,
    motivo: 'Fechamento de mês',
    status: 'pendente',
    created_at: '2026-10-18T12:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Financeiro' },
    ...over,
  };
}

const COLABORADORES = [{ id: 'c1', nome_completo: 'Ana Souza' }];

describe('NovaSolicitacaoDialog', () => {
  it('abre com o formulário vazio e o envio bloqueado', () => {
    render(<NovaSolicitacaoDialog open onOpenChange={vi.fn()} colaboradores={COLABORADORES} onCriar={vi.fn()} />);

    expect(screen.getByLabelText('Colaborador *')).toBeInTheDocument();
    expect(screen.getByLabelText('Data *')).toHaveValue('');
    expect(screen.getByLabelText('Horas *')).toHaveValue(null);
    expect(screen.getByLabelText('Motivo *')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Criar solicitação' })).toBeDisabled();
  });

  it('mostra a equivalência em h/min enquanto as horas são digitadas', () => {
    render(<NovaSolicitacaoDialog open onOpenChange={vi.fn()} colaboradores={COLABORADORES} onCriar={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Horas *'), { target: { value: '2.5' } });

    expect(screen.getByText('Equivale a 2h30')).toBeInTheDocument();
  });

  it('cancelar fecha e descarta o rascunho (não reabre com dado antigo)', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <NovaSolicitacaoDialog open onOpenChange={onOpenChange} colaboradores={COLABORADORES} onCriar={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText('Motivo *'), { target: { value: 'Inventário' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <NovaSolicitacaoDialog open={false} onOpenChange={onOpenChange} colaboradores={COLABORADORES} onCriar={vi.fn()} />
    );
    rerender(
      <NovaSolicitacaoDialog open onOpenChange={onOpenChange} colaboradores={COLABORADORES} onCriar={vi.fn()} />
    );

    expect(screen.getByLabelText('Motivo *')).toHaveValue('');
  });
});

describe('SolicitacaoDetalhesDialog', () => {
  it('lê o registro completo e oferece decidir enquanto pendente', () => {
    const s = linha();
    const onAprovar = vi.fn();
    const onRejeitar = vi.fn();
    render(
      <SolicitacaoDetalhesDialog
        solicitacao={s}
        open
        onOpenChange={vi.fn()}
        onAprovar={onAprovar}
        onRejeitar={onRejeitar}
      />
    );

    expect(screen.getByText('Detalhes da solicitação')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('20/10/2026')).toBeInTheDocument();
    expect(screen.getByText('2h30')).toBeInTheDocument();
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Aprovar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Rejeitar/i }));

    expect(onAprovar).toHaveBeenCalledWith(s);
    expect(onRejeitar).toHaveBeenCalledWith(s);
  });

  it('já decidida: mostra a observação do aprovador e esconde as ações', () => {
    const s = linha({
      status: 'rejeitada',
      aprovado_em: '2026-10-21T12:00:00.000Z',
      observacoes_aprovador: 'Fora da escala',
    });
    render(<SolicitacaoDetalhesDialog solicitacao={s} open onOpenChange={vi.fn()} />);

    expect(screen.getByText('Decisão')).toBeInTheDocument();
    expect(screen.getByText('Fora da escala')).toBeInTheDocument();
    expect(screen.getByText('Decidida em 21/10/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rejeitar/i })).not.toBeInTheDocument();
  });

  it('"Fechar" avisa o dono do estado', () => {
    const onOpenChange = vi.fn();
    render(<SolicitacaoDetalhesDialog solicitacao={linha()} open onOpenChange={onOpenChange} />);

    // Dois botões respondem por "Fechar": o X do Radix (só ícone) e o do rodapé
    // (texto). O do rodapé é o que não tem `svg` dentro.
    const fechar = screen.getAllByRole('button', { name: 'Fechar' }).find((b) => !b.querySelector('svg'));
    expect(fechar).toBeDefined();

    fireEvent.click(fechar!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
