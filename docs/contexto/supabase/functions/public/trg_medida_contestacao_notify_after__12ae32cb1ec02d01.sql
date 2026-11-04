CREATE OR REPLACE FUNCTION public.trg_medida_contestacao_notify_after()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colab_user uuid;
  v_colab_nome text;
  v_admin_ids uuid[];
BEGIN
  SELECT c.user_id, c.nome_completo INTO v_colab_user, v_colab_nome
  FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;

  -- Aplicada -> notificar colaborador com prazo
  IF NEW.status_workflow = 'aplicada' AND OLD.status_workflow IS DISTINCT FROM 'aplicada' AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    VALUES (v_colab_user, NEW.empresa_id, 'medida_aplicada',
      'Medida disciplinar registrada',
      'Você tem até ' || to_char(NEW.contestacao_prazo_ate AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' para contestar.',
      'medida_disciplinar', NEW.id);
  END IF;

  -- Contestada -> notificar admins/rh da empresa
  IF NEW.status_workflow = 'contestada' AND OLD.status_workflow IS DISTINCT FROM 'contestada' THEN
    SELECT COALESCE(array_agg(DISTINCT ur.user_id), '{}') INTO v_admin_ids
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = NEW.empresa_id
    WHERE ur.role IN ('admin','rh');

    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    SELECT uid, NEW.empresa_id, 'medida_contestada',
      'Nova contestação de medida disciplinar',
      COALESCE(v_colab_nome,'Colaborador') || ' contestou a medida. Prazo de resposta em análise.',
      'medida_disciplinar', NEW.id
    FROM unnest(v_admin_ids) uid;
  END IF;

  -- Resposta -> notificar colaborador
  IF NEW.contestacao_respondida_em IS NOT NULL AND OLD.contestacao_respondida_em IS NULL AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    VALUES (v_colab_user, NEW.empresa_id, 'medida_contestacao_resposta',
      CASE WHEN NEW.contestacao_aceita THEN 'Contestação aceita' ELSE 'Contestação analisada' END,
      COALESCE(NEW.contestacao_resposta, 'Sua contestação foi analisada pelo RH.'),
      'medida_disciplinar', NEW.id);
  END IF;

  RETURN NEW;
END;
$function$
