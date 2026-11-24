import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentOCR } from '../useDocumentOCR';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (path: string, file: File) => mockUpload(path, file),
        getPublicUrl: (path: string) => mockGetPublicUrl(path),
      }),
    },
    functions: {
      invoke: (name: string, opts: unknown) => mockInvoke(name, opts),
    },
  },
}));

function makeFile(name = 'doc.pdf') {
  return new File(['content'], name, { type: 'application/pdf' });
}

describe('useDocumentOCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/temp/doc.pdf' } });
    mockInvoke.mockResolvedValue({
      data: { valid: true, confidence: 0.95, extractedData: { nome: 'Alice' } },
      error: null,
    });
  });

  it('starts with isProcessing false', () => {
    const { result } = renderHook(() => useDocumentOCR());
    expect(result.current.isProcessing).toBe(false);
  });

  it('returns processDocument function', () => {
    const { result } = renderHook(() => useDocumentOCR());
    expect(typeof result.current.processDocument).toBe('function');
  });

  it('sets isProcessing true during processing', async () => {
    let resolveInvoke!: (v: unknown) => void;
    mockInvoke.mockReturnValueOnce(new Promise(r => { resolveInvoke = r; }));

    const { result } = renderHook(() => useDocumentOCR());
    let promise!: Promise<unknown>;

    act(() => {
      promise = result.current.processDocument(makeFile(), 'rg');
    });

    expect(result.current.isProcessing).toBe(true);

    await act(async () => {
      resolveInvoke({ data: { valid: true, confidence: 0.9 }, error: null });
      await promise;
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it('uploads file to temp path', async () => {
    const { result } = renderHook(() => useDocumentOCR());
    const file = makeFile('rg.png');

    await act(async () => {
      await result.current.processDocument(file, 'rg');
    });

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^temp\/.*\.png$/),
      file
    );
  });

  it('calls OCR edge function with correct doc type', async () => {
    const { result } = renderHook(() => useDocumentOCR());

    await act(async () => {
      await result.current.processDocument(makeFile(), 'cnh');
    });

    expect(mockInvoke).toHaveBeenCalledWith('process-document-ocr', expect.objectContaining({
      body: expect.objectContaining({ docType: 'cnh' }),
    }));
  });

  it('returns OCR data on success', async () => {
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: any;

    await act(async () => {
      ocr = await result.current.processDocument(makeFile(), 'rg');
    });

    expect(ocr).toEqual({ valid: true, confidence: 0.95, extractedData: { nome: 'Alice' } });
  });

  it('returns error result when upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'storage full' } });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: any;

    await act(async () => {
      ocr = await result.current.processDocument(makeFile(), 'rg');
    });

    expect(ocr.valid).toBe(false);
    expect(ocr.confidence).toBe(0);
    expect(ocr.error).toContain('Não foi possível');
  });

  it('returns error result when function invocation fails', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'function error' } });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: any;

    await act(async () => {
      ocr = await result.current.processDocument(makeFile(), 'rg');
    });

    expect(ocr.valid).toBe(false);
  });

  it('resets isProcessing to false even on error', async () => {
    mockUpload.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDocumentOCR());

    await act(async () => {
      await result.current.processDocument(makeFile(), 'rg');
    });

    expect(result.current.isProcessing).toBe(false);
  });
});
