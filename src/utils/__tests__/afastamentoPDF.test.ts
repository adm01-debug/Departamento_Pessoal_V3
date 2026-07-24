import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockAutoTable } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
    setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
    save: mockSave, setPage: vi.fn(), splitTextToSize: vi.fn((t: string) => [t]),
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => 1,
    },
    lastAutoTable: { finalY: 80 },
  }));
  const mockAutoTable = vi.fn().mockImplementation(function(doc: any) {
    doc.lastAutoTable = { finalY: 80 };
  });
  return { MockJsPDF, mockSave, mockAutoTable };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));

import { gerarAfastamentosPDF } from '../afastamentoPDF';

const sampleDados = [
  {
    colaborador: 'João Silva',
    tipo: 'INSS - Doença',
    cid: 'M54.5',
    inicio: '2024-01-10',
    fim: '2024-01-25',
    dias: 15,
    status: 'ativo',
    diasInss: 15,
    pericia: '2024-01-20',
  },
];

describe('gerarAfastamentosPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDoc = {
      setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
      setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
      save: mockSave, setPage: vi.fn(), splitTextToSize: vi.fn((t: string) => [t]),
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        getNumberOfPages: () => 1,
      },
      lastAutoTable: { finalY: 80 },
    };
    MockJsPDF.mockReturnValue(mockDoc as any);
    mockAutoTable.mockImplementation(function(doc: any) {
      doc.lastAutoTable = { finalY: 80 };
    });
  });

  it('creates jsPDF and saves file', async () => {
    await gerarAfastamentosPDF('Relatório de Afastamentos', sampleDados);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  });

  it('calls autoTable with correct head columns', async () => {
    await gerarAfastamentosPDF('Relatório', sampleDados);
    expect(mockAutoTable).toHaveBeenCalled();
    const opts = mockAutoTable.mock.calls[0][1];
    expect(opts.head[0]).toContain('Colaborador');
  });

  it('maps dados to table rows', async () => {
    await gerarAfastamentosPDF('Relatório', sampleDados);
    const opts = mockAutoTable.mock.calls[0][1];
    expect(opts.body).toHaveLength(1);
    expect(opts.body[0][0]).toBe('João Silva');
  });

  it('handles empty dados without error', async () => {
    await expect(gerarAfastamentosPDF('Vazio', [])).resolves.toBeDefined();
  });

  it('handles filtros parameter gracefully', async () => {
    await expect(
      gerarAfastamentosPDF('Relatório', sampleDados, { status: 'ativo', tipo: 'INSS' })
    ).resolves.toBeDefined();
  });
});
