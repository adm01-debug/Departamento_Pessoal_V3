import { useState, useEffect } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { useBruteForceProtection } from '@/hooks/useBruteForceProtection';
import { LockoutMessage } from '@/components/login/LockoutMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, Shield, Users, BarChart3, FileText, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import govbrLogo from '@/assets/govbr-logo.svg';

const features = [
  { icon: Users, label: 'Gestão completa de Colaboradores', desc: 'Cadastro, documentos, benefícios e histórico' },
  { icon: Shield, label: 'eSocial 100% Integrado', desc: 'Envio automático de eventos obrigatórios' },
  { icon: BarChart3, label: 'Relatórios Inteligentes', desc: 'Dashboards com KPIs em tempo real' },
  { icon: FileText, label: 'Folha de Pagamento', desc: 'Cálculos trabalhistas atualizados 2026' },
];

const SECURITY_REASONS: Record<string, string> = {
  session_anomaly: 'Sessão encerrada por motivos de segurança. Faça login novamente.',
  idle_timeout: 'Sessão expirada por inatividade. Faça login novamente.',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [govBrLoading, setGovBrLoading] = useState(false);
  const [securityNotice, setSecurityNotice] = useState('');
  const [mfaPending, setMfaPending] = useState<{ factorId: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const { signIn, resetPassword, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lockState, checkLock, recordFailedAttempt, resetAttempts } = useBruteForceProtection();

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason && SECURITY_REASONS[reason]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecurityNotice(SECURITY_REASONS[reason]);
    }
  }, [searchParams]);


  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        throw result.error;
      }
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Erro ao fazer login com Google.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGovBrSignIn = async () => {
    setGovBrLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-gov-br', {
        body: { 
          action: 'get_auth_url', 
          redirectUri: `${window.location.origin}/auth/callback` 
        },
      });
      if (error) throw error;
      if (data?.url) {
        const parsed = new URL(data.url);
        if (parsed.protocol !== 'https:' || !/\.gov\.br$/i.test(parsed.hostname)) {
          throw new Error('URL de redirecionamento inválida');
        }
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError('Erro ao iniciar integração Gov.br');
      toast.error(safeErrorMessage(err, 'Erro ao iniciar integração Gov.br.'));
    } finally {
      setGovBrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockState.isLocked) return;
    setLoading(true);
    setError('');
    try {
      const isLocked = await checkLock(email);
      if (isLocked) {
        setLoading(false);
        return;
      }
      await signIn(email, password);
      await resetAttempts(email);
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.code === 'mfa_required') {
        // MFA enrolled — show TOTP challenge without recording a failed attempt
        setMfaPending({ factorId: err.factorId || '' });
        return;
      }
      await recordFailedAttempt(email);
      const msg = err?.message;
      if (msg && msg.includes('bloqueada')) {
        setError(msg);
      } else {
        setError('Email ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaPending || !totpCode) return;
    setLoading(true);
    setError('');
    try {
      const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaPending.factorId,
        code: totpCode.replace(/\s/g, ''),
      });
      if (challengeError) throw challengeError;
      await resetAttempts(email);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Informe seu email');
      return;
    }
    const lastReset = Number(sessionStorage.getItem('__pwd_reset_ts') || '0');
    if (Date.now() - lastReset < 60_000) {
      setError('Aguarde 1 minuto antes de solicitar novamente.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: rl } = await supabase.rpc('check_rate_limit', {
        check_endpoint: 'password_reset',
        check_ip: 'client',
        check_user_id: undefined,
      });
      if (rl && typeof rl === 'object' && (rl as any).blocked) {
        setError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
        return;
      }
      await resetPassword(email);
      sessionStorage.setItem('__pwd_reset_ts', String(Date.now()));
      setForgotSent(true);
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Erro ao enviar email de recuperação.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <PageTitle title="Login" description="Acesse o Sistema de Departamento Pessoal" />
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Dark branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[hsl(240,24%,5%)]">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/4" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/6 to-transparent rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top - Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-glow-lime">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Sistema DP</h1>
              <p className="text-xs text-white/40 font-body tracking-wider uppercase">Departamento Pessoal</p>
            </div>
          </motion.div>

          {/* Center - Value prop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-display font-bold text-white leading-tight mb-4">
                Gestão completa do seu
                <br />
                <span className="text-primary">Departamento Pessoal</span>
              </h2>
              <p className="text-base text-white/50 font-body max-w-md leading-relaxed">
                Automatize processos, reduza erros e ganhe tempo com uma plataforma inteligente e moderna.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {features.map(({ icon: Icon, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-primary/20 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-white/90 font-body mb-1">{label}</p>
                  <p className="text-xs text-white/35 font-body leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom - Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-4"
          >
            <div className="flex -space-x-2">
              {['bg-primary/60', 'bg-info/60', 'bg-success/60', 'bg-warning/60'].map((bg, i) => (
                <div key={i} className={cn('h-8 w-8 rounded-full border-2 border-[hsl(240,24%,5%)]', bg)} />
              ))}
            </div>
            <div>
              <p className="text-sm text-white/60 font-body">
                <span className="text-primary font-semibold">200+</span> empresas confiam no Sistema DP
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold">Sistema DP</h1>
          </div>

          <Card className="border border-border/30 shadow-elevated rounded-xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl font-display">
                {mfaPending ? 'Verificação em duas etapas' : forgotMode ? 'Recuperar senha' : 'Bem-vindo de volta'}
              </CardTitle>
              <CardDescription className="font-body">
                {mfaPending
                  ? 'Digite o código do seu aplicativo autenticador'
                  : forgotMode
                  ? 'Informe seu email para receber o link de recuperação'
                  : 'Faça login para acessar o sistema'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {mfaPending ? (
                <form onSubmit={handleMfaSubmit} className="space-y-5">
                  <div className="flex justify-center mb-2">
                    <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                      <ShieldCheck className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totp" className="font-body text-sm font-medium">Código TOTP (6 dígitos)</Label>
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9 ]*"
                      maxLength={7}
                      autoComplete="one-time-code"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="000 000"
                      required
                      autoFocus
                      className="h-11 text-center text-lg tracking-widest rounded-lg border-border/50 focus:border-primary/50 font-mono"
                    />
                  </div>
                  {error && (
                    <motion.p role="alert" aria-live="assertive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-lg">
                      {error}
                    </motion.p>
                  )}
                  <Button type="submit" className="w-full h-11 rounded-lg font-body font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-glow" disabled={loading || totpCode.replace(/\s/g,'').length !== 6}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar
                  </Button>
                  <Button type="button" variant="ghost" className="w-full font-body text-sm" onClick={() => { setMfaPending(null); setTotpCode(''); setError(''); }}>
                    Voltar ao login
                  </Button>
                </form>
              ) : (
              <>
              {securityNotice && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning-foreground">
                  <Shield className="h-4 w-4 shrink-0 text-warning" />
                  <span className="font-body">{securityNotice}</span>
                </motion.div>
              )}
              {forgotMode ? (
                forgotSent ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-4">
                    <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-lg">Email enviado!</p>
                      <p className="text-sm text-muted-foreground font-body mt-1">
                        Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-lg font-body"
                      onClick={() => { setForgotMode(false); setForgotSent(false); }}
                    >
                      Voltar ao login
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="font-body text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          className="h-11 pl-10 rounded-lg border-border/50 focus:border-primary/50 font-body"
                        />
                      </div>
                    </div>
                    {error && (
                      <motion.p role="alert" aria-live="assertive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-lg">
                        {error}
                      </motion.p>
                    )}
                    <Button type="submit" className="w-full h-11 rounded-lg font-body font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-glow" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar link de recuperação
                    </Button>
                    <Button type="button" variant="ghost" className="w-full font-body text-sm" onClick={() => { setForgotMode(false); setError(''); }}>
                      Voltar ao login
                    </Button>
                  </form>
                )
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-body text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        autoComplete="username"
                        className="h-11 pl-10 rounded-lg border-border/50 focus:border-primary/50 font-body"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-body text-sm font-medium">Senha</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline font-body"
                        onClick={() => { setForgotMode(true); setError(''); }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-11 pl-10 pr-10 rounded-lg border-border/50 focus:border-primary/50 font-body"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {lockState.isLocked && (
                    <LockoutMessage remainingSeconds={lockState.remainingSeconds} />
                  )}
                  {error && !lockState.isLocked && (
                    <motion.p role="alert" aria-live="assertive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-lg">
                      {error}
                    </motion.p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-lg font-body font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-glow"
                    disabled={loading || authLoading || lockState.isLocked}
                  >
                    {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>


                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground font-body">ou</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-lg font-body font-medium gap-2 border-border/50 hover:bg-accent/50 text-xs px-2"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                    >
                      {googleLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Google
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-lg font-body font-medium gap-2 border-border/50 hover:bg-accent/50 text-xs px-2 overflow-hidden group relative"
                      onClick={handleGovBrSignIn}
                      disabled={govBrLoading}
                    >
                      {govBrLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                          <img src={govbrLogo} alt="Gov.br" className="h-4 w-auto" />
                          <span className="truncate font-bold">Gov.br</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
              </>
              )}
            </CardContent>
          </Card>

          {/* Security badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex items-center justify-center gap-2 text-muted-foreground/50"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-body">Protegido por criptografia ponta-a-ponta • LGPD Compliant</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
    </>
  );
}
