import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stethoscope } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ProximosEventosDialog, type EventoDetalhado } from '@/components/colaborador-detalhes/ProximosEventosDialog';

const EVENTO: EventoDetalhado = {
  icon: Stethoscope,
  titulo: 'Vencimento do ASO',
  categoria: 'SST',
  dataFormatada: '20/12/2026',
  quandoLabel: 'em 33 dias',
  badge: { label: '33 dias', tone: 'warning' },
  contexto: 'Pela NR-7 (PCMSO), o exame precisa ser renovado antes de vencer.',
  onClick: vi.fn(),
};

describe('ProximosEventosDialog', () => {
  it('mostra título, categoria, data, quando e contexto', () => {
    render(<ProximosEventosDialog open onOpenChange={vi.fn()} eventos={[EVENTO]} />);
    expect(screen.getByText('Vencimento do ASO')).toBeInTheDocument();
    expect(screen.getByText(/SST · 20\/12\/2026 · em 33 dias/)).toBeInTheDocument();
    expect(screen.getByText(/NR-7/)).toBeInTheDocument();
  });

  it('mostra o badge que vem do hook, não um fixo', () => {
    render(
      <ProximosEventosDialog
        open
        onOpenChange={vi.fn()}
        eventos={[{ ...EVENTO, badge: { label: 'hoje', tone: 'warning' }, onClick: vi.fn() }]}
      />
    );
    expect(screen.getByText('hoje')).toBeInTheDocument();
    expect(screen.queryByText('33 dias')).not.toBeInTheDocument();
  });

  it('sem quandoLabel não deixa um separador solto', () => {
    render(
      <ProximosEventosDialog open onOpenChange={vi.fn()} eventos={[{ ...EVENTO, quandoLabel: '', onClick: vi.fn() }]} />
    );
    expect(screen.getByText('SST · 20/12/2026')).toBeInTheDocument();
  });

  it('sem evento mostra a mensagem de vazio', () => {
    render(<ProximosEventosDialog open onOpenChange={vi.fn()} eventos={[]} />);
    expect(screen.getByText('Nenhum evento futuro identificado.')).toBeInTheDocument();
  });

  // Igual ao PendenciasDialog: precisa FECHAR antes de navegar, senão o véu
  // fica sobre a aba de destino.
  it('"Ver detalhes" fecha o diálogo e então chama a ação', async () => {
    const onOpenChange = vi.fn();
    const onClick = vi.fn();
    render(<ProximosEventosDialog open onOpenChange={onOpenChange} eventos={[{ ...EVENTO, onClick }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
