import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBruteForceProtection } from '../useBruteForceProtection';

/**
 * Este hook é intencionalmente offline: o bloqueio real de conta é decidido
 * pela edge function `auth-login` (service_role). As RPCs `record_failed_login`
 * e `check_login_lock` foram revogadas de anon/authenticated porque permitiam
 * bloquear a conta de terceiros conhecendo apenas o e-mail. Os testes abaixo
 * garantem que o hook nunca volte a chamá-las.
 */
const rpcSpy = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    get rpc() {
      return rpcSpy;
    },
  },
}));

const EMAIL = 'user@test.com';

describe('useBruteForceProtection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('estado inicial', () => {
    it('começa destravado e sem tentativas', () => {
      const { result } = renderHook(() => useBruteForceProtection());
      expect(result.current.lockState).toEqual({
        isLocked: false,
        remainingSeconds: 0,
        attempts: 0,
      });
    });
  });

  describe('superfície de rede', () => {
    it('não chama nenhuma RPC do banco em nenhuma das operações', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.checkLock(EMAIL);
        await result.current.recordFailedAttempt(EMAIL);
        await result.current.resetAttempts(EMAIL);
      });

      // Regressão: qualquer chamada aqui reabre o DoS de lockout por e-mail.
      expect(rpcSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkLock', () => {
    it('retorna false quando não há bloqueio local', async () => {
      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean | undefined;

      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });

      expect(locked).toBe(false);
      expect(result.current.lockState.isLocked).toBe(false);
    });

    it('retorna false para e-mail vazio', async () => {
      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean | undefined;

      await act(async () => {
        locked = await result.current.checkLock('');
      });

      expect(locked).toBe(false);
    });

    it('retorna true enquanto o bloqueio local estiver vigente', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        for (let i = 0; i < 5; i += 1) {
          await result.current.recordFailedAttempt(EMAIL);
        }
      });

      let locked: boolean | undefined;
      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });

      expect(locked).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBeGreaterThan(0);
    });

    it('libera automaticamente depois que o bloqueio expira', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        for (let i = 0; i < 5; i += 1) {
          await result.current.recordFailedAttempt(EMAIL);
        }
      });

      // Avança além dos 5 minutos de espera.
      const agora = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(agora + 6 * 60 * 1000);

      let locked: boolean | undefined;
      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });

      expect(locked).toBe(false);
      expect(result.current.lockState.isLocked).toBe(false);
    });
  });

  describe('recordFailedAttempt', () => {
    it('incrementa o contador sem travar antes do limite', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt(EMAIL);
        await result.current.recordFailedAttempt(EMAIL);
      });

      expect(result.current.lockState.attempts).toBe(2);
      expect(result.current.lockState.isLocked).toBe(false);
    });

    it('trava a UI na quinta falha', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        for (let i = 0; i < 5; i += 1) {
          await result.current.recordFailedAttempt(EMAIL);
        }
      });

      expect(result.current.lockState.attempts).toBe(5);
      expect(result.current.lockState.isLocked).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBe(300);
    });

    it('mantém contadores independentes por e-mail', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        for (let i = 0; i < 5; i += 1) {
          await result.current.recordFailedAttempt(EMAIL);
        }
      });

      let outroBloqueado: boolean | undefined;
      await act(async () => {
        outroBloqueado = await result.current.checkLock('outro@test.com');
      });

      expect(outroBloqueado).toBe(false);
    });

    it('ignora e-mail vazio', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt('');
      });

      expect(result.current.lockState.attempts).toBe(0);
    });
  });

  describe('resetAttempts', () => {
    it('zera o contador após login bem-sucedido', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt(EMAIL);
        await result.current.recordFailedAttempt(EMAIL);
        await result.current.resetAttempts(EMAIL);
      });

      expect(result.current.lockState).toEqual({
        isLocked: false,
        remainingSeconds: 0,
        attempts: 0,
      });

      let locked: boolean | undefined;
      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });
      expect(locked).toBe(false);
    });
  });

  describe('applyServerLock', () => {
    it('reflete o bloqueio decidido pelo servidor', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      act(() => {
        result.current.applyServerLock(EMAIL, 900);
      });

      expect(result.current.lockState.isLocked).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBe(900);

      let locked: boolean | undefined;
      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });
      expect(locked).toBe(true);
    });

    it('usa a espera padrão quando o servidor não informa a duração', () => {
      const { result } = renderHook(() => useBruteForceProtection());

      act(() => {
        result.current.applyServerLock(EMAIL, 0);
      });

      expect(result.current.lockState.remainingSeconds).toBe(300);
    });
  });

  describe('resiliência do sessionStorage', () => {
    it('trata conteúdo corrompido como contador zerado', async () => {
      const chave = `__bf_${btoa(EMAIL).replace(/=/g, '')}`;
      sessionStorage.setItem(chave, 'não-é-json');

      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean | undefined;
      await act(async () => {
        locked = await result.current.checkLock(EMAIL);
      });

      expect(locked).toBe(false);
    });
  });
});
