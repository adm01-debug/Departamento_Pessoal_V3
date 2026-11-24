/**
 * CRUD DE PERFIL DE KIT (FASE 7) — o botão "Novo Perfil de Kit" era decorativo;
 * agora existe formulário real sobre `public.onboarding_kits` (nome + itens +
 * ativo). Aqui testamos o CONTRATO do formulário: normalização dos itens,
 * validação e o payload que chega ao `onSalvar`.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}>
      switch
    </button>
  ),
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));
vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));

import { KitOnboardingDialog, itensParaTexto, textoParaItens } from '@/components/admissoes/KitOnboardingDialog';

describe('KitOnboardingDialog — normalização', () => {
  it('quebra os itens por linha, apara espaços e descarta linhas vazias', () => {
    expect(textoParaItens('Notebook\n  Headset  \n\n  Crachá \n')).toEqual(['Notebook', 'Headset', 'Crachá']);
    expect(textoParaItens('')).toEqual([]);
    expect(itensParaTexto(['Notebook', 'Headset'])).toBe('Notebook\nHeadset');
  });
});

describe('KitOnboardingDialog — formulário', () => {
  it('não monta nada quando fechado', () => {
    render(<KitOnboardingDialog open={false} onOpenChange={vi.fn()} onSalvar={vi.fn()} />);
    expect(screen.queryByLabelText('Nome do kit')).not.toBeInTheDocument();
  });

  it('cria: começa vazio, exige nome e ao menos um item, e devolve o payload limpo', () => {
    const onSalvar = vi.fn();
    render(<KitOnboardingDialog open onOpenChange={vi.fn()} kit={null} onSalvar={onSalvar} />);

    expect(screen.getByText('Novo perfil de kit')).toBeInTheDocument();
    const salvar = screen.getByRole('button', { name: 'Salvar perfil' });
    expect(salvar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nome do kit'), { target: { value: '  Kit Suporte  ' } });
    expect(salvar).toBeDisabled(); // ainda sem itens

    fireEvent.change(screen.getByLabelText('Itens do kit'), { target: { value: 'Notebook\n\nHeadset' } });
    expect(salvar).toBeEnabled();

    fireEvent.click(salvar);
    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Kit Suporte', itens: ['Notebook', 'Headset'], ativo: true });
  });

  it('edita: carrega o kit, permite desativar e devolve o payload alterado', () => {
    const onSalvar = vi.fn();
    render(
      <KitOnboardingDialog
        open
        onOpenChange={vi.fn()}
        kit={{ id: 'k1', nome: 'Kit Dev', itens: ['MacBook', 'Headset'], ativo: true }}
        onSalvar={onSalvar}
      />,
    );

    expect(screen.getByText('Editar Kit Dev')).toBeInTheDocument();
    expect((screen.getByLabelText('Nome do kit') as HTMLInputElement).value).toBe('Kit Dev');
    expect((screen.getByLabelText('Itens do kit') as HTMLTextAreaElement).value).toBe('MacBook\nHeadset');

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Kit Dev', itens: ['MacBook', 'Headset'], ativo: false });
  });

  it('não salva com o formulário inválido (só espaços)', () => {
    const onSalvar = vi.fn();
    render(<KitOnboardingDialog open onOpenChange={vi.fn()} onSalvar={onSalvar} />);
    fireEvent.change(screen.getByLabelText('Nome do kit'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Itens do kit'), { target: { value: 'Notebook' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
