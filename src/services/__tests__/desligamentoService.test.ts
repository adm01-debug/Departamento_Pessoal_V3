import { describe, it, expect, vi, beforeEach } from 'vitest';
import { desligamentoService } from '../desligamentoService';

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

describe('desligamentoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Chain setup for listar
    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [], error: null });

    // Chain for buscarPorId
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  describe('listar', () => {
    const EMPRESA_ID = 'empresa-test-123';

    it('should call select with colaborador join', () => {
      mockEq.mockResolvedValue({ data: [], error: null });
      desligamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
      expect(mockSelect).toHaveBeenCalledWith('*, colaborador:colaboradores(nome_completo)', { count: 'exact' });
    });

    it('should apply limit of 500', () => {
      mockEq.mockResolvedValue({ data: [], error: null });
      desligamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
      expect(mockOrder).toHaveBeenCalledWith('data_desligamento', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(500);
    });

    it('should filter by empresaId when provided', async () => {
      mockEq.mockResolvedValue({ data: [{ id: '1' }], count: 1, error: null });
      const result = await desligamentoService.listar({ filters: { empresa_id: 'empresa-123' } });
      expect(mockEq).toHaveBeenCalledWith('empresa_id', 'empresa-123');
      expect(result.data).toEqual([{ id: '1' }]);
    });

    it('should return empty array when data is null', async () => {
      mockEq.mockResolvedValue({ data: null, error: null });
      const result = await desligamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
      expect(result.data).toEqual([]);
    });

    it('should throw on error', async () => {
      mockEq.mockResolvedValue({ data: null, error: new Error('DB error') });
      await expect(desligamentoService.listar({ filters: { empresa_id: EMPRESA_ID } })).rejects.toThrow('DB error');
    });

    it('should throw when empresa_id is missing', async () => {
      await expect(desligamentoService.listar()).rejects.toThrow('empresa_id obrigatório');
    });
  });

  describe('criar — validation', () => {
    it('should throw if colaborador_id is missing', async () => {
      await expect(desligamentoService.criar({
        data_desligamento: '2026-01-01',
        tipo: 'sem_justa_causa',
        empresa_id: '123',
      })).rejects.toThrow('Colaborador é obrigatório');
    });

    it('should throw if data_desligamento is missing', async () => {
      await expect(desligamentoService.criar({
        colaborador_id: '123',
        tipo: 'sem_justa_causa',
        empresa_id: '123',
      })).rejects.toThrow('Data de desligamento é obrigatória');
    });

    it('should throw if tipo is missing', async () => {
      await expect(desligamentoService.criar({
        colaborador_id: '123',
        data_desligamento: '2026-01-01',
        empresa_id: '123',
      })).rejects.toThrow('Tipo de rescisão é obrigatório');
    });

    it('should throw if empresa_id is missing', async () => {
      await expect(desligamentoService.criar({
        colaborador_id: '123',
        data_desligamento: '2026-01-01',
        tipo: 'sem_justa_causa',
      })).rejects.toThrow('Empresa é obrigatória');
    });

    it('should sanitize motivo (trim + limit 1000 chars)', async () => {
      const longMotivo = 'A'.repeat(2000);
      mockInsert.mockReturnValue({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: '1' }, error: null }) }) });
      
      await desligamentoService.criar({
        colaborador_id: '123',
        data_desligamento: '2026-01-01',
        tipo: 'sem_justa_causa',
        empresa_id: '456',
        motivo: `  ${longMotivo}  `,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.motivo.length).toBe(1000);
      expect(insertCall.motivo).not.toContain('  ');
    });
  });

  describe('buscarPorId — validation', () => {
    it('should throw if id is empty', async () => {
      await expect(desligamentoService.buscarPorId('')).rejects.toThrow('ID é obrigatório');
    });
  });

  describe('atualizar — validation', () => {
    it('should throw if id is empty', async () => {
      await expect(desligamentoService.atualizar('', {})).rejects.toThrow('ID é obrigatório');
    });
  });

  describe('excluir — validation', () => {
    it('should throw if id is empty', async () => {
      await expect(desligamentoService.excluir('')).rejects.toThrow('ID é obrigatório');
    });
  });
});
