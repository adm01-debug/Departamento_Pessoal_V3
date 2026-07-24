import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rescisaoService } from '../rescisaoService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependências
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

describe('rescisaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validarTransicao', () => {
    it('should block jumping more than one stage', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { etapa: 'comunicacao', status: 'pendente' }, error: null }),
      });

      await expect(rescisaoService.validarTransicao('1', 'documentacao', 'empresa-uuid-1'))
        .resolves.toBe(true);

      await expect(rescisaoService.validarTransicao('1', 'homologacao', 'empresa-uuid-1'))
        .rejects.toThrow(/Transição bloqueada/);
    });

    it('should block homologation if status is not calculado', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { etapa: 'calculo', status: 'pendente' }, error: null }),
      });

      await expect(rescisaoService.validarTransicao('1', 'homologacao', 'empresa-uuid-1'))
        .rejects.toThrow(/A rescisão precisa estar com status "calculado"/);
    });
  });

  describe('assinarDigitalmente', () => {
    // Achado N25: assinatura deixou de ser um hash client-side (btoa
    // reversível, forjável) gravado via UPDATE direto — agora é delegada à
    // RPC assinar_desligamento (SECURITY DEFINER), que calcula o hash
    // server-side e é a única via permitida para gravar essas colunas
    // (escrita direta é bloqueada por trigger).
    it('should call assinar_desligamento RPC with the correct part', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', assinado_empresa: true }, error: null });

      (supabase.rpc as unknown as ReturnType<typeof vi.fn>) = mockRpc;
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await rescisaoService.assinarDigitalmente('1', 'empresa', 'empresa-uuid-1');

      expect(mockRpc).toHaveBeenCalledWith('assinar_desligamento', {
        _desligamento_id: '1',
        _parte: 'empresa',
      });
    });

    it('should surface the RPC error (e.g. blocked by server-side rules)', async () => {
      const mockRpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Esta parte ja assinou esta rescisao' } });
      (supabase.rpc as unknown as ReturnType<typeof vi.fn>) = mockRpc;

      await expect(rescisaoService.assinarDigitalmente('1', 'empresa')).rejects.toThrow(/ja assinou/);
    });
  });
});
