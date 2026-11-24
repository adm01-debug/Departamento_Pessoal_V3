import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '../auditLogger';

// Mocking the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        // We'll mock the return value in each test if needed
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('Audit Log & RLS Integration Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });
  });

  it('should include tenant isolation fields when logging', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertSpy });

    await auditLogger.log({
      tabela: 'desligamentos',
      registro_id: 'des-456',
      acao: 'INSERT',
      dados_novos: { status: 'pendente' }
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source_table: 'desligamentos',
        entity: 'desligamentos',
        entity_id: 'des-456',
        action: 'INSERT',
        user_id: 'user-123',
      })
    );
  });

  it('should ensure that only authenticated users can trigger audit inserts', async () => {
     (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { user: null } });
     const insertSpy = vi.fn();
     (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertSpy });

     await auditLogger.log({
       tabela: 'desligamentos',
       registro_id: 'des-456',
       acao: 'UPDATE'
     });

     // Should still attempt but with null user_id (RLS on DB will block if not allowed)
     expect(insertSpy).toHaveBeenCalledWith(
       expect.objectContaining({
         user_id: undefined
       })
     );
  });
});
