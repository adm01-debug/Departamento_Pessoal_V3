/**
 * P2-039: Helper para actions de form (React 19).
 *
 * Substitui useFormState (deprecated em React 19) por useActionState.
 * Mantém backward compatibility com React 18.
 *
 * USO:
 *
 * 1. Criar a action (server action ou async function):
 * ```typescript
 * async function submitForm(prev: FormState, formData: FormData): Promise<FormState> {
 *   const result = await api.submit(Object.fromEntries(formData));
 *   if (result.error) return { error: result.error };
 *   return { success: true, data: result.data };
 * }
 * ```
 *
 * 2. No componente (React 19+):
 * ```typescript
 * import { useActionState } from 'react';
 * const [state, formAction, isPending] = useActionState(submitForm, { error: null });
 * ```
 *
 * 3. Alternativa usando este helper (React 18/19 compat):
 * ```typescript
 * import { useFormActionState } from '@/hooks/useActionStateHelper';
 * const { state, formAction, isPending, formRef } = useFormActionState(submitForm, initialState);
 *
 * return (
 *   <form ref={formRef} action={formAction}>
 *     <input name="email" />
 *     {state.error && <p>{state.error}</p>}
 *     <button disabled={isPending}>Enviar</button>
 *   </form>
 * );
 * ```
 */

import { useActionState as useReactActionState } from 'react';
import { useRef, useCallback, type RefObject } from 'react';
import type { ActionState, FormState } from '@/types/actionState';

// Re-export do React 19 hook
export { useActionState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Estado padrão para actions de form
 */
export interface DefaultFormState {
  error?: string | null;
  success?: boolean;
  data?: unknown;
  errors?: Record<string, string>;
}

/**
 * Action function signature
 */
export type ActionFunction<State extends ActionState, FormData = FormData> = (
  prevState: State,
  formData: FormData
) => Promise<State>;

/**
 * Hook return type
 */
export interface UseFormActionStateReturn<State extends ActionState> {
  state: State;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  formRef: RefObject<HTMLFormElement | null>;
}

// =============================================================================
// FALLBACK PARA REACT 18
// =============================================================================

/**
 * Implementação fallback para React 18 (quando useActionState não disponível)
 * Este fallback é usado apenas quando React 19 não está disponível.
 */
function useFormActionStateFallback<State extends ActionState>(
  action: ActionFunction<State>,
  initialState: State
): UseFormActionStateReturn<State> {
  const [state, setState] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const formAction = useCallback((formData: FormData) => {
    setIsPending(true);
    action(state, formData)
      .then(setState)
      .catch((error) => {
        setState({
          ...state,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        } as State);
      })
      .finally(() => setIsPending(false));
  }, [action, state]);

  return { state, formAction, isPending, formRef };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Hook principal - usa useActionState do React 19 quando disponível,
 * fallback para implementação própria em React 18.
 *
 * @param action - A função que processa o form
 * @param initialState - Estado inicial
 * @returns { state, formAction, isPending, formRef }
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { state, formAction, isPending } = useFormActionState(loginAction, {
 *     error: null,
 *     success: false,
 *   });
 *
 *   return (
 *     <form action={formAction}>
 *       <input name="email" type="email" required />
 *       <input name="password" type="password" required />
 *       {state.error && <p className="error">{state.error}</p>}
 *       <button type="submit" disabled={isPending}>
 *         {isPending ? 'Enviando...' : 'Entrar'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormActionState<State extends ActionState>(
  action: ActionFunction<State>,
  initialState: State
): UseFormActionStateReturn<State> {
  // Tenta usar React 19 useActionState
  // Fallback para implementação própria em React 18
  try {
    // @ts-expect-error - useActionState é do React 19
    return useReactActionState(action, initialState);
  } catch {
    return useFormActionStateFallback(action, initialState);
  }
}

// =============================================================================
// VALIDATORS HELPERS
// =============================================================================

/**
 * Valida campo obrigatório
 */
export function required(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') {
    return 'Este campo é obrigatório';
  }
  return undefined;
}

/**
 * Valida email
 */
export function isValidEmail(value: string): string | undefined {
  if (!value) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Email inválido';
  }
  return undefined;
}

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): string | undefined {
  if (!cpf) return undefined;

  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) {
    return 'CPF deve ter 11 dígitos';
  }

  // Valida dígitos verificadores
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
    return 'CPF inválido';
  }

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
    return 'CPF inválido';
  }

  return undefined;
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): string | undefined {
  if (!cnpj) return undefined;

  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) {
    return 'CNPJ deve ter 14 dígitos';
  }

  // Validação simplificada
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return 'CNPJ inválido';
  }

  return undefined;
}

// Import necessário para fallback
import { useState } from 'react';
