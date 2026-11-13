-- Cron diário `notificar-ferias-pagamento-d5` (Art. 145 CLT) aborta inteiro em produção.
--
-- Causa: o laço de destinatários de public.notificar_ferias_pagamento_d5()
-- (20261014120000_fix_cron_jobs_onda3b.sql) lê só user_roles JOIN user_empresas,
-- que não têm FK para auth.users. Linhas de usuário apagado do Auth ficam para
-- trás; o INSERT em notificacoes viola notificacoes_user_id_fkey, o EXCEPTION
-- faz RAISE e nenhuma notificação do dia é gravada.
-- Evidência (canônico, 12/11/2026): postgres_logs 11:00:00Z pg_cron
-- `23503 ... Key (user_id)=(...) is not present in table "users"`; 3 user_ids
-- admin/rh sem auth.users; 4 alertas ativos em v_ferias_alerta_pagamento_d2 e
-- 0 notificações 'ferias_pagamento_d5' nos últimos 7 dias.
--
-- Mudança: mesma função, só com JOIN em auth.users no laço de destinatários.
-- Não apaga as linhas órfãs (deleção de dado = decisão do dono).

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
        JOIN auth.users au ON au.id = ur.user_id  -- ignora papéis de usuário apagado do Auth (FK notificacoes_user_id_fkey)
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

  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('info', format('Notificações Art.145 geradas: %s', v_count),
          jsonb_build_object('categoria', 'ferias_d5', 'executed_at', now(), 'count', v_count));

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('error', SQLERRM, jsonb_build_object('categoria', 'ferias_d5', 'sqlstate', SQLSTATE));
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_ferias_pagamento_d5() FROM PUBLIC, anon, authenticated;
