import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { AppRole, AuthContextType } from '@/contexts/AuthContext';
import { usePiiMask } from '@/hooks/usePiiMask';

const withRoles = (roles: AppRole[]) =>
  function Wrapper({ children }: { children?: ReactNode }) {
    const value = { hasRole: (role: AppRole) => roles.includes(role) } as AuthContextType;
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

describe('usePiiMask', () => {
  it('retorna valores completos para admin', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['admin']) });
    expect(result.current.canViewPii).toBe(true);
    expect(result.current.cpf('12345678901')).toBe('12345678901');
    expect(result.current.bankAccount('12345678')).toBe('12345678');
    expect(result.current.email('user@test.com')).toBe('user@test.com');
    expect(result.current.pis('12345678901')).toBe('12345678901');
  });

  it('retorna valores completos para moderator', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['moderator']) });
    expect(result.current.canViewPii).toBe(true);
    expect(result.current.cpf('12345678901')).toBe('12345678901');
  });

  it('mascara valores para user comum', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['user']) });
    expect(result.current.canViewPii).toBe(false);
    expect(result.current.cpf('12345678901')).toBe('•••.•••.•••-01');
    expect(result.current.bankAccount('12345678')).toBe('••••5678');
    expect(result.current.email('user@test.com')).toBe('u••r@test.com');
    expect(result.current.pis('12345678901')).toBe('•••.•••••.••-1');
  });

  it('mascara quando não há contexto de auth (fail-closed)', () => {
    const { result } = renderHook(() => usePiiMask());
    expect(result.current.canViewPii).toBe(false);
    expect(result.current.cpf('12345678901')).toBe('•••.•••.•••-01');
  });

  it('lida com valores nulos/vazios', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['admin']) });
    expect(result.current.cpf(null)).toBe('');
    expect(result.current.cpf(undefined)).toBe('');
    expect(result.current.bankAccount('')).toBe('');
  });

  it('pix mascara por tipo: CPF, email e chave genérica', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['user']) });
    expect(result.current.pix('CPF', '123.456.789-01')).toBe('•••.•••.•••-01');
    expect(result.current.pix('Email', 'user@test.com')).toBe('u••r@test.com');
    expect(result.current.pix('Telefone', '11987654321')).toBe('•••••••4321');
    // admin vê tudo em claro
    const { result: admin } = renderHook(() => usePiiMask(), { wrapper: withRoles(['admin']) });
    expect(admin.current.pix('CPF', '123.456.789-01')).toBe('123.456.789-01');
  });

  it('deep mascara chaves sensíveis em payloads aninhados (auditoria)', () => {
    const { result } = renderHook(() => usePiiMask(), { wrapper: withRoles(['user']) });
    const out = result.current.deep({
      id: 'x',
      cpf: '12345678901',
      meta: { salario: 5000, nome: 'Ana' },
      lista: [{ email: 'a@b.c' }],
    }) as Record<string, unknown>;
    expect(out.id).toBe('x');
    expect(out.cpf).toBe('••••');
    const meta = out.meta as Record<string, unknown>;
    expect(meta.salario).toBe('••••');
    expect(meta.nome).toBe('Ana');
    const lista = out.lista as Array<Record<string, unknown>>;
    expect(lista[0].email).toBe('••••');
  });
});
