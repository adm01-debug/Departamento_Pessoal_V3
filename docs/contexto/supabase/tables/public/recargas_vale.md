# public.recargas_vale

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
| 2 | `vale_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `valor` | `numeric` | não |  |  |  |
| 5 | `data_recarga` | `text` | sim |  |  |  |
| 6 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `mes_referencia` | `text` | sim |  |  |  |
| 9 | `origem_recurso` | `text` | sim | `'empresa'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recargas_vale_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recargas_vale_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recargas_vale_vale_id_fkey | FOREIGN KEY | `FOREIGN KEY (vale_id) REFERENCES vales_alimentacao(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recargas_vale_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_recargas_vale_colaborador_id ON public.recargas_vale USING btree (colaborador_id)` |
| idx_recargas_vale_vale_id | btree | vale_id | não | sim |  | `CREATE INDEX idx_recargas_vale_vale_id ON public.recargas_vale USING btree (vale_id)` |
| recargas_vale_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recargas_vale_pkey ON public.recargas_vale USING btree (id)` |


## Policies (RLS)

### `tenant_recargas_vale`

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
