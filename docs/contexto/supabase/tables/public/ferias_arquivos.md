# public.ferias_arquivos

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `arquivo_url` | `text` | sim |  |  |  |
| 5 | `assinavel` | `boolean` | sim | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_arquivos_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (ferias_id) REFERENCES ferias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_arquivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_arquivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_arquivos_pkey ON public.ferias_arquivos USING btree (id)` |
| idx_ferias_arquivos_ferias_id | btree | ferias_id | não | sim |  | `CREATE INDEX idx_ferias_arquivos_ferias_id ON public.ferias_arquivos USING btree (ferias_id)` |


## Policies (RLS)

### `tenant_ferias_arquivos`

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
