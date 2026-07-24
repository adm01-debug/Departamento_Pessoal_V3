-- Issues 19/12: Adiciona colunas de negócio ausentes em jornadas.
--
-- 2025122813133602_create_jornadas.sql (stub gerado automaticamente) criou
-- a tabela com campos genéricos (descricao, valor, status). A migration
-- 20260306005302_* que devia criar a tabela com os campos corretos (nome,
-- tipo, carga_horaria_semanal, horario_entrada, horario_saida,
-- intervalo_minutos, ativa) virou no-op pois a tabela já existia.
-- jornadaService.ts e JornadasPage.tsx referenciam todas essas colunas.
ALTER TABLE public.jornadas
  ADD COLUMN IF NOT EXISTS nome                   TEXT,
  ADD COLUMN IF NOT EXISTS tipo                   TEXT DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS carga_horaria_semanal  INTEGER DEFAULT 44,
  ADD COLUMN IF NOT EXISTS horario_entrada        TEXT,
  ADD COLUMN IF NOT EXISTS horario_saida          TEXT,
  ADD COLUMN IF NOT EXISTS intervalo_minutos      INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ativa                  BOOLEAN DEFAULT true;

-- Índice de suporte para listagem por empresa filtrando apenas jornadas ativas
CREATE INDEX IF NOT EXISTS idx_jornadas_empresa_ativa
  ON public.jornadas (empresa_id, ativa)
  WHERE ativa = true;
