-- ============================================================
-- HARDENING POLICIES: fechar exposição anon nas tabelas críticas
-- TO public → TO authenticated (14 tabelas com dados sensíveis)
-- ============================================================
ALTER POLICY view_audit ON public.audit_log TO authenticated;
ALTER POLICY "Gestores podem ver logs de provisão" ON public.provisao_logs TO authenticated;
ALTER POLICY "Gestores podem ver auditoria de provisão" ON public.provisao_auditoria TO authenticated;
ALTER POLICY "Apenas admin pode ver logs de integração" ON public.integracao_logs TO authenticated;
ALTER POLICY "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas TO authenticated;
ALTER POLICY "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos TO authenticated;
ALTER POLICY "Usuários podem ver configurações de suas empresas" ON public.cnab_configuracoes TO authenticated;
ALTER POLICY view_pendencias ON public.pendencias TO authenticated;
ALTER POLICY "Enable read access for all users" ON public.promo_brindes TO authenticated;
ALTER POLICY "Enable read access for all users" ON public.times TO authenticated;
ALTER POLICY "Enable read for all" ON public.times_brindes TO authenticated;
ALTER POLICY "Anyone can read versao_banco" ON public.versao_banco TO authenticated;
