# public.documentos_historico

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
| 2 | `documento_id` | `uuid` | sim |  |  |  |
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `versao` | `text` | não |  |  |  |
| 5 | `url_arquivo` | `text` | não |  |  |  |
| 6 | `tamanho` | `integer` | sim |  |  |  |
| 7 | `alteracoes` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| doc_historico_tamanho_nao_neg | CHECK | `CHECK (tamanho IS NULL OR tamanho >= 0)` |  |  | sim |
| documentos_historico_documento_id_fkey | FOREIGN KEY | `FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_historico_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| documentos_historico_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_historico_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_historico_pkey ON public.documentos_historico USING btree (id)` |
| idx_documentos_historico_documento_id | btree | documento_id | não | sim |  | `CREATE INDEX idx_documentos_historico_documento_id ON public.documentos_historico USING btree (documento_id)` |
| idx_documentos_historico_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_documentos_historico_usuario_id ON public.documentos_historico USING btree (usuario_id)` |


## Policies (RLS)

### `Documentos historico authenticated`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(usuario_id = auth.uid())` |
| WITH CHECK | `(usuario_id = auth.uid())` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
