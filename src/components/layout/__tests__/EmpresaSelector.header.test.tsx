/**
 * ============================================================================
 * SELETOR DE EMPRESA — variante `header` (chip do topo em telas < lg)
 *
 * Contrato que este teste trava:
 *   1. no header o chip é COMPACTO (sem o padding externo `px-3 pt-3 pb-1` da
 *      sidebar, que fazia o chip estourar a altura do header e gerar rolagem
 *      horizontal na página inteira);
 *   2. no header o disclosure é OVERLAY (`absolute` + `top-full`), ou seja, não
 *      entra no fluxo — abrir a lista NÃO empurra nem aumenta o header;
 *   3. na sidebar continua sendo o disclosure INLINE original (`height: auto`,
 *      sem `absolute`), que empurra os itens de baixo;
 *   4. trocar de empresa dispara `trocarEmpresa` e fecha a lista;
 *   5. com uma única empresa o chip não abre nada (não é ação sem efeito).
 * ============================================================================
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EmpresaSelector } from '../EmpresaSelector';

const EMPRESA_ATUAL = { id: 'e1', nome_fantasia: 'Promo Brindes (Demo)', razao_social: 'Promo Brindes LTDA', cnpj: null };

const VINCULOS = [
  { empresa_id: 'e1', empresa: { nome_fantasia: 'Promo Brindes (Demo)', razao_social: 'Promo Brindes LTDA' } },
  { empresa_id: 'e2', empresa: { nome_fantasia: 'Filial Norte (Demo)', razao_social: 'Filial Norte LTDA' } },
];

function renderizar(props: Partial<Parameters<typeof EmpresaSelector>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EmpresaSelector
        collapsed={false}
        empresaAtual={EMPRESA_ATUAL}
        userEmpresas={VINCULOS}
        temMultiplasEmpresas
        trocarEmpresa={vi.fn()}
        variant="header"
        {...props}
      />
    </MemoryRouter>
  );
}

/** Sobe do item da lista até o container animado do disclosure. */
function containerDoMenu(item: HTMLElement): HTMLElement {
  const alvo = item.closest('div.overflow-hidden');
  expect(alvo, 'container do disclosure não encontrado').not.toBeNull();
  return alvo as HTMLElement;
}

describe('EmpresaSelector — variante header', () => {
  it('usa o chip compacto, sem o padding externo da sidebar', () => {
    const { container } = renderizar();

    const chip = screen.getByRole('button', { name: /Empresa: Promo Brindes/i });
    expect(chip).toHaveClass('gap-2', 'px-2', 'py-1');

    // O wrapper do chip é quem levava `px-3 pt-3 pb-1` na sidebar.
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toContain('px-3');
    expect(wrapper.className).toContain('relative');
  });

  it('abre a lista como OVERLAY (fora do fluxo) e não como disclosure inline', () => {
    renderizar();

    const chip = screen.getByRole('button', { name: /Empresa: Promo Brindes/i });
    expect(chip).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');

    const opcao = screen.getByText('Filial Norte (Demo)');
    const menu = containerDoMenu(opcao);
    expect(menu).toHaveClass('absolute', 'top-full', 'z-50');
    // No overlay o próprio container já é a moldura: o miolo traz só o padding,
    // sem a segunda moldura (`rounded-xl border ... bg-sidebar-accent/40`) da
    // sidebar — que ficaria "caixa dentro de caixa" flutuando no header.
    const miolo = menu.firstElementChild as HTMLElement;
    expect(miolo).toHaveClass('p-1');
    expect(miolo.className).not.toContain('bg-sidebar-accent/40');
  });

  it('troca de empresa e fecha a lista', async () => {
    const trocarEmpresa = vi.fn();
    renderizar({ trocarEmpresa });

    const chip = screen.getByRole('button', { name: /Empresa: Promo Brindes/i });
    fireEvent.click(chip);
    fireEvent.click(screen.getByText('Filial Norte (Demo)'));

    expect(trocarEmpresa).toHaveBeenCalledWith('e2');
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    // A saída é animada (AnimatePresence): o item permanece no DOM enquanto a
    // animação roda e só depois é desmontado.
    await waitFor(() => expect(screen.queryByText('Filial Norte (Demo)')).toBeNull());
  });

  it('com uma única empresa o chip não abre nada', () => {
    renderizar({
      temMultiplasEmpresas: false,
      userEmpresas: [VINCULOS[0]],
      trocarEmpresa: vi.fn(),
    });

    const chip = screen.getByRole('button', { name: /Empresa: Promo Brindes/i });
    fireEvent.click(chip);

    expect(chip).toHaveAttribute('aria-expanded', 'false');
    // Sem chevron: não há indicação visual de lista.
    expect(chip.querySelectorAll('svg')).toHaveLength(1);
  });
});

describe('EmpresaSelector — variante sidebar (padrão)', () => {
  it('mantém o disclosure INLINE que empurra o conteúdo', () => {
    render(
      <MemoryRouter>
        <EmpresaSelector
          collapsed={false}
          empresaAtual={EMPRESA_ATUAL}
          userEmpresas={VINCULOS}
          temMultiplasEmpresas
          trocarEmpresa={vi.fn()}
        />
      </MemoryRouter>
    );

    const chip = screen.getByRole('button', { name: /Empresa: Promo Brindes/i });
    expect(chip).toHaveClass('gap-2.5', 'px-3', 'py-2.5');

    fireEvent.click(chip);
    const menu = containerDoMenu(screen.getByText('Filial Norte (Demo)'));
    expect(menu).not.toHaveClass('absolute');
    expect(menu).toHaveClass('overflow-hidden');
  });
});
