import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cnabLayoutService } from '../cnabLayoutService';
import { cnabService } from '../cnabService';

vi.mock('../cnabService', () => ({
  cnabService: { generateCNAB240: vi.fn() },
}));

describe('cnabLayoutService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls cnabService.generateCNAB240 with correct args', async () => {
    vi.mocked(cnabService.generateCNAB240).mockResolvedValue('CNAB240_CONTENT');
    await cnabLayoutService.generateCNAB240Real('emp-1', 'folha-1');
    expect(cnabService.generateCNAB240).toHaveBeenCalledWith('emp-1', 'folha-1');
  });

  it('returns the value from cnabService.generateCNAB240', async () => {
    vi.mocked(cnabService.generateCNAB240).mockResolvedValue('CNAB240_CONTENT');
    const result = await cnabLayoutService.generateCNAB240Real('emp-1', 'folha-1');
    expect(result).toBe('CNAB240_CONTENT');
  });

  it('propagates errors thrown by cnabService.generateCNAB240', async () => {
    vi.mocked(cnabService.generateCNAB240).mockRejectedValue(new Error('CNAB error'));
    await expect(cnabLayoutService.generateCNAB240Real('emp-1', 'folha-1')).rejects.toThrow('CNAB error');
  });
});
