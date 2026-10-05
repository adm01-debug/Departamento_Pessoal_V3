import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, AuthError } from '@supabase/supabase-js';
import { sanitizePlainText } from '@/utils/sanitizeHtml';
import { loggerService } from '@/services/loggerService';
import { queryClient } from '@/lib/queryClient';
import { validatePasswordFull } from '@/utils/passwordPolicy';
import { functionUrl } from '@/lib/functionsUrl';

export type AppRole = 'admin' | 'moderator' | 'user';

/**
 * Estado da carga de papéis do usuário — tri-state EXPLÍCITO para que a autorização
 * nunca confunda "não consegui verificar" (técnico) com "não tem permissão" (negócio).
 */
export type RolesStatus = 'loading' | 'success' | 'error';

export interface User {
  id: string;
  email: string;
  name?: string;
  roles: AppRole[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isReady: boolean;
  isAdmin: boolean;
  /** `loading | success | error` — `error` NÃO é "usuário sem permissão". */
  rolesStatus: RolesStatus;
  /** Mensagem legível da falha de `get_user_roles` (null quando o RPC respondeu). */
  rolesError: string | null;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_INIT_TIMEOUT_MS = 10000;
const USER_ROLES_TIMEOUT_MS = 5000;

/**
 * Resultado da carga de papéis: os papéis + o MOTIVO da falha (quando houve).
 *
 * O fallback global `['user']` continua sendo devolvido para não mudar o comportamento de
 * todo o app sem análise de impacto — mas agora vem ACOMPANHADO de `erro`/`motivo`, e quem
 * decide autorização consegue distinguir "usuário só tem `user`" de "não deu para verificar".
 */
interface ResultadoRoles {
  roles: AppRole[];
  /** Erro devolvido pelo RPC ou capturado por exceção (undefined quando deu certo). */
  erro?: unknown;
  /** Como a falha ocorreu (`timeout` era invisível: virava `['user']` legítimo). */
  motivo?: 'rpc' | 'timeout' | 'excecao';
}

/** Mensagem legível da falha, exibida no diagnóstico de autorização. */
function descreverErroRoles(erro: unknown, motivo?: ResultadoRoles['motivo']): string {
  if (motivo === 'timeout') {
    return `Tempo esgotado (${USER_ROLES_TIMEOUT_MS}ms) ao chamar get_user_roles`;
  }
  const e = erro as { message?: string; code?: string; details?: string; hint?: string } | undefined;
  if (e?.message) return `${e.code ? `[${e.code}] ` : ''}${e.message}${e.hint ? ` — ${e.hint}` : ''}`;
  return 'Falha desconhecida ao consultar get_user_roles';
}

async function fetchUserRoles(userId: string): Promise<ResultadoRoles> {
  try {
    const { data, error } = await supabase.rpc('get_user_roles', { _user_id: userId });
    if (error) {
      loggerService.error('Error fetching user roles', { userId, error });
      return { roles: ['user'], erro: error, motivo: 'rpc' };
    }
    const roles = (data as AppRole[]) || ['user'];
    return { roles };
  } catch (e) {
    loggerService.error('Exception fetching user roles', { userId }, e as Error);
    return { roles: ['user'], erro: e, motivo: 'excecao' };
  }
}

function fetchUserRolesWithTimeout(userId: string): Promise<ResultadoRoles> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      loggerService.warn('User roles fetch timed out', { userId });
      resolve({ roles: ['user'], motivo: 'timeout' });
    }, USER_ROLES_TIMEOUT_MS);

    fetchUserRoles(userId)
      .then((resultado) => {
        window.clearTimeout(timeoutId);
        resolve(resultado);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        loggerService.error('Failed to fetch user roles', { userId }, error);
        resolve({ roles: ['user'], erro: error, motivo: 'excecao' });
      });
  });
}

