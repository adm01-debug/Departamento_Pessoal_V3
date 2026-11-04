# public.deficiencias

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `cid` | `text` | sim |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `laudo_url` | `text` | sim |  |  |  |
| 8 | `cota_pcd` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| deficiencias_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| deficiencias_colaborador_id_key | UNIQUE | `UNIQUE (colaborador_id)` |  |  | sim |
| deficiencias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| deficiencias_colaborador_id_key | btree | colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX deficiencias_colaborador_id_key ON public.deficiencias USING btree (colaborador_id)` |
| deficiencias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX deficiencias_pkey ON public.deficiencias USING btree (id)` |
| idx_deficiencias_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_deficiencias_colaborador_id ON public.deficiencias USING btree (colaborador_id)` |


## Policies (RLS)

### `tenant_deficiencias`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
