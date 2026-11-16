import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TreinamentosTabsList } from '../TreinamentosTabsList';

const ABAS = [
  { value: 'treinamentos', label: 'Treinamentos' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'trilhas', label: 'Trilhas' },
  { value: 'inscricoes', label: 'Inscrições' },
  { value: 'turmas', label: 'Turmas / Instâncias' },
  { value: 'certificados', label: 'Certificados' },
] as const;

/**
 * ============================================================================
 * TABLIST DE TREINAMENTOS — contrato visual e funcional.
 *
 * A referência é a TabList do Dashboard Executivo: lista plana, sem fundo
 * segmentado nem fundo individual na aba ativa, divisória inferior contínua e
 * indicador Lime de 2 px ocupando toda a região ativa. Aqui garantimos também
 * que as seis abas, a seleção e a navegação por teclado continuam funcionando.
 * ============================================================================
 */

function Harness({ inicial = 'treinamentos' }: { inicial?: string }) {
  const [aba, setAba] = useState(inicial);

  return (
    <Tabs value={aba} onValueChange={setAba}>
      <TreinamentosTabsList value={aba} onValueChange={setAba} />
      {ABAS.map(({ value, label }) => (
        <TabsContent key={value} value={value}>
          Painel {label}
        </TabsContent>
      ))}
    </Tabs>
  );
}

describe('TreinamentosTabsList', () => {
  it('preserva as seis abas, na ordem e com os rótulos existentes', () => {
    render(<Harness />);

    expect(screen.getAllByRole('tab').map((aba) => aba.textContent)).toEqual([
      'Treinamentos',
      'Catálogo',
      'Trilhas',
      'Inscrições',
      'Turmas / Instâncias',
      'Certificados',
    ]);

    for (const { label } of ABAS) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('usa lista plana: sem fundo/borda de container e sem fundo na aba ativa', () => {
    const { container } = render(<Harness />);
    const lista = container.querySelector('[data-treinamentos-tablist]') as HTMLElement;
    const ativa = screen.getByRole('tab', { name: 'Treinamentos' });

    expect(lista).toHaveClass(
      'grid',
      'w-full',
      'grid-cols-2',
      'justify-start',
      'sm:grid-cols-3',
      'border-b',
      'border-border/30',
      'bg-transparent',
      'rounded-none',
      'xl:grid-cols-6'
    );
    expect(lista.className).not.toMatch(/rounded-xl|bg-card|bg-muted|\bp-1\b/);

    expect(ativa).toHaveAttribute('data-state', 'active');
    expect(ativa).toHaveClass('data-[state=active]:bg-transparent', 'data-[state=active]:text-foreground');
    expect(ativa.className).not.toMatch(/data-\[state=active\]:bg-background/);
    expect(ativa).toHaveClass('text-muted-foreground');
  });

  it('renderiza um único indicador Lime de 2 px, de ponta a ponta da aba', () => {
    const { container } = render(<Harness />);
    const indicadores = container.querySelectorAll('[data-aba-indicador]');

    expect(indicadores).toHaveLength(1);
    expect(indicadores[0]).toHaveClass('absolute', 'inset-x-0', '-bottom-px', 'h-0.5', 'rounded-full', 'bg-primary');
  });

  it('troca a aba ativa, o painel e mantém o indicador na aba selecionada', async () => {
    const { container } = render(<Harness />);

    await userEvent.click(screen.getByRole('tab', { name: 'Catálogo' }));

    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: 'Treinamentos' })).toHaveAttribute('data-state', 'inactive');
    expect(screen.getByText('Painel Catálogo')).toBeVisible();
    expect(container.querySelector('[data-aba-indicador]')).not.toBeNull();
    expect(screen.getByRole('tab', { name: 'Catálogo' }).querySelector('[data-aba-indicador]')).not.toBeNull();
  });

  it('navega por teclado com as setas, preservando a semântica de tablist', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('tab', { name: 'Treinamentos' }));
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Painel Catálogo')).toBeVisible();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Certificados' })).toHaveAttribute('data-state', 'active');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Treinamentos' })).toHaveAttribute('data-state', 'active');
  });
});
