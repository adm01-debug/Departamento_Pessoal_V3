# public.whatsapp_mensagens_logs

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `telefone` | `text` | não |  |  |  |
| 5 | `template_id` | `uuid` | sim |  |  |  |
| 6 | `status` | `text` | sim | `'sent'::text` |  |  |
| 7 | `mensagem_id_externo` | `text` | sim |  |  |  |
| 8 | `error_message` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| whatsapp_mensagens_logs_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| whatsapp_mensagens_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| whatsapp_mensagens_logs_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_whatsapp_mensagens_logs_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_whatsapp_mensagens_logs_colaborador_id ON public.whatsapp_mensagens_logs USING btree (colaborador_id)` |
| idx_whatsapp_mensagens_logs_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_whatsapp_mensagens_logs_template_id ON public.whatsapp_mensagens_logs USING btree (template_id)` |
| whatsapp_mensagens_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX whatsapp_mensagens_logs_pkey ON public.whatsapp_mensagens_logs USING btree (id)` |


## Policies (RLS)

### `Gestores veem logs de mensagens WhatsApp`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'gestor'::app_role, 'rh'::app_role]))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_whatsapp_mensagens_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_whatsapp_mensagens_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
