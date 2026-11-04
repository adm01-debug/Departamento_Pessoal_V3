# public.sinistros_seguro

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
| 4 | `tipo` | `text` | sim |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `data_sinistro` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `status` | `text` | sim | `'aberto'::text` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sinistros_seguro_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sinistros_seguro_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sinistros_seguro_seguro_vida_id_fkey | FOREIGN KEY | `FOREIGN KEY (seguro_vida_id) REFERENCES seguros_vida(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sinistros_seguro_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_sinistros_seguro_colaborador_id ON public.sinistros_seguro USING btree (colaborador_id)` |
| idx_sinistros_seguro_seguro_vida_id | btree | seguro_vida_id | não | sim |  | `CREATE INDEX idx_sinistros_seguro_seguro_vida_id ON public.sinistros_seguro USING btree (seguro_vida_id)` |
| sinistros_seguro_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sinistros_seguro_pkey ON public.sinistros_seguro USING btree (id)` |


## Policies (RLS)

### `tenant_sinistros_seguro`

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
