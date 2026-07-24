import { describe, it, expect, vi, beforeEach } from 'vitest';
import { folhaPagamentoService } from '../folhaPagamentoService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

// Mock dynamic imports
vi.mock('@/utils/folha/validadorFolha', () => ({
  validadorFolha: {
    validarFolha: vi.fn().mockResolvedValue([]),
  },
}));

describe('folhaPagamentoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assinarHolerite', () => {
    it('should call upsert with correct data and return hash', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { nome_completo: 'João Silva', cpf: '123', cargo: 'Dev' }, 
        error: null 
      });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'colaboradores') {
          return { select: mockSelect, eq: mockEq, single: mockSingle };
        }
        if (table === 'holerites') {
          return { upsert: mockUpsert };
        }
        return {};
      });

      const hash = await folhaPagamentoService.assinarHolerite('folha-1', 'colab-1');

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex = 64 chars
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        folha_id: 'folha-1',
        colaborador_id: 'colab-1',
        assinado: true,
      }));
    });
  });

  describe('fecharFolha', () => {
    it('should throw error if there are critical alerts', async () => {
      const { validadorFolha } = await import('@/utils/folha/validadorFolha');
      (validadorFolha.validarFolha as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { gravidade: 'alta', mensagem: 'Erro crítico' }
      ]);

      await expect(folhaPagamentoService.fecharFolha('folha-1')).rejects.toThrow(/existem 1 alertas críticos/);
    });

    it('should invoke fechar-folha edge function with optimistic version and return audit_hash', async () => {
      const { validadorFolha } = await import('@/utils/folha/validadorFolha');
      (validadorFolha.validarFolha as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { version: 3, empresa_id: 'emp-1', status: 'aberta' },
        error: null,
      });
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'folhas_pagamento') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
          };
        }
        return {};
      });

      (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { ok: true, version: 4, audit_hash: 'abc123', warnings: [] },
        error: null,
      });

      const result = await folhaPagamentoService.fecharFolha('folha-1');

      expect(result.success).toBe(true);
      expect(result.version).toBe(4);
      expect(result.audit_hash).toBe('abc123');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('fechar-folha', {
        body: { empresaId: 'emp-1', folhaId: 'folha-1', version: 3 },
      });
    });

    it('should propagate VERSION_CONFLICT error from edge function', async () => {
      const { validadorFolha } = await import('@/utils/folha/validadorFolha');
      (validadorFolha.validarFolha as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { version: 3, empresa_id: 'emp-1', status: 'aberta' },
          error: null,
        }),
      }));

      (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: null,
        error: { message: 'Folha foi alterada por outro processo. Recarregue e tente novamente.' },
      });

      await expect(folhaPagamentoService.fecharFolha('folha-1')).rejects.toThrow(/outro processo/);
    });
  });

  describe('reabrirFolha', () => {
    it('should require motivo and call reabrir-folha with current version', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { version: 5, empresa_id: 'emp-1', status: 'fechada' },
          error: null,
        }),
      }));
      (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { ok: true, version: 6, audit_hash: 'xyz789' },
        error: null,
      });

      const result = await folhaPagamentoService.reabrirFolha(
        'folha-1',
        'Correção retroativa por erro de cálculo de INSS',
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(6);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('reabrir-folha', {
        body: {
          empresaId: 'emp-1',
          folhaId: 'folha-1',
          version: 5,
          motivo: 'Correção retroativa por erro de cálculo de INSS',
          override_esocial: false,
        },
      });
    });

    it('should reject when folha is not fechada', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { version: 5, empresa_id: 'emp-1', status: 'aberta' },
          error: null,
        }),
      }));

      await expect(
        folhaPagamentoService.reabrirFolha('folha-1', 'Motivo qualquer aqui'),
      ).rejects.toThrow(/não está fechada/);
    });
  });
});
