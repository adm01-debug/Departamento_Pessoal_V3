import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCriarEvento } = vi.hoisted(() => ({ mockCriarEvento: vi.fn() }));

vi.mock('@/services/esocialService', () => ({
  criarEvento: mockCriarEvento,
}));

import { gerarEventosMensais } from '../esocialEventosPeriodicos';

describe('gerarEventosMensais', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates three monthly events in correct order', async () => {
    mockCriarEvento.mockResolvedValue({ id: 'ev-1' });
    const results = await gerarEventosMensais('emp-1', '2026-07');
    expect(results).toHaveLength(3);
    expect(mockCriarEvento).toHaveBeenCalledTimes(3);
  });

  it('calls criarEvento with S-1200 for remuneracao', async () => {
    mockCriarEvento.mockResolvedValue({});
    await gerarEventosMensais('emp-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      empresa_id: 'emp-1',
      tipo_evento: 'S-1200',
      competencia: '2026-07',
    }));
  });

  it('calls criarEvento with S-1210 for pagamentos', async () => {
    mockCriarEvento.mockResolvedValue({});
    await gerarEventosMensais('emp-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      tipo_evento: 'S-1210',
    }));
  });

  it('calls criarEvento with S-1280 for informacoes complementares', async () => {
    mockCriarEvento.mockResolvedValue({});
    await gerarEventosMensais('emp-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      tipo_evento: 'S-1280',
    }));
  });

  it('returns all event results', async () => {
    mockCriarEvento
      .mockResolvedValueOnce({ id: 'ev-a' })
      .mockResolvedValueOnce({ id: 'ev-b' })
      .mockResolvedValueOnce({ id: 'ev-c' });
    const results = await gerarEventosMensais('emp-1', '2026-07');
    expect(results).toEqual([{ id: 'ev-a' }, { id: 'ev-b' }, { id: 'ev-c' }]);
  });
});
