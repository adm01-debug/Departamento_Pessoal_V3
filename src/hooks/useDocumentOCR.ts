import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

export type OCRResult = {
  valid: boolean;
  confidence: number;
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

export function useDocumentOCR() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processDocument = async (file: File, docType: string): Promise<OCRResult> => {
    setIsProcessing(true);
    try {
      // 1. Upload to storage (temp location)
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-admissao')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documentos-admissao')
        .getPublicUrl(filePath);

      // 3. Call OCR function
      const { data, error } = await supabase.functions.invoke('process-document-ocr', {
        body: { 
          fileUrl: publicUrl,
          docType: docType
        },
      });

      if (error) throw error;

      // 4. Cleanup temp file (optional, but good practice)
      // await supabase.storage.from('documentos-admissao').remove([filePath]);

      return data as OCRResult;
    } catch (err: unknown) {
      loggerService.error('OCR Error', { docType }, err instanceof Error ? err : undefined);
      return {
        valid: false,
        confidence: 0,
        error: 'Não foi possível processar o documento automaticamente.'
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return { processDocument, isProcessing };
}
