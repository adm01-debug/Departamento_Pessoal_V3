import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  gerarComunicadoMTE,
  gerarComunicadoSindicato,
  type ComunicadoColetivasInput,
} from '@/utils/comunicadoFeriasColetivasPDF';

const BUCKET = 'ferias-coletivas-comunicados';

export interface GerarComunicadoParams {
  coletivaId: string;
  empresaId: string;
  sindicato: { nome: string; endereco?: string; cnpj?: string };
}

async function uploadPDF(path: string, blob: Blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;
}

export function useGerarComunicadoColetivas() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ coletivaId, empresaId, sindicato }: GerarComunicadoParams) => {
      // 1. Carrega dados da coletiva + empresa + total de colaboradores
      const [{ data: coletiva, error: e1 }, { data: empresa, error: e2 }] = await Promise.all([
        supabase.from('ferias_coletivas').select('*').eq('id', coletivaId).single(),
        supabase.from('empresas').select('*').eq('id', empresaId).single(),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (!coletiva || !empresa) throw new Error('Dados da coletiva ou empresa não encontrados');

      let colabQuery = supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo');
      if (coletiva.departamentos?.length) {
        colabQuery = colabQuery.in('departamento', coletiva.departamentos);
      }
      const { count } = await colabQuery;
      const totalColaboradores = count ?? 0;

      const input: ComunicadoColetivasInput = {
        coletiva,
        empresa,
        sindicato,
        totalColaboradores,
      };

      // 2. Gera PDFs em memória
      const [mte, sind] = await Promise.all([
        gerarComunicadoMTE(input),
        gerarComunicadoSindicato(input),
      ]);

      // 3. Upload para bucket privado (path: {empresa_id}/{coletiva_id}/arquivo.pdf)
      const mtePath = `${empresaId}/${coletivaId}/${mte.filename}`;
      const sindPath = `${empresaId}/${coletivaId}/${sind.filename}`;
      await Promise.all([uploadPDF(mtePath, mte.blob), uploadPDF(sindPath, sind.blob)]);

      // 4. Registra metadados via RPC auditada
      const { data, error } = await supabase.rpc('registrar_comunicado_ferias_coletivas', {
        _coletiva_id: coletivaId,
        _mte_path: mtePath,
        _mte_hash: mte.hash,
        _sindicato_path: sindPath,
        _sindicato_hash: sind.hash,
        _sindicato_nome: sindicato.nome,
      });
      if (error) throw error;

      return { data, mtePath, sindPath };
    },
    onSuccess: () => {
      toast.success('Comunicados MTE e sindicato gerados e arquivados com sucesso');
      qc.invalidateQueries({ queryKey: ['ferias_coletivas'] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao gerar comunicados: ${err.message ?? err}`);
    },
  });
}

export async function baixarComunicadoColetivas(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) throw error ?? new Error('URL assinada indisponível');
  return data.signedUrl;
}
