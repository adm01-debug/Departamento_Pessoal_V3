-- Fixup: add empresa_id to tables created in 20251216-20251221 migrations without it
-- These tables were created in timestamp migrations without empresa_id, but later
-- timestamp migrations (2025122813134212+, 20260317+, 20260711+, 20260712+) try to
-- CREATE INDEX on empresa_id — failing because the column is absent.
-- This fixup sorts after the table-creation migrations (20251221214653 is the latest)
-- and before the earliest index-creation batch (2025122813133501).

-- holerites.empresa_id — indexed in 2025122813134212_create_holerites.sql
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- folhas_pagamento.empresa_id — indexed in 20260317125552 and later
-- NOTE: folhas_pagamento is the correct table name in these early migrations
-- (later migrations may use folha_pagamento — both coexist; only this one is missing empresa_id)
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- desligamentos.empresa_id — indexed in 20260712213730
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- auditoria_logs.empresa_id — indexed in 20260711153353
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- onboarding_colaborador.empresa_id — indexed in 20260711153353
ALTER TABLE public.onboarding_colaborador ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- onboarding_tarefas.empresa_id — indexed in 20260711153353
ALTER TABLE public.onboarding_tarefas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
