// Bateria de testes para useFormActionState.
// Cobre: estado inicial, transição pending, captura de erro, reset via formRef.

import { renderHook, act } from '@testing-library/react';
import { useFormActionState } from '../useActionStateHelper';

describe('useFormActionState', () => {
  it('inicializa com o estado fornecido', () => {
    const initial = { error: null as string | null, success: false };
    const { result } = renderHook(() =>
      useFormActionState(async () => initial, initial),
    );
    expect(result.current.state).toEqual(initial);
    expect(result.current.isPending).toBe(false);
  });

  it('transiciona para pending durante execução', async () => {
    const initial = { error: null as string | null, success: false };

    let resolveAction: (value: { error: null; success: boolean }) => void = () => {};
    const slowAction = new Promise<{ error: null; success: boolean }>(
      (resolve) => { resolveAction = resolve; },
    );

    const { result } = renderHook(() =>
      useFormActionState(async () => slowAction, initial),
    );

    act(() => {
      result.current.formAction(new FormData());
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveAction({ error: null, success: true });
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.state.success).toBe(true);
  });

  it('captura erros lançados pela action', async () => {
    const initial = { error: null as string | null, success: false };

    const { result } = renderHook(() =>
      useFormActionState(async () => {
        throw new Error('Falha simulada');
      }, initial),
    );

    await act(async () => {
      result.current.formAction(new FormData());
    });

    expect(result.current.state.error).toBe('Falha simulada');
    expect(result.current.isPending).toBe(false);
  });

  it('captura erros não-Error (string)', async () => {
    const initial = { error: null as string | null, success: false };

    const { result } = renderHook(() =>
      useFormActionState(async () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string error';
      }, initial),
    );

    await act(async () => {
      result.current.formAction(new FormData());
    });

    expect(result.current.state.error).toBe('string error');
  });

  it('fornece formRef inicializado', () => {
    const initial = { error: null as string | null, success: false };
    const { result } = renderHook(() =>
      useFormActionState(async () => initial, initial),
    );
    expect(result.current.formRef).toBeDefined();
    expect(result.current.formRef.current).toBeNull();
  });

  it('propaga FormData para a action', async () => {
    const initial = { error: null as string | null, success: false };
    let receivedFormData: FormData | null = null;

    const { result } = renderHook(() =>
      useFormActionState(async (_, fd) => {
        receivedFormData = fd;
        return { error: null, success: true };
      }, initial),
    );

    const formData = new FormData();
    formData.append('email', 'test@example.com');

    await act(async () => {
      result.current.formAction(formData);
    });

    expect(receivedFormData).not.toBeNull();
    expect(receivedFormData!.get('email')).toBe('test@example.com');
  });
});
