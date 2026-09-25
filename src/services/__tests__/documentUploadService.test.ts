import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  uploadDocumentFile,
  removeDocumentFile,
  getDocumentSignedUrl,
  resolveDocumentUrl,
} from '../documentUploadService';

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe('documentUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadDocumentFile', () => {
    it('valida, envia o arquivo pro bucket e devolve o storage_path/meta', async () => {
      const file = makeFile('contrato.pdf', 'application/pdf');
      const meta = await uploadDocumentFile(file, {
        bucket: 'documentos',
        empresaId: 'empresa-1',
        colaboradorId: 'colab-1',
        categoria: 'documentos-digitais',
      });

      expect(meta.nome_arquivo).toBe('contrato.pdf');
      expect(meta.mime_type).toBe('application/pdf');
      expect(meta.tamanho).toBe(1024);
      expect(meta.storage_path).toMatch(/^empresa-1\/colab-1\/documentos-digitais\/[0-9a-f-]+\.pdf$/);

      const storageFrom = vi.mocked(supabase.storage.from);
      expect(storageFrom).toHaveBeenCalledWith('documentos');
    });

    it('rejeita arquivo maior que o limite antes de chamar o Storage', async () => {
      const file = makeFile('grande.pdf', 'application/pdf', 11 * 1024 * 1024);
      await expect(
        uploadDocumentFile(file, { bucket: 'documentos', empresaId: 'e1', colaboradorId: 'c1', categoria: 'x' }),
      ).rejects.toThrow(/10MB/);
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('rejeita extensão perigosa antes de chamar o Storage', async () => {
      const file = makeFile('malware.exe', 'application/octet-stream');
      await expect(
        uploadDocumentFile(file, { bucket: 'documentos', empresaId: 'e1', colaboradorId: 'c1', categoria: 'x' }),
      ).rejects.toThrow(/não permitido/);
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('propaga erro do Storage quando o upload falha', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        upload: vi.fn(async () => ({ data: null, error: { message: 'network down' } })),
      } as any);

      const file = makeFile('contrato.pdf', 'application/pdf');
      await expect(
        uploadDocumentFile(file, { bucket: 'documentos', empresaId: 'e1', colaboradorId: 'c1', categoria: 'x' }),
      ).rejects.toEqual({ message: 'network down' });
    });
  });

  describe('removeDocumentFile', () => {
    it('remove o objeto do bucket', async () => {
      await removeDocumentFile('documentos', 'e1/c1/x/uuid.pdf');
      expect(supabase.storage.from).toHaveBeenCalledWith('documentos');
    });

    it('lança quando o Storage devolve erro', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        remove: vi.fn(async () => ({ data: null, error: { message: 'not found' } })),
      } as any);
      await expect(removeDocumentFile('documentos', 'missing.pdf')).rejects.toEqual({ message: 'not found' });
    });
  });

  describe('getDocumentSignedUrl', () => {
    it('devolve a signed URL', async () => {
      const url = await getDocumentSignedUrl('documentos', 'e1/c1/x/uuid.pdf');
      expect(url).toBe('https://example.test/signed');
    });

    it('lança quando não vem signedUrl', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        createSignedUrl: vi.fn(async () => ({ data: null, error: null })),
      } as any);
      await expect(getDocumentSignedUrl('documentos', 'x')).rejects.toThrow(/link de acesso/);
    });
  });

  describe('resolveDocumentUrl', () => {
    it('gera signed URL quando storage_path existe (fluxo novo)', async () => {
      const url = await resolveDocumentUrl({ storage_path: 'e1/c1/x/uuid.pdf', url: null }, 'documentos');
      expect(url).toBe('https://example.test/signed');
    });

    it('cai pra url legada quando não há storage_path', async () => {
      const url = await resolveDocumentUrl({ storage_path: null, url: 'https://legado.example.com/doc.pdf' }, 'documentos');
      expect(url).toBe('https://legado.example.com/doc.pdf');
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('devolve null quando não há nem storage_path nem url', async () => {
      const url = await resolveDocumentUrl({ storage_path: null, url: null }, 'documentos');
      expect(url).toBeNull();
    });
  });
});
