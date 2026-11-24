import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provisaoService } from '../provisaoService';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('provisaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should call select with colaborador join', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await provisaoService.list('empresa-123');
      expect(mockSelect).toHaveBeenCalledWith('*, colaborador:colaboradores(nome_completo, salario_base)');
      expect(result).toEqual([]);
    });

    it('should throw when empresa_id is missing', async () => {
      await expect(provisaoService.list('')).rejects.toThrow('empresa_id obrigatório');
    });

    it('should throw error if supabase fails', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((onSuccess) => onSuccess({ data: null, error: { message: 'DB Error' } }))
      };
      
      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      await expect(provisaoService.list('1', '2026-05')).rejects.toMatchObject({ message: 'DB Error' });
    });
  });

  describe('calcular', () => {
    it('should invoke the correct edge function with parameters', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { success: true }, error: null } as any);
      const result = await provisaoService.calcular('empresa-123', '2026-05');
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith('calcular-provisoes', {
        body: { empresa_id: 'empresa-123', competencia: '2026-05' }
      });
      expect(result).toEqual({ success: true });
    });
  });
});
