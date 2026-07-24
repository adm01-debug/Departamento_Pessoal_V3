import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockToastSuccess } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
    setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
    save: mockSave, splitTextToSize: vi.fn((t: string) => [t]),
    internal: { pageSize: { getWidth: () => 210 } },
    lastAutoTable: { finalY: 100 },
    autoTable: vi.fn().mockImplementation(function(this: any) { this.lastAutoTable = { finalY: 100 }; }),
  }));
  return { MockJsPDF, mockSave, mockToastSuccess: vi.fn() };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) }) }),
    }),
  },
}));
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

import { gerarPDFRescisao } from '../rescisaoPDF';

const sampleForm = {
  nomeColaborador: 'Maria Costa',
  cpf: '111.222.333-44',
  cargo: 'Analista',
  dataAdmissao: '2020-01-15',
  dataDesligamento: '2024-07-10',
  tipo: 'sem_justa_causa',
};

const sampleResult = {
  diasTrabalhados: 10,
  saldoSalario: 1666,
  diasAviso: 30,
  avisoIndenizado: 5000,
  feriasVencidas: 0,
  feriasProporcionais: 1666,
  mesesFerias: 4,
  tercoFerias: 555,
  decimoTerceiro: 1666,
  meses13: 4,
  totalProventos: 10000,
  inss: 412,
  irrf: 200,
  totalDescontos: 612,
  multaFGTS: 2000,
  fgtsRescisao: 400,
  saldoFGTS: 5000,
  totalLiquido: 9388,
  salarioBase: 5000,
};

describe('gerarPDFRescisao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const docMock = {
      setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
      setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
      save: mockSave, splitTextToSize: vi.fn((t: string) => [t]),
      internal: { pageSize: { getWidth: () => 210 } },
      lastAutoTable: { finalY: 100 },
      autoTable: vi.fn().mockImplementation(function(this: any) { this.lastAutoTable = { finalY: 100 }; }),
    };
    MockJsPDF.mockReturnValue(docMock as any);
  });

  it('creates a jsPDF instance and saves the PDF', async () => {
    await gerarPDFRescisao(sampleForm, sampleResult as any);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  });

  it('works without an auditoria record', async () => {
    await expect(gerarPDFRescisao(sampleForm, sampleResult as any)).resolves.toBeUndefined();
  });

  it('works when auditoria is provided directly', async () => {
    const auditoria = { id: 'audit-1', created_at: new Date().toISOString() };
    await expect(gerarPDFRescisao(sampleForm, sampleResult as any, auditoria)).resolves.toBeUndefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles minimal form fields without throwing', async () => {
    const minimalForm = { nomeColaborador: 'Test', tipo: 'pedido_demissao' };
    await expect(gerarPDFRescisao(minimalForm, sampleResult as any)).resolves.toBeUndefined();
  });
});
