import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF } = vi.hoisted(() => {
  const mockDoc = {
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setLineWidth: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    text: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((t: string) => [t]),
    output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
  };
  const MockJsPDF = vi.fn().mockImplementation(() => mockDoc);
  return { MockJsPDF };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));

import { gerarComunicadoMTE, gerarComunicadoSindicato } from '../comunicadoFeriasColetivasPDF';

const MOCK_INPUT = {
  coletiva: {
    id: 'coletiva-uuid-1234',
    data_inicio: '2026-09-01',
    data_fim: '2026-09-15',
    dias: 15,
    departamentos: ['TI', 'RH'],
    justificativa: 'Manutenção anual',
  },
  empresa: {
    razao_social: 'EMPRESA TESTE LTDA',
    cnpj: '12.345.678/0001-90',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  sindicato: {
    nome: 'Sindicato dos Trabalhadores',
    endereco: 'Rua dos Sindicatos, 100',
    cnpj: '98.765.432/0001-00',
  },
  totalColaboradores: 50,
};

describe('gerarComunicadoMTE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const freshDoc = {
      setFont: vi.fn().mockReturnThis(),
      setFontSize: vi.fn().mockReturnThis(),
      setLineWidth: vi.fn().mockReturnThis(),
      setTextColor: vi.fn().mockReturnThis(),
      text: vi.fn(),
      line: vi.fn(),
      splitTextToSize: vi.fn((t: string) => [t]),
      output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    };
    MockJsPDF.mockImplementation(() => freshDoc);
  });

  it('returns a Blob', async () => {
    const result = await gerarComunicadoMTE(MOCK_INPUT);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('returns Uint8Array bytes', async () => {
    const result = await gerarComunicadoMTE(MOCK_INPUT);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it('returns a hash string', async () => {
    const result = await gerarComunicadoMTE(MOCK_INPUT);
    expect(typeof result.hash).toBe('string');
    expect(result.hash.length).toBeGreaterThan(0);
  });

  it('returns filename starting with mte_', async () => {
    const result = await gerarComunicadoMTE(MOCK_INPUT);
    expect(result.filename.startsWith('mte_')).toBe(true);
    expect(result.filename.endsWith('.pdf')).toBe(true);
  });

  it('includes coletiva id prefix in MTE filename', async () => {
    const result = await gerarComunicadoMTE(MOCK_INPUT);
    expect(result.filename).toContain('coletiva-uu');
  });

  it('creates a jsPDF document', async () => {
    await gerarComunicadoMTE(MOCK_INPUT);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('handles coletiva without departamentos', async () => {
    const input = { ...MOCK_INPUT, coletiva: { ...MOCK_INPUT.coletiva, departamentos: null } };
    await expect(gerarComunicadoMTE(input as any)).resolves.toBeDefined();
  });
});

describe('gerarComunicadoSindicato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const freshDoc = {
      setFont: vi.fn().mockReturnThis(),
      setFontSize: vi.fn().mockReturnThis(),
      setLineWidth: vi.fn().mockReturnThis(),
      setTextColor: vi.fn().mockReturnThis(),
      text: vi.fn(),
      line: vi.fn(),
      splitTextToSize: vi.fn((t: string) => [t]),
      output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    };
    MockJsPDF.mockImplementation(() => freshDoc);
  });

  it('returns a Blob', async () => {
    const result = await gerarComunicadoSindicato(MOCK_INPUT);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('returns a hash string', async () => {
    const result = await gerarComunicadoSindicato(MOCK_INPUT);
    expect(typeof result.hash).toBe('string');
  });

  it('returns filename starting with sindicato_', async () => {
    const result = await gerarComunicadoSindicato(MOCK_INPUT);
    expect(result.filename.startsWith('sindicato_')).toBe(true);
    expect(result.filename.endsWith('.pdf')).toBe(true);
  });

  it('creates a jsPDF document', async () => {
    await gerarComunicadoSindicato(MOCK_INPUT);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('handles missing sindicato endereco/cnpj gracefully', async () => {
    const input = { ...MOCK_INPUT, sindicato: { nome: 'Sindicato X' } };
    await expect(gerarComunicadoSindicato(input)).resolves.toBeDefined();
  });
});
