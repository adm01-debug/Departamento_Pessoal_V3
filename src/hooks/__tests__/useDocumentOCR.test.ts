import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentOCR } from '../useDocumentOCR';

const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (name: string, opts: unknown) => mockInvoke(name, opts),
    },
  },
}));

function makeFile(name = 'doc.pdf', type = 'application/pdf') {
  return new File(['content'], name, { type });
}

/** Arquivo de imagem: único formato que passa pelo OCR. */
function makeImage(name = 'doc.png') {
  return makeFile(name, 'image/png');
}

/** Corpo enviado à edge function na última chamada. */
function lastFormData(): FormData {
  const opts = mockInvoke.mock.calls.at(-1)?.[1] as { body: FormData };
  return opts.body;
}

describe('useDocumentOCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        path: 'admissao_1/rg_1.pdf',
        ocr: { valid: true, confidence: 0.95, extractedData: { nome: 'Alice' } },
      },
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
    mockInvoke.mockReturnValueOnce(
      new Promise((r) => {
        resolveInvoke = r;
      })
    );

    const { result } = renderHook(() => useDocumentOCR());
    let promise!: Promise<unknown>;

    act(() => {
      promise = result.current.processDocument(makeFile(), 'rg', 'tok-12345678901234');
    });

    expect(result.current.isProcessing).toBe(true);

    await act(async () => {
      resolveInvoke({ data: { ok: true, ocr: { valid: true, confidence: 0.9 } }, error: null });
      await promise;
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it('envia o arquivo pela edge function admissao-publica com o token', async () => {
    const { result } = renderHook(() => useDocumentOCR());

    await act(async () => {
      await result.current.processDocument(makeImage('rg.png'), 'rg', 'tok-12345678901234');
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'admissao-publica',
      expect.objectContaining({ body: expect.any(FormData) })
    );
    const form = lastFormData();
    expect(form.get('token')).toBe('tok-12345678901234');
    expect(form.get('tipo')).toBe('rg');
    expect(form.get('ocr')).toBe('true');
    // Campo único "RG ou CNH": o OCR recebe `identidade`, que aceita os dois.
    expect(form.get('doc_type')).toBe('identidade');
  });

  it('não pede OCR de documento PDF (o provedor só lê imagem)', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: true, path: 'admissao_1/rg_1.pdf', ocr: null }, error: null });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: Record<string, unknown> = {};

    await act(async () => {
      ocr = await result.current.processDocument(makeFile('rg.pdf'), 'rg', 'tok-12345678901234');
    });

    expect(lastFormData().get('ocr')).toBeNull();
    expect(ocr).toEqual({ uploaded: true, valid: true, confidence: 0 });
  });

  it('traduz o tipo da UI para o tipo aceito pelo OCR', async () => {
    const { result } = renderHook(() => useDocumentOCR());

    await act(async () => {
      await result.current.processDocument(makeImage(), 'residencia', 'tok-12345678901234');
    });

    expect(lastFormData().get('doc_type')).toBe('comprovante_residencia');
  });

  it('não pede OCR para tipo sem OCR (foto) e considera o envio como sucesso', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: true, path: 'admissao_1/foto_1.jpg', ocr: null }, error: null });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: Record<string, unknown> = {};

    await act(async () => {
      ocr = await result.current.processDocument(makeFile('foto.jpg'), 'foto', 'tok-12345678901234');
    });

    expect(lastFormData().get('ocr')).toBeNull();
    expect(ocr).toEqual({ uploaded: true, valid: true, confidence: 0 });
  });

  it('returns OCR data on success', async () => {
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: Record<string, unknown> = {};

    await act(async () => {
      ocr = await result.current.processDocument(makeImage(), 'rg', 'tok-12345678901234');
    });

    expect(ocr.uploaded).toBe(true);
    expect(ocr.valid).toBe(true);
    expect(ocr.confidence).toBe(0.95);
    expect(ocr.extractedData).toEqual({ nome: 'Alice' });
  });

  it('mantém uploaded=true quando o OCR não valida o documento', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        path: 'admissao_1/rg_1.pdf',
        ocr: { valid: false, confidence: 0, error: 'Documento ilegível' },
      },
      error: null,
    });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: Record<string, unknown> = {};

    await act(async () => {
      ocr = await result.current.processDocument(makeImage(), 'rg', 'tok-12345678901234');
    });

    expect(ocr.uploaded).toBe(true);
    expect(ocr.valid).toBe(false);
    expect(ocr.error).toBe('Documento ilegível');
  });

  it('marca uploaded=false quando o envio falha', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'function error' } });
    const { result } = renderHook(() => useDocumentOCR());
    let ocr: Record<string, unknown> = {};

    await act(async () => {
      ocr = await result.current.processDocument(makeFile(), 'rg', 'tok-12345678901234');
    });

    expect(ocr.uploaded).toBe(false);
    expect(ocr.valid).toBe(false);
    expect(ocr.error).toBe('Não foi possível enviar o documento.');
  });

  it('resets isProcessing to false even on error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDocumentOCR());

    await act(async () => {
      await result.current.processDocument(makeFile(), 'rg', 'tok-12345678901234');
    });

    expect(result.current.isProcessing).toBe(false);
  });
});
