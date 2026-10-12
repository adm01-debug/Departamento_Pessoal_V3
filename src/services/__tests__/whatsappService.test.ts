import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const mockFrom = vi.hoisted(() => vi.fn());
const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    functions: { invoke: mockInvoke },
  },
}));

import { whatsappService } from '../whatsappService';

function setupSelectEqMaybeSingle(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

function setupUpsert(error: { message: string; code?: string } | null = null) {
  const upsertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ upsert: upsertFn });
  return { upsertFn };
}

function setupInsert(error: { message: string; code?: string } | null = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

function setupSelectEq(data: unknown, error: { message: string; code?: string } | null = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

function setupSelectEqOrder(data: unknown, error: { message: string; code?: string } | null = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

describe('whatsappService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('returns config data when found', async () => {
      const configData = { id: '1', empresa_id: 'emp-1', habilitado: true };
      setupSelectEqMaybeSingle(configData);

      const result = await whatsappService.getConfig('emp-1');

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_config');
      expect(result).toEqual(configData);
    });

    it('returns null when no config found', async () => {
      setupSelectEqMaybeSingle(null);

      const result = await whatsappService.getConfig('emp-1');

      expect(result).toBeNull();
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('DB error');
      setupSelectEqMaybeSingle(null, dbError);

      await expect(whatsappService.getConfig('emp-1')).rejects.toThrow('DB error');
    });

    it('calls eq with the correct empresa_id', async () => {
      const { eqFn } = setupSelectEqMaybeSingle({ empresa_id: 'emp-42' });

      await whatsappService.getConfig('emp-42');

      expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-42');
    });
  });

  describe('saveConfig', () => {
    it('saves config without throwing on success', async () => {
      const { upsertFn } = setupUpsert(null);

      await expect(
        whatsappService.saveConfig({ empresa_id: 'emp-1', status: 'active' } as never)
      ).resolves.toBeUndefined();

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_config');
      expect(upsertFn).toHaveBeenCalledWith(expect.objectContaining({ empresa_id: 'emp-1', status: 'active' }), {
        onConflict: 'empresa_id',
      });
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('Upsert failed');
      setupUpsert(dbError);

      await expect(whatsappService.saveConfig({ empresa_id: 'emp-1', status: 'active' } as never)).rejects.toThrow(
        'Upsert failed'
      );
    });
  });

  describe('sendMessage', () => {
    it('invokes whatsapp-send edge function and returns success', async () => {
      mockInvoke.mockResolvedValue({ data: { success: true, status: 'sent', log_id: 'log-1' }, error: null });

      const result = await whatsappService.sendMessage({
        empresaId: 'emp-1',
        phone: '+5511999999999',
        message: 'hello',
      });

      expect(result).toEqual({ success: true, logId: 'log-1' });
      expect(mockInvoke).toHaveBeenCalledWith('whatsapp-send', {
        body: { empresa_id: 'emp-1', colaborador_id: undefined, telefone: '+5511999999999', mensagem: 'hello' },
      });
    });

    it('throws when the edge function reports failure', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, status: 'failed', error: 'Evolution API respondeu 500' },
        error: null,
      });

      await expect(whatsappService.sendMessage({ empresaId: 'emp-1', phone: '+55', message: 'hi' })).rejects.toThrow(
        'Evolution API respondeu 500'
      );
    });

    it('throws on invoke error', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge error' } });

      await expect(whatsappService.sendMessage({ empresaId: 'emp-1', phone: '+55', message: 'hi' })).rejects.toThrow(
        'Edge error'
      );
    });
  });

  describe('listTemplates', () => {
    it('returns templates array on success', async () => {
      const templates = [
        { id: 't-1', empresa_id: 'emp-1', nome: 'Template A' },
        { id: 't-2', empresa_id: 'emp-1', nome: 'Template B' },
      ];
      setupSelectEq(templates);

      const result = await whatsappService.listTemplates('emp-1');

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_templates');
      expect(result).toEqual(templates);
    });

    it('returns empty array when data is null', async () => {
      setupSelectEq(null as never);

      const result = await whatsappService.listTemplates('emp-1');

      expect(result).toEqual([]);
    });

    it('applies empresa_id filter', async () => {
      const { eqFn } = setupSelectEq([]);

      await whatsappService.listTemplates('emp-99');

      expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-99');
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('Templates fetch failed');
      setupSelectEq([], dbError);

      await expect(whatsappService.listTemplates('emp-1')).rejects.toThrow('Templates fetch failed');
    });
  });

  describe('listLogs', () => {
    it('returns logs array on success', async () => {
      const logs = [{ id: 'log-1', empresa_id: 'emp-1', status: 'sent', colaborador: { nome_completo: 'João' } }];
      setupSelectEqOrder(logs);

      const result = await whatsappService.listLogs('emp-1');

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_mensagens_logs');
      expect(result).toEqual(logs);
    });

    it('returns empty array when data is null', async () => {
      setupSelectEqOrder(null as never);

      const result = await whatsappService.listLogs('emp-1');

      expect(result).toEqual([]);
    });

    it('orders by created_at descending', async () => {
      const { orderFn } = setupSelectEqOrder([]);

      await whatsappService.listLogs('emp-1');

      expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('applies empresa_id filter', async () => {
      const { eqFn } = setupSelectEqOrder([]);

      await whatsappService.listLogs('emp-77');

      expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-77');
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('Logs fetch failed');
      setupSelectEqOrder([], dbError);

      await expect(whatsappService.listLogs('emp-1')).rejects.toThrow('Logs fetch failed');
    });
  });

  describe('sendTemplateMessage', () => {
    it('invokes whatsapp-send with template_id and returns logId', async () => {
      mockInvoke.mockResolvedValue({ data: { success: true, status: 'sent', log_id: 'log-9' }, error: null });

      const result = await whatsappService.sendTemplateMessage({
        empresaId: 'emp-1',
        colaboradorId: 'col-1',
        templateId: 'tpl-1',
        phone: '+5511999999999',
      });

      expect(result).toEqual({ success: true, logId: 'log-9' });
      expect(mockInvoke).toHaveBeenCalledWith('whatsapp-send', {
        body: {
          empresa_id: 'emp-1',
          colaborador_id: 'col-1',
          telefone: '+5511999999999',
          template_id: 'tpl-1',
        },
      });
    });

    it('throws wrapped error when edge function fails', async () => {
      mockInvoke.mockResolvedValue({ data: { success: false, error: 'Evolution API respondeu 500' }, error: null });

      await expect(
        whatsappService.sendTemplateMessage({
          empresaId: 'emp-1',
          colaboradorId: 'col-1',
          templateId: 'tpl-1',
          phone: '+5511999999999',
        })
      ).rejects.toThrow('Falha ao enviar mensagem de template do WhatsApp');
    });

    it('throws wrapped error on invoke error', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge error' } });

      await expect(
        whatsappService.sendTemplateMessage({
          empresaId: 'emp-1',
          colaboradorId: 'col-1',
          templateId: 'tpl-1',
          phone: '+5511999999999',
        })
      ).rejects.toThrow('Falha ao enviar mensagem de template do WhatsApp');
    });
  });
});
