import { useState, useCallback } from 'react';

interface LockState {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
}

const INITIAL: LockState = { isLocked: false, remainingSeconds: 0, attempts: 0 };

/** Espelho local do escalonamento aplicado pelo servidor (5 → 7 → 10 falhas). */
const LOCAL_MAX_ATTEMPTS = 5;
const LOCAL_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos

const LOCAL_KEY = (email: string) =>
  `__bf_${btoa(email.toLowerCase()).replace(/=/g, '')}`;

interface LocalCounter {
  count: number;
  lockedUntil: number; // epoch ms, 0 = sem bloqueio
}

function readLocal(email: string): LocalCounter {
  try {
    const raw = sessionStorage.getItem(LOCAL_KEY(email));
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LocalCounter>;
    return {
      count: Number.isFinite(parsed.count) ? Number(parsed.count) : 0,
      lockedUntil: Number.isFinite(parsed.lockedUntil) ? Number(parsed.lockedUntil) : 0,
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeLocal(email: string, counter: LocalCounter): void {
  try {
    sessionStorage.setItem(LOCAL_KEY(email), JSON.stringify(counter));
  } catch {
    /* storage cheio ou bloqueado — o servidor continua sendo a autoridade */
  }
}

function clearLocal(email: string): void {
  try {
    sessionStorage.removeItem(LOCAL_KEY(email));
  } catch {
    /* ignore */
  }
}

/**
 * Feedback de UI para tentativas de login malsucedidas.
 *
 * IMPORTANTE — este hook é deliberadamente **apenas cosmético**. O bloqueio
 * real de conta é decidido e persistido no servidor, dentro da edge function
 * `auth-login`, que roda com service_role e chama
 * `check_account_lockout` / `record_login_attempt`. `AuthContext.signIn`
 * já roteia 100% dos logins por lá, então a proteção não depende desta tela.
 *
 * Antes, este hook chamava as RPCs `record_failed_login` e `check_login_lock`
 * diretamente com a chave anônima. Isso abria um ataque de negação de serviço:
 * conhecendo apenas o e-mail da vítima, qualquer pessoa podia chamar a RPC
 * cinco vezes e deixar a conta bloqueada por até 60 minutos, sem nunca tentar
 * uma senha. Quem incrementa o contador de falhas precisa ser quem sabe que a
 * senha falhou — o servidor. O EXECUTE dessas RPCs foi revogado de anon e
 * authenticated; qualquer chamada a partir do navegador agora é rejeitada pelo
 * banco, e por isso elas foram removidas daqui.
 *
 * O contador em sessionStorage sobrevive apenas para evitar rajadas na própria
 * aba e dar retorno imediato ao usuário. Ele é trivialmente apagável pelo
 * atacante — e tudo bem, porque não é ele que protege a conta.
 */
export function useBruteForceProtection() {
  const [lockState, setLockState] = useState<LockState>(INITIAL);

  /** Retorna true quando a aba já sabe que o usuário está em espera. */
  const checkLock = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false;

    const local = readLocal(email);
    if (local.lockedUntil > Date.now()) {
      const remaining = Math.ceil((local.lockedUntil - Date.now()) / 1000);
      setLockState({ isLocked: true, remainingSeconds: remaining, attempts: local.count });
      return true;
    }

    // Expirou: limpa o resíduo para não bloquear a próxima tentativa legítima.
    if (local.lockedUntil !== 0) {
      writeLocal(email, { count: local.count, lockedUntil: 0 });
    }
    setLockState((s) => ({ ...s, isLocked: false, remainingSeconds: 0 }));
    return false;
  }, []);

  /**
   * Registra a falha apenas no estado local da aba. O servidor já registrou a
   * mesma tentativa ao responder o login — nada é enviado daqui.
   */
  const recordFailedAttempt = useCallback(async (email: string) => {
    if (!email) return;

    const local = readLocal(email);
    const newCount = local.count + 1;
    const lockedUntil = newCount >= LOCAL_MAX_ATTEMPTS ? Date.now() + LOCAL_LOCKOUT_MS : 0;
    writeLocal(email, { count: newCount, lockedUntil });

    setLockState({
      attempts: newCount,
      isLocked: lockedUntil > 0,
      remainingSeconds: lockedUntil > 0 ? LOCAL_LOCKOUT_MS / 1000 : 0,
    });
  }, []);

  /** Login bem-sucedido: zera o contador da aba. */
  const resetAttempts = useCallback(async (email: string) => {
    if (!email) return;
    clearLocal(email);
    setLockState(INITIAL);
  }, []);

  /**
   * Aplica na UI um bloqueio que o servidor já decidiu (resposta
   * ACCOUNT_LOCKED / 429 da edge function auth-login). Esta é a única fonte
   * de verdade sobre bloqueio real.
   */
  const applyServerLock = useCallback((email: string, remainingSeconds: number) => {
    const safeRemaining = Number.isFinite(remainingSeconds) && remainingSeconds > 0
      ? Math.ceil(remainingSeconds)
      : LOCAL_LOCKOUT_MS / 1000;
    if (email) {
      writeLocal(email, { count: LOCAL_MAX_ATTEMPTS, lockedUntil: Date.now() + safeRemaining * 1000 });
    }
    setLockState({ isLocked: true, remainingSeconds: safeRemaining, attempts: LOCAL_MAX_ATTEMPTS });
  }, []);

  return { lockState, checkLock, recordFailedAttempt, resetAttempts, applyServerLock };
}
