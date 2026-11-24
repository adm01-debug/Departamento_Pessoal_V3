import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useServerValidation } from '../useServerValidation';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('useServerValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as any);
  });

  it('returns handleServerError function', () => {
    const { result } = renderHook(() => useServerValidation());
    expect(typeof result.current.handleServerError).toBe('function');
  });

  it('shows generic toast for unknown error', () => {
    const { result } = renderHook(() => useServerValidation());
    result.current.handleServerError(new Error('Something went wrong'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('handles VALIDATION_ERROR with field errors', () => {
    const { result } = renderHook(() => useServerValidation());
    const setError = vi.fn();

    const error = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Campos inválidos',
        fields: [
          { field: 'nome', message: 'Nome obrigatório' },
          { field: 'cpf', message: 'CPF inválido' },
        ],
      },
    };

    const handled = result.current.handleServerError({ data: error }, setError);

    expect(handled).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('nome', { type: 'server', message: 'Nome obrigatório' });
    expect(setError).toHaveBeenCalledWith('cpf', { type: 'server', message: 'CPF inválido' });
    expect(toast.error).toHaveBeenCalledWith('Verifique os campos destacados no formulário.');
  });

  it('handles TIMEOUT_ERROR', () => {
    const { result } = renderHook(() => useServerValidation());

    const error = {
      error: { code: 'TIMEOUT_ERROR', message: 'Timeout' },
    };

    const handled = result.current.handleServerError({ data: error });

    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });

  it('handles HTTP 504 status', () => {
    const { result } = renderHook(() => useServerValidation());

    const handled = result.current.handleServerError({ status: 504 });

    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });

  it('handles 401 status', () => {
    const { result } = renderHook(() => useServerValidation());

    const handled = result.current.handleServerError({ status: 401 });

    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Sessão expirada')
    );
  });

  it('handles 403 status', () => {
    const { result } = renderHook(() => useServerValidation());

    const handled = result.current.handleServerError({ status: 403 });

    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });

  it('falls back to error message from response data', () => {
    const { result } = renderHook(() => useServerValidation());

    const error = {
      response: { data: { error: { code: 'UNKNOWN', message: 'Erro específico' } } },
    };

    result.current.handleServerError(error);
    expect(toast.error).toHaveBeenCalledWith('Erro específico');
  });

  it('uses default message when error has no message', () => {
    const { result } = renderHook(() => useServerValidation());

    result.current.handleServerError({});
    expect(toast.error).toHaveBeenCalledWith('Ocorreu um erro inesperado.');
  });

  it('returns false for non-specifically-handled errors', () => {
    const { result } = renderHook(() => useServerValidation());

    const handled = result.current.handleServerError({ message: 'generic' });
    expect(handled).toBe(false);
  });
});
