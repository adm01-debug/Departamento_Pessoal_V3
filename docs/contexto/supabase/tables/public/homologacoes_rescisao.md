# public.homologacoes_rescisao

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
| 2 | `desligamento_id` | `uuid` | não |  |  |  |
| 3 | `etapa` | `text` | não |  |  |  |
| 4 | `status` | `text` | não | `'pendente'::text` |  |  |
| 5 | `parecer` | `text` | sim |  |  |  |
| 6 | `usuario_id` | `uuid` | sim |  |  |  |
| 7 | `data_decisao` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| homologacoes_rescisao_desligamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (desligamento_id) REFERENCES desligamentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| homologacoes_rescisao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| homologacoes_rescisao_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| uq_homologacoes_desligamento_etapa | UNIQUE | `UNIQUE (desligamento_id, etapa)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| homologacoes_rescisao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX homologacoes_rescisao_pkey ON public.homologacoes_rescisao USING btree (id)` |
| idx_homologacoes_desligamento | btree | desligamento_id | não | sim |  | `CREATE INDEX idx_homologacoes_desligamento ON public.homologacoes_rescisao USING btree (desligamento_id)` |
| idx_homologacoes_rescisao_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_homologacoes_rescisao_usuario_id ON public.homologacoes_rescisao USING btree (usuario_id)` |
| uq_homologacoes_desligamento_etapa | btree | desligamento_id, etapa | sim | sim |  | `CREATE UNIQUE INDEX uq_homologacoes_desligamento_etapa ON public.homologacoes_rescisao USING btree (desligamento_id, etapa)` |


## Policies (RLS)

### `Acesso homologacoes por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM (desligamentos d      JOIN user_empresas ue ON ((d.empresa_id = ue.empresa_id)))   WHERE ((d.id = homologacoes_rescisao.desligamento_id) AND (ue.user_id = auth.uid()))))` |
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
