# public.colaborador_beneficios

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `beneficio_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| colaborador_beneficios_beneficio_id_colaborador_id_key | UNIQUE | `UNIQUE (beneficio_id, colaborador_id)` |  |  | sim |
| colaborador_beneficios_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_id) REFERENCES beneficios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaborador_beneficios_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaborador_beneficios_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| colaborador_beneficios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| colaborador_beneficios_beneficio_id_colaborador_id_key | btree | beneficio_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX colaborador_beneficios_beneficio_id_colaborador_id_key ON public.colaborador_beneficios USING btree (beneficio_id, colaborador_id)` |
| colaborador_beneficios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX colaborador_beneficios_pkey ON public.colaborador_beneficios USING btree (id)` |
| idx_colaborador_beneficios_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_colaborador_beneficios_colaborador_id ON public.colaborador_beneficios USING btree (colaborador_id)` |
| idx_colaborador_beneficios_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_colaborador_beneficios_empresa ON public.colaborador_beneficios USING btree (empresa_id) WHERE (empresa_id IS NOT NULL)` |


## Policies (RLS)

### `colaborador_beneficios_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `tenant_colaborador_beneficios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_empresa_colaborador | BEFORE | INSERT OR UPDATE | ROW | enabled | public.dp_sync_empresa_from_colaborador |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
