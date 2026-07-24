import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExcelExport } from '../useExcelExport';

const mockDownloadWorkbook = vi.fn().mockResolvedValue(undefined);
const mockBuildTabularWorkbook = vi.fn().mockReturnValue({ id: 'workbook' });

vi.mock('@/utils/importacao/excelDownload', () => ({
  buildTabularWorkbook: (titulo: string, colunas: string[], rows: unknown[][]) =>
    mockBuildTabularWorkbook(titulo, colunas, rows),
  downloadWorkbook: (wb: unknown, filename: string) =>
    mockDownloadWorkbook(wb, filename),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

describe('useExcelExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exportarExcel function', () => {
    const { result } = renderHook(() => useExcelExport());
    expect(typeof result.current.exportarExcel).toBe('function');
  });

  it('builds workbook with correct headers and rows', async () => {
    const { result } = renderHook(() => useExcelExport());
    const data = [{ nome: 'Alice', cargo: 'Dev' }, { nome: 'Bob', cargo: 'QA' }];

    await act(async () => {
      await result.current.exportarExcel('Relatório', data, ['nome', 'cargo']);
    });

    expect(mockBuildTabularWorkbook).toHaveBeenCalledWith(
      'Relatório',
      ['nome', 'cargo'],
      [['Alice', 'Dev'], ['Bob', 'QA']]
    );
  });

  it('downloads with lowercase-hyphenated filename', async () => {
    const { result } = renderHook(() => useExcelExport());

    await act(async () => {
      await result.current.exportarExcel('Folha de Pagamento', [], ['col']);
    });

    expect(mockDownloadWorkbook).toHaveBeenCalledWith(
      expect.anything(),
      'folha-de-pagamento.xlsx'
    );
  });

  it('shows success toast after export', async () => {
    const { result } = renderHook(() => useExcelExport());

    await act(async () => {
      await result.current.exportarExcel('Test', [{ a: 1 }], ['a']);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Excel exportado com sucesso!');
  });

  it('handles missing fields gracefully with empty string fallback', async () => {
    const { result } = renderHook(() => useExcelExport());
    const data = [{ nome: 'Alice' }]; // 'cargo' is missing

    await act(async () => {
      await result.current.exportarExcel('Test', data, ['nome', 'cargo']);
    });

    expect(mockBuildTabularWorkbook).toHaveBeenCalledWith(
      'Test',
      ['nome', 'cargo'],
      [['Alice', '']]
    );
  });

  it('shows error toast when download throws', async () => {
    mockDownloadWorkbook.mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useExcelExport());

    await act(async () => {
      await result.current.exportarExcel('Test', [{ a: 1 }], ['a']);
    });

    expect(mockToastError).toHaveBeenCalledWith('Erro ao gerar Excel: disk full');
  });

  it('shows error toast when buildTabularWorkbook throws', async () => {
    mockBuildTabularWorkbook.mockImplementationOnce(() => { throw new Error('build failed'); });
    const { result } = renderHook(() => useExcelExport());

    await act(async () => {
      await result.current.exportarExcel('Test', [{ a: 1 }], ['a']);
    });

    expect(mockToastError).toHaveBeenCalledWith('Erro ao gerar Excel: build failed');
  });
});
