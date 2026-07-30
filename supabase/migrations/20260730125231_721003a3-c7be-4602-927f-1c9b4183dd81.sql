-- =====================================================================
-- Portal público de contratação: restauração de acesso + hardening
--
-- Contexto:
--   A revogação em massa de grants `anon` removeu EXECUTE de
--   get_admissao_por_token, quebrando a rota pública /contratacao
--   (candidato ainda não tem conta -> role `anon`).
--   As RPCs-irmãs de portal público (contrato_consultar_por_token,
--   medida_consultar_por_token) mantiveram o grant, o que confirma que
--   a remoção aqui foi colateral e não intencional.
--
-- Hardening simultâneo:
--   A função não validava `data_expiracao`. Um token vencido continuava
--   devolvendo a linha completa de admissao_tokens + to_jsonb(admissoes),
--   isto é, PII completa do candidato por tempo indeterminado.
--
-- Modelo de ameaça aceito:
--   O token é a credencial. Ele é um segredo de alta entropia passado
--   como argumento exato — não há superfície de enumeração/listagem.
--   O portador legítimo é o próprio titular dos dados retornados.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_admissao_por_token(_token text)
RETURNS TABLE(token_row admissao_tokens, admissao jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t, to_jsonb(a.*)
  FROM public.admissao_tokens t
  JOIN public.admissoes a ON a.id = t.admissao_id
  WHERE t.token = _token
    -- Guarda de entropia: rejeita sondagens triviais antes de tocar o índice.
    AND _token IS NOT NULL
    AND length(_token) >= 16
    -- Guarda de validade: token vencido não devolve PII.
    -- `data_expiracao IS NULL` é tratado como "sem expiração" para
    -- preservar tokens legados emitidos antes da coluna ser populada.
    AND (t.data_expiracao IS NULL OR t.data_expiracao > now())
  LIMIT 1;
$function$;

-- Restaura o acesso do candidato não autenticado (paridade com as demais
-- RPCs de portal público por token).
GRANT EXECUTE ON FUNCTION public.get_admissao_por_token(text) TO anon;

COMMENT ON FUNCTION public.get_admissao_por_token(text) IS
  'Portal público de contratação. O token é a credencial: exige match exato, '
  'entropia mínima e validade não expirada. Executável por anon por design.';