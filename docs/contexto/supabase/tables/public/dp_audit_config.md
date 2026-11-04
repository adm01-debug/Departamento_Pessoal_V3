# public.dp_audit_config

> Registro de politicas de auditoria por tabela para LGPD Art. 37 e 39.
PROCEDIMENTO DE ATIVACAO pgaudit:
  1. Acessar Supabase Dashboard > Database > Extensions
  2. Habilitar pgaudit
  3. Executar: ALTER DATABASE postgres SET pgaudit.log = 'write';
  4. Executar: ALTER DATABASE postgres SET pgaudit.log_relation = 'on';
  5. Para cada tabela em dp_audit_config WHERE enabled=true E audit_writes=true:
     SECURITY LABEL FOR pgaudit ON TABLE public.<tabela> IS 'OBJECT';
  ATENCAO: pgaudit.log = 'all' enche o disco em horas. Usar SOMENTE 'write'.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `table_name` | `text` | não |  |  |  |
| 3 | `audit_reads` | `boolean` | não | `false` |  |  |
| 4 | `audit_writes` | `boolean` | não | `true` |  |  |
| 5 | `audit_ddl` | `boolean` | não | `true` |  |  |
| 6 | `enabled` | `boolean` | não | `true` |  |  |
| 7 | `configured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `configured_by` | `text` | não | `CURRENT_USER` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_audit_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dp_audit_config_table_name_key | UNIQUE | `UNIQUE (table_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_audit_config_enabled_idx | btree | table_name | não | sim | `(enabled = true)` | `CREATE INDEX dp_audit_config_enabled_idx ON public.dp_audit_config USING btree (table_name) WHERE (enabled = true)` |
| dp_audit_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_audit_config_pkey ON public.dp_audit_config USING btree (id)` |
| dp_audit_config_table_name_key | btree | table_name | sim | sim |  | `CREATE UNIQUE INDEX dp_audit_config_table_name_key ON public.dp_audit_config USING btree (table_name)` |


## Policies (RLS)

### `service_role_full_audit_config`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
