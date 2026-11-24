-- Rotinas do pg_cron que falhavam em toda execução no canônico (7 dias até 12/10):
--
-- purge-rate-limits-hourly          168/168  purge_rate_limits não existe (20260728175807 nunca aplicada)
-- lgpd-cleanup-daily (+ lovable-*)   14/14   process_lgpd_cleanup_queue usa colunas inexistentes
--                                            (status/processado_em/data_prevista_limpeza);
--                                            drenar_fila_limpeza_lgpd (20260728180353) nunca aplicada
-- ferias-atualizar-status-diario      7/7    chama fn_update_ferias_status_by_date(), que é função de
--                                            TRIGGER — não pode ser chamada por SELECT
-- notificar-ferias-pagamento-d5       5/5    grava tipo 'ferias_pagamento_d5', recusado por
--                                            chk_notificacoes_tipo
--
-- Fora deste escopo: anonimizar_dados_pessoais (chamada pela drenagem LGPD) ainda referencia
-- colaboradores.metadata, inexistente; a drenagem isola a falha por item e a registra em
-- logs_sistema em vez de abortar.

DO $pre$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE EXCEPTION 'rotinas_agendadas requires pg_cron (schema cron)';
  END IF;
  IF to_regclass('public.rate_limits') IS NULL
     OR to_regclass('public.lgpd_fila_limpeza') IS NULL
     OR to_regclass('public.ferias') IS NULL
     OR to_regclass('public.notificacoes') IS NULL
     OR to_regclass('public.logs_sistema') IS NULL THEN
    RAISE EXCEPTION 'rotinas_agendadas requires rate_limits, lgpd_fila_limpeza, ferias, notificacoes and logs_sistema';
  END IF;
  IF to_regprocedure('public.anonimizar_dados_pessoais(uuid)') IS NULL THEN
    RAISE EXCEPTION 'rotinas_agendadas requires public.anonimizar_dados_pessoais(uuid)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.notificacoes'::regclass AND conname = 'chk_notificacoes_tipo'
  ) THEN
    RAISE EXCEPTION 'rotinas_agendadas expected constraint chk_notificacoes_tipo on public.notificacoes';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------------------
