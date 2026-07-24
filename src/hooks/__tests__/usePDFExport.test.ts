import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  MockJsPDF, mockSave, mockText, mockSetFontSize, mockAutoTable,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockText = vi.fn();
  const mockSetFontSize = vi.fn();
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: mockSetFontSize,
    text: mockText,
    save: mockSave,
  }));
  return {
    MockJsPDF,
    mockSave,
    mockText,
    mockSetFontSize,
    mockAutoTable: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

import { usePDFExport } from '../usePDFExport';

describe('usePDFExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes exportarPDF function', () => {
    const { result } = renderHook(() => usePDFExport());
    expect(typeof result.current.exportarPDF).toBe('function');
  });

  it('exportarPDF creates jsPDF, calls autoTable and saves file', async () => {
    const { result } = renderHook(() => usePDFExport());
    const dados = [{ nome: 'Alice', cargo: 'Dev' }];
    const colunas = ['nome', 'cargo'];

    await act(async () => {
      await result.current.exportarPDF('Colaboradores', dados, colunas);
    });

    expect(MockJsPDF).toHaveBeenCalledTimes(1);
    expect(mockSetFontSize).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalledWith('Colaboradores', expect.any(Number), expect.any(Number));
    expect(mockAutoTable).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('colaboradores.pdf');
    expect(mockToastSuccess).toHaveBeenCalledWith('PDF exportado com sucesso!');
  });

  it('passes correct head and body to autoTable', async () => {
    const { result } = renderHook(() => usePDFExport());
    const dados = [{ nome: 'Bob', cargo: 'QA' }, { nome: 'Carol', cargo: 'PM' }];
    const colunas = ['nome', 'cargo'];

    await act(async () => {
      await result.current.exportarPDF('Relatório', dados, colunas);
    });

    const call = mockAutoTable.mock.calls[0];
    const opts = call[1];
    expect(opts.head).toEqual([['nome', 'cargo']]);
    expect(opts.body).toEqual([['Bob', 'QA'], ['Carol', 'PM']]);
  });

  it('shows error toast when jsPDF throws', async () => {
    MockJsPDF.mockImplementationOnce(() => { throw new Error('PDF failed'); });
    const { result } = renderHook(() => usePDFExport());

    await act(async () => {
      await result.current.exportarPDF('Title', [], []);
    });

    expect(mockToastError).toHaveBeenCalledWith('Erro ao gerar PDF: PDF failed');
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
