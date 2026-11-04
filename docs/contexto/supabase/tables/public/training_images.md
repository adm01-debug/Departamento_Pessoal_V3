# public.training_images

> Capa de um conteúdo de treinamento. Uma linha por conteúdo; storage_path aponta para o bucket privado training-images.

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
| 3 | `content_type` | `text` | não |  |  |  |
| 4 | `content_id` | `uuid` | não |  |  |  |
| 5 | `source_content_id` | `uuid` | sim |  |  | Curso de origem quando a capa é herdada por turma/certificado (evita geração duplicada). |
| 6 | `storage_path` | `text` | não |  |  |  |
| 7 | `content_hash` | `text` | sim |  |  |  |
| 8 | `status` | `text` | não | `'disabled'::text` |  | disabled = integração de geração desligada; pending/processing/succeeded/failed só existem com provedor configurado. |
| 9 | `provider` | `text` | não | `'disabled'::text` |  |  |
| 10 | `model` | `text` | sim |  |  |  |
| 11 | `attempts` | `integer` | não | `0` |  | Tentativas de processamento da versão atual (content_hash). Reinicia quando o conteúdo é editado. |
| 12 | `generations` | `integer` | não | `0` |  | Quantidade de capas concluídas com sucesso (histórico, nunca reduz). |
| 13 | `failures` | `integer` | não | `0` |  |  |
| 14 | `unknown_outcomes` | `integer` | não | `0` |  | Resultados pagos desconhecidos (timeout/rede/5xx). Exige reconciliação manual; NÃO é retentado automaticamente. |
| 15 | `last_attempt_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `operation_id` | `text` | sim |  |  | Identificador estável da operação no provedor (rastreabilidade/suporte). Não impede cobrança duplicada por si só. |
| 17 | `reconciled_at` | `timestamp with time zone` | sim |  |  |  |
| 18 | `reconciled_by` | `text` | sim |  |  |  |
| 19 | `reconciliation_notes` | `text` | sim |  |  |  |
| 20 | `last_error` | `text` | sim |  |  |  |
| 21 | `prompt_version` | `text` | sim |  |  |  |
| 22 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 24 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 25 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| training_images_attempts_check | CHECK | `CHECK (attempts >= 0 AND attempts <= 5)` |  |  | sim |
| training_images_caminho_tenant | CHECK | `CHECK (storage_path ~~ (empresa_id::text \|\| '/%'::text))` |  |  | sim |
| training_images_caminho_unico | UNIQUE | `UNIQUE (empresa_id, storage_path)` |  |  | sim |
| training_images_content_type_check | CHECK | `CHECK (content_type = ANY (ARRAY['course'::text, 'learning_path'::text, 'training_session'::text, 'certificate'::text]))` |  |  | sim |
| training_images_conteudo_unico | UNIQUE | `UNIQUE (empresa_id, content_type, content_id)` |  |  | sim |
| training_images_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| training_images_failures_check | CHECK | `CHECK (failures >= 0)` |  |  | sim |
| training_images_generations_check | CHECK | `CHECK (generations >= 0)` |  |  | sim |
| training_images_hash_valido | CHECK | `CHECK (content_hash IS NULL OR char_length(content_hash) >= 8 AND char_length(content_hash) <= 128)` |  |  | sim |
| training_images_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| training_images_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'disabled'::text]))` |  |  | sim |
| training_images_unknown_outcomes_check | CHECK | `CHECK (unknown_outcomes >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_training_images_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_training_images_empresa ON public.training_images USING btree (empresa_id)` |
| idx_training_images_origem | btree | source_content_id | não | sim | `(source_content_id IS NOT NULL)` | `CREATE INDEX idx_training_images_origem ON public.training_images USING btree (source_content_id) WHERE (source_content_id IS NOT NULL)` |
| idx_training_images_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_training_images_status ON public.training_images USING btree (empresa_id, status)` |
| training_images_caminho_unico | btree | empresa_id, storage_path | sim | sim |  | `CREATE UNIQUE INDEX training_images_caminho_unico ON public.training_images USING btree (empresa_id, storage_path)` |
| training_images_conteudo_unico | btree | empresa_id, content_type, content_id | sim | sim |  | `CREATE UNIQUE INDEX training_images_conteudo_unico ON public.training_images USING btree (empresa_id, content_type, content_id)` |
| training_images_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX training_images_pkey ON public.training_images USING btree (id)` |


## Policies (RLS)

### `training_images_select_tenant`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| track_training_images_outcomes | BEFORE | UPDATE | ROW | enabled | public.training_images_track_outcomes |
| update_training_images_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
