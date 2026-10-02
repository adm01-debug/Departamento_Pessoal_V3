import { useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { maskBankAccount, maskCpfDisplay, maskEmail, maskPisDisplay } from '@/utils/piiMask';

// Autorização por campo (LGPD): admin/moderator veem PII completo;
// demais papéis — e qualquer contexto sem auth — recebem a versão mascarada.
export function usePiiMask() {
  const auth = useContext(AuthContext);
  const canViewPii = auth?.hasRole('admin') || auth?.hasRole('moderator') || false;

  return useMemo(
    () => ({
      canViewPii,
      cpf: (v: string | null | undefined) => (canViewPii ? (v ?? '') : maskCpfDisplay(v)),
      pis: (v: string | null | undefined) => (canViewPii ? (v ?? '') : maskPisDisplay(v)),
      bankAccount: (v: string | null | undefined) => (canViewPii ? (v ?? '') : maskBankAccount(v)),
      email: (v: string | null | undefined) => (canViewPii ? (v ?? '') : maskEmail(v)),
    }),
    [canViewPii]
  );
}
