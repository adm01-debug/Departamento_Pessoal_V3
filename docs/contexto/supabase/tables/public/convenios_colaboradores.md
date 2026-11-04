# public.convenios_colaboradores

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
| 2 | `convenio_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `limite_individual` | `numeric` | sim | `0` |  |  |
| 5 | `saldo_utilizado` | `numeric` | sim | `0` |  |  |
| 6 | `ativo` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| conv_colab_valores_nao_negativos | CHECK | `CHECK ((limite_individual IS NULL OR limite_individual >= 0::numeric) AND COALESCE(saldo_utilizado, 0::numeric) >= 0::numeric)` |  |  | sim |
| convenios_colaboradores_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| convenios_colaboradores_convenio_id_fkey | FOREIGN KEY | `FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| convenios_colaboradores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| convenios_colaboradores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX convenios_colaboradores_pkey ON public.convenios_colaboradores USING btree (id)` |
| idx_convenios_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_convenios_colaboradores_colaborador_id ON public.convenios_colaboradores USING btree (colaborador_id)` |
| idx_convenios_colaboradores_convenio_id | btree | convenio_id | não | sim |  | `CREATE INDEX idx_convenios_colaboradores_convenio_id ON public.convenios_colaboradores USING btree (convenio_id)` |


## Policies (RLS)

### `tenant_convenios_colaboradores`

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
