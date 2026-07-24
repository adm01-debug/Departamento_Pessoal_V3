import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockToastSuccess } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const MockJsPDF = vi.fn();
  const mockToastSuccess = vi.fn();
  return { MockJsPDF, mockSave, mockToastSuccess };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

import { gerarPDIPDF } from '../evaluationPDF';

function makeDocMock() {
  const doc = {
    setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
    setFillColor: vi.fn(), rect: vi.fn(), text: vi.fn(), line: vi.fn(),
    save: mockSave,
    internal: { pageSize: { getWidth: () => 210 } },
    lastAutoTable: { finalY: 100 },
    autoTable: vi.fn().mockImplementation(function(this: any) { this.lastAutoTable = { finalY: 100 }; }),
  };
  return doc;
}

describe('gerarPDIPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockJsPDF.mockImplementation(() => makeDocMock());
  });

  it('creates a jsPDF instance', async () => {
    await gerarPDIPDF('João', { titulo: 'Dev Skills', competencia: 'Liderança', acao: 'Treinamento', prazo: '2024-12-31', status: 'pendente' });
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('saves PDF with colaborador name in filename', async () => {
    await gerarPDIPDF('Maria Souza', { titulo: 'T', competencia: 'C', acao: 'A', prazo: null, status: 'em_andamento' });
    expect(mockSave).toHaveBeenCalledWith('PDI_Maria_Souza.pdf');
  });

  it('shows success toast after generation', async () => {
    await gerarPDIPDF('Bob', { titulo: 'T', competencia: 'C', acao: 'A' });
    expect(mockToastSuccess).toHaveBeenCalledWith('PDI gerado com sucesso!');
  });

  it('handles empty pdi object without throwing', async () => {
    await expect(gerarPDIPDF('Test', {})).resolves.toBeUndefined();
  });
});
