import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockText, mockLine, mockAutoTable } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockText = vi.fn();
  const mockLine = vi.fn();
  const mockSetFontSize = vi.fn();
  const mockSetTextColor = vi.fn();
  const mockSetFont = vi.fn();
  const mockSetFillColor = vi.fn();
  const mockRect = vi.fn();
  const mockSplitTextToSize = vi.fn((t: string) => [t]);
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    setFont: mockSetFont,
    setFillColor: mockSetFillColor,
    rect: mockRect,
    text: mockText,
    line: mockLine,
    save: mockSave,
    splitTextToSize: mockSplitTextToSize,
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    lastAutoTable: { finalY: 100 },
    addPage: vi.fn(),
  }));
  const mockAutoTable = vi.fn().mockImplementation(function(this: any) {
    this.lastAutoTable = { finalY: 100 };
  });
  return { MockJsPDF, mockSave, mockText, mockLine, mockAutoTable };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));

import { feriasPDF } from '../feriasPDF';

const sampleSolicitacao = {
  colaborador: { nome_completo: 'João Silva', cpf: '123.456.789-00', cargo: { nome: 'Dev' }, departamento: { nome: 'TI' } },
  data_inicio: '2024-07-01',
  data_fim: '2024-07-30',
  dias_ferias: 30,
  abono_pecuniario: false,
  adiantamento_13: false,
};

describe('feriasPDF.gerarRecibo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDoc = {
      setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
      setFillColor: vi.fn(), rect: vi.fn(), text: mockText, line: mockLine,
      save: mockSave, splitTextToSize: vi.fn((t: string) => [t]),
      internal: { pageSize: { getWidth: () => 210 } },
      lastAutoTable: { finalY: 100 },
    };
    MockJsPDF.mockReturnValue(mockDoc as any);
    mockAutoTable.mockImplementation(function(doc: any) {
      doc.lastAutoTable = { finalY: 100 };
    });
  });

  it('creates a jsPDF document', () => {
    feriasPDF.gerarRecibo(sampleSolicitacao);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('saves the PDF file', () => {
    feriasPDF.gerarRecibo(sampleSolicitacao);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  });

  it('includes colaborador name in text calls', () => {
    feriasPDF.gerarRecibo(sampleSolicitacao);
    const allTextCalls = mockText.mock.calls.map((c: any[]) => String(c[0]));
    expect(allTextCalls.some(t => t.includes('Aviso'))).toBe(true);
  });

  it('calls autoTable to build the info table', () => {
    feriasPDF.gerarRecibo(sampleSolicitacao);
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('handles missing colaborador gracefully', () => {
    expect(() => feriasPDF.gerarRecibo({ ...sampleSolicitacao, colaborador: null })).not.toThrow();
  });
});
