/**
 * AppPagination — padrão único de paginação do sistema.
 *
 * Cobre o contrato de APRESENTAÇÃO do componente: sequência dos controles,
 * destaque da página ativa (verde-lima sólido), estado das setas nos extremos,
 * seletor só quando há handler, recorte de página inexistente e as emissões de
 * evento. A paginação em si (consultas, filtros, fatias) continua nas telas.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppPagination } from '../ui/app-pagination';

const montar = (props: Partial<React.ComponentProps<typeof AppPagination>> = {}) =>
  render(
    <AppPagination
      page={1}
      total={100}
      pageSize={25}
      onPageChange={vi.fn()}
      {...props}
    />
  );

const anterior = () => screen.getByLabelText('Página anterior');
const proxima = () => screen.getByLabelText('Próxima página');
const paginaAtiva = () => screen.getByLabelText(/^Página \d+$/);

describe('AppPagination', () => {
  it('mostra a página atual em verde-lima sólido com 28 × 28 px', () => {
    montar({ page: 3 });
    const ativa = paginaAtiva();
    expect(ativa).toHaveTextContent('3');
    expect(ativa).toHaveAttribute('aria-current', 'page');
    expect(ativa.className).toContain('bg-primary');
    expect(ativa.className).toContain('text-primary-foreground');
    expect(ativa.className).toContain('h-7');
    expect(ativa.className).toContain('w-7');
  });

  it('não renderiza o seletor sem handler de troca de quantidade', () => {
    montar();
    expect(screen.queryByLabelText('Linhas por página')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('renderiza "Linhas por página" com o valor atual e emite a troca', () => {
    const onPageSizeChange = vi.fn();
    montar({ pageSize: 25, pageSizeOptions: [10, 25, 50], onPageSizeChange });
    const seletor = screen.getByLabelText('Linhas por página');
    expect(screen.getByText('Linhas por página')).toBeInTheDocument();
    expect(seletor).toHaveTextContent('25');
    expect(seletor.className).toContain('h-7');
    expect(seletor.className).toContain('w-[64px]');
  });

  it('acrescenta o valor corrente às opções quando ele não está na lista', () => {
    // 15 por página (default herdado de uma API) tem de aparecer no seletor.
    montar({ pageSize: 15, pageSizeOptions: [10, 25, 50], onPageSizeChange: vi.fn() });
    expect(screen.getByLabelText('Linhas por página')).toHaveTextContent('15');
  });

  it('navega para anterior/próxima emitindo os eventos', () => {
    const onPageChange = vi.fn();
    montar({ page: 2, onPageChange });
    fireEvent.click(anterior());
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(proxima());
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('desabilita as setas na primeira e na última página', () => {
    const { unmount } = montar({ page: 1 });
    expect(anterior()).toBeDisabled();
    expect(proxima()).toBeEnabled();
    unmount();

    montar({ page: 4 }); // 100 ÷ 25 = 4 páginas
    expect(anterior()).toBeEnabled();
    expect(proxima()).toBeDisabled();
  });

  it('com uma única página as duas setas ficam desabilitadas', () => {
    montar({ page: 1, total: 3, pageSize: 25 });
    expect(anterior()).toBeDisabled();
    expect(proxima()).toBeDisabled();
    expect(paginaAtiva()).toHaveTextContent('1');
  });

  it('lista vazia: página 1, setas desabilitadas e sem erro de divisão', () => {
    montar({ page: 1, total: 0, pageSize: 25 });
    expect(paginaAtiva()).toHaveTextContent('1');
    expect(anterior()).toBeDisabled();
    expect(proxima()).toBeDisabled();
  });

  it('recorta uma página fora da faixa (nunca exibe página inexistente)', () => {
    // 100 ÷ 25 = 4 páginas: pedir a 9 exibe a 4 e desabilita o "próxima".
    montar({ page: 9 });
    expect(paginaAtiva()).toHaveTextContent('4');
    expect(proxima()).toBeDisabled();
    expect(anterior()).toBeEnabled();
  });

  it('desabilita os controles durante o carregamento', () => {
    montar({ page: 2, isLoading: true });
    expect(anterior()).toBeDisabled();
    expect(proxima()).toBeDisabled();
  });

  it('mantém as setas acessíveis por teclado (botões nativos com rótulo)', () => {
    montar({ page: 2 });
    [anterior(), proxima()].forEach((botao) => {
      expect(botao.tagName).toBe('BUTTON');
      expect(botao).not.toHaveAttribute('tabindex', '-1');
      expect(botao).toHaveAttribute('aria-label');
    });
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
  });
});
