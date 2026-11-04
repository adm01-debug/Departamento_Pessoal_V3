# public.training_image_requests

> Fila persistente de geração automática. Uma linha por conteúdo; reivindicada com FOR UPDATE SKIP LOCKED pelo worker.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `content_type` | `text` | não |  |  |  |
| 4 | `content_id` | `uuid` | não |  |  |  |
| 5 | `requested_by` | `uuid` | sim |  |  |  |
| 6 | `status` | `text` | não | `'queued'::text` |  |  |
| 7 | `attempts` | `integer` | não | `0` |  |  |
| 8 | `last_error` | `text` | sim |  |  |  |
| 9 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `available_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `finished_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| training_image_requests_attempts_check | CHECK | `CHECK (attempts >= 0 AND attempts <= 5)` |  |  | sim |
| training_image_requests_content_type_check | CHECK | `CHECK (content_type = ANY (ARRAY['course'::text, 'learning_path'::text]))` |  |  | sim |
| training_image_requests_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| training_image_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| training_image_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'done'::text, 'skipped'::text, 'failed'::text]))` |  |  | sim |
| training_image_requests_unico | UNIQUE | `UNIQUE (empresa_id, content_type, content_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_training_image_requests_empresa | btree | empresa_id, content_type | não | sim |  | `CREATE INDEX idx_training_image_requests_empresa ON public.training_image_requests USING btree (empresa_id, content_type)` |
| idx_training_image_requests_status | btree | status, available_at, requested_at | não | sim |  | `CREATE INDEX idx_training_image_requests_status ON public.training_image_requests USING btree (status, available_at, requested_at)` |
| training_image_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX training_image_requests_pkey ON public.training_image_requests USING btree (id)` |
| training_image_requests_unico | btree | empresa_id, content_type, content_id | sim | sim |  | `CREATE UNIQUE INDEX training_image_requests_unico ON public.training_image_requests USING btree (empresa_id, content_type, content_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
