-- Issue 38: Adiciona colunas para_irrf, para_plano_saude, para_salario_familia em dependentes.
--
-- 002_colaboradores.sql criou dependentes com nome/cpf/data_nascimento/parentesco.
-- 20251216164756_* tentou recriar a tabela com as colunas para_* via
-- CREATE TABLE IF NOT EXISTS — que foi NO-OP (tabela já existia).
-- Nenhuma migration posterior as adicionou via ADD COLUMN.
--
-- calculoBeneficiosService.ts filtra por para_plano_saude/para_salario_familia;
-- dependentesService.ts insere/exibe todas as três; types.ts as declara como
-- obrigatórias no tipo Row. Sem elas toda query retorna NULL e os cálculos de
-- benefícios ficam incorretos.

ALTER TABLE public.dependentes
  ADD COLUMN IF NOT EXISTS para_irrf           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS para_plano_saude    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS para_salario_familia BOOLEAN DEFAULT false;

-- Índice de suporte para consultas de benefícios filtrando por colaborador
CREATE INDEX IF NOT EXISTS idx_dependentes_empresa_id
  ON public.dependentes (empresa_id)
  WHERE empresa_id IS NOT NULL;
