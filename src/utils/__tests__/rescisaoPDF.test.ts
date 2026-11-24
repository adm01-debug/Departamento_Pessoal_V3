import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockToastSuccess } = vi.hoisted(() => {
  const mockSave = vi.fn();
  // Vitest 4 requires 'function' or 'class' (not arrow) for constructor mocks
  const MockJsPDF = vi.fn().mockImplementation(function(this: any) {
    this.setFontSize = vi.fn(); this.setTextColor = vi.fn(); this.setFont = vi.fn();
    this.setFillColor = vi.fn(); this.rect = vi.fn(); this.text = vi.fn(); this.line = vi.fn();
    this.save = mockSave; this.splitTextToSize = vi.fn((t: string) => [t]);
    this.internal = { pageSize: { getWidth: () => 210 } };
    this.lastAutoTable = { finalY: 100 };
    this.autoTable = vi.fn().mockImplementation(function(this: any) { this.lastAutoTable = { finalY: 100 }; });
  });
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
    MockJsPDF.mockImplementation(function(this: any) {
      this.setFontSize = vi.fn(); this.setTextColor = vi.fn(); this.setFont = vi.fn();
      this.setFillColor = vi.fn(); this.rect = vi.fn(); this.text = vi.fn(); this.line = vi.fn();
      this.save = mockSave; this.splitTextToSize = vi.fn((t: string) => [t]);
      this.internal = { pageSize: { getWidth: () => 210 } };
      this.lastAutoTable = { finalY: 100 };
      this.autoTable = vi.fn().mockImplementation(function(this: any) { this.lastAutoTable = { finalY: 100 }; });
    });
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
