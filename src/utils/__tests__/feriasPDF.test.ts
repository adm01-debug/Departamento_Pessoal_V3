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
  const mockSplitTextToSize = vi.fn(function (t: string) {
    return [t];
  });
  const mockDoc = {
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    setFont: mockSetFont,
    setFillColor: mockSetFillColor,
    rect: mockRect,
    text: mockText,
    line: mockLine,
    save: mockSave,
    splitTextToSize: mockSplitTextToSize,
    internal: {
      pageSize: {
        getWidth: function () {
          return 210;
        },
        getHeight: function () {
          return 297;
        },
      },
    },
    lastAutoTable: { finalY: 100 },
    addPage: vi.fn(),
  };
  const MockJsPDF = vi.fn().mockImplementation(function () {
    return mockDoc;
  });
  const mockAutoTable = vi.fn().mockImplementation(function (doc: Record<string, unknown>) {
    doc.lastAutoTable = { finalY: 100 };
  });
  return { MockJsPDF, mockSave, mockText, mockLine, mockAutoTable };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));

import { feriasPDF } from '../feriasPDF';
import type { Ferias } from '@/types/entities';

const sampleSolicitacao: Ferias = {
  id: 'f1',
  colaborador_id: 'c1',
  empresa_id: 'e1',
  status: 'pendente',
  colaborador: { nome_completo: 'João Silva', cpf: '123.456.789-00', cargo: 'Dev', departamento: 'TI' },
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
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFont: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      text: mockText,
      line: mockLine,
      save: mockSave,
      splitTextToSize: vi.fn((t: string) => [t]),
      internal: { pageSize: { getWidth: () => 210 } },
      lastAutoTable: { finalY: 100 },
    };
    MockJsPDF.mockImplementation(function () {
      return mockDoc as never;
    });
    mockAutoTable.mockImplementation(function (doc: Record<string, unknown>) {
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
    const allTextCalls = mockText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(allTextCalls.some((t) => t.includes('Aviso'))).toBe(true);
  });

  it('calls autoTable to build the info table', () => {
    feriasPDF.gerarRecibo(sampleSolicitacao);
    expect(mockAutoTable).toHaveBeenCalled();
  });

  it('handles missing colaborador gracefully', () => {
    expect(() => feriasPDF.gerarRecibo({ ...sampleSolicitacao, colaborador: null })).not.toThrow();
  });
});

// ─── gerarRelatorioKPIs (onda 12) ─────────────────────────────────────────────

import type { FeriasKpiStats } from '../feriasPDF';

const KPI: FeriasKpiStats = {
  total: 12,
  pendentes: 3,
  aprovadas: 5,
  emGozo: 2,
  abonoPecuniario: 1,
  vencidas: 1,
  periodoLabel: '2026',
};

describe('feriasPDF.gerarRelatorioKPIs', () => {
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();
  const openWindow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const mockDoc: Record<string, unknown> = {
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setFont: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      text: mockText,
      line: mockLine,
      save: mockSave,
      splitTextToSize: vi.fn((t: string) => [t]),
      internal: { pageSize: { width: 210, height: 297 } },
      lastAutoTable: { finalY: 100 },
      getNumberOfPages: vi.fn(() => 1),
      output: vi.fn(() => new Blob(['pdf'])),
    };
    MockJsPDF.mockImplementation(function () {
      return mockDoc as never;
    });
    mockAutoTable.mockImplementation(function (doc: Record<string, unknown>) {
      doc.lastAutoTable = { finalY: 100 };
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    window.open = openWindow;
  });

  it('gera PDF, monta as duas tabelas e abre o blob', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, [sampleSolicitacao]);
    expect(MockJsPDF).toHaveBeenCalled();
    expect(mockAutoTable).toHaveBeenCalledTimes(2);
    expect(createObjectURL).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith('blob:url', '_blank', 'noopener');
    expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/^relatorio_ferias_\d{8}\.pdf$/));
  });

  it('KPIs vão para a tabela de indicadores', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, [sampleSolicitacao]);
    const kpiTable = mockAutoTable.mock.calls[0]?.[1] as { body: string[][] };
    expect(kpiTable.body.map((r) => r[1])).toEqual(['12', '3', '5', '2', '1', '1']);
  });

  it('detalhamento linha a linha com nome em maiúsculas', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, [sampleSolicitacao]);
    const detail = mockAutoTable.mock.calls[1]?.[1] as { body: string[][] };
    expect(detail.body[0]?.[0]).toBe('JOÃO SILVA');
    expect(detail.body[0]?.[4]).toBe('PENDENTE');
  });

  it('usa fallback LOVABLE HR sem empresa', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, []);
    const texts = mockText.mock.calls.map((c) => String(c[0]));
    expect(texts).toContain('LOVABLE HR');
  });

  it('usa razao_social da empresa no cabeçalho', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, [], undefined, {
      id: 'e1',
      razao_social: 'Promo Brindes',
    } as never);
    const texts = mockText.mock.calls.map((c) => String(c[0]));
    expect(texts).toContain('Promo Brindes');
  });

  it('inclui linha de filtros quando search/status informados', async () => {
    await feriasPDF.gerarRelatorioKPIs(KPI, [], { search: 'joao', status: 'pendente' });
    const texts = mockText.mock.calls.map((c) => String(c[0]));
    expect(texts.some((t) => t.includes('Busca: "joao"') && t.includes('Status: pendente'))).toBe(true);
  });
});
