/**
 * Guarda de rota ADMIN — exige o papel `admin` E o MFA.
 *
 * RESPONSABILIDADES, AGORA SEPARADAS: este componente decide QUEM pode entrar
 * (papel `admin`); o portao de MFA mora no `MfaGate`, compartilhado com o
 * `PermissionRoute`. A maquina de estados e as telas do MFA foram movidas NA
 * INTEGRA para la, entao o comportamento desta rota e EXATAMENTE o de antes:
 * mesmos textos, mesmas condicoes, mesmo fail-closed e o mesmo
 * `VITE_E2E_BYPASS_MFA`.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AcessoRestrito, MfaGate, VerificandoPrivilegios } from './MfaGate';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isReady, isAdmin, loading } = useAuth();

  if (!isReady || (loading && !user)) return <VerificandoPrivilegios />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <AcessoRestrito />;

  return <MfaGate>{children}</MfaGate>;
}
