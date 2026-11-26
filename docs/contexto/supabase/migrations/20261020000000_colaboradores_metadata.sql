-- colaboradores.metadata: identidade imutável de origem (ex.: admissao_id) e
-- dados auxiliares. O insert do admissaoService.concluir grava
-- metadata.admissao_id aqui — a reconciliação de falha parcial não pode depender
-- de `observacoes` (campo livre editável).
-- IF NOT EXISTS: a mesma coluna é criada pela 20261019000000_qa3_db_fixes —
-- a segunda a aplicar vira no-op, a ordem entre os dois lotes não importa.
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
