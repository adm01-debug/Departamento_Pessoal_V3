import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockJsPDF, mockSave } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockAddImage = vi.fn();
  const mockDoc = {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    addImage: mockAddImage,
    splitTextToSize: vi.fn((t: string) => [t]),
    save: mockSave,
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
  };
  const MockJsPDF = vi.fn().mockImplementation(() => mockDoc);
  return { MockJsPDF, mockSave };
});

vi.mock('jspdf', () => ({ default: MockJsPDF }));
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}));

import { gerarReciboAssinaturaPDF } from '../reciboAssinaturaPdf';

const MOCK_DATA = {
  hash: 'abc123def456789012345678901234567890123456789012345678901234',
  assinadoEm: '2026-07-24T10:00:00.000Z',
  contratoId: 'contrato-uuid-1',
  origin: 'https://app.example.com',
};

describe('gerarReciboAssinaturaPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const freshDoc = {
      setFillColor: vi.fn(),
      setTextColor: vi.fn(),
      setFont: vi.fn().mockReturnThis(),
      setFontSize: vi.fn(),
      setDrawColor: vi.fn(),
      rect: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addImage: vi.fn(),
      splitTextToSize: vi.fn((t: string) => [t]),
      save: mockSave,
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    };
    MockJsPDF.mockImplementation(() => freshDoc);
  });

  it('creates a jsPDF document', async () => {
    await gerarReciboAssinaturaPDF(MOCK_DATA);
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
  });

  it('saves the PDF with filename containing hash prefix', async () => {
    await gerarReciboAssinaturaPDF(MOCK_DATA);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('abc123def456'));
  });

  it('saves filename starting with recibo-assinatura-', async () => {
    await gerarReciboAssinaturaPDF(MOCK_DATA);
    expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/^recibo-assinatura-/));
  });

  it('generates QR code with correct URL', async () => {
    const QRCode = await import('qrcode');
    await gerarReciboAssinaturaPDF(MOCK_DATA);
    expect(QRCode.default.toDataURL).toHaveBeenCalledWith(
      expect.stringContaining('abc123def456'),
      expect.any(Object)
    );
  });

  it('works without contratoId', async () => {
    const data = { ...MOCK_DATA, contratoId: undefined };
    await expect(gerarReciboAssinaturaPDF(data)).resolves.toBeUndefined();
  });

  it('adds QR code image to document', async () => {
    const addImage = vi.fn();
    MockJsPDF.mockImplementation(() => ({
      setFillColor: vi.fn(),
      setTextColor: vi.fn(),
      setFont: vi.fn().mockReturnThis(),
      setFontSize: vi.fn(),
      setDrawColor: vi.fn(),
      rect: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addImage,
      splitTextToSize: vi.fn((t: string) => [t]),
      save: mockSave,
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    }));
    await gerarReciboAssinaturaPDF(MOCK_DATA);
    expect(addImage).toHaveBeenCalledWith(
      expect.stringContaining('data:image/png'),
      'PNG',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });
});
