import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn() },
}));

import { departamentoService } from '../departamentoService';
import { BaseService } from '../baseService';

describe('departamentoService', () => {
  it('is an instance of BaseService', () => {
    expect(departamentoService).toBeInstanceOf(BaseService);
  });

  it('targets the departamentos table', () => {
    expect((departamentoService as any).table).toBe('departamentos');
  });

  it('orders by nome by default', () => {
    expect((departamentoService as any).options.defaultOrderBy).toBe('nome');
  });

  it('searches by nome column', () => {
    expect((departamentoService as any).options.searchColumn).toBe('nome');
  });

  it('exposes listar method', () => {
    expect(typeof departamentoService.listar).toBe('function');
  });

  it('exposes criar method', () => {
    expect(typeof departamentoService.criar).toBe('function');
  });

  it('exposes atualizar method', () => {
    expect(typeof departamentoService.atualizar).toBe('function');
  });

  it('exposes excluir method', () => {
    expect(typeof departamentoService.excluir).toBe('function');
  });
});