-- 1) Expurgo do rate-limit (corpo de 20260728175807)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_rate_limits(p_older_than_sec integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff  bigint := EXTRACT(EPOCH FROM now())::bigint - GREATEST(p_older_than_sec, 3600);
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE "timestamp" < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_rate_limits(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limits(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Fila LGPD (corpo de 20260728180353) + falhas por item registradas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd(p_limite integer DEFAULT 200)
RETURNS TABLE(id uuid, tabela text, registro_id uuid, sucesso boolean, erro text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT f.id, f.tabela, f.registro_id, f.dry_run
      FROM public.lgpd_fila_limpeza f
     WHERE f.executado = false
       AND f.data_programada <= current_date
     ORDER BY f.processed_at NULLS FIRST, f.data_programada
     LIMIT GREATEST(COALESCE(p_limite, 200), 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    id          := item.id;
    tabela      := item.tabela;
    registro_id := item.registro_id;
    erro        := NULL;

    BEGIN
      IF item.dry_run THEN
        sucesso := true;
        UPDATE public.lgpd_fila_limpeza SET processed_at = now()
         WHERE lgpd_fila_limpeza.id = item.id;
        RETURN NEXT;
        CONTINUE;
      END IF;

      IF item.tabela = 'colaboradores' THEN
        PERFORM public.anonimizar_dados_pessoais(item.registro_id);
      ELSE
        RAISE EXCEPTION 'tabela nao suportada para anonimizacao: %', item.tabela;
      END IF;

      UPDATE public.lgpd_fila_limpeza
         SET executado = true, processed_at = now()
       WHERE lgpd_fila_limpeza.id = item.id;

      sucesso := true;
    EXCEPTION WHEN others THEN
      sucesso := false;
      erro    := SQLERRM;
      UPDATE public.lgpd_fila_limpeza SET processed_at = now()
       WHERE lgpd_fila_limpeza.id = item.id;
    END;

    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.process_lgpd_cleanup_queue()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ok integer := 0;
  v_falhas jsonb := '[]'::jsonb;
  d record;
BEGIN
  FOR d IN SELECT * FROM public.drenar_fila_limpeza_lgpd(500) LOOP
    IF d.sucesso THEN
      v_ok := v_ok + 1;
    ELSE
      v_falhas := v_falhas || jsonb_build_object('fila_id', d.id, 'tabela', d.tabela, 'erro', d.erro);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_falhas) > 0 THEN
    INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
    VALUES ('error',
            format('Fila LGPD: %s item(ns) não anonimizado(s)', jsonb_array_length(v_falhas)),
            jsonb_build_object('job', 'lgpd_cleanup_queue', 'falhas', v_falhas));
  END IF;

  RETURN v_ok;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Status das férias por data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_atualizar_status_ferias_diario()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  v_destino text;
  v_ok integer := 0;
  v_recusadas integer := 0;
BEGIN
  FOR r IN
    SELECT f.id, f.status::text AS status, f.data_fim
      FROM public.ferias f
     WHERE COALESCE(f.cancelado, false) = false
       AND (
         (f.status = 'aprovada' AND CURRENT_DATE >= f.data_inicio)
         OR (f.status = 'em_gozo' AND CURRENT_DATE > f.data_fim)
       )
     FOR UPDATE SKIP LOCKED
  LOOP
    v_destino := CASE WHEN CURRENT_DATE > r.data_fim THEN 'concluida' ELSE 'em_gozo' END;
    BEGIN
      IF r.status = 'aprovada' THEN
        UPDATE public.ferias SET status = 'em_gozo' WHERE id = r.id AND status = 'aprovada';
      END IF;
      IF v_destino = 'concluida' THEN
        UPDATE public.ferias SET status = 'concluida' WHERE id = r.id AND status = 'em_gozo';
      END IF;
      v_ok := v_ok + 1;
    EXCEPTION WHEN others THEN
      v_recusadas := v_recusadas + 1;
      INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
      VALUES ('warning', SQLERRM,
              jsonb_build_object('job', 'ferias_status_diario', 'ferias_id', r.id,
                                 'status_destino', v_destino, 'sqlstate', SQLSTATE));
    END;
  END LOOP;

  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('info',
          format('Status de férias: %s atualizada(s), %s recusada(s)', v_ok, v_recusadas),
          jsonb_build_object('job', 'ferias_status_diario', 'atualizadas', v_ok, 'recusadas', v_recusadas));

  RETURN jsonb_build_object('atualizadas', v_ok, 'recusadas', v_recusadas);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_atualizar_status_ferias_diario() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_atualizar_status_ferias_diario() TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Aviso D-5: o tipo que a função grava passa a ser aceito.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notificacoes
  DROP CONSTRAINT chk_notificacoes_tipo,
  ADD CONSTRAINT chk_notificacoes_tipo CHECK (
    tipo IS NULL OR tipo IN (
      'info','sucesso','aviso','erro','sistema','ponto','ferias','folha','beneficio',
      'documento','avaliacao','treinamento','admissao','desligamento','ferias_pagamento_d5'
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Agenda: recria os dois jobs cujo comando muda (horários preservados)
-- ---------------------------------------------------------------------------
DO $agenda$
BEGIN
  PERFORM cron.unschedule(j.jobname)
     FROM cron.job j
    WHERE j.jobname IN ('purge-rate-limits-hourly', 'ferias-atualizar-status-diario');

  PERFORM cron.schedule('purge-rate-limits-hourly', '7 * * * *',
                        $cmd$SELECT public.purge_rate_limits(86400);$cmd$);
  PERFORM cron.schedule('ferias-atualizar-status-diario', '30 3 * * *',
                        $cmd$SELECT public.fn_atualizar_status_ferias_diario();$cmd$);
END
$agenda$;
