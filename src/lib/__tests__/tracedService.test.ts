import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTracedService } from '../tracedService';
import { loggerService } from '@/services/loggerService';

vi.mock('@/services/loggerService', () => ({
  loggerService: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('createTracedService', () => {
  beforeEach(() => vi.clearAllMocks());

  const service = {
    prop: 'valor-nao-funcao',
    async soma(a: number, b: number) {
      return a + b;
    },
    async falha() {
      throw new Error('boom');
    },
  };

  it('envolve métodos: loga início+fim com trace_id e devolve o resultado', async () => {
    const traced = createTracedService(service, 'calc');
    const res = await traced.soma(2, 3);
    expect(res).toBe(5);

    const dbg = vi.mocked(loggerService.debug);
    expect(dbg).toHaveBeenCalledWith(
      '[calc.soma] Iniciando',
      expect.objectContaining({ trace_id: expect.any(String), args_count: 2 })
    );
    expect(dbg).toHaveBeenCalledWith(
      '[calc.soma] Sucesso',
      expect.objectContaining({ duration_ms: expect.any(String) })
    );
  });

  it('propriedades não-função passam direto', () => {
    const traced = createTracedService(service, 'calc');
    expect(traced.prop).toBe('valor-nao-funcao');
  });

  it('erro do método é logado e relançado', async () => {
    const traced = createTracedService(service, 'calc');
    await expect(traced.falha()).rejects.toThrow('boom');
    expect(loggerService.error).toHaveBeenCalledWith(
      '[calc.falha] Erro',
      expect.objectContaining({ error: 'boom' }),
      expect.any(Error)
    );
  });
});
