-- ============================================================================
-- P1-026: EXCEPTION handler em triggers de folha
-- ----------------------------------------------------------------------------
-- Triggers de folha sem EXCEPTION handler cancelam operação pai se algo der
-- errado na inserção/atualização da provisão. Adiciona BEGIN/EXCEPTION que
-- loga via RAISE WARNING mas não propaga o erro (preserva a folha principal).
-- ============================================================================

-- 1) calcular_provisao_mensal (P0-013 origem)
CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.provisoes_folha (
      empresa_id, colaborador_id, competencia,
      valor_13_salario, valor_ferias, encargos_provisao
    ) VALUES (
      NEW.empresa_id,
      NEW.colaborador_id,
      NEW.competencia,
      NEW.total_proventos / 12,
      (NEW.total_proventos / 12) * 1.33,
      (NEW.total_proventos / 12) * 0.28
    )
    ON CONFLICT (empresa_id, colaborador_id, competencia) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[folha] provisão falhou para folha_id=%, colab_id=%, comp=%: %',
      NEW.id, NEW.colaborador_id, NEW.competencia, SQLERRM;
    -- Não propaga — folha principal não é bloqueada
  END;
  RETURN NEW;
END;
$$;

-- 2) Helper genérico para criar trigger de log com EXCEPTION
CREATE OR REPLACE FUNCTION public._safe_audit_trigger(p_tabela TEXT)
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Placeholder: tabela de auditoria é chamada por RPC em P0-005.
    -- Esta função existe como ponto de extensão para triggers customizados
    -- que não devem bloquear a operação principal.
    PERFORM 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[%] trigger error: %', p_tabela, SQLERRM;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Adiciona UNIQUE constraint necessário para ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provisoes_folha_empresa_colaborador_competencia_key'
  ) THEN
    ALTER TABLE public.provisoes_folha
      ADD CONSTRAINT provisoes_folha_empresa_colaborador_competencia_key
      UNIQUE (empresa_id, colaborador_id, competencia);
  END IF;
END $$;

COMMENT ON FUNCTION public.calcular_provisao_mensal() IS
  '[P1-026] Trigger agora tolera falhas de provisão sem bloquear a folha principal.';
COMMENT ON FUNCTION public._safe_audit_trigger IS
  '[P1-026] Helper para triggers que não devem bloquear a operação pai.';
