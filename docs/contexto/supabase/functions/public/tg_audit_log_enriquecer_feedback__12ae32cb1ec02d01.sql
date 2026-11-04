CREATE OR REPLACE FUNCTION public.tg_audit_log_enriquecer_feedback()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_motivo text := nullif(btrim(coalesce(current_setting('ninebox.feedback_motivo', true), '')), '');
  v_acao   text := nullif(btrim(coalesce(current_setting('ninebox.feedback_acao', true), '')), '');
  v_ap     record;
begin
  -- Status vem do payload quando as colunas explícitas não foram informadas.
  if new.status_anterior is null then
    new.status_anterior := nullif(new.dados_anteriores ->> 'status', '');
  end if;
  if new.status_posterior is null then
    new.status_posterior := nullif(new.dados_novos ->> 'status', '');
  end if;

  -- finalizar_feedback: o motivo NÃO estava no INSERT da audit_log. O wrapper
  -- o disponibiliza na configuração local e o trigger grava o texto integral.
  if new.tabela = 'feedbacks_360'
     and coalesce(new.acao, '') = 'UPDATE'
     and v_motivo is not null then
    new.justificativa := coalesce(new.justificativa, v_motivo);
    new.dados_novos := coalesce(new.dados_novos, '{}'::jsonb)
      || jsonb_build_object(
           'justificativa', new.justificativa,
           'motivo', new.justificativa,
           'acao', v_acao,
           'status_anterior', new.status_anterior,
           'status_posterior', new.status_posterior
         );
  end if;

  -- Aprovação/devolução: a justificativa vive em
  -- feedbacks_360_aprovacoes_gestor. Copiamos para a trilha sem mudar a regra
  -- de aprovação e sem duplicar a decisão.
  if new.tabela = 'feedbacks_360_aprovacoes_gestor' then
    select a.justificativa, a.decisao
      into v_ap
      from public.feedbacks_360_aprovacoes_gestor a
     where a.id = new.registro_id;

    if found then
      if new.justificativa is null then
        new.justificativa := v_ap.justificativa;
      end if;
      if new.status_posterior is null then
        new.status_posterior := case lower(coalesce(v_ap.decisao, ''))
          when 'aprovado' then 'aprovada_gestor'
          when 'devolvido' then 'devolvida'
          else null
        end;
      end if;
      new.dados_novos := coalesce(new.dados_novos, '{}'::jsonb)
        || jsonb_build_object(
             'justificativa', new.justificativa,
             'status_posterior', new.status_posterior
           );
    end if;
  end if;

  if new.justificativa is null then
    new.justificativa := nullif(new.dados_novos ->> 'justificativa', '');
  end if;

  return new;
end;
$function$
