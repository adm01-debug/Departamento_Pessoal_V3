-- Reconcilia tabela canônica ausente do replay (criada fora de migrations).
CREATE TABLE IF NOT EXISTS public.medidas_disciplinares_integracao (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  medida_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  colaborador_id uuid NOT NULL,
  tipo_integracao text NOT NULL,
  ref_id uuid,
  competencia text,
  valor numeric(12,2),
  dias integer,
  status text DEFAULT 'pendente'::text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contrato_assinatura_tokens_created_by ON public.contrato_assinatura_tokens (created_by);
CREATE INDEX IF NOT EXISTS idx_contrato_assinatura_tokens_empresa_id ON public.contrato_assinatura_tokens (empresa_id);
CREATE INDEX IF NOT EXISTS idx_contrato_assinatura_tokens_revogado_por ON public.contrato_assinatura_tokens (revogado_por);
CREATE INDEX IF NOT EXISTS idx_contrato_templates_created_by ON public.contrato_templates (created_by);
CREATE INDEX IF NOT EXISTS idx_contrato_templates_departamento_id ON public.contrato_templates (departamento_id);
CREATE INDEX IF NOT EXISTS idx_contrato_token_eventos_ator_id ON public.contrato_token_eventos (ator_id);
CREATE INDEX IF NOT EXISTS idx_contratos_gerados_contrato_anterior_id ON public.contratos_gerados (contrato_anterior_id);
CREATE INDEX IF NOT EXISTS idx_contratos_gerados_gerado_por ON public.contratos_gerados (gerado_por);
CREATE INDEX IF NOT EXISTS idx_contratos_gerados_template_id ON public.contratos_gerados (template_id);
CREATE INDEX IF NOT EXISTS idx_ferias_pagamento_confirmado_por ON public.ferias (pagamento_confirmado_por);
CREATE INDEX IF NOT EXISTS idx_ferias_coletivas_comunicado_gerado_por ON public.ferias_coletivas (comunicado_gerado_por);
CREATE INDEX IF NOT EXISTS idx_ferias_programacao_aprovado_gestor_por ON public.ferias_programacao (aprovado_gestor_por);
CREATE INDEX IF NOT EXISTS idx_ferias_programacao_aprovado_rh_por ON public.ferias_programacao (aprovado_rh_por);
CREATE INDEX IF NOT EXISTS idx_ferias_programacao_criado_por ON public.ferias_programacao (criado_por);
CREATE INDEX IF NOT EXISTS idx_ferias_programacao_periodo_aquisitivo_id ON public.ferias_programacao (periodo_aquisitivo_id);
CREATE INDEX IF NOT EXISTS idx_ferias_programacao_rejeitado_por ON public.ferias_programacao (rejeitado_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disciplinares_aprovado_gestor_por ON public.medidas_disciplinares (aprovado_gestor_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disciplinares_aprovado_juridico_por ON public.medidas_disciplinares (aprovado_juridico_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disciplinares_aprovado_rh_por ON public.medidas_disciplinares (aprovado_rh_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disciplinares_arquivado_por ON public.medidas_disciplinares (arquivado_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disciplinares_rejeitado_por ON public.medidas_disciplinares (rejeitado_por);
CREATE INDEX IF NOT EXISTS idx_medidas_disc_integracao_colaborador_id ON public.medidas_disciplinares_integracao (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_medidas_disc_workflow_log_ator_id ON public.medidas_disciplinares_workflow_log (ator_id);