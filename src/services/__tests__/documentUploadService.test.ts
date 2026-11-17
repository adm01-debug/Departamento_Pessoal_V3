import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  uploadDocumentFile,
  removeDocumentFile,
  getDocumentSignedUrl,
  resolveDocumentUrl,
} from '../documentUploadService';

// Resgatado da branch `muri`. Os `as any` da origem foram trocados por
// `as unknown as` tipado: o ratchet de `any` em teste tem baseline 0
// (scripts/ratchet-any-tests.mjs).
type BucketApi = ReturnType<typeof supabase.storage.from>;
const bucket = (parcial: Record<string, unknown>) => parcial as unknown as BucketApi;

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
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
      expect(vi.mocked(supabase.storage.from)).toHaveBeenCalledWith('documentos');
    });

    // O path é o que as policies de storage usam para isolar tenant
    // (`storage_path_empresa_id(name)` lê o 1º segmento). Se a empresa deixar
    // de ser o primeiro segmento, o INSERT passa a ser recusado por RLS.
    it('o primeiro segmento do path é sempre a empresa', async () => {
      const meta = await uploadDocumentFile(makeFile('rg.png', 'image/png'), {
        bucket: 'documentos-colaboradores',
        empresaId: 'e-aaa',
        colaboradorId: 'c-bbb',
        categoria: 'documentos-pessoais',
      });
      expect(meta.storage_path.split('/')[0]).toBe('e-aaa');
    });

    it('extensão vem normalizada em minúscula e sem caractere estranho', async () => {
      const meta = await uploadDocumentFile(makeFile('Ficha.PDF', 'application/pdf'), {
        bucket: 'documentos',
        empresaId: 'e1',
        colaboradorId: 'c1',
        categoria: 'x',
      });
      expect(meta.storage_path.endsWith('.pdf')).toBe(true);
    });

    it('rejeita arquivo maior que o limite antes de chamar o Storage', async () => {
      const file = makeFile('grande.pdf', 'application/pdf', 11 * 1024 * 1024);
      await expect(
        uploadDocumentFile(file, {
          bucket: 'documentos',
          empresaId: 'e1',
          colaboradorId: 'c1',
          categoria: 'x',
        })
      ).rejects.toThrow(/10MB/);
      expect(vi.mocked(supabase.storage.from)).not.toHaveBeenCalled();
    });

    it('rejeita extensão perigosa antes de chamar o Storage', async () => {
      const file = makeFile('malware.exe', 'application/octet-stream');
      await expect(
        uploadDocumentFile(file, {
          bucket: 'documentos',
          empresaId: 'e1',
          colaboradorId: 'c1',
          categoria: 'x',
        })
      ).rejects.toThrow(/não permitido/);
      expect(vi.mocked(supabase.storage.from)).not.toHaveBeenCalled();
    });

    it('propaga erro do Storage quando o upload falha', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce(
        bucket({ upload: vi.fn(async () => ({ data: null, error: { message: 'network down' } })) })
      );
      await expect(
        uploadDocumentFile(makeFile('contrato.pdf', 'application/pdf'), {
          bucket: 'documentos',
          empresaId: 'e1',
          colaboradorId: 'c1',
          categoria: 'x',
        })
      ).rejects.toEqual({ message: 'network down' });
    });
  });

  describe('removeDocumentFile', () => {
    it('remove o objeto do bucket', async () => {
      await removeDocumentFile('documentos', 'e1/c1/x/uuid.pdf');
      expect(vi.mocked(supabase.storage.from)).toHaveBeenCalledWith('documentos');
    });

    // `.remove()` devolve `{ data, error }` e não lança: sem este `throw` o
    // chamador apaga a linha do banco achando que o arquivo saiu.
    it('lança quando o Storage devolve erro', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce(
        bucket({ remove: vi.fn(async () => ({ data: null, error: { message: 'not found' } })) })
      );
      await expect(removeDocumentFile('documentos', 'missing.pdf')).rejects.toEqual({
        message: 'not found',
      });
    });
  });

  describe('getDocumentSignedUrl', () => {
    it('devolve a signed URL', async () => {
      expect(await getDocumentSignedUrl('documentos', 'e1/c1/x/uuid.pdf')).toBe('https://example.test/signed');
    });

    it('lança quando não vem signedUrl', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce(
        bucket({ createSignedUrl: vi.fn(async () => ({ data: null, error: null })) })
      );
      await expect(getDocumentSignedUrl('documentos', 'x')).rejects.toThrow(/link de acesso/);
    });
  });

  describe('resolveDocumentUrl', () => {
    it('gera signed URL quando storage_path existe (fluxo novo)', async () => {
      expect(await resolveDocumentUrl({ storage_path: 'e1/c1/x/uuid.pdf', url: null }, 'documentos')).toBe(
        'https://example.test/signed'
      );
    });

    it('cai pra url legada quando não há storage_path', async () => {
      expect(
        await resolveDocumentUrl({ storage_path: null, url: 'https://legado.example.com/doc.pdf' }, 'documentos')
      ).toBe('https://legado.example.com/doc.pdf');
      expect(vi.mocked(supabase.storage.from)).not.toHaveBeenCalled();
    });

    it('devolve null quando não há nem storage_path nem url', async () => {
      expect(await resolveDocumentUrl({ storage_path: null, url: null }, 'documentos')).toBeNull();
    });
  });
});
