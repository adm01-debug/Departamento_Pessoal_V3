-- ETAPA 7: remocao de policies redundantes (mesmo predicado ja coberto)
DROP POLICY IF EXISTS "tenant_documentos_afastamento" ON public.documentos_afastamento;
DROP POLICY IF EXISTS "tenant_prorrogacoes_afastamento" ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS "Tenant scoped log_envio_relatorios" ON public.log_envio_relatorios;
