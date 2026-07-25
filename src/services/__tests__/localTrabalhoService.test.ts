import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn() },
}));

import { localTrabalhoService } from '../localTrabalhoService';
import { BaseService } from '../baseService';

describe('localTrabalhoService', () => {
  it('is an instance of BaseService', () => {
    expect(localTrabalhoService).toBeInstanceOf(BaseService);
  });

  it('targets the locais_trabalho table', () => {
    expect((localTrabalhoService as any).table).toBe('locais_trabalho');
  });

  it('orders by nome by default', () => {
    expect((localTrabalhoService as any).options.defaultOrderBy).toBe('nome');
  });

  it('searches by nome column', () => {
    expect((localTrabalhoService as any).options.searchColumn).toBe('nome');
  });

  it('exposes listar method', () => {
    expect(typeof localTrabalhoService.listar).toBe('function');
  });

  it('exposes criar method', () => {
    expect(typeof localTrabalhoService.criar).toBe('function');
  });

  it('exposes atualizar method', () => {
    expect(typeof localTrabalhoService.atualizar).toBe('function');
  });

  it('exposes excluir method', () => {
    expect(typeof localTrabalhoService.excluir).toBe('function');
  });
});
