import { describe, it, expect, vi, beforeEach } from 'vitest';
import { valeTransporteService, valeAlimentacaoService } from '../calculoBeneficiosService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('calculoBeneficiosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valeTransporteService.calcularCustoMensal', () => {
    it('should calculate VT correctly respecting 6% limit', async () => {
      // Mock colaborador salary
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { salario_base: 5000 }, 
        error: null 
      });

      // Mock routes (VT benefits)
      const mockSelectRoutes = vi.fn().mockResolvedValue({ 
        data: [
          { 
            beneficio: { tipo: 'transporte', valor: 5.0 }, 
            quantidade_diaria: 2 
          }
        ], 
        error: null 
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'colaboradores') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mockSingle };
        }
        if (table === 'beneficios_colaborador') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), eq2: vi.fn().mockReturnThis() };
        }
        return {
           select: vi.fn().mockReturnThis(),
           eq: vi.fn().mockReturnThis(),
           single: mockSingle,
           // Handle the chain for benefits
        };
      });
      
      // Override for specific chain
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis()
      });

      // Simpler way for this specific test case
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
          const chain = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn(),
          };
          
          if (table === 'colaboradores') {
              chain.single.mockResolvedValue({ data: { salario_base: 3000 }, error: null });
          } else if (table === 'beneficios_colaborador') {
              chain.eq.mockReturnThis();
              chain.single = undefined as any; // No single for this one
              (chain as any).then = (resolve: any) => resolve({ 
                  data: [{ beneficio: { tipo: 'transporte', valor: 5.0 }, quantidade_diaria: 2 }], 
                  error: null 
              });
          }
          return chain;
      });

      const result = await valeTransporteService.calcularCustoMensal('colab-1', 20);
      
      // Total cost: 5.0 * 2 * 20 = 200
      // Max discount: 3000 * 0.06 = 180
      // Effective discount: min(200, 180) = 180
      // Company cost: 200 - 180 = 20
      expect(result.custoTotal).toBe(200);
      expect(result.descontoColaborador).toBe(180);
      expect(result.custoEmpresa).toBe(20);
    });
  });

  describe('valeAlimentacaoService.calcularCredito', () => {
    it('should calculate daily proportional value if benefit is daily (value < 100)', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { valor: 25, tipo: 'refeicao' }, error: null })
      });

      const result = await valeAlimentacaoService.calcularCredito('benef-1', 20);
      expect(result).toBe(500); // 25 * 20
    });

    it('should return full value if benefit is monthly (value >= 100)', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { valor: 800, tipo: 'alimentacao' }, error: null })
      });

      const result = await valeAlimentacaoService.calcularCredito('benef-1', 20);
      expect(result).toBe(800);
    });
  });
});
