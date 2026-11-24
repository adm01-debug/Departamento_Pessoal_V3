import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gerarEventosMensais } from '../esocialEventosPeriodicos';
import { gerarEventosSST } from '../esocialEventosSST';

const { mockCriarEvento } = vi.hoisted(() => ({ mockCriarEvento: vi.fn() }));

vi.mock('@/services/esocialService', () => ({
  criarEvento: mockCriarEvento,
}));

describe('gerarEventosMensais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarEvento.mockResolvedValue({ id: 'evt-created' });
  });

  it('creates exactly 3 events (S-1200, S-1210, S-1280)', async () => {
    await gerarEventosMensais('empresa-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledTimes(3);
  });

  it('creates S-1200 (Remuneração) event', async () => {
    await gerarEventosMensais('empresa-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_evento: 'S-1200',
        empresa_id: 'empresa-1',
        competencia: '2026-07',
      })
    );
  });

  it('creates S-1210 (Pagamentos) event', async () => {
    await gerarEventosMensais('empresa-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_evento: 'S-1210' })
    );
  });

  it('creates S-1280 (Informações Complementares) event', async () => {
    await gerarEventosMensais('empresa-1', '2026-07');
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_evento: 'S-1280' })
    );
  });

  it('returns array of 3 results', async () => {
    const results = await gerarEventosMensais('empresa-1', '2026-07');
    expect(results).toHaveLength(3);
  });

  it('passes empresaId to all criarEvento calls', async () => {
    await gerarEventosMensais('emp-xyz', '2026-01');
    for (const call of mockCriarEvento.mock.calls) {
      expect(call[0].empresa_id).toBe('emp-xyz');
    }
  });

  it('passes competencia to all criarEvento calls', async () => {
    await gerarEventosMensais('emp-1', '2025-12');
    for (const call of mockCriarEvento.mock.calls) {
      expect(call[0].competencia).toBe('2025-12');
    }
  });
});

describe('gerarEventosSST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarEvento.mockResolvedValue({ id: 'sst-created' });
  });

  it('creates no events when dados is empty', async () => {
    await gerarEventosSST('empresa-1', {});
    expect(mockCriarEvento).not.toHaveBeenCalled();
  });

  it('creates S-2210 (acidente) when dados.acidente is set', async () => {
    const acidente = { data: '2026-01-15', tipo: 'queda' };
    await gerarEventosSST('empresa-1', { acidente });
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_evento: 'S-2210',
        empresa_id: 'empresa-1',
        dados: acidente,
      })
    );
  });

  it('does NOT create S-2210 when dados.acidente is absent', async () => {
    await gerarEventosSST('empresa-1', { exame: {}, riscos: {} });
    const types = mockCriarEvento.mock.calls.map(c => c[0].tipo_evento);
    expect(types).not.toContain('S-2210');
  });

  it('creates S-2220 (exame) when dados.exame is set', async () => {
    const exame = { tipo: 'admissional', medico: 'Dr. X' };
    await gerarEventosSST('empresa-1', { exame });
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_evento: 'S-2220',
        dados: exame,
      })
    );
  });

  it('does NOT create S-2220 when dados.exame is absent', async () => {
    await gerarEventosSST('empresa-1', { acidente: {} });
    const types = mockCriarEvento.mock.calls.map(c => c[0].tipo_evento);
    expect(types).not.toContain('S-2220');
  });

  it('creates S-2240 (riscos) when dados.riscos is set', async () => {
    const riscos = { agente: 'ruído', nivel: 'alto' };
    await gerarEventosSST('empresa-1', { riscos });
    expect(mockCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_evento: 'S-2240',
        dados: riscos,
      })
    );
  });

  it('does NOT create S-2240 when dados.riscos is absent', async () => {
    await gerarEventosSST('empresa-1', { exame: {} });
    const types = mockCriarEvento.mock.calls.map(c => c[0].tipo_evento);
    expect(types).not.toContain('S-2240');
  });

  it('creates all three events when all dados keys are present', async () => {
    await gerarEventosSST('empresa-1', {
      acidente: { tipo: 'corte' },
      exame: { tipo: 'periódico' },
      riscos: { agente: 'calor' },
    });
    expect(mockCriarEvento).toHaveBeenCalledTimes(3);
    const types = mockCriarEvento.mock.calls.map(c => c[0].tipo_evento);
    expect(types).toContain('S-2210');
    expect(types).toContain('S-2220');
    expect(types).toContain('S-2240');
  });

  it('returns array of created events', async () => {
    const results = await gerarEventosSST('empresa-1', {
      acidente: {},
      exame: {},
    });
    expect(results).toHaveLength(2);
  });
});
