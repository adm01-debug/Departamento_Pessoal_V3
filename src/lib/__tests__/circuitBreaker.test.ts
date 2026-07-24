import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../circuitBreaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 5000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED');
  });

  // -------------------------------------------------------------------------
  // CLOSED state — normal operation
  // -------------------------------------------------------------------------
  it('executes fn and returns its result when CLOSED', async () => {
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('propagates errors thrown by fn when CLOSED', async () => {
    const err = new Error('network error');
    await expect(cb.execute(() => Promise.reject(err))).rejects.toThrow('network error');
  });

  it('stays CLOSED and increments failure count without reaching threshold', async () => {
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    // 2 failures < threshold of 3
    expect(cb.getState()).toBe('CLOSED');
  });

  it('resets failure count to zero after a successful call', async () => {
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    // Success resets the counter
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe('CLOSED');
    // Two more failures should still not open (counter was reset to 0)
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    expect(cb.getState()).toBe('CLOSED');
  });

  // -------------------------------------------------------------------------
  // Transition CLOSED → OPEN
  // -------------------------------------------------------------------------
  it('transitions to OPEN after failureThreshold consecutive failures', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }
    expect(cb.getState()).toBe('OPEN');
  });

  // -------------------------------------------------------------------------
  // OPEN state — circuit tripped
  // -------------------------------------------------------------------------
  it('throws "Circuit Breaker is OPEN" error without calling fn when OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }
    const fn = vi.fn(() => Promise.resolve('should not run'));
    await expect(cb.execute(fn)).rejects.toThrow('Circuit Breaker is OPEN');
    expect(fn).not.toHaveBeenCalled();
  });

  it('getState() returns OPEN after threshold failures', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }
    expect(cb.getState()).toBe('OPEN');
  });

  // -------------------------------------------------------------------------
  // Transition OPEN → HALF_OPEN → CLOSED
  // -------------------------------------------------------------------------
  it('transitions from OPEN to HALF_OPEN after resetTimeout and allows execution', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }
    expect(cb.getState()).toBe('OPEN');

    // Advance fake clock past the resetTimeout
    vi.advanceTimersByTime(5001);

    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
  });

  it('transitions from HALF_OPEN to CLOSED after a successful probe', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }

    vi.advanceTimersByTime(5001);

    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe('CLOSED');
  });

  it('stays OPEN when the probe in HALF_OPEN fails', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }

    vi.advanceTimersByTime(5001);

    await cb.execute(() => Promise.reject(new Error('still failing'))).catch(() => {});
    expect(cb.getState()).toBe('OPEN');
  });

  it('does not transition to HALF_OPEN before resetTimeout has elapsed', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }

    // Advance only 4999ms — just under the threshold
    vi.advanceTimersByTime(4999);

    const fn = vi.fn(() => Promise.resolve('ok'));
    await expect(cb.execute(fn)).rejects.toThrow('Circuit Breaker is OPEN');
    expect(fn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Default options
  // -------------------------------------------------------------------------
  it('uses failureThreshold=5 and resetTimeout=30000 by default', async () => {
    const defaultCb = new CircuitBreaker();
    const fail = () => Promise.reject(new Error('x'));
    for (let i = 0; i < 4; i++) {
      await defaultCb.execute(fail).catch(() => {});
      expect(defaultCb.getState()).toBe('CLOSED');
    }
    await defaultCb.execute(fail).catch(() => {});
    expect(defaultCb.getState()).toBe('OPEN');
  });
});
