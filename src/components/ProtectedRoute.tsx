import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { loggerService } from '@/services/loggerService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// H19: MFA gate for users who have enrolled TOTP.
// 'ok'               = no TOTP enrolled OR session already at aal2 — access granted
// 'pending-challenge' = enrolled TOTP but session still at aal1 — TOTP required
type MfaGate = 'checking' | 'ok' | 'pending-challenge';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isReady, loading } = useAuth();
  const [mfaGate, setMfaGate] = useState<MfaGate>('checking');
  const [factorId, setFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isReady || !user) return;

    let cancelled = false;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      .then(async ({ data }) => {
        if (cancelled) return;
        // Already at aal2 or no MFA enrolled → grant access
        if (!data || data.currentLevel === 'aal2' || data.nextLevel !== 'aal2') {
          setMfaGate('ok');
          return;
        }
        // Enrolled TOTP but session is still at aal1 — must complete challenge.
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find(f => f.status === 'verified');
        if (totp && !cancelled) {
          setFactorId(totp.id);
          setMfaGate('pending-challenge');
          loggerService.warn('H19: aal1 session with enrolled MFA — requiring TOTP challenge', { userId: user.id });
        } else if (!cancelled) {
          // Inconsistent state: nextLevel=aal2 but no verified factor found → allow through
          setMfaGate('ok');
        }
      })
      .catch(() => {
        // Fail-open: MFA is optional for regular users — a check failure shouldn't lock them out
        if (!cancelled) setMfaGate('ok');
      });

    return () => { cancelled = true; };
  }, [isReady, user]);

  useEffect(() => {
    if (mfaGate === 'pending-challenge') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mfaGate]);

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
      setMfaGate('ok');
    } catch {
      setChallengeError('Código inválido ou expirado. Tente novamente.');
      setTotpCode('');
      inputRef.current?.focus();
    } finally {
      setChallengeLoading(false);
    }
  };

  // Espera a inicialização completa (RESTORE SESSION) antes de decidir
  if (!isReady || (loading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[100px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8 relative z-10"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
            />
            <div className="p-8 rounded-full bg-card shadow-glass border border-border/50 relative m-2">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <motion.div
              animate={{
                y: [0, -4, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-2 -right-2 p-2 rounded-lg bg-primary shadow-glow-sm"
            >
              <Lock className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-h3 font-display font-bold tracking-tight">Sessão Segura</h2>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                Validando credenciais...
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mfaGate === 'checking') {
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

  if (mfaGate === 'pending-challenge') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-12 text-center min-h-screen bg-background">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-h2 font-display text-foreground">Verificação em Dois Fatores</h2>
          <p className="text-body text-muted-foreground">
            Sua conta possui autenticação de dois fatores ativa. Informe o código de 6 dígitos do seu app TOTP para continuar.
          </p>
        </div>
        <form onSubmit={handleTotpSubmit} className="w-full max-w-xs space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="pr-totp-code">Código do autenticador</Label>
            <Input
              id="pr-totp-code"
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

  return <>{children}</>;
}
