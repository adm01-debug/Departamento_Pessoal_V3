SELECT 'ok'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name LIKE 'dp_audit_log%'
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
)
AND EXISTS (
  SELECT 1 FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name = 'dp_audit_log'
    AND grantee = 'authenticated' AND privilege_type = 'SELECT'
);
