
ALTER TABLE public.contrato_assinatura_tokens
  ADD COLUMN IF NOT EXISTS reminders_enviados int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contrato_tokens_pending_reminder
  ON public.contrato_assinatura_tokens (created_at)
  WHERE usado_em IS NULL;

CREATE OR REPLACE VIEW public.v_contratos_assinatura_kpi
WITH (security_invoker = true) AS
SELECT
  t.empresa_id,
  COUNT(*)                                              AS tokens_gerados,
  COUNT(*) FILTER (WHERE t.usado_em IS NOT NULL)        AS tokens_assinados,
  COUNT(*) FILTER (WHERE t.usado_em IS NULL AND t.expira_em > now()) AS tokens_pendentes,
  COUNT(*) FILTER (WHERE t.usado_em IS NULL AND t.expira_em <= now()) AS tokens_expirados,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.usado_em IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS taxa_conversao_pct,
  AVG(EXTRACT(EPOCH FROM (t.usado_em - t.created_at))/3600.0) FILTER (WHERE t.usado_em IS NOT NULL) AS tempo_medio_assinatura_h
FROM public.contrato_assinatura_tokens t
GROUP BY t.empresa_id;

GRANT SELECT ON public.v_contratos_assinatura_kpi TO authenticated;

CREATE OR REPLACE VIEW public.v_contratos_tokens_pendentes
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.empresa_id,
  t.contrato_id,
  t.email_destinatario,
  t.expira_em,
  t.created_at,
  t.reminders_enviados,
  t.ultimo_reminder_at,
  EXTRACT(DAY FROM (now() - t.created_at))::int AS dias_desde_geracao,
  EXTRACT(DAY FROM (t.expira_em - now()))::int  AS dias_para_expirar,
  c.status AS contrato_status,
  c.data_inicio,
  c.data_fim,
  c.colaborador_id,
  col.nome_completo AS colaborador_nome,
  tpl.tipo_contrato
FROM public.contrato_assinatura_tokens t
JOIN public.contratos_gerados c ON c.id = t.contrato_id
LEFT JOIN public.colaboradores col ON col.id = c.colaborador_id
LEFT JOIN public.contrato_templates tpl ON tpl.id = c.template_id
WHERE t.usado_em IS NULL
  AND t.expira_em > now();

GRANT SELECT ON public.v_contratos_tokens_pendentes TO authenticated;

CREATE OR REPLACE FUNCTION public.contratos_enviar_lembretes_assinatura()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT t.id, t.empresa_id, t.expira_em, t.created_at, t.reminders_enviados,
           col.nome_completo
    FROM public.contrato_assinatura_tokens t
    JOIN public.contratos_gerados c ON c.id = t.contrato_id
    LEFT JOIN public.colaboradores col ON col.id = c.colaborador_id
    WHERE t.usado_em IS NULL
      AND t.expira_em > now()
      AND (
        (t.reminders_enviados = 0 AND t.created_at <= now() - interval '2 days')
        OR (t.reminders_enviados = 1 AND t.created_at <= now() - interval '5 days')
        OR (t.reminders_enviados <= 2 AND t.expira_em <= now() + interval '1 day')
      )
      AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at <= now() - interval '12 hours')
  LOOP
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, link, prioridade, created_at)
    SELECT DISTINCT
      ur.user_id,
      r.empresa_id,
      'contrato_assinatura_pendente',
      'Contrato aguardando assinatura',
      format('O contrato de %s está sem assinatura há %s dias. Expira em %s.',
             COALESCE(r.nome_completo, 'colaborador'),
             EXTRACT(DAY FROM (now() - r.created_at))::int,
             to_char(r.expira_em, 'DD/MM/YYYY HH24:MI')),
      '/configuracoes/contratos-templates',
      CASE WHEN r.expira_em <= now() + interval '1 day' THEN 'alta' ELSE 'media' END,
      now()
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id
    WHERE ue.empresa_id = r.empresa_id
      AND ur.role IN ('admin','rh');

    UPDATE public.contrato_assinatura_tokens
    SET reminders_enviados = reminders_enviados + 1,
        ultimo_reminder_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.contratos_enviar_lembretes_assinatura() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('contratos-lembretes-assinatura');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'contratos-lembretes-assinatura',
  '0 12 * * *',
  $$SELECT public.contratos_enviar_lembretes_assinatura();$$
);
