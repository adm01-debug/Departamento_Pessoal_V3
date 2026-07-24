import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

import { whatsappService } from '../whatsappService';

function setupSelectEqMaybeSingle(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

function setupUpsert(error: any = null) {
  const upsertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ upsert: upsertFn });
  return { upsertFn };
}

function setupInsert(error: any = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

function setupSelectEq(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

function setupSelectEqOrder(data: any[], error: any = null) {
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
        whatsappService.saveConfig({ empresa_id: 'emp-1', habilitado: true } as any)
      ).resolves.toBeUndefined();

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_config');
      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ empresa_id: 'emp-1', habilitado: true }),
        { onConflict: 'empresa_id' }
      );
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('Upsert failed');
      setupUpsert(dbError);

      await expect(
        whatsappService.saveConfig({ empresa_id: 'emp-1', habilitado: false } as any)
      ).rejects.toThrow('Upsert failed');
    });
  });

  describe('sendMessage', () => {
    it('returns { success: true } on success', async () => {
      setupInsert(null);

      const result = await whatsappService.sendMessage({
        empresaId: 'emp-1',
        phone: '+5511999999999',
        message: 'hello',
      });

      expect(result).toEqual({ success: true });
      expect(mockFrom).toHaveBeenCalledWith('whatsapp_mensagens_logs');
    });

    it('inserts with correct fields', async () => {
      const { insertFn } = setupInsert(null);

      await whatsappService.sendMessage({
        empresaId: 'emp-1',
        colaboradorId: 'col-1',
        phone: '+5511999999999',
        message: 'test',
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa_id: 'emp-1',
          colaborador_id: 'col-1',
          telefone: '+5511999999999',
          status: 'sent',
        })
      );
    });

    it('throws when supabase returns an error', async () => {
      const dbError = new Error('Insert failed');
      setupInsert(dbError);

      await expect(
        whatsappService.sendMessage({
          empresaId: 'emp-1',
          phone: '+55',
          message: 'hi',
        })
      ).rejects.toThrow('Insert failed');
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
      setupSelectEq(null as any);

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
      const logs = [
        { id: 'log-1', empresa_id: 'emp-1', status: 'sent', colaborador: { nome_completo: 'João' } },
      ];
      setupSelectEqOrder(logs);

      const result = await whatsappService.listLogs('emp-1');

      expect(mockFrom).toHaveBeenCalledWith('whatsapp_mensagens_logs');
      expect(result).toEqual(logs);
    });

    it('returns empty array when data is null', async () => {
      setupSelectEqOrder(null as any);

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
    let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
    });

    it('returns { success: true, logId } on success', async () => {
      const singleFn = vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null });
      const selectFn1 = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn1 });

      const eqUpdate = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

      mockFrom
        .mockReturnValueOnce({ insert: insertFn })
        .mockReturnValueOnce({ update: updateFn });

      const result = await whatsappService.sendTemplateMessage({
        empresaId: 'emp-1',
        colaboradorId: 'col-1',
        templateId: 'tpl-1',
        phone: '+5511999999999',
      });

      expect(result).toEqual({ success: true, logId: 'log-1' });
    });

    it('inserts log with pending status', async () => {
      const singleFn = vi.fn().mockResolvedValue({ data: { id: 'log-2' }, error: null });
      const selectFn1 = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn1 });

      const eqUpdate = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

      mockFrom
        .mockReturnValueOnce({ insert: insertFn })
        .mockReturnValueOnce({ update: updateFn });

      await whatsappService.sendTemplateMessage({
        empresaId: 'emp-1',
        colaboradorId: 'col-1',
        templateId: 'tpl-1',
        phone: '+5511999999999',
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa_id: 'emp-1',
          colaborador_id: 'col-1',
          template_id: 'tpl-1',
          telefone: '+5511999999999',
          status: 'pending',
        })
      );
    });

    it('updates log status to sent after delay', async () => {
      const singleFn = vi.fn().mockResolvedValue({ data: { id: 'log-3' }, error: null });
      const selectFn1 = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn1 });

      const eqUpdate = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

      mockFrom
        .mockReturnValueOnce({ insert: insertFn })
        .mockReturnValueOnce({ update: updateFn });

      await whatsappService.sendTemplateMessage({
        empresaId: 'emp-1',
        colaboradorId: 'col-1',
        templateId: 'tpl-1',
        phone: '+5511999999999',
      });

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sent' })
      );
      expect(eqUpdate).toHaveBeenCalledWith('id', 'log-3');
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('throws wrapped error when insert fails', async () => {
      const dbError = new Error('Insert failed');
      const singleFn = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const selectFn1 = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn1 });

      mockFrom.mockReturnValueOnce({ insert: insertFn });

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
