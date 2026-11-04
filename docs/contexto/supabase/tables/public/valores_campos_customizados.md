# public.valores_campos_customizados

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
| 2 | `campo_customizado_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `valor` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| valores_campos_customizados_campo_customizado_id_colaborado_key | UNIQUE | `UNIQUE (campo_customizado_id, colaborador_id)` |  |  | sim |
| valores_campos_customizados_campo_customizado_id_fkey | FOREIGN KEY | `FOREIGN KEY (campo_customizado_id) REFERENCES campos_customizados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| valores_campos_customizados_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| valores_campos_customizados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_valores_campos_customizados_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_valores_campos_customizados_colaborador_id ON public.valores_campos_customizados USING btree (colaborador_id)` |
| valores_campos_customizados_campo_customizado_id_colaborado_key | btree | campo_customizado_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX valores_campos_customizados_campo_customizado_id_colaborado_key ON public.valores_campos_customizados USING btree (campo_customizado_id, colaborador_id)` |
| valores_campos_customizados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX valores_campos_customizados_pkey ON public.valores_campos_customizados USING btree (id)` |


## Policies (RLS)

### `tenant_valores_campos_customizados`

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
