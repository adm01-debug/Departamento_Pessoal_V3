-- Habilitar RLS nas tabelas identificadas
ALTER TABLE public.folha_eventos_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_auditoria_fraude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_seguranca_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_fila_limpeza ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar duplicidade
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.folha_eventos_auditoria;
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.folha_assinaturas;
DROP POLICY IF EXISTS "Admins can view fraud audit" ON public.ponto_auditoria_fraude;
DROP POLICY IF EXISTS "Admins can manage blacklist" ON public.ponto_seguranca_blacklist;
DROP POLICY IF EXISTS "Service role only for cleanup queue" ON public.lgpd_fila_limpeza;

-- Políticas para folha_eventos_auditoria
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.folha_eventos_auditoria;
CREATE POLICY "Admins can view audit logs" ON public.folha_eventos_auditoria
FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin'));

-- Políticas para folha_assinaturas (assinante_id é o UUID do usuário que assinou)
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.folha_assinaturas;
CREATE POLICY "Users can view their own signatures" ON public.folha_assinaturas
FOR SELECT TO authenticated USING (assinante_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin'));

-- Políticas para ponto_auditoria_fraude
DROP POLICY IF EXISTS "Admins can view fraud audit" ON public.ponto_auditoria_fraude;
CREATE POLICY "Admins can view fraud audit" ON public.ponto_auditoria_fraude
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin'));

-- Políticas para ponto_seguranca_blacklist
DROP POLICY IF EXISTS "Admins can manage blacklist" ON public.ponto_seguranca_blacklist;
CREATE POLICY "Admins can manage blacklist" ON public.ponto_seguranca_blacklist
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin'));

-- Políticas para lgpd_fila_limpeza
DROP POLICY IF EXISTS "Service role only for cleanup queue" ON public.lgpd_fila_limpeza;
CREATE POLICY "Service role only for cleanup queue" ON public.lgpd_fila_limpeza
FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'service_role');
