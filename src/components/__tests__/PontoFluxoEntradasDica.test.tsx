import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => {
  // Os props de animação não fazem sentido no DOM do teste (o `motion.*` vira
  // uma tag comum); descartá-los evita warning de atributo desconhecido.
  const propsDom = ({ initial: _i, animate: _a, transition: _t, ...props }: any) => props;
  return {
    motion: { div: ({ children, ...props }: any) => <div {...propsDom(props)}>{children}</div> },
    useReducedMotion: () => false,
  };
});

import { DicaFluxoEntradas } from '../ponto/PontoFluxoEntradasDica';

/**
 * DICA (tooltip) do gráfico "Fluxo de Entradas por Horário".
 *
 * O que este teste trava: o conteúdo pedido (intervalo em destaque, entradas,
 * participação), o percentual CALCULADO (nunca fixo), a marca de pico só no
 * horário de maior volume e o acabamento por tokens do sistema.
 */
describe('dica do Fluxo de Entradas por Horário', () => {
  it('mostra intervalo, entradas e participação do horário', () => {
    render(<DicaFluxoEntradas hour="08:00" count={6} total={24} ehPico reduzido={false} />);

    const dica = screen.getByRole('tooltip');
    expect(dica).toHaveTextContent('08:00 – 08:59');
    expect(dica).toHaveTextContent('Entradas registradas');
    expect(dica).toHaveTextContent('Participação no total');
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Pico de movimentação')).toBeInTheDocument();
  });

  it('o percentual é derivado do total exibido — mesmo horário, totais diferentes', () => {
    const { unmount } = render(<DicaFluxoEntradas hour="08:00" count={6} total={24} ehPico reduzido={false} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
    unmount();

    // 6 de 12 = 50%: nada é fixado na tela.
    render(<DicaFluxoEntradas hour="08:00" count={6} total={12} ehPico reduzido={false} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('não marca pico em horário comum', () => {
    render(<DicaFluxoEntradas hour="09:00" count={4} total={24} ehPico={false} reduzido={false} />);
    expect(screen.getByText('09:00 – 09:59')).toBeInTheDocument();
    expect(screen.queryByText('Pico de movimentação')).toBeNull();
  });

  it('total zero não vira NaN nem divisão inválida', () => {
    render(<DicaFluxoEntradas hour="12:00" count={0} total={0} ehPico={false} reduzido={false} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('usa só tokens do sistema — sem cor, fonte ou posição fixa novas', () => {
    const { container } = render(<DicaFluxoEntradas hour="08:00" count={6} total={24} ehPico reduzido={false} />);
    const caixa = container.firstElementChild as HTMLElement;
    expect(caixa.className).toContain('bg-popover');
    expect(caixa.className).toContain('border-border');
    expect(caixa.className).toContain('rounded-lg');
    // A caixa nunca rouba o hover da barra.
    expect(caixa.className).toContain('pointer-events-none');
    // A posição é escrita pelo gráfico (left/top medidos), não pelo componente.
    expect(caixa.style.left).toBe('');
    expect(caixa.style.top).toBe('');
  });
});