function buildUser(
  supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  roles: AppRole[]
): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name as string | undefined,
    roles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  /**
   * Tri-state da carga de papéis. Nasce `loading` e NUNCA vira `success` por falha:
   * uma falha de `get_user_roles`/timeout vira `error` (com mensagem), para que a guarda
   * de permissão mostre "não foi possível verificar" em vez de "Acesso Restrito".
   */
  const [rolesStatus, setRolesStatus] = useState<RolesStatus>('loading');
  const [rolesError, setRolesError] = useState<string | null>(null);
  // Ref espelha `isReady` para leitura no callback do timeout de inicialização
  // sem re-executar o useEffect (que re-subscreveria em onAuthStateChange).
  const isReadyRef = useRef(false);

  const markReady = useCallback(() => {
    setLoading(false);
    setIsReady(true);
    isReadyRef.current = true;
  }, []);

  const enrichUserWithRoles = useCallback(
    async (supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
      setRolesStatus('loading');
      setRolesError(null);
      const { roles, erro, motivo } = await fetchUserRolesWithTimeout(supabaseUser.id);
      setUser((prevUser) => (prevUser && prevUser.id === supabaseUser.id ? buildUser(supabaseUser, roles) : prevUser));
      if (erro || motivo) {
        // Falha técnica: reporta como ERRO (não como papel legítimo). O fallback `['user']`
        // segue aplicado ao `user` para não quebrar o resto do app, mas a autorização
        // granular enxerga `rolesStatus === 'error'` e trata como verificação falha.
        setRolesStatus('error');
        setRolesError(descreverErroRoles(erro, motivo));
      } else {
        setRolesStatus('success');
        setRolesError(null);
      }
    },
    []
  );

  const applySession = useCallback(
    (nextSession: Session | null) => {
      if (nextSession?.user) {
        setSession(nextSession);
        setUser(buildUser(nextSession.user, ['user']));
        void enrichUserWithRoles(nextSession.user);
      } else {
        setSession(null);
        setUser(null);
        setRolesStatus('success');
        setRolesError(null);
      }
      markReady();
    },
    [enrichUserWithRoles, markReady]
  );

  // P1-028: ref estável para o callback, evita re-execução do useEffect a cada render.
  const applySessionRef = useRef(applySession);
  useEffect(() => {
    applySessionRef.current = applySession;
  }, [applySession]);

  useEffect(() => {
    let isMounted = true;

    const authInitTimeout = window.setTimeout(() => {
      if (isMounted && !isReadyRef.current) {
        loggerService.warn('Auth initialization timed out');
        markReady();
      }
    }, AUTH_INIT_TIMEOUT_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      loggerService.info('Auth state changed', { event, userId: newSession?.user?.id });
      applySession(newSession);
    });

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (isMounted) applySession(initialSession);
      } catch (e) {
        loggerService.error('Auth initialization error', {}, e as Error);
        if (isMounted) {
          applySession(null);
        }
      } finally {
        window.clearTimeout(authInitTimeout);
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      window.clearTimeout(authInitTimeout);
      subscription.unsubscribe();
    };
  }, [applySession, markReady]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // H20: Route all logins through the auth-login edge function so that
      // IP-level + per-email rate limits and account lockout are enforced
      // server-side — unreachable by attackers calling the Supabase Auth REST
      // API directly (which would bypass the React UI checks entirely).
      const SUPABASE_URL =
        (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL;
      // O .env do projeto expõe a chave pública como VITE_SUPABASE_PUBLISHABLE_KEY.
      // VITE_SUPABASE_ANON_KEY existe apenas em ambientes legados — usar apenas
      // ela deixava ANON_KEY undefined e derrubava todo login com "credenciais inválidas".
      const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!SUPABASE_URL || !ANON_KEY) {
        throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias');
      }

      // `functionUrl` resolve para o proxy do dev server em desenvolvimento
      // (same-origin, sem CORS) e para a URL absoluta do projeto em produção.
      let res: Response;
      try {
        res = await fetch(functionUrl('auth-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body: JSON.stringify({ email, password }),
        });
      } catch (networkErr) {
        // Falha de rede/CORS — NÃO é credencial inválida. Reportar como tal
        // evita que o usuário fique tentando senhas corretas contra um
        // servidor inalcançável (e que a tentativa entre no contador de
        // brute-force).
        loggerService.error('Auth endpoint unreachable', { email }, networkErr as Error);
        const netErr = new Error(
          'Não foi possível contatar o servidor de autenticação. Verifique sua conexão e tente novamente.'
        );
        (netErr as Error & { code: string }).code = 'NETWORK_ERROR';
        throw netErr;
      }

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        code?: string;
        error?: string;
        locked_until?: string;
        session?: { access_token: string; refresh_token: string };
      };

      if (!res.ok || !body.success) {
        const code = body.code ?? '';
        if (code === 'ACCOUNT_LOCKED' || res.status === 429) {
          const msg = body.error ?? 'Conta temporariamente bloqueada por excesso de tentativas.';
          loggerService.warn('Login blocked - account locked or rate limited', { email, code });
          throw new Error(msg);
        }
        throw new Error(body.error ?? 'Credenciais inválidas.');
      }

      // Hydrate the Supabase client session from the token returned by the edge function.
      const session = body.session!;
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (sessionErr) throw sessionErr;

      // Check if MFA challenge is required (user enrolled TOTP → nextLevel = aal2)
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.[0];
        const mfaErr = new Error('Autenticação de dois fatores necessária.');
        (mfaErr as Error & { code: string; factorId: string }).code = 'mfa_required';
        (mfaErr as Error & { code: string; factorId: string }).factorId = totpFactor?.id || '';
        throw mfaErr;
      }

      loggerService.info('User signed in', { email });

      // P4-076: Pre-fetch dados críticos após login
      // - Não bloqueia a transição de página (fire-and-forget)
      // - AbortController garante cancelamento se logout ocorrer durante pre-fetch
      // - Fallback graceful: erro de pre-fetch nunca quebra o login
      const controller = new AbortController();
      const prefetchTimeout = window.setTimeout(() => controller.abort(), 10_000);

      void Promise.all([
        // Empresas do tenant (necessário em quase todas as páginas)
        queryClient.prefetchQuery({
          queryKey: ['empresas'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('empresas')
              .select('id, razao_social, nome_fantasia, cnpj')
              .limit(10);
            if (error) throw error;
            return data;
          },
        }),
        // Colaboradores ativos (dashboard + listagens)
        queryClient.prefetchQuery({
          queryKey: ['colaboradores', { status: 'ativo', limit: 50 }],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('colaboradores')
              .select('id, nome_completo, empresa_id, cargo, status, data_admissao')
              .eq('status', 'ativo')
              .limit(50);
            if (error) throw error;
            return data;
          },
        }),
      ])
        .then(() => loggerService.debug('Pre-fetch post-login concluído'))
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          loggerService.warn('Pre-fetch post-login falhou (não bloqueia login)', { email });
        })
        .finally(() => window.clearTimeout(prefetchTimeout));
    } catch (e) {
      const err = e as AuthError | Error;
      loggerService.warn('Sign in failed', { email, message: err.message });
      throw err;
    }
  }, []); // queryClient e supabase são singletons de módulo — deps estáveis, excluídas de propósito

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      loggerService.error('Sign out error', {}, e as Error);
    } finally {
      queryClient.clear();
      try {
        localStorage.clear();
      } catch {
        /* private browsing */
      }
      try {
        sessionStorage.clear();
      } catch {
        /* private browsing */
      }
      try {
        indexedDB.deleteDatabase('ponto-offline-db');
      } catch {
        /* ignore */
      }
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* caches API unavailable */
      }
      setUser(null);
      setSession(null);
      loggerService.info('User signed out - all local state cleared');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const pwCheck = await validatePasswordFull(password);
    if (!pwCheck.valid) {
      throw new Error(`Senha fraca: ${pwCheck.errors.join('; ')}`);
    }
    if (pwCheck.warnings?.length) {
      loggerService.warn('Password breach warning on signup', { email, warnings: pwCheck.warnings });
    }
    try {
      const sanitizedName = sanitizePlainText(name.trim(), 100);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: sanitizedName } },
      });
      if (error) throw error;
      loggerService.info('User signed up', { email });
    } catch (e) {
      loggerService.error('Sign up error', { email }, e as Error);
      throw e;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      loggerService.info('Password reset email sent', { email });
    } catch (e) {
      loggerService.error('Password reset request error', { email }, e as Error);
      throw e;
    }
  }, []);

  const isAdmin = useMemo(() => user?.roles?.includes('admin') ?? false, [user]);
  const hasRole = useCallback((role: AppRole) => user?.roles?.includes(role) ?? false, [user]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isReady,
      isAdmin,
      rolesStatus,
      rolesError,
      hasRole,
      signIn,
      signOut,
      signUp,
      resetPassword,
    }),
    [user, session, loading, isReady, isAdmin, rolesStatus, rolesError, hasRole, signIn, signOut, signUp, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
