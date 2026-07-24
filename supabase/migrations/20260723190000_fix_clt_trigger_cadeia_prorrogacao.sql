-- =============================================================================
-- MELHORIA 13 — Gap A1.7: bloquear cadeia de 3+ contratos de experiência
--
-- CLT Art.451: contrato de trabalho por prazo determinado prorrogado mais
-- de UMA VEZ passa a vigorar sem determinação de prazo.
--
-- O trigger M8 (170000) verificava apenas v_anterior.prorrogado = TRUE,
-- o que bloqueia a tentativa de prorrogar O MESMO contrato duas vezes
-- (ex: A→B e A→C), mas NÃO bloqueava a cadeia A→B→C (prorrogação da
-- prorrogação), pois B.prorrogado permanece FALSE até que alguém prorrogue B.
--
-- Cenário de falha confirmado em Postgres real:
--   1. Contrato A (30d) — original
--   2. Contrato B (30d, ant=A) — 1ª prorrogação → A.prorrogado=TRUE
--   3. Contrato C (20d, ant=B) — "prorrogação" de B → PASSOU (deveria falhar)
--   Resultado: 3 contratos encadeados = 2 prorrogações = viola Art.451 CLT
--
-- FIX: verificar se o contrato anterior já É uma prorrogação
-- (v_anterior.contrato_anterior_id IS NOT NULL) — se for, rejeitar.
-- Isso garante que o ciclo máximo seja: original → 1ª prorrogação.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validar_contrato_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo      text;
  v_dias      int;
  v_anterior  record;
BEGIN
  -- Buscar tipo_contrato via template
  SELECT tipo_contrato INTO v_tipo
  FROM public.contrato_templates
  WHERE id = NEW.template_id;

  IF v_tipo IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular duração em dias
  IF NEW.data_fim IS NOT NULL THEN
    v_dias := (NEW.data_fim - NEW.data_inicio)::int;
  END IF;

  -- ─── CLT experiência (Art. 445 §único + Art. 451) ──────────────────────
  IF v_tipo = 'clt_experiencia' THEN
    IF NEW.data_fim IS NULL THEN
      RAISE EXCEPTION 'Contrato de experiência deve ter data_fim definida.';
    END IF;
    IF v_dias < 1 THEN
      RAISE EXCEPTION 'data_fim deve ser posterior a data_inicio.';
    END IF;

    IF NEW.contrato_anterior_id IS NOT NULL THEN
      -- PRORROGAÇÃO: bloquear com SELECT FOR UPDATE (anti-race A9)
      SELECT * INTO v_anterior
      FROM public.contratos_gerados
      WHERE id = NEW.contrato_anterior_id
      FOR UPDATE;

      IF v_anterior IS NULL THEN
        RAISE EXCEPTION 'Contrato anterior não encontrado (id: %).', NEW.contrato_anterior_id;
      END IF;

      -- Gap A1.7 fix: bloquear prorrogação de prorrogação
      -- Se o anterior já é prorrogação de outro contrato (contrato_anterior_id IS NOT NULL),
      -- então aceitar C como prorrogação de B criaria uma cadeia de 3, violando CLT Art.451.
      IF v_anterior.contrato_anterior_id IS NOT NULL THEN
        RAISE EXCEPTION
          'CLT Art.451: não é possível prorrogar um contrato que já é uma prorrogação. '
          'Estrutura permitida: contrato original → 1 prorrogação. '
          'O contrato % já é prorrogação de %, impossível encadear uma 3ª.',
          v_anterior.id, v_anterior.contrato_anterior_id;
      END IF;

      -- Bloquear se o anterior já foi marcado prorrogado
      IF v_anterior.prorrogado THEN
        RAISE EXCEPTION
          'Contrato anterior (%) já foi prorrogado. CLT Art.451: somente uma prorrogação é permitida.',
          NEW.contrato_anterior_id;
      END IF;

      DECLARE
        v_anterior_tipo text;
        v_anterior_dias int;
        v_total         int;
      BEGIN
        SELECT tipo_contrato INTO v_anterior_tipo
        FROM public.contrato_templates WHERE id = v_anterior.template_id;

        IF v_anterior_tipo <> 'clt_experiencia' THEN
          RAISE EXCEPTION
            'Prorrogação inválida: contrato anterior não é de experiência (tipo: %).', v_anterior_tipo;
        END IF;

        v_anterior_dias := (v_anterior.data_fim - v_anterior.data_inicio)::int;
        v_total := v_anterior_dias + v_dias;

        -- Cada período ≤ 45 dias em prorrogação
        IF v_dias > 45 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: em prorrogação, cada período não pode exceder 45 dias (informado: % dias).',
            v_dias;
        END IF;
        IF v_anterior_dias > 45 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: período anterior excede 45 dias (% dias), não é prorrogável.',
            v_anterior_dias;
        END IF;
        IF v_total > 90 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: soma dos períodos de experiência excede 90 dias (anterior: % + novo: % = % dias).',
            v_anterior_dias, v_dias, v_total;
        END IF;

        -- Marcar o anterior como prorrogado (já com lock)
        UPDATE public.contratos_gerados
        SET prorrogado = TRUE
        WHERE id = NEW.contrato_anterior_id;
      END;

    ELSE
      -- PERÍODO ÚNICO (sem prorrogação): limite é 90 dias
      IF v_dias > 90 THEN
        RAISE EXCEPTION
          'CLT Art.445 §único: contrato de experiência não pode exceder 90 dias em período único (informado: % dias).',
          v_dias;
      END IF;
    END IF;

  -- ─── CLT determinado (Art. 445 caput) ────────────────────────────────
  ELSIF v_tipo = 'clt_determinado' THEN
    IF NEW.data_fim IS NULL THEN
      RAISE EXCEPTION 'Contrato por prazo determinado deve ter data_fim.';
    END IF;
    IF v_dias < 1 THEN
      RAISE EXCEPTION 'data_fim deve ser posterior a data_inicio.';
    END IF;
    IF v_dias > 730 THEN
      RAISE EXCEPTION
        'CLT Art.445: contrato por prazo determinado não pode exceder 2 anos / 730 dias (informado: % dias).',
        v_dias;
    END IF;

  -- ─── CLT indeterminado / horista ─────────────────────────────────────
  ELSIF v_tipo IN ('clt_indeterminado', 'clt_horista') THEN
    IF NEW.data_fim IS NOT NULL THEN
      RAISE EXCEPTION
        'Contrato por prazo indeterminado (tipo: %) não deve ter data_fim.', v_tipo;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
