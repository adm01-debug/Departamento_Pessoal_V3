-- Variantes com usuario explicito. Fonte unica de verdade: as versoes
-- baseadas em auth.uid() passam a DELEGAR para estas, de modo que a regra
-- nunca possa divergir entre o RLS e as Edge Functions.

CREATE OR REPLACE FUNCTION public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND _empresa_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_empresas ue
                 WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id)
     AND (public.has_role(_user_id, 'admin'::app_role)
       OR public.has_role(_user_id, 'rh'::app_role));
$$;

CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas_para(_user_id uuid, _empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL
     AND _empresa_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_empresas ue
                 WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id)
     AND (public.has_role(_user_id, 'admin'::app_role)
       OR public.has_role(_user_id, 'rh'::app_role)
       OR public.has_role(_user_id, 'gestor'::app_role));
$$;

-- Delegacao: mantem a assinatura usada por ~90 politicas RLS intacta.
CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.pode_gerir_rh_para(auth.uid(), _empresa_id);
$$;

CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.pode_gerir_pessoas_para(auth.uid(), _empresa_id);
$$;

-- As variantes com usuario explicito NUNCA podem ser chamadas pelo cliente:
-- receber o user_id como argumento e' exatamente o que as torna forjaveis
-- se expostas ao PostgREST. Sao exclusivas do backend.
REVOKE ALL ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pode_gerir_rh(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_gerir_pessoas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas(uuid) TO authenticated, service_role;