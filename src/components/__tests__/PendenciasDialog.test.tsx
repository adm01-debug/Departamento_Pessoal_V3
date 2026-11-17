import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeartPulse } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { PendenciasDialog, type PendenciaItem } from '@/components/colaborador-detalhes/PendenciasDialog';

const ITEM: PendenciaItem = {
  icon: HeartPulse,
  texto: '1 ASO vencido',
  contexto: 'Pela NR-7 (PCMSO), o colaborador não deve permanecer em atividade sem um ASO válido.',
  itens: ['Periódico — validade venceu em 10/01/2020 (há 2503 dias)'],
  severidade: 'alta',
  onClick: vi.fn(),
};

describe('PendenciasDialog', () => {
  it('mostra o resumo, o contexto e o detalhe linha a linha', () => {
    render(<PendenciasDialog open onOpenChange={vi.fn()} pendencias={[ITEM]} />);
    expect(screen.getByText('1 ASO vencido')).toBeInTheDocument();
    expect(screen.getByText(/NR-7/)).toBeInTheDocument();
    expect(screen.getByText(/validade venceu em 10\/01\/2020/)).toBeInTheDocument();
  });

  it('severidade alta aparece como "Alta"', () => {
    render(<PendenciasDialog open onOpenChange={vi.fn()} pendencias={[ITEM]} />);
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('severidade media aparece como "Média"', () => {
    render(
      <PendenciasDialog open onOpenChange={vi.fn()} pendencias={[{ ...ITEM, severidade: 'media', onClick: vi.fn() }]} />
    );
    expect(screen.getByText('Média')).toBeInTheDocument();
  });

  it('sem pendências mostra a mensagem de vazio, não uma lista em branco', () => {
    render(<PendenciasDialog open onOpenChange={vi.fn()} pendencias={[]} />);
    expect(screen.getByText('Nenhuma pendência identificada.')).toBeInTheDocument();
  });

  // "Resolver agora" tem de FECHAR o diálogo antes de navegar: se só navegasse,
  // o véu ficaria sobre a aba de destino.
  it('"Resolver agora" fecha o diálogo e só então chama a ação', async () => {
    const onOpenChange = vi.fn();
    const onClick = vi.fn();
    render(<PendenciasDialog open onOpenChange={onOpenChange} pendencias={[{ ...ITEM, onClick }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Resolver agora' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
