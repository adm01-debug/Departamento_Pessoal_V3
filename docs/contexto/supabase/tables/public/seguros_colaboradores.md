# public.seguros_colaboradores

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
| 2 | `seguro_vida_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `data_adesao` | `date` | sim |  |  |  |
| 5 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seguros_colaboradores_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seguros_colaboradores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seguros_colaboradores_seguro_vida_id_fkey | FOREIGN KEY | `FOREIGN KEY (seguro_vida_id) REFERENCES seguros_vida(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seguros_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_seguros_colaboradores_colaborador_id ON public.seguros_colaboradores USING btree (colaborador_id)` |
| idx_seguros_colaboradores_seguro_vida_id | btree | seguro_vida_id | não | sim |  | `CREATE INDEX idx_seguros_colaboradores_seguro_vida_id ON public.seguros_colaboradores USING btree (seguro_vida_id)` |
| seguros_colaboradores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seguros_colaboradores_pkey ON public.seguros_colaboradores USING btree (id)` |


## Policies (RLS)

### `tenant_seguros_colaboradores`

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
