-- Re-cria índice de ciencia_rate_limits que pode estar ausente em branches de preview
-- onde 20260723152556_* falhou antes de 20260723152400_* criar a tabela.
--
-- Em bancos frescos o índice já existe (criado pelo 152556_*); CREATE INDEX IF NOT EXISTS
-- é no-op. Em branches de preview com estado parcial, esta migração cria o índice.
CREATE INDEX IF NOT EXISTS idx_ciencia_rate_limits_verif_contrato
  ON public.ciencia_rate_limits (identifier, created_at DESC)
  WHERE rpc_name = 'contrato_verificar_autenticidade_v2';

CREATE INDEX IF NOT EXISTS idx_ciencia_rate_limits_identifier
  ON public.ciencia_rate_limits (identifier, created_at DESC);
