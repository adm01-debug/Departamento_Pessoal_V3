import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
    })),
  },
}));

import { cargoService } from '../cargoService';
import { departamentoService } from '../departamentoService';
import { localTrabalhoService } from '../localTrabalhoService';

describe('cargoService', () => {
  it('is an instance with expected methods', () => {
    expect(typeof cargoService.listar).toBe('function');
    expect(typeof cargoService.criar).toBe('function');
    expect(typeof cargoService.atualizar).toBe('function');
    expect(typeof cargoService.excluir).toBe('function');
  });
});

describe('departamentoService', () => {
  it('is an instance with expected methods', () => {
    expect(typeof departamentoService.listar).toBe('function');
    expect(typeof departamentoService.criar).toBe('function');
    expect(typeof departamentoService.atualizar).toBe('function');
    expect(typeof departamentoService.excluir).toBe('function');
  });
});

describe('localTrabalhoService', () => {
  it('is an instance with expected methods', () => {
    expect(typeof localTrabalhoService.listar).toBe('function');
    expect(typeof localTrabalhoService.criar).toBe('function');
    expect(typeof localTrabalhoService.atualizar).toBe('function');
    expect(typeof localTrabalhoService.excluir).toBe('function');
  });
});
