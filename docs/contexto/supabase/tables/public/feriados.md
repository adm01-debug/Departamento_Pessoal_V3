# public.feriados

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
| 2 | `data` | `date` | não |  |  |  |
| 3 | `descricao` | `character varying(100)` | não |  |  |  |
| 4 | `tipo` | `character varying(20)` | sim | `'nacional'::character varying` |  |  |
| 5 | `uf` | `character varying(2)` | sim |  |  |  |
| 6 | `cidade` | `character varying(100)` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feriados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| feriados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| feriados_tipo_check | CHECK | `CHECK (tipo::text = ANY (ARRAY['nacional'::character varying::text, 'estadual'::character varying::text, 'municipal'::character varying::text, 'facultativo'::character varying::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feriados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feriados_pkey ON public.feriados USING btree (id)` |
| idx_feriados_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_feriados_empresa_id ON public.feriados USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_feriados`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
