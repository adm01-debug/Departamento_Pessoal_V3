import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bancoHorasService } from '../bancoHorasService';
import { bancoHorasConfigService } from '../bancoHorasConfigService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// ─── bancoHorasService ────────────────────────────────────────────────────────

describe('bancoHorasService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // listarPorColaborador
  describe('listarPorColaborador', () => {
    function setupList(data: any[], error: any = null) {
      const order = vi.fn().mockResolvedValue({ data, error });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });
      return { select, eq, order };
    }

    it('queries banco_horas for the given colaboradorId', async () => {
      const { eq } = setupList([]);
      await bancoHorasService.listarPorColaborador('colab-1');
      expect(eq).toHaveBeenCalledWith('colaborador_id', 'colab-1');
    });

    it('returns data from supabase', async () => {
      const records = [
        { id: '1', tipo: 'credito', horas: '08:00:00' },
        { id: '2', tipo: 'debito', horas: '03:00:00' },
      ];
      setupList(records);
      const result = await bancoHorasService.listarPorColaborador('colab-1');
      expect(result).toEqual(records);
    });

    it('returns empty array when data is null', async () => {
      setupList(null as any);
      const result = await bancoHorasService.listarPorColaborador('colab-1');
      expect(result).toEqual([]);
    });

    it('throws when supabase returns error', async () => {
      setupList([], { message: 'DB error' });
      await expect(bancoHorasService.listarPorColaborador('colab-1')).rejects.toBeDefined();
    });
  });

  // getSaldo
  describe('getSaldo', () => {
    function setupSaldo(data: any[] | null, error: any = null) {
      const eq = vi.fn().mockResolvedValue({ data, error });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });
      return { select, eq };
    }

    it('selects tipo and horas columns (not quantidade_horas)', async () => {
      const { select } = setupSaldo([]);
      await bancoHorasService.getSaldo('colab-1');
      expect(select).toHaveBeenCalledWith('tipo, horas');
    });

    it('returns 0 when no records exist (null)', async () => {
      setupSaldo(null);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(0);
    });

    it('returns 0 when data is empty array', async () => {
      setupSaldo([]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(0);
    });

    it('accumulates credito as positive', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '08:00:00' },
        { tipo: 'credito', horas: '02:00:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(10);
    });

    it('accumulates debito as negative', async () => {
      setupSaldo([
        { tipo: 'debito', horas: '05:00:00' },
        { tipo: 'debito', horas: '03:00:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(-8);
    });

    it('balances credits against debits correctly', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '10:00:00' },
        { tipo: 'debito', horas: '04:00:00' },
        { tipo: 'credito', horas: '02:00:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(8); // 10 - 4 + 2
    });

    it('treats unrecognized tipo as debito (subtracts)', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '10:00:00' },
        { tipo: 'outro', horas: '03:00:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(7);
    });

    it('handles horas with minutes (interval HH:MM:SS)', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '01:30:00' },
        { tipo: 'debito', horas: '00:30:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBeCloseTo(1.0, 5);
    });

    it('handles invalid horas interval (non-parseable) as 0', async () => {
      setupSaldo([
        { tipo: 'credito', horas: 'invalid' },
        { tipo: 'credito', horas: '05:00:00' },
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(5); // 0 + 5
    });

    it('handles PostgreSQL interval with day component (e.g. "1 day 02:00:00")', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '1 day 02:00:00' }, // 26h
        { tipo: 'debito', horas: '2:00:00' },          // 2h
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBeCloseTo(24, 5); // 26 - 2
    });

    it('handles PostgreSQL interval with days only (e.g. "2 days")', async () => {
      setupSaldo([
        { tipo: 'credito', horas: '2 days' }, // 48h
      ]);
      const saldo = await bancoHorasService.getSaldo('colab-1');
      expect(saldo).toBe(48);
    });

    it('throws when supabase returns error', async () => {
      setupSaldo(null, { message: 'DB error' });
      await expect(bancoHorasService.getSaldo('colab-1')).rejects.toBeDefined();
    });
  });

  // registrar
  describe('registrar', () => {
    it('calls insert and returns data', async () => {
      const inserted = { id: 'bh-1', tipo: 'credito', horas: '08:00:00' };
      const maybeSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });

      const result = await bancoHorasService.registrar({ tipo: 'credito', horas: '08:00:00' });
      expect(insert).toHaveBeenCalledWith({ tipo: 'credito', horas: '08:00:00' });
      expect(result).toEqual(inserted);
    });

    it('throws on DB error', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Fail' } });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });
      await expect(bancoHorasService.registrar({})).rejects.toBeDefined();
    });
  });
});

// ─── bancoHorasConfigService ─────────────────────────────────────────────────

describe('bancoHorasConfigService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('buscar', () => {
    it('queries banco_horas_config by empresa_id', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });

      await bancoHorasConfigService.buscar('empresa-1');
      expect(eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
    });

    it('returns null when no config exists', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });
      const result = await bancoHorasConfigService.buscar('empresa-1');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Err' } });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });
      await expect(bancoHorasConfigService.buscar('empresa-1')).rejects.toBeDefined();
    });
  });

  describe('salvar', () => {
    it('calls UPDATE when config already exists for empresa_id', async () => {
      const existing = { id: 'cfg-1', empresa_id: 'emp-1' };
      const updateMaybeSingle = vi.fn().mockResolvedValue({ data: { ...existing, nome: 'updated' }, error: null });
      const updateEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle }) });
      const update = vi.fn().mockReturnValue({ eq: updateEq });

      const selectMaybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
      const selectEq = vi.fn().mockReturnValue({ maybeSingle: selectMaybeSingle });
      const select = vi.fn().mockReturnValue({ eq: selectEq });

      // First call (buscar) → select chain; second call (update) → update chain
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? { select } : { update };
      });

      await bancoHorasConfigService.salvar({ empresa_id: 'emp-1', periodo: 'mensal' });
      expect(update).toHaveBeenCalledWith({ empresa_id: 'emp-1', periodo: 'mensal' });
      expect(updateEq).toHaveBeenCalledWith('id', existing.id);
    });

    it('calls INSERT when no config exists', async () => {
      const inserted = { id: 'cfg-new', empresa_id: 'emp-2' };
      const insertMaybeSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const insertSelect = vi.fn().mockReturnValue({ maybeSingle: insertMaybeSingle });
      const insert = vi.fn().mockReturnValue({ select: insertSelect });

      const selectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const selectEq = vi.fn().mockReturnValue({ maybeSingle: selectMaybeSingle });
      const select = vi.fn().mockReturnValue({ eq: selectEq });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? { select } : { insert };
      });

      const result = await bancoHorasConfigService.salvar({ empresa_id: 'emp-2', periodo: 'semanal' });
      expect(insert).toHaveBeenCalledWith({ empresa_id: 'emp-2', periodo: 'semanal' });
      expect(result).toEqual(inserted);
    });
  });
});
