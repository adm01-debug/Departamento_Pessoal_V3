/**
 * PERMISSÕES por funcionalidade — leitor da matriz que JÁ EXISTE no banco:
 * `public.permissions(role, resource, action, allowed)`, criada e semeada em
 * `supabase/migrations/20251220135248_…sql`.
 *
 * NÃO é um segundo sistema de permissões: é o MESMO, finalmente lido pelo
 * frontend. Antes dele só o `AdminRoute` (papel `admin`) controlava acesso.
 *
 * COMO FUNCIONA
 *   • o vínculo usuário→papel continua vindo do `useAuth` (`user.roles`, lido de
 *     `user_roles` via RPC `get_user_roles`) — nada mudou aí;
 *   • a RLS de `permissions` libera SELECT para qualquer usuário AUTENTICADO
 *     (aquelas linhas são a matriz papel→permissão, não dado de cliente), então
 *     buscamos SÓ as linhas dos papéis do usuário;
 *   • `pode(resource, action)` responde se aquele par está liberado (`allowed`).
 *
 * FALHA FECHADA: sem dado (erro, timeout, ainda carregando, sem papel) `pode()`
 * devolve `false` — nunca libera por omissão. O atalho do admin é o mesmo que a
 * própria matriz semeia (`'admin'` tem todas as linhas `allowed = true`), e existe
 * para não negar a tela enquanto a consulta (que nem é disparada para ele) resolve.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

/** Valores REAIS do enum `public.app_role` no banco (mais amplo que o `AppRole`). */
type AppRoleDb = Database['public']['Enums']['app_role'];

export interface PermissaoRow {
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

/** Chave/estado do cache das permissões do usuário logado. */
const PERMISSOES_STALE_MS = 5 * 60 * 1000;

/** Estado da verificação de permissão — `error` NÃO é "sem permissão". */
export type EstadoPermissoes = 'loading' | 'success' | 'error';

/** Mensagem legível do erro do PostgREST (code/hint identificam GRANT/enum ausentes). */
function descreverErroConsulta(error: unknown): string {
  const e = error as { message?: string; code?: string; details?: string; hint?: string } | undefined;
  if (e?.message) return `${e.code ? `[${e.code}] ` : ''}${e.message}${e.hint ? ` — ${e.hint}` : ''}`;
  return 'Falha ao consultar public.permissions';
}

export function usePermissions() {
  const { user, isAdmin, isReady, rolesStatus, rolesError } = useAuth();
  /** Lista estável por usuário — evita reexecutar o efeito/consulta a cada render. */
  const roles = useMemo(() => user?.roles ?? [], [user]);

  /**
   * A matriz só é consultada quando faz sentido: usuário pronto, logado, que NÃO
   * é admin (para admin a resposta é `true` por definição) e com pelo menos um
   * papel. Com `roles` vazio o hook nem consulta — e `pode()` fica `false`.
   */
  const consultaAtiva = isReady && !!user && !isAdmin && roles.length > 0;

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    enabled: consultaAtiva,
    queryKey: ['permissions', roles],
    staleTime: PERMISSOES_STALE_MS,
    queryFn: async (): Promise<PermissaoRow[]> => {
      const { data, error } = await supabase
        .from('permissions')
        .select('role, resource, action, allowed')
        // O enum `app_role` do banco é mais amplo que o `AppRole` do contexto
        // (`gestor`/`rh` existem lá e podem ser papéis reais do usuário), por isso
        // o filtro é tipado pelo enum do banco.
        .in('role', roles as unknown as AppRoleDb[]);
      if (error) throw error;
      return (data ?? []) as PermissaoRow[];
    },
  });

  const pode = useCallback(
    (resource: string, action: string) => {
      if (isAdmin) return true;
      return data.some((p) => p.resource === resource && p.action === action && p.allowed === true);
    },
    [data, isAdmin]
  );

  /**
   * Mensagem da falha da consulta à matriz — inclui `code`/`hint`, que é o que denuncia
   * `42501` (falta GRANT) ou `22P02` (valor fora do enum) no diagnóstico da tela.
   */
  const erroDaQuery = error ? descreverErroConsulta(error) : null;

  /**
   * TRI-STATE da verificação. `error` tem precedência: falha técnica JAMAIS é tratada
   * como "sem permissão" — a guarda mostra o estado de erro, não "Acesso Restrito".
   * Depois vem `loading` (papéis ou consulta ainda resolvendo) e só então `success`.
   */
  const estado: EstadoPermissoes =
    rolesStatus === 'error' || erroDaQuery ? 'error' : rolesStatus === 'loading' || isLoading ? 'loading' : 'success';

  return {
    pode,
    carregando: isLoading,
    estado,
    /** Falha (de papéis ou da consulta) — `null` quando não houve falha. */
    erro: rolesStatus === 'error' ? (rolesError ?? 'Falha ao carregar papéis') : erroDaQuery,
    /** Linhas cruas da matriz para os papéis do usuário (diagnóstico). */
    linhas: data,
    /** `false` = nem chegou a consultar a matriz (sem papel/pronto/admin). */
    consultaAtiva,
    roles,
    rolesStatus,
  };
}
