import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPapaUnparse, mockCreateObjectURL, mockAppendChild, mockRemoveChild, MockJsPDF, mockSave } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const MockJsPDF = vi.fn();
  return {
    mockPapaUnparse: vi.fn().mockReturnValue('col1,col2\nval1,val2'),
    mockCreateObjectURL: vi.fn().mockReturnValue('blob:url'),
    mockAppendChild: vi.fn(),
    mockRemoveChild: vi.fn(),
    MockJsPDF,
    mockSave,
  };
});

vi.mock('jspdf', () => ({ jsPDF: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('papaparse', () => ({ default: { unparse: mockPapaUnparse } }));

import { validateExportData, exportPontoCSV, exportPontoPDF } from '../exportService';

const sampleData = [
  { colaborador: 'Alice', data: '2024-01-15', hora_entrada: '08:00', hora_saida: '17:00', total_horas: '09:00', status: 'ok' },
  { colaborador: 'Bob', data: '2024-01-15', hora_entrada: '09:00', hora_saida: '18:00', total_horas: '09:00', status: 'ok' },
];

describe('validateExportData', () => {
  it('returns true for valid data with required fields', () => {
    expect(validateExportData(sampleData)).toBe(true);
  });

  it('throws when data is empty array', () => {
    expect(() => validateExportData([])).toThrow('Nenhum dado disponível');
  });

  it('throws when data is null/undefined', () => {
    expect(() => validateExportData(null as any)).toThrow('Nenhum dado disponível');
  });

  it('returns true even when fields are missing (warns only)', () => {
    const partial = [{ nome: 'Alice' }];
    expect(validateExportData(partial)).toBe(true);
  });
});

describe('exportPontoCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPapaUnparse.mockReturnValue('col,col2\nval1,val2');
    const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: { visibility: '' } };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
  });

  it('calls Papa.unparse with the data', () => {
    exportPontoCSV(sampleData);
    expect(mockPapaUnparse).toHaveBeenCalledWith(sampleData);
  });

  it('creates a download link and clicks it', () => {
    exportPontoCSV(sampleData);
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('returns true on success', () => {
    expect(exportPontoCSV(sampleData)).toBe(true);
  });

  it('throws when data is empty', () => {
    expect(() => exportPontoCSV([])).toThrow('Nenhum dado disponível');
  });
});

describe('exportPontoPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const autoTableFn = vi.fn().mockImplementation(function(this: any) {
      this.lastAutoTable = { finalY: 100 };
    });
    const docMock = {
      setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
      setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
      setPage: vi.fn(), save: mockSave, roundedRect: vi.fn(),
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        getNumberOfPages: () => 1,
      },
      lastAutoTable: { finalY: 100 },
      autoTable: autoTableFn,
    };
    MockJsPDF.mockImplementation(() => docMock);
  });

  it('creates jsPDF and saves a file', () => {
    exportPontoPDF(sampleData, 'Relatório', ['colaborador', 'data']);
    expect(MockJsPDF).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  });

  it('returns true on success', () => {
    expect(exportPontoPDF(sampleData, 'Relatório', ['colaborador', 'data'])).toBe(true);
  });

  it('throws when data is empty', () => {
    expect(() => exportPontoPDF([], 'Relatório', ['colaborador'])).toThrow('Nenhum dado disponível');
  });
});
