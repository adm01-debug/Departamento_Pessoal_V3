-- ok = contas_bancarias_decrypted roda como quem consulta (security_invoker) e
-- continua sem acesso para anon.
SELECT 'ok'
FROM pg_class c
WHERE c.oid = 'public.contas_bancarias_decrypted'::regclass
  AND c.reloptions::text[] && ARRAY['security_invoker=true', 'security_invoker=on']
  AND NOT has_table_privilege('anon', c.oid, 'SELECT');
