-- Folha calculada não fechava e nenhum holerite existia em produção.
--
-- `fechar-folha` (verifyFolhaIntegrity) exige holerites cuja soma bata com o
-- cabeçalho e com folha_itens. Dois bloqueios impediam isso:
--
-- 1. Toda gravação em holerites falhava: o gatilho tr_notify_new_holerite
--    (fn_enqueue_notification) lia NEW.competencia — coluna que holerites não
--    tem (42703) — e enviava colaborador_id para notificacoes.user_id, que é
--    FK de auth.users. A correção de 30/07 (20260730130920) nunca foi aplicada
--    no canônico e dependia de colaboradores.user_id, que também não existe.
-- 2. Nada gravava holerites: o front fala só com o external-db-bridge, que
--    recusa escrita em tabela tenant-scoped sem empresa_id (holerites não tem
--    a coluna); calcular-folha e fechar-folha não criam a linha.
--
-- Solução só de banco: o holerite passa a ser o espelho de folha_itens,
-- mantido por gatilho (vale para o cálculo em lote do front e para a edge
-- calcular-folha). Como o holerite agora nasce no cálculo, o colaborador só o
-- enxerga — e só é notificado — com a folha fechada ou paga.

DO $pre$
BEGIN
  IF to_regclass('public.holerites') IS NULL
     OR to_regclass('public.folha_itens') IS NULL
     OR to_regclass('public.folhas_pagamento') IS NULL
     OR to_regclass('public.colaboradores') IS NULL
     OR to_regclass('public.notificacoes') IS NULL THEN
    RAISE EXCEPTION 'holerites_espelho requires holerites, folha_itens, folhas_pagamento, colaboradores and notificacoes';
  END IF;

  -- O ON CONFLICT do espelho depende da chave (folha_id, colaborador_id).
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
     WHERE c.conrelid = 'public.holerites'::regclass
       AND c.contype IN ('u', 'p')
       AND (
         SELECT array_agg(a.attname::text ORDER BY a.attname)
           FROM unnest(c.conkey) AS k(attnum)
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       ) = ARRAY['colaborador_id', 'folha_id']
  ) THEN
    RAISE EXCEPTION 'holerites_espelho requires UNIQUE (folha_id, colaborador_id) on public.holerites';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'holerites' AND policyname = 'holerites_self_read'
  ) THEN
    RAISE EXCEPTION 'holerites_espelho expected policy holerites_self_read on public.holerites';
  END IF;
END
$pre$;

