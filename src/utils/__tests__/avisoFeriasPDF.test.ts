import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockAutoTable } = vi.hoisted(() => {
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((t: string) => [t]),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    lastAutoTable: { finalY: 80 },
  };
  const MockJsPDF = vi.fn().mockImplementation(() => mockDoc);
  const mockAutoTable = vi.fn().mockImplementation((doc: any) => {
    doc.lastAutoTable = { finalY: 80 };
  });
  return { MockJsPDF, mockAutoTable };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));

import { gerarAvisoFeriasPDF } from '../avisoFeriasPDF';

const MOCK_INPUT = {
  ferias: {
    id: 'ferias-uuid-1234',
    data_inicio: '2026-08-01',
    data_fim: '2026-08-30',
    dias_gozo: 30,
    salario_base: 3000,
    valor_ferias: 3000,
    valor_terco: 1000,
    valor_liquido: 3800,
  },
  colaborador: {
    nome_completo: 'Ana Silva',
    cpf: '111.444.777-35',
    cargo: { nome: 'Analista' },
    departamento: { nome: 'RH' },
  },
  empresa: {
    razao_social: 'EMPRESA TESTE LTDA',
    cnpj: '12.345.678/0001-90',
  },
};

describe('gerarAvisoFeriasPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const freshDoc = {
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setDrawColor: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      splitTextToSize: vi.fn((t: string) => [t]),
      getNumberOfPages: vi.fn().mockReturnValue(1),
      setPage: vi.fn(),
      output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
      },
      lastAutoTable: { finalY: 80 },
    };
    MockJsPDF.mockImplementation(() => freshDoc);
    mockAutoTable.mockImplementation((doc: any) => { doc.lastAutoTable = { finalY: 80 }; });
  });

  it('returns a Blob', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('returns a Uint8Array bytes', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it('returns a sha256 hash string', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(typeof result.hash).toBe('string');
    expect(result.hash.length).toBeGreaterThan(0);
  });

  it('returns filename containing colaborador name', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(result.filename).toContain('Ana_Silva');
    expect(result.filename).toContain('ferias-');
  });

  it('includes ferias id prefix in filename', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(result.filename).toContain('ferias-uui');
  });

  it('creates a jsPDF instance', async () => {
    await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('calls autoTable at least 3 times (identificação, período, valores)', async () => {
    await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(mockAutoTable.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('handles missing empresa data gracefully', async () => {
    const input = { ...MOCK_INPUT, empresa: null };
    await expect(gerarAvisoFeriasPDF(input as any)).resolves.toBeDefined();
  });

  it('handles missing assinatura (returns pending placeholder hash)', async () => {
    const result = await gerarAvisoFeriasPDF(MOCK_INPUT);
    expect(result.hash).toBeDefined();
  });
});
