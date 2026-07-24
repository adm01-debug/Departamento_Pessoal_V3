import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: vi.fn() },
}));

import { webhookService } from '../webhookService';

function setupListarChain(data: any[], count: number = 0, error: any = null) {
  const response = { data, count, error };
  const chain: any = {
    eq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn().mockResolvedValue(response),
  };
  chain.eq.mockReturnValue(chain);
  chain.ilike.mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listar', () => {
    it('returns paginated records when found', async () => {
      const webhooks = [
        { id: 'wh-1', nome: 'Webhook A', empresa_id: 'emp-1' },
        { id: 'wh-2', nome: 'Webhook B', empresa_id: 'emp-1' },
      ];
      setupListarChain(webhooks, 2);

      const result = await webhookService.listar({});

      expect(mockFrom).toHaveBeenCalledWith('webhooks');
      expect(result).toEqual({ data: webhooks, total: 2 });
    });

    it('applies empresa_id filter when provided', async () => {
      const webhooks = [{ id: 'wh-1', nome: 'Webhook A', empresa_id: 'emp-1' }];
      const { chain } = setupListarChain(webhooks, 1);

      await webhookService.listar({ filters: { empresa_id: 'emp-1' } });

      expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    });

    it('applies search filter using ilike', async () => {
      const webhooks = [{ id: 'wh-1', nome: 'Notificacao', empresa_id: 'emp-1' }];
      const { chain } = setupListarChain(webhooks, 1);

      await webhookService.listar({ search: 'Notif' });

      expect(chain.ilike).toHaveBeenCalledWith('nome', '%Notif%');
    });

    it('orders results by nome', async () => {
      const { chain } = setupListarChain([]);

      await webhookService.listar({});

      expect(chain.order).toHaveBeenCalledWith('nome');
    });

    it('returns empty array and total 0 when no data', async () => {
      setupListarChain([], 0);

      const result = await webhookService.listar({});

      expect(result).toEqual({ data: [], total: 0 });
    });

    it('returns empty array when data is null', async () => {
      setupListarChain(null as any, 0);

      const result = await webhookService.listar({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('applies both empresa_id filter and search filter', async () => {
      const { chain } = setupListarChain([], 0);

      await webhookService.listar({
        filters: { empresa_id: 'emp-5' },
        search: 'pedido',
      });

      expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-5');
      expect(chain.ilike).toHaveBeenCalledWith('nome', '%pedido%');
    });

    it('does not apply eq when empresa_id is absent', async () => {
      const { chain } = setupListarChain([]);

      await webhookService.listar({ filters: {} });

      expect(chain.eq).not.toHaveBeenCalled();
    });

    it('throws on DB error', async () => {
      const dbError = new Error('Connection refused');
      setupListarChain([], 0, dbError);

      await expect(webhookService.listar({})).rejects.toThrow('Connection refused');
    });

    it('calls select with count option', async () => {
      const { selectFn } = setupListarChain([]);

      await webhookService.listar({});

      expect(selectFn).toHaveBeenCalledWith('*', { count: 'exact' });
    });
  });
});
