-- Issue 41: Expande o CHECK constraint de audit_log.acao para aceitar os
-- valores usados pelas Edge Functions.
--
-- 20251220132737_* criou audit_log com:
--   acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE'))
--
-- As Edge Functions (calcular-folha, calcular-rescisao, fechar-folha,
-- calcular-ferias, etc.) inserem valores como 'PAYROLL_CALC', 'PAYROLL_CALC_BLOCKED',
-- 'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT', 'FERIAS_CALC', 'RESCISAO_CALC',
-- 'PROVISOES_CALC', 'ESOCIAL_SEND', 'DECIMO_CALC' etc.
-- Todos esses INSERTs são silenciosamente perdidos (try-catch /*noop*/ nas funções).
--
-- Correção: Drop + recriação do constraint com a lista ampliada.

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_acao_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_acao_check CHECK (
    acao IN (
      -- Operações CRUD padrão (triggers de tabelas)
      'INSERT', 'UPDATE', 'DELETE',
      -- Edge Functions de folha/cálculo
      'PAYROLL_CALC', 'PAYROLL_CALC_BLOCKED', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN',
      -- Edge Functions de férias
      'FERIAS_CALC', 'FERIAS_CANCEL',
      -- Edge Functions de rescisão
      'RESCISAO_CALC',
      -- Edge Functions de provisões
      'PROVISOES_CALC',
      -- Edge Functions de eSocial
      'ESOCIAL_SEND',
      -- Edge Functions de 13º salário
      'DECIMO_CALC',
      -- Controle de idempotência
      'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT',
      -- Backup automático
      'BACKUP_CREATED', 'BACKUP_FAILED',
      -- Operações de sistema genéricas
      'SYSTEM_ACTION', 'AUTH_ACTION', 'EXPORT', 'IMPORT'
    )
  );
