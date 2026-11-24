import { useEffect } from 'react';

/**
 * Hook para avisar o usuário sobre alterações não salvas antes de sair da página.
 * Aumenta a confiabilidade e evita perda de dados em fluxos complexos.
 */
export function useFormGuard(isDirty: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}
