import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

export type MedidaDisciplinarRow = Tables['medidas_disciplinares']['Row'];
export type MedidaDisciplinarInsert = Tables['medidas_disciplinares']['Insert'];
export type MedidaDisciplinarUpdate = Tables['medidas_disciplinares']['Update'];

export type MedidaWorkflowLogRow = Tables['medidas_disciplinares_workflow_log']['Row'];
export type MedidaIntegracaoRow = Tables['medidas_disciplinares_integracao']['Row'];
export type MedidaContestacaoAnexoRow =
  Tables['medidas_disciplinares_contestacao_anexos']['Row'];

/** Resumo do colaborador embutido nas consultas de medidas. */
export interface ColaboradorResumoMedida {
  nome_completo: string | null;
}

/** Linha de medida disciplinar com o join de colaborador. */
export type MedidaDisciplinarComColaborador = MedidaDisciplinarRow & {
  colaborador: ColaboradorResumoMedida | null;
};

/** Retorno da RPC `sugerir_proxima_medida`. */
export interface SugestaoProximaMedida {
  tipo_sugerido: string;
  justificativa: string;
  historico_12m: Record<string, number>;
}

/** Retorno da Edge Function `gerar-medida-disciplinar-pdf`. */
export interface MedidaPdfResultado {
  path: string;
  hash: string;
  signed_url: string;
}

/** Retorno genérico (jsonb) das RPCs de workflow de medidas. */
export type MedidaWorkflowResultado = Database['public']['Functions'] extends {
  medida_aprovar: { Returns: infer R };
}
  ? R
  : unknown;
