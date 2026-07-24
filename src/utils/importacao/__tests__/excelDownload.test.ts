import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWriteBuffer, mockAddWorksheet, mockAddRow, MockWorkbook } = vi.hoisted(() => {
  const mockAddRow = vi.fn();
  const mockWs = {
    columns: [] as any[],
    addRow: mockAddRow,
  };
  const mockWriteBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  const mockAddWorksheet = vi.fn().mockReturnValue(mockWs);
  const MockWorkbook = vi.fn().mockImplementation(() => ({
    addWorksheet: mockAddWorksheet,
    xlsx: { writeBuffer: mockWriteBuffer },
  }));
  return { mockWriteBuffer, mockAddWorksheet, mockAddRow, MockWorkbook };
});

vi.mock('exceljs', () => ({ default: { Workbook: MockWorkbook } }));

const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
const mockRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

import { downloadWorkbook, buildTabularWorkbook, XLSX_MIME } from '../excelDownload';

describe('XLSX_MIME', () => {
  it('is the correct OOXML MIME type', () => {
    expect(XLSX_MIME).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});

describe('downloadWorkbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteBuffer.mockResolvedValue(new ArrayBuffer(8));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mockRevokeObjectURL);
    const anchor = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as any);
  });

  it('calls writeBuffer and creates object URL', async () => {
    const wb = new MockWorkbook() as any;
    await downloadWorkbook(wb, 'test.xlsx');
    expect(mockWriteBuffer).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('sets download filename on anchor and clicks it', async () => {
    const anchor = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as any);
    const wb = new MockWorkbook() as any;
    await downloadWorkbook(wb, 'relatorio.xlsx');
    expect(anchor.download).toBe('relatorio.xlsx');
    expect(mockClick).toHaveBeenCalled();
  });

  it('revokes object URL after click', async () => {
    const wb = new MockWorkbook() as any;
    await downloadWorkbook(wb, 'file.xlsx');
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});

describe('buildTabularWorkbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockWs = { columns: [] as any[], addRow: mockAddRow };
    mockAddWorksheet.mockReturnValue(mockWs);
    MockWorkbook.mockImplementation(() => ({
      addWorksheet: mockAddWorksheet,
      xlsx: { writeBuffer: mockWriteBuffer },
    }));
  });

  it('creates a Workbook and adds a worksheet', () => {
    buildTabularWorkbook('Sheet1', ['Col A', 'Col B'], []);
    expect(MockWorkbook).toHaveBeenCalled();
    expect(mockAddWorksheet).toHaveBeenCalledWith('Sheet1');
  });

  it('adds rows for each data row', () => {
    buildTabularWorkbook('Data', ['Name', 'Age'], [['Alice', 30], ['Bob', 25]]);
    expect(mockAddRow).toHaveBeenCalledTimes(2);
    expect(mockAddRow).toHaveBeenCalledWith(['Alice', 30]);
    expect(mockAddRow).toHaveBeenCalledWith(['Bob', 25]);
  });

  it('truncates sheet name at 31 characters', () => {
    buildTabularWorkbook('A'.repeat(40), ['Col'], []);
    expect(mockAddWorksheet).toHaveBeenCalledWith('A'.repeat(31));
  });

  it('uses Sheet1 when name is empty', () => {
    buildTabularWorkbook('', ['Col'], []);
    expect(mockAddWorksheet).toHaveBeenCalledWith('Sheet1');
  });

  it('sets columns with correct headers', () => {
    const ws = { columns: [] as any[], addRow: mockAddRow };
    mockAddWorksheet.mockReturnValue(ws);
    buildTabularWorkbook('S', ['Name', 'Age'], []);
    expect(ws.columns[0]).toMatchObject({ header: 'Name', key: 'Name' });
    expect(ws.columns[1]).toMatchObject({ header: 'Age', key: 'Age' });
  });
});
