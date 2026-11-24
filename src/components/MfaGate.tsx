/**
 * Peças COMPARTILHADAS pelos guards de rota (`AdminRoute` e `PermissionRoute`).
 *
 * `MfaGate` é o portão de AUTENTICAÇÃO FORTE: exige a sessão em `aal2` e, quando
 * o usuário tem TOTP inscrito mas a sessão ainda está em `aal1`, pede o código de
 * 6 dígitos. É FAIL-CLOSED: se não der para verificar o nível, BLOQUEIA.
 *
 * POR QUE UM MÓDULO PRÓPRIO: o `AdminRoute` misturava DUAS responsabilidades —
 * "é admin?" e "cumpriu o MFA?" — e a Auditoria precisa da segunda SEM a
 * primeira. Extrair o portão deixa os dois guards exigirem o MESMO MFA, sem uma
 * segunda implementação e sem afrouxar nada: as telas e a máquina de estados
 * abaixo são as MESMAS que já rodavam (movidas na íntegra).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loggerService } from '@/services/loggerService';

// 'pending-challenge' = enrolled but aal1 session — must complete TOTP before access
type MfaState = 'checking' | 'verified' | 'pending-challenge' | 'missing';

/* ============================================================================
 * TEMPORARY DEVELOPMENT ACCESS
 * Remove when ti@promobrindes.com.br is deactivated.
 * ----------------------------------------------------------------------------
 * Exceção EXCLUSIVA e TEMPORÁRIA: as contas listadas abaixo passam pelo `MfaGate`
 * mesmo em `aal1` (sem MFA). Nenhum outro usuário é afetado — todo o fluxo de MFA
 * abaixo permanece idêntico para todos os demais.
 *
 * PARA REMOVER: apague este bloco, a chamada de `temBypassTemporarioDeMfa` dentro
 * de `MfaGate` e o `return` antecipado marcado com o mesmo comentário.
 * ========================================================================== */
const MFA_BYPASS_EMAILS = ['ti@promobrindes.com.br'];

/** TEMPORARY DEVELOPMENT ACCESS — comparação exata e case-insensitive. */
function temBypassTemporarioDeMfa(email?: string | null): boolean {
  return !!email && MFA_BYPASS_EMAILS.includes(email.trim().toLowerCase());
}

/** Tela de "verificando..." — usada pelos dois guards enquanto o estado resolve. */
export function VerificandoPrivilegios() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground animate-pulse">
          Verificando privilégios...
        </p>
      </div>
    </div>
  );
}

/**
 * Dados do diagnóstico de autorização exibidos na tela de negação.
 * ⚠️ TEMPORÁRIO: só é renderizado em development (ver `DiagnosticoPanel`).
 */
export interface DiagnosticoAutorizacao {
  userId: string;
  email: string;
  roles: string[];
  rolesStatus: string;
  rolesError: string | null;
  permission: string;
  consultaAtiva: boolean;
  consultaSituacao: string;
  linhas: { role: string; resource: string; action: string; allowed: boolean }[];
  encontrada: boolean;
  allowed: boolean | null;
  motivo: string;
}

/** Nível do MFA da sessão atual (`aal1`/`aal2`) — usado no diagnóstico. */
function useNivelMfa(): string {
  const [nivel, setNivel] = useState('verificando...');
  useEffect(() => {
    let cancelado = false;
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (!cancelado) setNivel(data?.currentLevel ?? 'desconhecido');
      })
      .catch(() => {
        if (!cancelado) setNivel('falha ao verificar');
      });
    return () => {
      cancelado = true;
    };
  }, []);
  return nivel;
}

function DiagRow({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{rotulo}:</dt>
      <dd className="break-all">{valor}</dd>
    </div>
  );
}

/**
 * ⚠️ BLOCO TEMPORÁRIO (somente development, mesma guarda dos mocks do projeto:
 * `DEV && MODE !== 'test'`) — mostra POR QUE a autorização foi negada, na PRÓPRIA TELA,
 * sem depender do console. Remover quando a causa estiver fechada.
 */
