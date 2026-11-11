-- RV-02: medidas_ciencia_tokens é estado interno; a ciência pública passa só
-- pelas RPCs que validam o token (lockdown P0, 20260912191000). Aquele lockdown
-- revogou as grants de anon/authenticated mas deixou duas policies de RH, hoje
-- inertes (sem grant elas não concedem nada). Elas reprovam o probe RV-02 todo
-- dia e voltariam a expor os tokens em texto puro se alguém reconcedesse
-- SELECT/INSERT a authenticated. Remove-as; não muda nenhum acesso atual.
DROP POLICY IF EXISTS "RH visualiza tokens da empresa" ON public.medidas_ciencia_tokens;
DROP POLICY IF EXISTS "RH gera tokens da empresa" ON public.medidas_ciencia_tokens;
