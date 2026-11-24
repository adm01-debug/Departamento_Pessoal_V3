/**
 * Guarda de rota ADMIN — exige o papel `admin` E MFA.
 *
 * RESPONSABILIDADES, AGORA SEPARADAS: este componente decide **QUEM** pode entrar
 * (papel `admin` — para acesso por permissão granular existe o `PermissionRoute`);
 * o portão de **MFA** mora no `MfaGate`, compartilhado pelas duas guardas. A
 * máquina de estados e as telas do MFA foram movidas na íntegra para lá, então o
 * comportamento desta rota é EXATAMENTE o de antes (mesmos textos, mesmas
 * condições, mesmo fail-closed).
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
