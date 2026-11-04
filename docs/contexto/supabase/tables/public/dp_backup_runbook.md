# public.dp_backup_runbook

> Runbook de backup/restore E migracao de secrets. Ver steps 10-14 para Item 7.
STATUS Item 7: Chave PII migrada para Vault (vault.secrets.dp_pii_master_key).
PENDENTE: DATABASE_URL e SERVICE_ROLE_KEY ainda em plaintext no compose da stack 182.
Migracao para Docker Secrets requer modificacao do MCP para ler _FILE suffix.

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
| 2 | `step_number` | `integer` | não |  |  |  |
| 3 | `step_title` | `text` | não |  |  |  |
| 4 | `step_command` | `text` | sim |  |  |  |
| 5 | `step_notes` | `text` | sim |  |  |  |
| 6 | `is_destructive` | `boolean` | não | `false` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_backup_runbook_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dp_backup_runbook_step_number_key | UNIQUE | `UNIQUE (step_number)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_backup_runbook_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_backup_runbook_pkey ON public.dp_backup_runbook USING btree (id)` |
| dp_backup_runbook_step_number_key | btree | step_number | sim | sim |  | `CREATE UNIQUE INDEX dp_backup_runbook_step_number_key ON public.dp_backup_runbook USING btree (step_number)` |


## Policies (RLS)

### `service_role_full_runbook`

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
