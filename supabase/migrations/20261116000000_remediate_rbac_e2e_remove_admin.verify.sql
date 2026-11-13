-- Verifica que a conta E2E nao-admin (user@teste.local) NAO possui mais role
-- 'admin' no canonico e MANTEM ao menos o papel 'user'. Retorna 'fail' (e por
-- consequencia o workflow reprova) se qualquer condicao estiver errada.
SELECT 'ok'::text
WHERE (
  (SELECT count(*) FROM public.user_roles r
   JOIN auth.users u ON u.id = r.user_id
   WHERE u.email = 'user@teste.local' AND r.role = 'admin') = 0
  AND
  (SELECT count(*) FROM public.user_roles r
   JOIN auth.users u ON u.id = r.user_id
   WHERE u.email = 'user@teste.local' AND r.role = 'user') >= 1
);