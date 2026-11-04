# public.historico_ferias

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
| 2 | `ferias_id` | `uuid` | não |  |  |  |
| 3 | `status_anterior` | `character varying(20)` | sim |  |  |  |
| 4 | `status_novo` | `character varying(20)` | não |  |  |  |
| 5 | `observacao` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_ferias_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (ferias_id) REFERENCES ferias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_ferias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_ferias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_ferias_pkey ON public.historico_ferias USING btree (id)` |
| idx_historico_ferias_ferias_id | btree | ferias_id | não | sim |  | `CREATE INDEX idx_historico_ferias_ferias_id ON public.historico_ferias USING btree (ferias_id)` |


## Policies (RLS)

### `tenant_historico_ferias`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(ferias_id IN ( SELECT ferias.id    FROM ferias   WHERE (ferias.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(ferias_id IN ( SELECT ferias.id    FROM ferias   WHERE (ferias.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
