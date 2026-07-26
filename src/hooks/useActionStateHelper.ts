/**
 * P2-039: Helper para actions de form (React 19).
 *
 * Substitui useFormState (deprecated em React 19) por useActionState.
 * Mantém backward compatibility com React 18.
 */

import { useState, useCallback, useRef, type RefObject } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ActionState {
  error?: string | null;
  success?: boolean;
  data?: unknown;
  errors?: Record<string, string>;
}

export type FormState = ActionState;

export type ActionFunction<State extends ActionState, FormData = FormData> = (
  prevState: State,
  formData: FormData
) => Promise<State>;

export interface UseFormActionStateReturn<State extends ActionState> {
  state: State;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  formRef: RefObject<HTMLFormElement | null>;
}

// =============================================================================
// VALIDATORS - re-export from validators.ts
// =============================================================================

export { required, isValidEmail, isValidCPF, isValidCNPJ } from './validators';

// =============================================================================
// IMPLEMENTATION
// =============================================================================

function useFormActionStateFallback<State extends ActionState>(
  action: ActionFunction<State>,
  initialState: State
): UseFormActionStateReturn<State> {
  const [state, setState] = useState<State>(initialState);
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
// MAIN HOOK
// =============================================================================

/**
 * Hook principal para form actions (React 18/19 compat)
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
 *       {state.error && <p className="error">{state.error}</p>}
 *       <button disabled={isPending}>
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
  return useFormActionStateFallback(action, initialState);
}

/**
 * Re-export do useActionState do React 19 (quando disponível)
 */
export { useActionState } from 'react';
