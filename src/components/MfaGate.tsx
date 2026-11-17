/**
 * Pecas COMPARTILHADAS pelas guardas de rota (`AdminRoute` e `PermissionRoute`).
 *
 * `MfaGate` e o portao de AUTENTICACAO FORTE: exige a sessao em `aal2` e, quando
 * o usuario tem TOTP inscrito mas a sessao ainda esta em `aal1`, pede o codigo
 * de 6 digitos. E FAIL-CLOSED: se nao der para verificar o nivel, BLOQUEIA.
 *
 * POR QUE UM MODULO PROPRIO: o `AdminRoute` misturava DUAS responsabilidades —
 * "e admin?" e "cumpriu o MFA?" — e o `PermissionRoute` precisa da segunda SEM
 * a primeira (a matriz do banco concede `auditoria.read` a gestor e rh, nao so
 * a admin). Extrair o portao deixa as duas guardas exigirem o MESMO MFA, sem
 * uma segunda implementacao e sem afrouxar nada: a maquina de estados e as
 * telas abaixo foram movidas NA INTEGRA do `AdminRoute`, com o mesmo texto, as
 * mesmas condicoes e o mesmo fail-closed.
 *
 * A unica porta de saida continua sendo `VITE_E2E_BYPASS_MFA`, que ja existia
 * na main e serve a suite de E2E. A branch `muri`, de onde vem a ideia desta
 * extracao, tinha TAMBEM um bypass por lista de e-mail fixa no codigo; isso
 * NAO foi trazido.
 */
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loggerService } from '@/services/loggerService';
import { useAuth } from '@/hooks/useAuth';

// 'pending-challenge' = enrolled but aal1 session — must complete TOTP before access
type MfaState = 'checking' | 'verified' | 'pending-challenge' | 'missing';

/** Tela de espera enquanto autenticacao/papeis/permissoes nao resolveram. */
export function VerificandoPrivilegios() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Verificando privilégios...
        </p>
      </div>
    </div>
  );
}

/** Negativa de acesso: a verificacao CONCLUIU e a permissao nao esta concedida. */
export function AcessoRestrito() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive/60" />
      <h2 className="text-h2 font-display text-foreground">Acesso Restrito</h2>
      <p className="text-body text-muted-foreground max-w-md">
        Você não possui permissão para acessar esta página. Contate o administrador do sistema.
      </p>
    </div>
  );
}

/**
 * Falha TECNICA de verificacao — nao e negativa de acesso.
 *
 * Existe para nao mentir: quando o RPC de papeis cai ou a consulta a matriz
 * falha, dizer "Acesso Restrito" faz o usuario legitimo pensar que perdeu
 * permissao. Aqui a tela diz que nao foi possivel verificar e oferece recarregar.
 *
 * Nao imprime id, e-mail nem as linhas da matriz: diagnostico de permissao em
 * tela e dado interno, e vai para o log.
 */
export function ErroVerificacaoPermissao({ permission, detalhe }: { permission: string; detalhe: string }) {
  useEffect(() => {
    loggerService.warn('Falha ao verificar permissão de rota', { permission, detalhe });
  }, [permission, detalhe]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <ShieldAlert className="h-16 w-16 text-warning/70" />
      <h2 className="text-h2 font-display text-foreground">Não foi possível verificar seu acesso</h2>
      <p className="text-body text-muted-foreground max-w-md">
        Isto não significa que você perdeu a permissão: a verificação em si falhou. Recarregue a página; se persistir,
        avise o administrador.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Recarregar
      </Button>
    </div>
  );
}

/** Portao de MFA. Renderiza `children` somente com a sessao em `aal2`. */
export function MfaGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const [mfaState, setMfaState] = useState<MfaState>(
    import.meta.env.VITE_E2E_BYPASS_MFA === 'true' ? 'verified' : 'checking'
  );
  const [factorId, setFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isReady || !user) return;
    if (import.meta.env.VITE_E2E_BYPASS_MFA === 'true') return;

    let cancelled = false;
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(async ({ data }) => {
        if (cancelled) return;
        // Session already at aal2 — MFA fully satisfied
        if (data?.currentLevel === 'aal2') {
          setMfaState('verified');
          return;
        }
        // nextLevel aal2 means user enrolled TOTP but this session is still at aal1.
        // Must complete TOTP challenge — do NOT grant access until aal2 is reached.
        if (data?.nextLevel === 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.find((f) => f.status === 'verified');
          if (totp && !cancelled) {
            setFactorId(totp.id);
            setMfaState('pending-challenge');
            loggerService.warn('Sessão em aal1 com MFA inscrito — exigindo desafio', { userId: user.id });
          } else if (!cancelled) {
            setMfaState('missing');
          }
          return;
        }
        // No MFA enrolled at all
        setMfaState('missing');
      })
      .catch(() => {
        // Fail-closed: cannot verify MFA status → block access, not grant it
        if (!cancelled) {
          loggerService.warn('MfaGate: verificação de MFA falhou — bloqueando (fail-closed)', { userId: user?.id });
          setMfaState('missing');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  useEffect(() => {
    if (mfaState === 'pending-challenge') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mfaState]);

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || !factorId) return;
    setChallengeLoading(true);
    setChallengeError('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: totpCode.replace(/\s/g, ''),
      });
      if (error) throw error;
      setMfaState('verified');
    } catch {
      setChallengeError('Código inválido ou expirado. Tente novamente.');
      setTotpCode('');
      inputRef.current?.focus();
    } finally {
      setChallengeLoading(false);
    }
  };

  if (mfaState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Verificando autenticação de dois fatores...
          </p>
        </div>
      </div>
    );
  }

  if (mfaState === 'pending-challenge') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-12 text-center min-h-screen bg-background">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-h2 font-display text-foreground">Verificação em Dois Fatores</h2>
          <p className="text-body text-muted-foreground">
            Esta área requer confirmação do seu autenticador. Informe o código de 6 dígitos do seu app TOTP.
          </p>
        </div>
        <form onSubmit={handleTotpSubmit} className="w-full max-w-xs space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="totp-code">Código do autenticador</Label>
            <Input
              id="totp-code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="000 000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="text-center text-xl tracking-widest rounded-xl"
              disabled={challengeLoading}
            />
          </div>
          {challengeError && <p className="text-sm text-destructive text-center">{challengeError}</p>}
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={challengeLoading || totpCode.replace(/\s/g, '').length < 6}
          >
            {challengeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verificar
          </Button>
        </form>
      </div>
    );
  }

  if (mfaState === 'missing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-12 text-center min-h-screen bg-background">
        <div className="h-20 w-20 rounded-full bg-warning/15 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-warning" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-h2 font-display text-foreground">Autenticação de Dois Fatores Obrigatória</h2>
          <p className="text-body text-muted-foreground">
            Esta área privilegiada requer MFA habilitado. Configure o autenticador de dois fatores antes de prosseguir.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/perfil?tab=seguranca')}>
          <ShieldCheck className="h-4 w-4" />
          Configurar MFA agora
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
