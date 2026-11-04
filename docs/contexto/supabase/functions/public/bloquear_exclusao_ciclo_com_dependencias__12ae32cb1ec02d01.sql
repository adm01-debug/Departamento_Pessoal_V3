CREATE OR REPLACE FUNCTION public.bloquear_exclusao_ciclo_com_dependencias()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_feedbacks integer;
  v_consolidacoes integer;
  v_aprovacoes integer;
  v_validacoes integer;
  v_metas integer;
  v_auditoria integer;
begin
  select count(*) into v_feedbacks from public.feedbacks_360 where ciclo_id = old.id;
  select count(*) into v_consolidacoes from public.feedbacks_360_consolidacoes where ciclo_id = old.id;
  select count(*) into v_aprovacoes from public.feedbacks_360_aprovacoes_gestor where ciclo_id = old.id;
  select count(*) into v_validacoes from public.feedbacks_360_validacoes_potencial where ciclo_id = old.id;
  select count(*) into v_metas from public.metas_okrs where ciclo_id = old.id;
  -- Histórico do ciclo: a auditoria não tem FK para ciclos_avaliacao; sem esta
  -- checagem o DELETE deixaria a trilha apontando para um registro inexistente.
  select count(*) into v_auditoria
    from public.audit_log
   where tabela = 'ciclos_avaliacao' and registro_id = old.id;

  if (v_feedbacks + v_consolidacoes + v_aprovacoes + v_validacoes + v_metas + v_auditoria) > 0 then
    raise exception 'ciclo_com_dependencias'
      using detail = format(
        'feedbacks=%s consolidacoes=%s aprovacoes=%s validacoes=%s metas=%s auditoria=%s',
        v_feedbacks, v_consolidacoes, v_aprovacoes, v_validacoes, v_metas, v_auditoria
      ),
      hint = 'Arquive o ciclo ou remova os vínculos com autorização; nada foi apagado.';
  end if;

  return old;
end;
$function$
