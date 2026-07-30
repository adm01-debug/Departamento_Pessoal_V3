-- =====================================================================
-- FIX CRÍTICO: UPDATE impossível em 17 tabelas
--
-- Diagnóstico:
--   18 gatilhos BEFORE UPDATE executam public.update_updated_at_column(),
--   cujo corpo é `NEW.updated_at = NOW()`. Em 17 tabelas a coluna
--   updated_at NUNCA existiu. Toda tentativa de UPDATE aborta com:
--       ERROR: record "new" has no field "updated_at"
--   (reproduzido em laboratório com tabela temporária + o gatilho real).
--
--   INSERT funcionava, o que mascarou o defeito: os gatilhos são BEFORE
--   UPDATE, então só disparam na alteração.
--
-- Impacto medido: 15 call sites de .update() no frontend sobre estas
--   tabelas — incluindo "marcar notificação como lida" (8 usos),
--   rubricas da folha (4), férias, onboarding e períodos de ponto.
--
-- Decisão de correção:
--   Adicionar a coluna, em vez de remover o gatilho. A convenção do projeto
--   exige created_at/updated_at, e as 17 tabelas já possuem created_at —
--   updated_at é a metade que faltou. Remover o gatilho "consertaria" o erro
--   destruindo a trilha de auditoria pretendida.
--
--   ADD COLUMN ... DEFAULT now() não reescreve a tabela (PG11+), então é
--   rápido mesmo nas tabelas grandes.
--
--   Backfill: updated_at = created_at. Semanticamente correto — a linha não
--   sofreu alteração desde a criação. Feito ANTES do NOT NULL para evitar
--   qualquer janela inconsistente.
-- =====================================================================

DO $$
DECLARE
  t text;
  alvos text[] := ARRAY[
    'auth_gov_br_sessions','blocked_ips','controle_acesso','documentos_admissao',
    'documentos_assinatura','documentos_colaborador','escalas_trabalho',
    'ferias_solicitacoes','notificacoes','onboarding_tarefas','onboarding_templates',
    'periodos_ponto','planos_saude','rubricas_folha','seguros_vida','treinamentos'
  ];
BEGIN
  FOREACH t IN ARRAY alvos LOOP
    -- idempotente: se já existir, não faz nada
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='updated_at'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()', t);
      -- alinha o histórico: linha nunca alterada => updated_at = created_at
      EXECUTE format(
        'UPDATE public.%I SET updated_at = created_at WHERE created_at IS NOT NULL', t);
      RAISE NOTICE 'updated_at adicionada em %', t;
    END IF;
  END LOOP;
END $$;

-- documentos_assinatura carregava DOIS gatilhos BEFORE UPDATE idênticos
-- (set_timestamp_documentos_assinatura e update_documentos_assinatura_updated_at),
-- ambos chamando update_updated_at_column(). Trabalho duplicado por linha.
DROP TRIGGER IF EXISTS set_timestamp_documentos_assinatura ON public.documentos_assinatura;