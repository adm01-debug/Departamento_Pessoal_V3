# public.comunicados_leituras

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `comunicado_id` | `uuid` | não |  |  |  |
| 3 | `usuario_id` | `uuid` | não |  |  |  |
| 4 | `lido_em` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| comunicados_leituras_comunicado_id_fkey | FOREIGN KEY | `FOREIGN KEY (comunicado_id) REFERENCES comunicados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| comunicados_leituras_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| comunicados_leituras_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX comunicados_leituras_pkey ON public.comunicados_leituras USING btree (id)` |
| idx_comunicados_leituras_comunicado_id | btree | comunicado_id | não | sim |  | `CREATE INDEX idx_comunicados_leituras_comunicado_id ON public.comunicados_leituras USING btree (comunicado_id)` |


## Policies (RLS)

### `comunicados_leituras_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM comunicados c   WHERE ((c.id = comunicados_leituras.comunicado_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |
| WITH CHECK |  |

### `comunicados_leituras_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM comunicados c   WHERE ((c.id = comunicados_leituras.comunicado_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |

### `comunicados_leituras_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM comunicados c   WHERE ((c.id = comunicados_leituras.comunicado_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |
| WITH CHECK |  |

### `comunicados_leituras_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM comunicados c   WHERE ((c.id = comunicados_leituras.comunicado_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |
| WITH CHECK | `((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM comunicados c   WHERE ((c.id = comunicados_leituras.comunicado_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
