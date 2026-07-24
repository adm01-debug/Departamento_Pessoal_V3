import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loggerService } from '@/services/loggerService';

interface AdminRouteProps {
  children: React.ReactNode;
}

// 'pending-challenge' = enrolled but aal1 session — must complete TOTP before access
type MfaState = 'checking' | 'verified' | 'pending-challenge' | 'missing';

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isReady, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mfaState, setMfaState] = useState<MfaState>('checking');
  const [factorId, setFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isReady || !isAdmin || !user) return;

    let cancelled = false;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(async ({ data }) => {
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
        const totp = factors?.totp?.find(f => f.status === 'verified');
        if (totp && !cancelled) {
          setFactorId(totp.id);
          setMfaState('pending-challenge');
          loggerService.warn('Admin session at aal1 with enrolled MFA — requiring challenge', { userId: user.id });
        } else if (!cancelled) {
          setMfaState('missing');
        }
        return;
      }
      // No MFA enrolled at all
      if (!cancelled) setMfaState('missing');
    }).catch(() => {
      // Fail-closed: cannot verify MFA status → block access, not grant it
      if (!cancelled) {
        loggerService.warn('AdminRoute: MFA check failed — blocking access (fail-closed)', { userId: user?.id });
        setMfaState('missing');
      }
    });

    return () => { cancelled = true; };
  }, [isReady, isAdmin, user]);

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

  if (!isReady || (loading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Verificando privilégios...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
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

  if (mfaState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Verificando autenticação de dois fatores...</p>
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
              onChange={e => setTotpCode(e.target.value)}
              className="text-center text-xl tracking-widest rounded-xl"
              disabled={challengeLoading}
            />
          </div>
          {challengeError && (
            <p className="text-sm text-destructive text-center">{challengeError}</p>
          )}
          <Button type="submit" className="w-full gap-2" disabled={challengeLoading || totpCode.replace(/\s/g, '').length < 6}>
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
            Contas de administrador requerem MFA habilitado para acessar áreas privilegiadas.
            Configure o autenticador de dois fatores antes de prosseguir.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate('/perfil?tab=seguranca')}
        >
          <ShieldCheck className="h-4 w-4" />
          Configurar MFA agora
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
