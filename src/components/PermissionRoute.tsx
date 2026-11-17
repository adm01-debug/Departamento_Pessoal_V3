/**
 * Guarda de rota por PERMISSAO — irma do `AdminRoute`.
 *
 * REGRA: AUTENTICADO + (admin OU permissao na matriz `public.permissions`) + MFA.
 * Usa o MESMO `MfaGate` do `AdminRoute` e a MESMA tela de negacao. Nao afrouxa
 * nada: quem nao tem a permissao continua vendo "Acesso Restrito", quem nao
 * esta logado continua indo para `/login`, e o MFA segue sendo exigido.
 *
 * POR QUE NAO USAR `AdminRoute` AQUI: a matriz do banco concede, por exemplo,
 * `('admin'|'gestor'|'rh', 'auditoria', 'read')`, e o `AdminRoute` so olha o
 * papel `admin` — bloquearia gestor e RH que JA tem a permissao concedida.
 *
 * Resgate da branch `muri`. Duas diferencas deliberadas em relacao a ela: o
 * MFA aqui nao tem bypass por lista de e-mail, e a tela de negacao nao imprime
 * id, e-mail nem as linhas da matriz — esse diagnostico vai para o log.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AcessoRestrito, ErroVerificacaoPermissao, MfaGate, VerificandoPrivilegios } from './MfaGate';

export interface PermissionRouteProps {
  /**
   * Permissao exigida no formato `'<resource>.<action>'` — ex.: `'auditoria.read'`.
   * Sao as colunas `resource`/`action` da matriz `public.permissions`.
   */
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { user, isReady, isAdmin, loading, rolesStatus, rolesError } = useAuth();
  const { pode, carregando, estado, erro } = usePermissions();
  const [resource, action] = permission.split('.');

  // 1) CARREGANDO — autenticacao, papeis e matriz ainda nao resolveram: nem
  //    libera, nem nega (sem piscar "Acesso Restrito" para quem TEM a permissao).
  const verificando = !isReady || (loading && !user) || (!!user && (carregando || estado === 'loading'));
  if (verificando) return <VerificandoPrivilegios />;

  // 2) Autenticacao.
  if (!user) return <Navigate to="/login" replace />;

  const permitido = isAdmin || pode(resource, action);

  // 3) FALHA DE VERIFICACAO — o RPC de papeis caiu ou a consulta a matriz
  //    falhou. Isto NUNCA vira "Acesso Restrito": o usuario legitimo pensaria
  //    que perdeu permissao.
  if (!permitido && (estado === 'error' || rolesStatus === 'error')) {
    return <ErroVerificacaoPermissao permission={permission} detalhe={erro ?? rolesError ?? 'erro desconhecido'} />;
  }

  // 4) Negativa REAL — a verificacao concluiu e a permissao nao esta concedida.
  if (!permitido) return <AcessoRestrito />;

  // 5) Autorizado → ainda exige o MFA (mesmo portao do AdminRoute).
  return <MfaGate>{children}</MfaGate>;
}
