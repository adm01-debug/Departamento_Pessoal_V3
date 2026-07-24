// P2-039: Helper para actions de form (React 19).
// Substitui useFormState (deprecated em React 19) por useActionState.
//
// Exemplo de uso:
//   'use server';
//   async function submitForm(prev: State, formData: FormData): Promise<State> { ... }
//
//   'use client';
//   import { useActionState } from 'react';
//   const [state, formAction, isPending] = useActionState(submitForm, { error: null });
//
// Este arquivo é apenas documentação — o helper real está em React 19.
// Mantido para facilitar migração futura.
export {};
