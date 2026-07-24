
CREATE TABLE IF NOT EXISTS public.holerite_distribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  holerite_id UUID NOT NULL REFERENCES public.holerites(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('email','whatsapp','portal')),
  status TEXT NOT NULL DEFAULT 'enfileirado' CHECK (status IN ('enfileirado','enviado','falhou')),
  erro TEXT,
  distribuido_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.holerite_distribuicoes TO authenticated;
GRANT ALL ON public.holerite_distribuicoes TO service_role;

CREATE INDEX IF NOT EXISTS idx_holerite_dist_folha ON public.holerite_distribuicoes(folha_id, canal);
CREATE INDEX IF NOT EXISTS idx_holerite_dist_status ON public.holerite_distribuicoes(status) WHERE status <> 'enviado';

ALTER TABLE public.holerite_distribuicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distribuicoes visiveis por empresa" ON public.holerite_distribuicoes;
CREATE POLICY "Distribuicoes visiveis por empresa"
ON public.holerite_distribuicoes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.folhas_pagamento fp
    JOIN public.user_empresas ue ON ue.empresa_id = fp.empresa_id
    WHERE fp.id = holerite_distribuicoes.folha_id
      AND ue.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS trg_holerite_dist_updated ON public.holerite_distribuicoes;
CREATE TRIGGER trg_holerite_dist_updated
BEFORE UPDATE ON public.holerite_distribuicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
