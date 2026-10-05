import { useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { maskBankAccount, maskCpfDisplay, maskEmail, maskGeneric, maskPiiDeep, maskPisDisplay } from '@/utils/piiMask';

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
      phone: (v: string | null | undefined) => (canViewPii ? (v ?? '') : maskGeneric(v)),
      // Chave PIX varia por tipo: CPF, Email, Telefone, CNPJ ou aleatória.
      pix: (tipo: string | null | undefined, chave: string | null | undefined) => {
        if (canViewPii) return chave ?? '';
        const t = (tipo ?? '').toLowerCase();
        if (t === 'cpf') return maskCpfDisplay(chave);
        if (t === 'email') return maskEmail(chave);
        return maskGeneric(chave);
      },
      // Mascara profunda para payloads arbitrários (auditoria, exports).
      deep: (v: unknown) => (canViewPii ? v : maskPiiDeep(v)),
    }),
    [canViewPii]
  );
}
