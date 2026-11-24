/**
 * ============================================================================
 * SELETOR DE COR — dark, sem UI nativa, com campo hexadecimal editável.
 * ============================================================================
 *
 * O cadastro de turnos não pode mais depender do `input type="color"` (janela
 * clara do sistema operacional). Estes testes travam o contrato de valor:
 *
 *   1. o gatilho mostra a cor atual e NÃO é um `input[type=color]`;
 *   2. a paleta publica `#rrggbb` normalizado e marca a amostra ativa;
 *   3. o campo hexadecimal publica com 6 dígitos, consolida a forma curta no
 *      blur e ignora lixo;
 *   4. mudar a prop por fora (abrir outro turno) ressincroniza o seletor.
 *
 * ── POR QUE OS ASSERTES LEEM `#turno-cor` PELO ID, NÃO POR `getByRole` ──────
 * O painel é um `Popover modal` (precisa ser: é o que pausa a armadilha de foco
 * do diálogo e faz Esc fechar só o painel). Enquanto ele está aberto o Radix
 * esconde o resto da página do leitor de tela (`aria-hidden`), então o próprio
 * gatilho sai da árvore acessível — por isso a cor publicada é conferida no
 * `aria-label` do botão e, nos casos de acessibilidade, com o painel fechado.
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { SeletorCor } from '../SeletorCor';

/**
 * Envelope CONTROLADO — é assim que o `DialogoTurno` usa a peça: o formulário é
 * dono do `cor` e devolve o novo valor para o seletor. Sem isso o seletor não
 * teria como refletir a escolha (é componente controlado, como o `Input`).
 */
function Controlado({ inicial = '#22c55e', onValor }: { inicial?: string; onValor?: (cor: string) => void }) {
  const [cor, setCor] = useState(inicial);
  return (
    <SeletorCor
      id="turno-cor"
      valor={cor}
      onValor={(nova) => {
        onValor?.(nova);
        setCor(nova);
      }}
    />
  );
}

function renderizar(valor = '#22c55e') {
  const onValor = vi.fn();
  const { rerender } = render(<SeletorCor id="turno-cor" valor={valor} onValor={onValor} />);
  return { onValor, rerender };
}

/** `aria-label` do gatilho (o que o formulário está mostrando). */
const rotuloGatilho = () => document.getElementById('turno-cor')?.getAttribute('aria-label');

describe('SeletorCor', () => {
  it('mostra a cor atual e não usa o seletor nativo do navegador', () => {
    renderizar('#3b82f6');

    const gatilho = screen.getByRole('button', { name: /Cor do turno: #3b82f6/ });
    expect(gatilho).toHaveTextContent('#3b82f6');
    expect(gatilho).toHaveAttribute('id', 'turno-cor');
    expect(document.querySelector('input[type="color"]')).toBeNull();
  });

  it('publica a cor normalizada ao escolher um atalho da paleta', () => {
    const onValor = vi.fn();
    render(<Controlado onValor={onValor} />);

    fireEvent.click(screen.getByRole('button', { name: /Cor do turno/ }));

    const atalho = screen.getByRole('button', { name: 'Usar a cor #8b5cf6' });
    fireEvent.click(atalho);

    expect(onValor).toHaveBeenCalledWith('#8b5cf6');
    expect(atalho).toHaveAttribute('aria-pressed', 'true');
    expect(rotuloGatilho()).toBe('Cor do turno: #8b5cf6');
  });

  it('publica hexadecimal completo na digitação, consolida o curto no blur e ignora lixo', () => {
    const { onValor } = renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Cor do turno/ }));
    const campo = screen.getByLabelText('Código hexadecimal da cor');

    fireEvent.change(campo, { target: { value: '#10b981' } });
    expect(onValor).toHaveBeenLastCalledWith('#10b981');

    // Forma curta NÃO é aplicada a cada tecla: `#1e8` viraria `#11ee88` no meio
    // da digitação de `#1e88e5`. Ela é consolidada no Enter/blur.
    onValor.mockClear();
    fireEvent.change(campo, { target: { value: 'abc' } });
    expect(onValor).not.toHaveBeenCalled();
    fireEvent.blur(campo);
    expect(onValor).toHaveBeenLastCalledWith('#aabbcc');

    onValor.mockClear();
    fireEvent.change(campo, { target: { value: 'azul' } });
    expect(onValor).not.toHaveBeenCalled();
  });

  it('ressincroniza quando a cor chega de fora (outro turno no modal)', () => {
    const { rerender, onValor } = renderizar('#22c55e');

    rerender(<SeletorCor id="turno-cor" valor="#ef4444" onValor={onValor} />);

    expect(screen.getByRole('button', { name: /Cor do turno: #ef4444/ })).toHaveTextContent('#ef4444');
    expect(onValor).not.toHaveBeenCalled();
  });

  it('expõe área de saturação e faixa de matiz como sliders acessíveis', () => {
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: /Cor do turno/ }));

    expect(screen.getByRole('slider', { name: 'Saturação e brilho' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Matiz' })).toBeInTheDocument();
  });
});
