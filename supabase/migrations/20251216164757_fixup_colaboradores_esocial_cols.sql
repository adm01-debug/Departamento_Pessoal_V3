-- Fixup: add eSocial/expanded columns to colaboradores table
-- 002_colaboradores.sql creates the table with a smaller schema (nome, cargo_id, etc.).
-- 20251216164756 tries CREATE TABLE IF NOT EXISTS with nome_completo, cargo TEXT, etc.
-- but is skipped since the table already exists. Later migrations reference these
-- columns (e.g. pontos_abertos view uses c.nome_completo). This fixup adds them.

-- Naming / identification
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS pis_pasep TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS ctps_data_emissao DATE;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS naturalidade_uf TEXT;

-- Dados bancários (002 has banco/agencia/conta but not these)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS banco_codigo TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS banco_nome TEXT;

-- Dados contratuais (002 uses cargo_id/departamento_id FKs; later migrations expect text fields)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS centro_custo TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS local_trabalho TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cbo TEXT;

-- Remuneração (002 uses salario; later migrations use salario_base)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario_base DECIMAL(12,2);

-- Jornada (002 uses horario_intervalo; 20251216164756 uses intervalo_minutos)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS intervalo_minutos INTEGER DEFAULT 60;

-- Qualificação / outros
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cursos_certificacoes TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Back-fill nome_completo from nome for any existing rows
UPDATE public.colaboradores SET nome_completo = nome WHERE nome_completo IS NULL AND nome IS NOT NULL;
