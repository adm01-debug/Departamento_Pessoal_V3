-- Funções de GATILHO não precisam de EXECUTE concedido: o disparo pelo
-- motor de triggers não passa por verificação de privilégio de chamada.
-- Manter o EXECUTE aberto só amplia a superfície da API à toa — e foi o
-- que elevou o linter de 76 para 78 ao tornar a função SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.calcular_provisao_mensal()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_notification()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verificar_divergencias_folha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()   FROM PUBLIC, anon, authenticated;