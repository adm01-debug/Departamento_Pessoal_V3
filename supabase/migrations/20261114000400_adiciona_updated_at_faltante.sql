-- Migration: updated_at ausente em 15 tabelas com trigger BEFORE UPDATE de updated_at
-- Cada tabela abaixo tem trigger que chama public.update_updated_at_column()
-- (NEW.updated_at = now()), mas não tem a coluna updated_at no banco canônico:
-- todo UPDATE nelas falha com 'record "new" has no field "updated_at"'.
-- Levantado read-only em 12/11/2026 (pg_trigger ⨝ pg_proc com prosrc ILIKE
-- '%NEW.updated_at%' e sem pg_attribute updated_at). planos_saude fica fora:
-- coberta por 20261114000200_planos_saude_updated_at.sql (PR #498).
-- Idempotente: ADD COLUMN IF NOT EXISTS. DEFAULT now() (STABLE) não reescreve a
-- tabela (fast default, PG11+). Preflight fail-closed: aborta se alguma tabela
-- não existir (alvo errado / estado divergente do esperado).

-- ============================================================
-- 0. Preflight
-- ============================================================
DO $preflight$
DECLARE
  v_tabela text;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY[
    'public.auth_gov_br_sessions',
    'public.blocked_ips',
    'public.controle_acesso',
    'public.documentos_admissao',
    'public.documentos_assinatura',
    'public.documentos_colaborador',
    'public.escalas_trabalho',
    'public.ferias_solicitacoes',
    'public.notificacoes',
    'public.onboarding_tarefas',
    'public.onboarding_templates',
    'public.periodos_ponto',
    'public.rubricas_folha',
    'public.seguros_vida',
    'public.treinamentos'
  ] LOOP
    IF to_regclass(v_tabela) IS NULL THEN
      RAISE EXCEPTION 'preflight: tabela % não existe', v_tabela;
    END IF;
  END LOOP;
END
$preflight$;

-- ============================================================
-- 1. Coluna exigida pelos triggers
-- ============================================================
ALTER TABLE public.auth_gov_br_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.blocked_ips
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.controle_acesso
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.documentos_admissao
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.documentos_assinatura
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.documentos_colaborador
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.escalas_trabalho
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.ferias_solicitacoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.onboarding_tarefas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.onboarding_templates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.periodos_ponto
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.rubricas_folha
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.seguros_vida
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
