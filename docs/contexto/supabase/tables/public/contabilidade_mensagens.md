# public.contabilidade_mensagens

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
| 2 | `thread_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `autor_tipo` | `text` | não |  |  |  |
| 5 | `autor_id` | `uuid` | sim |  |  |  |
| 6 | `autor_nome` | `text` | sim |  |  |  |
| 7 | `corpo` | `text` | não |  |  |  |
| 8 | `anexos` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 9 | `lida_em` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contabilidade_mensagens_autor_id_fkey | FOREIGN KEY | `FOREIGN KEY (autor_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contabilidade_mensagens_autor_tipo_check | CHECK | `CHECK (autor_tipo = ANY (ARRAY['rh'::text, 'contabilidade'::text, 'sistema'::text]))` |  |  | sim |
| contabilidade_mensagens_corpo_check | CHECK | `CHECK (length(corpo) >= 1 AND length(corpo) <= 10000)` |  |  | sim |
| contabilidade_mensagens_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contabilidade_mensagens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contabilidade_mensagens_thread_id_fkey | FOREIGN KEY | `FOREIGN KEY (thread_id) REFERENCES contabilidade_threads(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contabilidade_mensagens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contabilidade_mensagens_pkey ON public.contabilidade_mensagens USING btree (id)` |
| idx_contab_msg_autor_id | btree | autor_id | não | sim |  | `CREATE INDEX idx_contab_msg_autor_id ON public.contabilidade_mensagens USING btree (autor_id)` |
| idx_contab_msg_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_contab_msg_empresa_id ON public.contabilidade_mensagens USING btree (empresa_id)` |
| idx_contab_msgs_thread | btree | thread_id, created_at | não | sim |  | `CREATE INDEX idx_contab_msgs_thread ON public.contabilidade_mensagens USING btree (thread_id, created_at)` |


## Policies (RLS)

### `contab_msgs_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK | `user_belongs_to_empresa(auth.uid(), empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_bump_contab_thread | AFTER | INSERT | ROW | enabled | public.trg_contab_msg_bump_thread |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
