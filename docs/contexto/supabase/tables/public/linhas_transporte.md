# public.linhas_transporte

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
| 2 | `vale_transporte_id` | `uuid` | sim |  |  |  |
| 3 | `tipo` | `text` | sim | `'onibus'::text` |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `valor` | `numeric` | sim | `0` |  |  |
| 6 | `ida_volta` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| linhas_transporte_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| linhas_transporte_vale_transporte_id_fkey | FOREIGN KEY | `FOREIGN KEY (vale_transporte_id) REFERENCES vales_transporte(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_linhas_transporte_vale_transporte_id | btree | vale_transporte_id | não | sim |  | `CREATE INDEX idx_linhas_transporte_vale_transporte_id ON public.linhas_transporte USING btree (vale_transporte_id)` |
| linhas_transporte_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX linhas_transporte_pkey ON public.linhas_transporte USING btree (id)` |


## Policies (RLS)

### `tenant_linhas_transporte`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(vale_transporte_id IN ( SELECT vales_transporte.id    FROM vales_transporte   WHERE (vales_transporte.colaborador_id IN ( SELECT colaboradores.id            FROM colaboradores           WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |
| WITH CHECK | `(vale_transporte_id IN ( SELECT vales_transporte.id    FROM vales_transporte   WHERE (vales_transporte.colaborador_id IN ( SELECT colaboradores.id            FROM colaboradores           WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
