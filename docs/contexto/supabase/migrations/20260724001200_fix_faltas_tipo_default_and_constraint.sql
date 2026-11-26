-- Issue 40: Corrige faltas.tipo DEFAULT 'falta' incompatível com chk_faltas_tipo.
--
-- 2025122813133705_create_faltas.sql (stub) criou tipo TEXT DEFAULT 'falta'.
-- 20260317001934_fixup_faltas_cols.sql adicionou tipo TEXT DEFAULT 'falta' via
-- ADD COLUMN IF NOT EXISTS (redundante mas confirma a intenção original).
-- 20260713110053_* adicionou chk_faltas_tipo CHECK (tipo IS NULL OR tipo IN
-- ('atestado_medico','falta_injustificada','falta_justificada',...)) sem incluir
-- 'falta' na lista de valores válidos.
--
-- Resultado:
-- - Em produção com rows existentes: ADD CONSTRAINT falhou (rows com tipo='falta').
-- - Em preview (sem rows): ADD CONSTRAINT passou, mas qualquer INSERT sem tipo
--   explícito usa DEFAULT 'falta' e viola o constraint imediatamente.
--
-- Correção:
-- 1. Drop e recriação do constraint (idempotente via IF NOT EXISTS implícito no DROP)
-- 2. Backfill de rows com tipo inválido
-- 3. Alteração do DEFAULT para valor canônico

-- Passo 1: Remover constraint para permitir backfill seguro
ALTER TABLE public.faltas
  DROP CONSTRAINT IF EXISTS chk_faltas_tipo;

-- Passo 2: Backfill rows com tipo='falta' → 'falta_injustificada'
UPDATE public.faltas
  SET tipo = 'falta_injustificada'
  WHERE tipo = 'falta' OR tipo NOT IN (
    'atestado_medico','falta_injustificada','falta_justificada','licenca',
    'ausencia_parcial','atraso','saida_antecipada','luto','casamento',
    'doacao_sangue','servico_militar','doenca_familiar','maternidade',
    'paternidade','outros'
  );

-- Passo 3: Alterar DEFAULT para valor canônico válido
ALTER TABLE public.faltas
  ALTER COLUMN tipo SET DEFAULT 'falta_injustificada';

-- Passo 4: Re-adicionar constraint com lista completa
ALTER TABLE public.faltas
  ADD CONSTRAINT chk_faltas_tipo CHECK (
    tipo IS NULL OR tipo IN (
      'atestado_medico','falta_injustificada','falta_justificada','licenca',
      'ausencia_parcial','atraso','saida_antecipada','luto','casamento',
      'doacao_sangue','servico_militar','doenca_familiar','maternidade',
      'paternidade','outros'
    )
  );
