-- Migration: UPDATE quebrado em 15 tabelas com trigger BEFORE UPDATE de updated_at
-- Causa 1 (15 tabelas): cada tabela abaixo tem trigger que chama
-- public.update_updated_at_column() (NEW.updated_at = now()), mas não tem a
-- coluna updated_at no banco canônico: todo UPDATE falha com
-- 'record "new" has no field "updated_at"'. Corrigida na seção 1.
-- Causa 2 (2 das 15): mesmo com updated_at, o UPDATE ainda falhava por trigger
-- AFTER lendo coluna que não existe no canônico. Corrigida na seção 2:
--   - ferias_solicitacoes: process_ferias_audit() lia OLD/NEW.status_gestor e
--     status_rh -> passa a ler via to_jsonb(OLD/NEW) (coluna ausente = NULL);
--     resto do comportamento igual (também serve periodos_aquisitivos).
--   - documentos_admissao: fn_update_admissao_checklist() lia NEW.status e
--     NEW.tipo_documento -> passa a usar as colunas reais validado e tipo,
--     mesma intenção (marca o checklist da admissão quando o documento é validado).
-- Assinatura, SECURITY DEFINER, search_path, dono e ACL das duas funções ficam
-- iguais (CREATE OR REPLACE preserva dono/ACL).
-- Levantado read-only em 12/11/2026 (pg_trigger ⨝ pg_proc com prosrc ILIKE
-- '%NEW.updated_at%' e sem pg_attribute updated_at; pg_get_functiondef das duas
-- funções). planos_saude fica fora: coberta por
-- 20261114000200_planos_saude_updated_at.sql (PR #498).
-- Idempotente: ADD COLUMN IF NOT EXISTS e CREATE OR REPLACE. DEFAULT now()
-- (STABLE) não reescreve a tabela (fast default, PG11+). Preflight fail-closed:
-- aborta se alguma tabela, função ou coluna usada não existir (alvo errado /
-- estado divergente do esperado).

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
  IF to_regprocedure('public.process_ferias_audit()') IS NULL
     OR to_regprocedure('public.fn_update_admissao_checklist()') IS NULL THEN
    RAISE EXCEPTION 'preflight: process_ferias_audit() ou fn_update_admissao_checklist() não existe';
  END IF;
  IF (SELECT count(*) FROM pg_attribute
      WHERE attrelid = 'public.documentos_admissao'::regclass
        AND attname IN ('admissao_id', 'tipo', 'validado')
        AND NOT attisdropped) <> 3 THEN
    RAISE EXCEPTION 'preflight: documentos_admissao sem admissao_id/tipo/validado';
  END IF;
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

-- ============================================================
-- 2. Triggers AFTER que liam colunas inexistentes
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_ferias_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_empresa_id UUID;
    v_acao TEXT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_empresa_id := OLD.empresa_id;
        v_acao := 'DELETE';
    ELSE
        v_empresa_id := NEW.empresa_id;
        IF (TG_OP = 'INSERT') THEN
            v_acao := 'CREATE';
        ELSE
            v_acao := 'UPDATE';
            -- Detecção específica de aprovação (via jsonb: coluna ausente = NULL)
            IF (TG_TABLE_NAME = 'ferias_solicitacoes') THEN
                v_old := to_jsonb(OLD);
                v_new := to_jsonb(NEW);
                IF ((v_old->>'status_gestor') <> (v_new->>'status_gestor') AND (v_new->>'status_gestor') = 'aprovado') THEN
                    v_acao := 'APPROVE_GESTOR';
                ELSIF ((v_old->>'status_rh') <> (v_new->>'status_rh') AND (v_new->>'status_rh') = 'aprovado') THEN
                    v_acao := 'APPROVE_RH';
                ELSIF ((v_old->>'status') <> (v_new->>'status') AND (v_new->>'status') = 'rejeitado') THEN
                    v_acao := 'REJECT';
                END IF;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.ferias_audit_log (
        empresa_id, 
        usuario_id, 
        entidade_tipo, 
        entidade_id, 
        acao, 
        dados_anteriores, 
        dados_novos
    )
    VALUES (
        v_empresa_id,
        auth.uid(),
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        v_acao,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_admissao_checklist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.validado AND NOT COALESCE(OLD.validado, false)) THEN
        IF (NEW.tipo = 'RG' OR NEW.tipo = 'CPF') THEN
            UPDATE public.admissoes SET checklist_documentos_pessoais = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo = 'COMPROVANTE_RESIDENCIA') THEN
            UPDATE public.admissoes SET checklist_comprovante_endereco = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo = 'ASO') THEN
            UPDATE public.admissoes SET checklist_exame_admissional = true WHERE id = NEW.admissao_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
