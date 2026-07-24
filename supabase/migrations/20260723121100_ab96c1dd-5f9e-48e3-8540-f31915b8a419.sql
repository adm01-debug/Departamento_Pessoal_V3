
-- Idempotent: 005_esocial_auditoria.sql created notificacoes with a different schema
-- (usuario_id, no user_id/entidade_tipo/entidade_id/data_referencia). Add missing columns.
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entidade_tipo   TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id     UUID,
  ADD COLUMN IF NOT EXISTS data_referencia DATE;

-- Índice único parcial para deduplicação diária de notificações Art.145
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_ferias_d5_dia
  ON public.notificacoes (user_id, entidade_tipo, entidade_id, data_referencia)
  WHERE tipo = 'ferias_pagamento_d5';

CREATE OR REPLACE FUNCTION public.notificar_ferias_pagamento_d5()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerta RECORD;
  v_user RECORD;
  v_count INT := 0;
  v_titulo TEXT;
  v_msg TEXT;
BEGIN
  FOR v_alerta IN
    SELECT id, empresa_id, colaborador_id, data_inicio, dias_ate_inicio, severidade
      FROM public.v_ferias_alerta_pagamento_d2
     WHERE severidade IN ('atencao','critico','violacao_grave')
  LOOP
    v_titulo := CASE v_alerta.severidade
      WHEN 'violacao_grave' THEN '🚨 Férias iniciada SEM pagamento (Art. 145 CLT)'
      WHEN 'critico'        THEN '⚠️ Pagamento de férias vence em ≤2 dias (Art. 145)'
      ELSE                       'ℹ️ Pagamento de férias vence em ≤5 dias'
    END;
    v_msg := format(
      'Colaborador %s — início %s (em %s dia(s)). Confirme o pagamento no painel de Férias.',
      v_alerta.colaborador_id, to_char(v_alerta.data_inicio, 'DD/MM/YYYY'), v_alerta.dias_ate_inicio
    );

    FOR v_user IN
      SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        JOIN public.user_empresas ue ON ue.user_id = ur.user_id
       WHERE ue.empresa_id = v_alerta.empresa_id
         AND ur.role IN ('admin','rh')
    LOOP
      INSERT INTO public.notificacoes (
        user_id, empresa_id, tipo, titulo, mensagem,
        entidade_tipo, entidade_id, data_referencia, lida
      ) VALUES (
        v_user.user_id, v_alerta.empresa_id, 'ferias_pagamento_d5',
        v_titulo, v_msg, 'ferias', v_alerta.id, CURRENT_DATE, false
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.logs_sistema (nivel, categoria, mensagem, metadata)
  VALUES ('info', 'ferias_d5', format('Notificações Art.145 geradas: %s', v_count),
          jsonb_build_object('executed_at', now(), 'count', v_count));

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.logs_sistema (nivel, categoria, mensagem, metadata)
  VALUES ('error', 'ferias_d5', SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_ferias_pagamento_d5() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_ferias_pagamento_d5() TO service_role;

-- Agendamento diário 08:00 (segunda a sexta)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('notificar-ferias-pagamento-d5')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notificar-ferias-pagamento-d5');
    PERFORM cron.schedule(
      'notificar-ferias-pagamento-d5',
      '0 11 * * 1-5',  -- 08:00 BRT = 11:00 UTC
      $CRON$ SELECT public.notificar_ferias_pagamento_d5(); $CRON$
    );
  END IF;
END $$;
