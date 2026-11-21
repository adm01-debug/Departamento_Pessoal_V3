-- Relógio de ponto — etapa 74: alerta de coletor parado.
-- Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md.
--
-- Cada unidade tem um coletor (ponto_rep_dispositivos) que envia o cartão ponto
-- do AtecSoft. Se ele para (PC desligado, rede caída, serviço parado), o DP só
-- descobre no fechamento. Esta função avisa admin/RH da empresa pelo sino de
-- notificações (public.notificacoes) quando o coletor fica mais de 30 minutos
-- sem contato em horário comercial (seg–sex, 07:00–19:00, America/Sao_Paulo).
--
-- Uma notificação por coletor por dia para cada admin/RH: o dedupe consulta
-- notificacoes por (user_id, tipo, entidade_tipo, entidade_id, data_referencia).
-- `tipo = 'ponto'` já está na lista de chk_notificacoes_tipo (20261014120000);
-- notificacoes não tem coluna de link (o sino não navega), então não há link.
-- Aditiva e idempotente.

CREATE OR REPLACE FUNCTION public.alertar_coletores_ponto_parados(p_agora timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local timestamp := p_agora AT TIME ZONE 'America/Sao_Paulo';
  v_hoje date := (p_agora AT TIME ZONE 'America/Sao_Paulo')::date;
  v_disp record;
  v_ref_local timestamp;
  v_hora text;
  v_count integer := 0;
  v_ins integer;
BEGIN
  -- Fora do horário comercial não alerta (fim de semana e noite são normais).
  IF extract(isodow FROM v_local) NOT BETWEEN 1 AND 5
     OR v_local::time < time '07:00' OR v_local::time >= time '19:00' THEN
    RETURN 0;
  END IF;

  FOR v_disp IN
    SELECT d.id, d.empresa_id, d.unidade,
           coalesce(d.ultimo_contato_em, d.created_at) AS referencia
      FROM public.ponto_rep_dispositivos d
     WHERE d.ativo
       AND d.revogado_em IS NULL
       AND coalesce(d.ultimo_contato_em, d.created_at) < p_agora - interval '30 minutes'
  LOOP
    v_ref_local := v_disp.referencia AT TIME ZONE 'America/Sao_Paulo';
    v_hora := CASE
      WHEN v_ref_local::date = v_hoje THEN to_char(v_ref_local, 'HH24:MI')
      ELSE to_char(v_ref_local, 'DD/MM "às" HH24:MI')
    END;

    INSERT INTO public.notificacoes (
      user_id, empresa_id, tipo, titulo, mensagem,
      entidade_tipo, entidade_id, data_referencia, lida
    )
    SELECT DISTINCT ur.user_id, v_disp.empresa_id, 'ponto',
           'Coletor do ponto sem enviar dados',
           format('O coletor do ponto da unidade %s está sem enviar dados desde %s.',
                  v_disp.unidade, v_hora),
           'ponto_rep_dispositivo', v_disp.id, v_hoje, false
      FROM public.user_roles ur
      JOIN public.user_empresas ue ON ue.user_id = ur.user_id
      JOIN auth.users au ON au.id = ur.user_id  -- ignora papel de usuário apagado (FK notificacoes_user_id_fkey)
     WHERE ue.empresa_id = v_disp.empresa_id
       AND ur.role IN ('admin', 'rh')
       AND NOT EXISTS (
         SELECT 1 FROM public.notificacoes n
          WHERE n.user_id = ur.user_id
            AND n.tipo = 'ponto'
            AND n.entidade_tipo = 'ponto_rep_dispositivo'
            AND n.entidade_id = v_disp.id
            AND n.data_referencia = v_hoje
       );
    GET DIAGNOSTICS v_ins = ROW_COUNT;
    v_count := v_count + v_ins;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.alertar_coletores_ponto_parados(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alertar_coletores_ponto_parados(timestamptz) TO service_role;

COMMENT ON FUNCTION public.alertar_coletores_ponto_parados(timestamptz) IS
  'Etapa 74: notifica admin/RH (1x por coletor por dia) quando o coletor do ponto fica >30 min sem contato em horário comercial. Chamada pelo pg_cron.';

-- Agenda a cada 15 minutos. pg_cron não tem "schedule IF NOT EXISTS": desagenda
-- pelo nome e agenda de novo (reaplicar não duplica o job).
DO $ponto_cron$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE WARNING 'pg_cron indisponível — job alertar-coletores-ponto-parados não agendado nesta instância';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'alertar-coletores-ponto-parados';

  PERFORM cron.schedule(
    'alertar-coletores-ponto-parados', '*/15 * * * *',
    $cron$SELECT public.alertar_coletores_ponto_parados();$cron$
  );
END
$ponto_cron$;
