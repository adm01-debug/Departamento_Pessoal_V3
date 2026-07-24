import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityService } from '../securityService';

const { mockFrom, mockLoggerError, mockLoggerInfo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError, info: mockLoggerInfo },
}));

// select → order → [optional limit] → resolvedValue
function setupSelectOrderLimitChain(data: any[], error: any = null) {
  const limitFn = vi.fn().mockResolvedValue({ data, error });
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, limitFn };
}

// select → order → resolvedValue (no limit)
function setupSelectOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn };
}

// delete → eq → resolvedValue
function setupDeleteEqChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// update → eq → resolvedValue
function setupUpdateEqChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// ─── getBlockedIps ────────────────────────────────────────────────────────────

describe('securityService.getBlockedIps', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns blocked IPs ordered by created_at desc', async () => {
    const records = [{ id: '1', ip_address: '1.2.3.4' }];
    const { orderFn } = setupSelectOrderChain(records);
    const result = await securityService.getBlockedIps();
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectOrderChain(null as any);
    expect(await securityService.getBlockedIps()).toEqual([]);
  });

  it('throws and logs error on DB failure', async () => {
    setupSelectOrderChain([], { message: 'fail' });
    await expect(securityService.getBlockedIps()).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ─── unblockIp ────────────────────────────────────────────────────────────────

describe('securityService.unblockIp', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes blocked_ip by id and logs info', async () => {
    const { eqFn } = setupDeleteEqChain();
    await securityService.unblockIp('ip-1');
    expect(eqFn).toHaveBeenCalledWith('id', 'ip-1');
    expect(mockLoggerInfo).toHaveBeenCalledWith('IP unblocked', { id: 'ip-1' });
  });

  it('throws and logs error on DB failure', async () => {
    setupDeleteEqChain({ message: 'fail' });
    await expect(securityService.unblockIp('ip-1')).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ─── getLoginAttempts ─────────────────────────────────────────────────────────

describe('securityService.getLoginAttempts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns login attempts with limit 100', async () => {
    const records = [{ id: '1', email: 'a@b.com', success: false }];
    const { limitFn } = setupSelectOrderLimitChain(records);
    const result = await securityService.getLoginAttempts();
    expect(result).toEqual(records);
    expect(limitFn).toHaveBeenCalledWith(100);
  });

  it('returns empty array when data is null', async () => {
    setupSelectOrderLimitChain(null as any);
    expect(await securityService.getLoginAttempts()).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectOrderLimitChain([], { message: 'fail' });
    await expect(securityService.getLoginAttempts()).rejects.toBeDefined();
  });
});

// ─── getSecurityAlerts ────────────────────────────────────────────────────────

describe('securityService.getSecurityAlerts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns security alerts', async () => {
    const records = [{ id: 'a1', type: 'brute_force', severity: 'high' }];
    const { limitFn } = setupSelectOrderLimitChain(records);
    const result = await securityService.getSecurityAlerts();
    expect(result).toEqual(records);
    expect(limitFn).toHaveBeenCalledWith(100);
  });

  it('returns empty array when data is null', async () => {
    setupSelectOrderLimitChain(null as any);
    expect(await securityService.getSecurityAlerts()).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectOrderLimitChain([], { message: 'fail' });
    await expect(securityService.getSecurityAlerts()).rejects.toBeDefined();
  });
});

// ─── getGeoBlockedAttempts ────────────────────────────────────────────────────

describe('securityService.getGeoBlockedAttempts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns geo-blocked attempts', async () => {
    const records = [{ id: 'g1', ip_address: '5.6.7.8', country_code: 'CN' }];
    const { limitFn } = setupSelectOrderLimitChain(records);
    const result = await securityService.getGeoBlockedAttempts();
    expect(result).toEqual(records);
  });

  it('throws on DB error', async () => {
    setupSelectOrderLimitChain([], { message: 'fail' });
    await expect(securityService.getGeoBlockedAttempts()).rejects.toBeDefined();
  });
});

// ─── getRateLimitLogs ─────────────────────────────────────────────────────────

describe('securityService.getRateLimitLogs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns rate limit logs', async () => {
    const records = [{ id: 'r1', ip_address: '1.1.1.1' }];
    const { limitFn } = setupSelectOrderLimitChain(records);
    const result = await securityService.getRateLimitLogs();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupSelectOrderLimitChain(null as any);
    expect(await securityService.getRateLimitLogs()).toEqual([]);
  });
});

// ─── resolveAlert ─────────────────────────────────────────────────────────────

describe('securityService.resolveAlert', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates security_alerts with resolved=true and resolved_by', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await securityService.resolveAlert('a1', 'user-1');
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
      resolved: true,
      resolved_by: 'user-1',
    }));
    expect(eqFn).toHaveBeenCalledWith('id', 'a1');
  });

  it('throws on DB error', async () => {
    setupUpdateEqChain({ message: 'fail' });
    await expect(securityService.resolveAlert('a1', 'user-1')).rejects.toBeDefined();
  });
});
