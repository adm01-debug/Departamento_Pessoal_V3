
-- Etapa 7.3: Hardening SECURITY DEFINER — revogar EXECUTE de 'authenticated'
-- de RPCs administrativas/sensíveis que devem ser invocadas apenas por
-- edge functions (service_role) após validação de papel/contexto.

-- 1) processar_ajuste_aprovado: já documentado no security memory como
--    "apenas service_role (chamada por edge function após validação)".
REVOKE EXECUTE ON FUNCTION public.processar_ajuste_aprovado(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.processar_ajuste_aprovado(uuid) FROM anon;

-- 2) AFDT — ações de reconciliação executadas por administradores via edge
--    functions; expor a authenticated permite bypass do rate limit e da
--    trilha de auditoria centralizada.
REVOKE EXECUTE ON FUNCTION public.associar_pis_colaborador_afdt(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.associar_pis_colaborador_afdt(uuid, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.criar_batida_da_divergencia_afdt(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.criar_batida_da_divergencia_afdt(uuid, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.resolver_divergencia_afdt(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolver_divergencia_afdt(uuid, text) FROM anon;

-- 3) pagar_desligamento: efeito financeiro. Deve passar por edge function
--    (com CSRF, rate limit e auditoria) — não expor direto ao cliente.
REVOKE EXECUTE ON FUNCTION public.pagar_desligamento(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pagar_desligamento(uuid, text) FROM anon;

-- Garantir grant explícito ao service_role para todas.
GRANT EXECUTE ON FUNCTION public.processar_ajuste_aprovado(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.associar_pis_colaborador_afdt(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.criar_batida_da_divergencia_afdt(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolver_divergencia_afdt(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pagar_desligamento(uuid, text) TO service_role;