-- 1) Notificação nunca derruba a gravação do holerite.
CREATE OR REPLACE FUNCTION public.fn_enqueue_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_competencia text;
    v_status text;
    v_empresa_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'holerites' THEN
        BEGIN
            SELECT f.competencia, f.status::text, f.empresa_id
              INTO v_competencia, v_status, v_empresa_id
              FROM public.folhas_pagamento f
             WHERE f.id = NEW.folha_id;

            -- Holerite de folha ainda em cálculo não está disponível. O vínculo
            -- colaborador ↔ login é colaborador_id = auth.uid() (sou_o_colaborador).
            IF v_status IN ('fechada', 'paga')
               AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.colaborador_id) THEN
                IF v_competencia ~ '^\d{4}-\d{2}$' THEN
                    v_competencia := substr(v_competencia, 6, 2) || '/' || substr(v_competencia, 1, 4);
                END IF;

                INSERT INTO public.notificacoes (
                    user_id, empresa_id, titulo, mensagem, tipo, entidade_tipo, entidade_id, lida
                ) VALUES (
                    NEW.colaborador_id,
                    v_empresa_id,
                    'Novo Holerite Disponível',
                    'Seu holerite de ' || COALESCE(v_competencia, 'referência atual') ||
                    ' já está disponível para visualização.',
                    'folha',
                    'holerite',
                    NEW.id,
                    false
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_enqueue_notification: notificação ignorada para holerite % (%)', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$function$;

-- 2) Holerite = espelho de folha_itens enquanto a folha não fecha.
CREATE OR REPLACE FUNCTION public.fn_sync_holerite_from_folha_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_folha_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.folha_id ELSE NEW.folha_id END;
BEGIN
    -- Folha fechada/paga é imutável: o espelho não reescreve o histórico.
    IF EXISTS (
        SELECT 1 FROM public.folhas_pagamento f
         WHERE f.id = v_folha_id AND f.status::text IN ('fechada', 'paga')
    ) THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.holerites h
         WHERE h.folha_id = OLD.folha_id
           AND h.colaborador_id = OLD.colaborador_id
           AND h.assinado IS NOT TRUE;
        RETURN NULL;
    END IF;

    -- Holerite já assinado não é tocado; se o item mudou depois da assinatura,
    -- a verificação de integridade do fechamento acusa a divergência.
    INSERT INTO public.holerites AS h (
        folha_id, colaborador_id,
        colaborador_nome, colaborador_cpf, colaborador_cargo,
        colaborador_departamento, colaborador_matricula,
        salario_base, total_proventos, total_descontos, liquido,
        valor_inss, valor_irrf, valor_fgts
    )
    SELECT
        NEW.folha_id, NEW.colaborador_id,
        c.nome_completo, COALESCE(c.cpf, 'N/A'), COALESCE(c.cargo, 'N/A'),
        COALESCE(c.departamento, 'N/A'), c.matricula,
        COALESCE(NEW.salario_base, c.salario_base, 0),
        COALESCE(NEW.total_proventos, 0), COALESCE(NEW.total_descontos, 0), COALESCE(NEW.total_liquido, 0),
        COALESCE(NEW.inss_mes, 0), COALESCE(NEW.irrf_mes, 0), COALESCE(NEW.fgts_mes, 0)
      FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id
    ON CONFLICT (folha_id, colaborador_id) DO UPDATE SET
        colaborador_nome         = EXCLUDED.colaborador_nome,
        colaborador_cpf          = EXCLUDED.colaborador_cpf,
        colaborador_cargo        = EXCLUDED.colaborador_cargo,
        colaborador_departamento = EXCLUDED.colaborador_departamento,
        colaborador_matricula    = EXCLUDED.colaborador_matricula,
        salario_base             = EXCLUDED.salario_base,
        total_proventos          = EXCLUDED.total_proventos,
        total_descontos          = EXCLUDED.total_descontos,
        liquido                  = EXCLUDED.liquido,
        valor_inss               = EXCLUDED.valor_inss,
        valor_irrf               = EXCLUDED.valor_irrf,
        valor_fgts               = EXCLUDED.valor_fgts
     WHERE h.assinado IS NOT TRUE;

    RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_sync_holerite_from_folha_item() FROM PUBLIC;
DO $revoke$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.fn_sync_holerite_from_folha_item() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.fn_sync_holerite_from_folha_item() FROM authenticated';
  END IF;
END
$revoke$;

-- Só os campos financeiros disparam: mudar status_pagamento ao pagar não
-- recria holerite.
DROP TRIGGER IF EXISTS trg_sync_holerite_folha_item ON public.folha_itens;
CREATE TRIGGER trg_sync_holerite_folha_item
AFTER INSERT OR DELETE
   OR UPDATE OF salario_base, total_proventos, total_descontos, total_liquido, inss_mes, irrf_mes, fgts_mes
ON public.folha_itens
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_holerite_from_folha_item();

-- 3) Colaborador só vê o próprio holerite com a folha fechada ou paga.
ALTER POLICY holerites_self_read ON public.holerites
  USING (
    public.sou_o_colaborador(colaborador_id)
    AND EXISTS (
      SELECT 1 FROM public.folhas_pagamento f
       WHERE f.id = holerites.folha_id
         AND f.status::text IN ('fechada', 'paga')
    )
  );
