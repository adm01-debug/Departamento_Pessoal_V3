/**
 * Guarda de rota por PERMISSÃO — irmã do `AdminRoute`.
 *
 * REGRA: AUTENTICADO + (admin OU permissão na matriz `public.permissions`) + MFA.
 * Usa o MESMO `MfaGate` do `AdminRoute` (nenhuma segunda implementação de MFA) e
 * a MESMA tela de negação. Não afrouxa nada: quem não tem a permissão continua
 * vendo "Acesso Restrito"; quem não está logado continua indo para `/login`; e o
 * MFA segue sendo exigido de quem entra.
 *
 * POR QUE NÃO USAR `AdminRoute` AQUI: a trilha de auditoria global é dado
 * sensível, mas não é exclusividade de admin — a matriz do banco concede
 * `('admin'|'gestor'|'rh', 'auditoria', 'read')`, e o `AdminRoute` só olha o papel
 * `admin`, o que bloquearia gestor/RH que JÁ têm a permissão.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AcessoRestrito, ErroVerificacaoPermissao, MfaGate, VerificandoPrivilegios } from './MfaGate';

export interface PermissionRouteProps {
  /**
   * Permissão exigida, no formato `'<resource>.<action>'` — ex.: `'auditoria.read'`.
   * É a chave da matriz `public.permissions` (resource/action).
   */
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { user, isReady, isAdmin, loading, rolesStatus, rolesError } = useAuth();
  const { pode, carregando, estado, erro, linhas, consultaAtiva, roles } = usePermissions();
  const [resource, action] = permission.split('.');

  // 1) CARREGANDO — autenticação, papéis e permissões ainda não resolveram:
  //    nem libera, nem nega (sem "flash" de Acesso Restrito para quem tem a permissão).
  const verificando = !isReady || (loading && !user) || (!!user && (carregando || estado === 'loading'));
  if (verificando) return <VerificandoPrivilegios />;

  // 2) Autenticação.
  if (!user) return <Navigate to="/login" replace />;

  // Mocks/parciais podem não trazer os campos novos — nunca quebrar por isso.
  const linhasDaMatriz = linhas ?? [];
  const rolesDoUsuario = (roles ?? user.roles ?? []) as string[];
  const permitido = isAdmin || pode(resource, action);

  // 3) FALHA DE VERIFICAÇÃO (não é negativa de acesso): não foi possível carregar os
  //    papéis (RPC falhou/timeout) nem consultar a matriz. NUNCA vira "Acesso Restrito".
  if (!permitido && (estado === 'error' || rolesStatus === 'error')) {
    return <ErroVerificacaoPermissao permission={permission} detalhe={erro ?? rolesError ?? 'erro desconhecido'} />;
  }

  // 4) Negativa REAL — a verificação concluiu e a permissão não está concedida.
  if (!permitido) {
    const linha = linhasDaMatriz.find((l) => l.resource === resource && l.action === action) ?? null;
    const motivo = !consultaAtiva
      ? 'A matriz não foi consultada (nenhum papel carregado no contexto)'
      : erro
        ? `Erro ao verificar: ${erro}`
        : !linha
          ? `public.permissions não tem linha para roles=${JSON.stringify(rolesDoUsuario)} em (${resource}, ${action})`
          : `A linha existe, mas allowed=${String(linha.allowed)}`;
    return (
      <AcessoRestrito
        diagnostico={{
          userId: user.id,
          email: user.email,
          roles: rolesDoUsuario,
          rolesStatus: String(rolesStatus ?? 'success'),
          rolesError: rolesError ?? null,
          permission,
          consultaAtiva: !!consultaAtiva,
          consultaSituacao: erro ? `erro: ${erro}` : 'sucesso',
          linhas: linhasDaMatriz,
          encontrada: !!linha,
          allowed: linha ? linha.allowed : null,
          motivo,
        }}
      />
    );
  }

  // 5) Autorizado → ainda exige o MFA (mesmo portão do AdminRoute).
  return <MfaGate>{children}</MfaGate>;
}
