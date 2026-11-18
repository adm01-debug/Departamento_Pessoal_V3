/**
 * Exercita a mutationFn de CRIACAO de plano de beneficio — o caminho que o
 * teste existente (BeneficiosSettingsTab.test.tsx) nao executa, porque ali
 * `useMutation` e mockado como `() => ({ mutate: vi.fn() })` e o `mutationFn`
 * nunca roda. Apontado pela Devin Review em #696, com razao: os 8 testes de la
 * passam sem tocar a correcao.
 *
 * Aqui o `useMutation` mockado GUARDA a config recebida, e o teste chama o
 * `mutationFn` direto. `criar` e a primeira das tres chamadas a useMutation no
 * componente (linha 49; depois alternarStatus e excluir), por isso calls[0].
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const h = vi.hoisted(() => ({
  empresaAtual: { id: 'empresa-1' } as { id: string } | undefined,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: h.empresaAtual }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/forms', () => ({
  FormSwitch: () => <input type="checkbox" aria-label="switch" />,
}));

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BeneficiosSettingsTab } from '../settings/BeneficiosSettingsTab';

type MutationConfig = { mutationFn: (d: { nome: string; tipo: string; valor: string }) => Promise<void> };

function mutationFnDeCriar() {
  render(<BeneficiosSettingsTab />);
  const calls = vi.mocked(useMutation).mock.calls;
  expect(calls.length).toBeGreaterThanOrEqual(3);
  return (calls[0][0] as unknown as MutationConfig).mutationFn;
}

const PAYLOAD = { nome: 'VR Novo', tipo: 'Alimentação', valor: '300' };

describe('BeneficiosSettingsTab — criação de plano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.empresaAtual = { id: 'empresa-1' };
  });

  it('envia empresa_id no insert — sem isso o gateway devolve 403 TENANT_SCOPE_REQUIRED', async () => {
    await mutationFnDeCriar()(PAYLOAD);

    expect(supabase.from).toHaveBeenCalledWith('beneficios');
    const retorno = vi.mocked(supabase.from).mock.results.at(-1)?.value as {
      insert: ReturnType<typeof vi.fn>;
    };
    const enviado = retorno.insert.mock.calls[0][0];
    expect(enviado).toMatchObject({
      nome: 'VR Novo',
      tipo: 'Alimentação',
      valor: 300,
      ativo: true,
      empresa_id: 'empresa-1',
    });
  });

  it('bloqueia antes de chamar o banco quando nenhuma empresa está selecionada', async () => {
    h.empresaAtual = undefined;
    const fn = mutationFnDeCriar();

    await expect(fn(PAYLOAD)).rejects.toThrow('Selecione uma empresa.');
    expect(supabase.from).not.toHaveBeenCalledWith('beneficios');
  });

  it('continua validando nome e valor antes da empresa', async () => {
    const fn = mutationFnDeCriar();

    await expect(fn({ ...PAYLOAD, nome: '   ' })).rejects.toThrow('Nome do plano é obrigatório.');
    await expect(fn({ ...PAYLOAD, valor: '-1' })).rejects.toThrow('Valor inválido');
    expect(supabase.from).not.toHaveBeenCalledWith('beneficios');
  });
});
