# Roles

`config` traz limites por role (ex.: `statement_timeout` de anon/authenticated).

| role | superuser | login | bypass RLS | create role | create db | conn limit | config | membro de |
|---|---|---|---|---|---|---|---|---|
| anon | não | não | não | não | não | -1 | statement_timeout=3s |  |
| authenticated | não | não | não | não | não | -1 | statement_timeout=8s |  |
| authenticator | não | sim | não | não | não | -1 | session_preload_libraries=supautils, safeupdate, statement_timeout=8s, lock_timeout=8s | anon, authenticated, service_role |
| ci_auditor | não | sim | não | não | não | 5 |  |  |
| cli_login_postgres | não | sim | não | não | não | -1 |  | postgres |
| dashboard_user | não | não | não | sim | sim | -1 |  |  |
| dp_ci_auditor | não | sim | não | não | não | 2 | statement_timeout=15s |  |
| dp_mcp_role | não | não | não | não | não | -1 |  |  |
| dp_mcp_user | não | sim | não | não | não | 5 |  | dp_mcp_role |
| pgbouncer | não | sim | não | não | não | -1 |  |  |
| pgsodium_keyholder | não | não | não | não | não | -1 |  | pgsodium_keyiduser |
| pgsodium_keyiduser | não | não | não | não | não | -1 |  |  |
| pgsodium_keymaker | não | não | não | não | não | -1 |  | pgsodium_keyholder, pgsodium_keyiduser |
| postgres | não | sim | sim | sim | sim | -1 | search_path="\$user", public, extensions | anon, authenticated, authenticator, ci_auditor, dp_ci_auditor, dp_mcp_role, dp_mcp_user, pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend, service_role, supabase_privileged_role |
| service_role | não | não | sim | não | não | -1 |  |  |
| supabase_admin | sim | sim | sim | sim | sim | -1 | search_path="$user", public, auth, extensions, log_statement=none |  |
| supabase_auth_admin | não | sim | não | sim | não | -1 | search_path=auth, idle_in_transaction_session_timeout=60000, log_statement=none |  |
| supabase_etl_admin | não | sim | sim | não | não | -1 |  | pg_monitor, pg_read_all_data, supabase_privileged_role |
| supabase_privileged_role | não | não | não | não | não | -1 |  |  |
| supabase_read_only_user | não | sim | sim | não | não | -1 | default_transaction_read_only=on | pg_monitor, pg_read_all_data |
| supabase_realtime_admin | não | não | não | não | não | -1 |  |  |
| supabase_replication_admin | não | sim | não | não | não | -1 |  |  |
| supabase_storage_admin | não | sim | não | sim | não | -1 | search_path=storage, log_statement=none | authenticator |
