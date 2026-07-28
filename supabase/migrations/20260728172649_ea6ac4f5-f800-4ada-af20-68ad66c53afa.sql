-- Índice de cobertura para o caminho de verificação de RLS:
-- SELECT id FROM colaboradores WHERE empresa_id IN (...)
-- Permite index-only scan, eliminando heap fetches em ~30 policies filhas.
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id_cover
  ON public.colaboradores (empresa_id) INCLUDE (id);

ANALYZE public.colaboradores;
ANALYZE public.pensoes;