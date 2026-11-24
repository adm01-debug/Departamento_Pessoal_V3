import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * A moldura animada vira um contêiner simples (mesmo recorte de
 * `CandidatoDetalhesDialog.test.tsx`): a coreografia do `AnimatePresence` é do
 * Design System e não é o alvo aqui — o teste cobre o CONTEÚDO e as regras do
 * assistente (trilha de etapas, bloqueio do “Continuar”, rascunho parcial).
 */
vi.mock('@/components/ui/cascade-dialog', () => ({
  CascadeDialogFrame: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

vi.mock('@radix-ui/react-dialog', () => ({
  Title: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  Description: ({ children, className }: { children: ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

import { NovaVagaDialog } from '../NovaVagaDialog';

function montar(props: Partial<Parameters<typeof NovaVagaDialog>[0]> = {}) {
  const onPublicar = vi.fn();
  const onSalvarRascunho = vi.fn();
  const utils = render(
    <NovaVagaDialog
      open
      onOpenChange={vi.fn()}
      departamentos={[]}
      salvando={false}
      onPublicar={onPublicar}
      onSalvarRascunho={onSalvarRascunho}
      {...props}
    />
  );
  return { ...utils, onPublicar, onSalvarRascunho };
}

describe('NovaVagaDialog', () => {
  it('abre na etapa 1 com a trilha das três etapas', () => {
    montar();
    expect(screen.getByText('Anunciar nova vaga')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 3 · Informações básicas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Informações básicas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descrição e requisitos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revisão e publicação/ })).toBeInTheDocument();
  });

  it('não avança com campos obrigatórios vazios', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(screen.getByText('Confira os campos destacados abaixo para continuar.')).toBeInTheDocument();
    expect(screen.getByText('Informe o título da vaga.')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 3 · Informações básicas')).toBeInTheDocument();
  });

  it('mantém o “Voltar” desabilitado na primeira etapa', () => {
    montar();
    expect(screen.getByRole('button', { name: /Voltar/ })).toBeDisabled();
  });

  it('não salva rascunho sem título e explica o motivo', () => {
    const { onSalvarRascunho } = montar();
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }));

    expect(onSalvarRascunho).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o título para salvar o rascunho.')).toBeInTheDocument();
  });

  it('salva o rascunho parcial apenas com o título', () => {
    const { onSalvarRascunho } = montar();
    fireEvent.change(screen.getByLabelText(/Título da vaga/), { target: { value: 'Analista de RH' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }));

    expect(onSalvarRascunho).toHaveBeenCalledTimes(1);
    expect(onSalvarRascunho.mock.calls[0][0]).toMatchObject({ titulo: 'Analista de RH', quantidade: 1 });
  });

  it('mostra o spinner e trava os botões enquanto salva', () => {
    montar({ salvando: true });
    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
  });
});
