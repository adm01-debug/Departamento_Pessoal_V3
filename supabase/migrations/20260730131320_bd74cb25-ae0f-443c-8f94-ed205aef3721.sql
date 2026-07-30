-- =====================================================================
-- FIX: 3 gatilhos com deriva de modelo (referenciam colunas inexistentes)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) fn_update_admissao_checklist — AFTER UPDATE em documentos_admissao
--    Referenciava NEW.status e NEW.tipo_documento. O modelo real usa
--    `validado boolean` e `tipo text`. Efeito: TODO update em
--    documentos_admissao abortava e o checklist nunca era marcado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_admissao_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_tipo text := upper(coalesce(NEW.tipo, ''));
BEGIN
    -- dispara na transição não-validado -> validado
    IF COALESCE(NEW.validado, false) AND NOT COALESCE(OLD.validado, false) THEN
        IF v_tipo IN ('RG', 'CPF') THEN
            UPDATE public.admissoes
               SET checklist_documentos_pessoais = true
             WHERE id = NEW.admissao_id;
        ELSIF v_tipo IN ('COMPROVANTE_RESIDENCIA', 'COMPROVANTE_ENDERECO') THEN
            UPDATE public.admissoes
               SET checklist_comprovante_endereco = true
             WHERE id = NEW.admissao_id;
        ELSIF v_tipo = 'ASO' THEN
            UPDATE public.admissoes
               SET checklist_exame_admissional = true
             WHERE id = NEW.admissao_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) process_ferias_audit — AFTER I/U/D em ferias_solicitacoes
--                            e em periodos_aquisitivos
--    Dois defeitos distintos:
--    (a) ferias_solicitacoes: lia OLD/NEW.status_gestor e .status_rh;
--        o modelo atual tem um único `status`. Quebrava todo UPDATE.
--    (b) periodos_aquisitivos: lia NEW.empresa_id, coluna que a tabela
--        NÃO possui — a empresa vem do colaborador. Quebrava INSERT,
--        UPDATE e DELETE, inviabilizando o cálculo de direito a férias.
--    Passo a resolver a empresa por tabela e a envolver a gravação em
--    EXCEPTION: auditoria nunca deve derrubar a operação auditada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_ferias_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_empresa_id   uuid;
    v_acao         text;
    v_reg          record;
    v_colaborador  uuid;
BEGIN
    v_reg := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

    -- resolução da empresa conforme o modelo de cada tabela
    IF TG_TABLE_NAME = 'periodos_aquisitivos' THEN
        v_colaborador := v_reg.colaborador_id;
        SELECT c.empresa_id INTO v_empresa_id
          FROM public.colaboradores c
         WHERE c.id = v_colaborador;
    ELSE
        v_empresa_id := v_reg.empresa_id;
    END IF;

    v_acao := CASE TG_OP WHEN 'INSERT' THEN 'CREATE'
                         WHEN 'DELETE' THEN 'DELETE'
                         ELSE 'UPDATE' END;

    -- ferias_solicitacoes tem um único campo `status`
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'ferias_solicitacoes'
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'aprovado'  THEN v_acao := 'APPROVE';
        ELSIF NEW.status = 'rejeitado' THEN v_acao := 'REJECT';
        END IF;
    END IF;

    BEGIN
        INSERT INTO public.ferias_audit_log (
            empresa_id, usuario_id, entidade_tipo, entidade_id,
            acao, dados_anteriores, dados_novos
        ) VALUES (
            v_empresa_id,
            auth.uid(),
            TG_TABLE_NAME,
            v_reg.id,
            v_acao,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'process_ferias_audit: trilha ignorada em %.% (%)',
                      TG_TABLE_NAME, v_reg.id, SQLERRM;
    END;

    RETURN NULL; -- gatilho AFTER: retorno é ignorado
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_update_admissao_checklist() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_ferias_audit()         FROM PUBLIC, anon, authenticated;