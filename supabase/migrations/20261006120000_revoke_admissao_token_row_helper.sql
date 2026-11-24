-- _admissao_token_row é helper interno das RPCs do portal de admissão —
-- não deve ser alcançável pela API. O REVOKE ... FROM PUBLIC da migration
-- 20261002103000 não cobria os grants de default privileges que o Supabase
-- dá por role (anon/authenticated). Chamadas internas via SECURITY DEFINER
-- das RPCs continuam válidas (checadas contra o owner, não o caller).
REVOKE EXECUTE ON FUNCTION public._admissao_token_row(TEXT) FROM anon, authenticated;