function DiagnosticoPanel({ d }: { d: DiagnosticoAutorizacao }) {
  const mfa = useNivelMfa();
  return (
    <div className="mt-6 w-full max-w-lg rounded-lg border border-border bg-muted/40 p-4 text-left">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Diagnóstico de autorização
      </p>
      <dl className="space-y-1 font-mono text-[11px] leading-relaxed text-foreground">
        <DiagRow rotulo="Usuário" valor={`${d.userId} (${d.email})`} />
        <DiagRow
          rotulo="Roles"
          valor={`${JSON.stringify(d.roles)} — status: ${d.rolesStatus}${d.rolesError ? ` — ${d.rolesError}` : ''}`}
        />
        <DiagRow rotulo="Permissão solicitada" valor={d.permission} />
        <DiagRow
          rotulo="Consulta permissions"
          valor={d.consultaAtiva ? d.consultaSituacao : 'não executada (nenhum papel carregado)'}
        />
        <DiagRow rotulo="Registros da matriz" valor={String(d.linhas.length)} />
        <DiagRow rotulo="Permissão encontrada" valor={d.encontrada ? `sim (allowed=${String(d.allowed)})` : 'não'} />
        <DiagRow rotulo="MFA" valor={mfa} />
        <DiagRow rotulo="Motivo final da negação" valor={d.motivo} />
      </dl>
      {d.linhas.length > 0 ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded bg-background p-2 text-[10px] text-muted-foreground">
          {JSON.stringify(d.linhas, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/** Tela de negação de acesso — usada pelos dois guards (mesmo texto de sempre). */
export function AcessoRestrito({ diagnostico }: { diagnostico?: DiagnosticoAutorizacao } = {}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive/60" />
      <h2 className="text-h2 font-display text-foreground">Acesso Restrito</h2>
      <p className="text-body text-muted-foreground max-w-md">
        Você não possui permissão para acessar esta página. Contate o administrador do sistema.
      </p>
      {diagnostico && import.meta.env.DEV && import.meta.env.MODE !== 'test' ? (
        <DiagnosticoPanel d={diagnostico} />
      ) : null}
    </div>
  );
}

/**
 * Falha de VERIFICAÇÃO — não é negativa de acesso. Usada quando não foi possível
 * confirmar a permissão (RPC de papéis falhou/timeout, ou a consulta à matriz deu erro).
 * Existe para que uma falha técnica JAMAIS apareça como "Acesso Restrito".
 */
export function ErroVerificacaoPermissao({ permission, detalhe }: { permission: string; detalhe?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <ShieldAlert className="h-16 w-16 text-warning/70" />
      <h2 className="text-h2 font-display text-foreground">Não foi possível verificar sua autorização</h2>
      <p className="text-body text-muted-foreground max-w-md">
        Não conseguimos confirmar sua permissão para <span className="font-mono">{permission}</span>. Isto é uma falha
        de verificação, não uma negativa de acesso — tente novamente em instantes.
      </p>
      {detalhe ? (
        <p className="max-w-lg break-all rounded border border-border bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
          {detalhe}
        </p>
      ) : null}
      <Button className="gap-2" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </Button>
    </div>
  );
}

/**
 * Portão de MFA: só renderiza `children` quando a sessão está em `aal2`.
 * O usuário já foi validado (e autorizado) pelo guard que monta este componente.
 */
export function MfaGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mfaState, setMfaState] = useState<MfaState>('checking');
  const [factorId, setFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // TEMPORARY DEVELOPMENT ACCESS
  // Remove when ti@promobrindes.com.br is deactivated.
  const possuiBypassTemporario = temBypassTemporarioDeMfa(user?.email);

  useEffect(() => {
    if (!user) return;
    // TEMPORARY DEVELOPMENT ACCESS — Remove when ti@promobrindes.com.br is deactivated.
    // Nem consulta o AAL: o `return` antecipado do render já entrega `children` (só esta conta).
    if (possuiBypassTemporario) return;

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
            loggerService.warn('Sessão aal1 com MFA inscrito — exigindo desafio TOTP', { userId: user.id });
          } else if (!cancelled) {
            setMfaState('missing');
          }
          return;
        }
        // No MFA enrolled at all
        if (!cancelled) setMfaState('missing');
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
  }, [user, possuiBypassTemporario]);

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

  // TEMPORARY DEVELOPMENT ACCESS
  // Remove when ti@promobrindes.com.br is deactivated.
  // (Só esta conta chega aqui com bypass — os demais seguem o fluxo de MFA abaixo.)
  if (possuiBypassTemporario) return <>{children}</>;

  if (mfaState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground animate-pulse">
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
            Contas de administrador requerem MFA habilitado para acessar áreas privilegiadas. Configure o autenticador
            de dois fatores antes de prosseguir.
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
