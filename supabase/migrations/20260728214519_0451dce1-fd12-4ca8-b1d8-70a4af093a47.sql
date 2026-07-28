REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.log_envio_relatorios FROM authenticated;
GRANT SELECT ON public.log_envio_relatorios TO authenticated;