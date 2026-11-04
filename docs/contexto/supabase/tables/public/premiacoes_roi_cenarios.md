# public.premiacoes_roi_cenarios

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `configuracoes` | `jsonb` | não |  |  |  |
| 5 | `resultados` | `jsonb` | não |  |  |  |
| 6 | `snapshot_logs` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| premiacoes_roi_cenarios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| premiacoes_roi_cenarios_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_roi_cenarios_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_premiacoes_roi_cenarios_user_id ON public.premiacoes_roi_cenarios USING btree (user_id)` |
| premiacoes_roi_cenarios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_roi_cenarios_pkey ON public.premiacoes_roi_cenarios USING btree (id)` |


## Policies (RLS)

### `Users can manage their own scenarios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
