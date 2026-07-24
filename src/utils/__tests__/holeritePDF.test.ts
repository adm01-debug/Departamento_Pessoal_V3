import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave, mockText } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockText = vi.fn();
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
    setFillColor: vi.fn(), setDrawColor: vi.fn(), setLineWidth: vi.fn(),
    rect: vi.fn(), line: vi.fn(), text: mockText, save: mockSave,
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
    lastAutoTable: { finalY: 100 },
  }));
  return { MockJsPDF, mockSave, mockText };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));

import { gerarPDFHolerite } from '../holeritePDF';

const sampleHolerite = {
  colaborador_nome: 'Alice Santos',
  colaborador_cpf: '987.654.321-00',
  colaborador_cargo: 'Analista',
  competencia: '07/2024',
  salario_base: 5000,
  total_proventos: 5200,
  total_descontos: 800,
  liquido: 4400,
  inss: 412,
  irrf: 200,
  fgts: 416,
};

describe('gerarPDFHolerite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockJsPDF.mockImplementation(() => ({
      setFontSize: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(),
      setFillColor: vi.fn(), setDrawColor: vi.fn(), setLineWidth: vi.fn(),
      rect: vi.fn(), line: vi.fn(), text: mockText, save: mockSave,
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
      },
      lastAutoTable: { finalY: 100 },
    }));
  });

  it('creates a jsPDF document', () => {
    gerarPDFHolerite(sampleHolerite);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('saves the PDF with colaborador name in filename', () => {
    gerarPDFHolerite(sampleHolerite);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  });

  it('includes competencia in text output', () => {
    gerarPDFHolerite(sampleHolerite);
    const calls = mockText.mock.calls.map((c: any[]) => String(c[0]));
    expect(calls.some(t => t.includes('07/2024'))).toBe(true);
  });

  it('includes colaborador name in text output', () => {
    gerarPDFHolerite(sampleHolerite);
    const calls = mockText.mock.calls.map((c: any[]) => String(c[0]));
    expect(calls.some(t => t.includes('Alice Santos'))).toBe(true);
  });

  it('does not throw with optional fields missing', () => {
    const minimal = { ...sampleHolerite, horas_extras_valor: undefined, vale_transporte: undefined };
    expect(() => gerarPDFHolerite(minimal)).not.toThrow();
  });
});
