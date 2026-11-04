# public.guias_inss

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `competencia` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | sim | `'mensal'::text` |  |  |
| 5 | `valor_empresa` | `numeric` | sim | `0` |  |  |
| 6 | `valor_segurados` | `numeric` | sim | `0` |  |  |
| 7 | `valor_total` | `numeric` | sim | `0` |  |  |
| 8 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 9 | `data_vencimento` | `date` | sim |  |  |  |
| 10 | `data_pagamento` | `timestamp with time zone` | sim |  |  |  |
| 11 | `codigo_barras` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| guias_inss_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| guias_inss_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| guias_inss_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX guias_inss_pkey ON public.guias_inss USING btree (id)` |
| idx_guias_inss_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_guias_inss_empresa_id ON public.guias_inss USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_guias_inss`

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
