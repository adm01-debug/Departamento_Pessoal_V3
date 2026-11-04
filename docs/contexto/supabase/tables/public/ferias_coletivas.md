# public.ferias_coletivas

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `data_inicio` | `date` | não |  |  |  |
| 4 | `data_fim` | `date` | não |  |  |  |
| 5 | `dias` | `integer` | não |  |  |  |
| 6 | `departamentos` | `text[]` | sim |  |  |  |
| 7 | `justificativa` | `text` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 9 | `aprovado_por` | `uuid` | sim |  |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `comunicado_mte_path` | `text` | sim |  |  |  |
| 14 | `comunicado_mte_hash` | `text` | sim |  |  |  |
| 15 | `comunicado_sindicato_path` | `text` | sim |  |  |  |
| 16 | `comunicado_sindicato_hash` | `text` | sim |  |  |  |
| 17 | `comunicado_sindicato_nome` | `text` | sim |  |  |  |
| 18 | `comunicado_gerado_em` | `timestamp with time zone` | sim |  |  |  |
| 19 | `comunicado_gerado_por` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_coletivas_comunicado_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (comunicado_gerado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_coletivas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| ferias_coletivas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_coletivas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_coletivas_pkey ON public.ferias_coletivas USING btree (id)` |
| idx_ferias_coletivas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ferias_coletivas_empresa_id ON public.ferias_coletivas USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_ferias_coletivas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_ferias_coletivas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
