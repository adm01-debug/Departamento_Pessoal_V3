import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTranslation } from '../useTranslation';

describe('useTranslation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('carrega somente o locale atual e marca a troca como pendente até concluir', async () => {
    localStorage.setItem('dp_locale', 'pt-BR');
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.t('nav.colaboradores')).toBe('Colaboradores');

    act(() => {
      result.current.setLocale('en-US');
    });

    expect(result.current.isLoaded).toBe(false);
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.t('nav.colaboradores')).toBe('Employees');
    expect(localStorage.getItem('dp_locale')).toBe('en-US');
  });
});
