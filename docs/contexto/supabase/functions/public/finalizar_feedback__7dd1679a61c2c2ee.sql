CREATE OR REPLACE FUNCTION public.finalizar_feedback(p_feedback_id uuid, p_acao text, p_motivo text DEFAULT NULL::text, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_resultado jsonb;
begin
  -- Configuração LOCAL DA TRANSAÇÃO: o trigger BEFORE INSERT da audit_log lê
  -- este valor e grava `justificativa`, `status_anterior` e `status_posterior`.
  perform set_config('ninebox.feedback_motivo', coalesce(p_motivo, ''), true);
  perform set_config('ninebox.feedback_acao', coalesce(p_acao, ''), true);

  v_resultado := public.finalizar_feedback_base(p_feedback_id, p_acao, p_motivo, p_idempotencia);

  perform set_config('ninebox.feedback_motivo', '', true);
  perform set_config('ninebox.feedback_acao', '', true);
  return v_resultado;
end;
$function$
