import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

export type OCRResult = {
  valid: boolean;
  confidence: number;
  /**
   * O arquivo chegou ao servidor? Sem separar isto de `valid`, um OCR que falha
   * (tipo sem OCR, serviço de IA fora do ar) fazia o documento deixar de ser
   * enviado — o candidato ficava travado na contratação.
   */
  uploaded: boolean;
  extractedData?: {
    nome?: string;
    cpf?: string;
    data_nascimento?: string;
    rg?: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  error?: string;
};

/**
 * Tipos de documento da UI que o OCR reconhece. A lista canônica é a de
 * `supabase/functions/_shared/ocr.ts`; `foto` e `ctps` não têm OCR (não é
 * documento de texto) e são apenas enviados.
 */
const OCR_DOC_TYPE_MAP: Record<string, string> = {
  // O campo da UI é "RG ou CNH" — um tipo de OCR só para `rg` reprovava CNH.
  rg: 'identidade',
  cpf: 'cpf',
  cnh: 'cnh',
  residencia: 'comprovante_residencia',
  comprovante_residencia: 'comprovante_residencia',
};

/**
 * O provedor recebe a URL do arquivo como `image_url`, então PDF não tem OCR:
 * o arquivo é enviado normalmente e o RH confere na mão.
 */
function hasOcrSupport(file: File, docType: string): boolean {
  return Boolean(OCR_DOC_TYPE_MAP[docType]) && file.type.startsWith('image/');
}

export function useDocumentOCR() {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Envia um documento do portal público `/contratacao` e devolve o OCR.
   *
   * O envio passa pela edge function `admissao-publica` porque o candidato não
   * tem sessão: o Storage nega INSERT a `anon`, e desde o P0-004 o único
   * caminho sancionado é `service_role` depois de a função validar o token.
   */
  const processDocument = async (file: File, docType: string, token: string): Promise<OCRResult> => {
    setIsProcessing(true);
    try {
      const ocrDocType = hasOcrSupport(file, docType) ? OCR_DOC_TYPE_MAP[docType] : undefined;

      const form = new FormData();
      form.append('token', token);
      form.append('tipo', docType);
      form.append('file', file);
      if (ocrDocType) {
        form.append('ocr', 'true');
        form.append('doc_type', ocrDocType);
      }

      const { data, error } = await supabase.functions.invoke('admissao-publica', { body: form });

      if (error) throw error;

      if (!ocrDocType) {
        return { uploaded: true, valid: true, confidence: 0 };
      }

      const ocr = (data as { ocr?: Partial<OCRResult> | null } | null)?.ocr ?? null;

      return {
        uploaded: true,
        valid: ocr?.valid ?? false,
        confidence: ocr?.confidence ?? 0,
        extractedData: ocr?.extractedData,
        error: ocr?.valid ? undefined : ocr?.error ?? 'Não foi possível validar o documento automaticamente.',
      };
    } catch (err: unknown) {
      loggerService.error('OCR Error', { docType }, err instanceof Error ? err : undefined);
      return {
        uploaded: false,
        valid: false,
        confidence: 0,
        error: 'Não foi possível enviar o documento.',
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return { processDocument, isProcessing };
}