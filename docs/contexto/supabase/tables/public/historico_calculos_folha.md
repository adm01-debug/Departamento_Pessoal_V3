# public.historico_calculos_folha

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
| 2 | `folha_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `snapshot` | `jsonb` | não |  |  |  |
| 5 | `criado_por` | `uuid` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_calculos_folha_criado_por_fkey | FOREIGN KEY | `FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| historico_calculos_folha_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_calculos_folha_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_calculos_folha_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_calculos_folha_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_calculos_folha_pkey ON public.historico_calculos_folha USING btree (id)` |
| idx_historico_calculos_folha_criado_por | btree | criado_por | não | sim |  | `CREATE INDEX idx_historico_calculos_folha_criado_por ON public.historico_calculos_folha USING btree (criado_por)` |
| idx_historico_calculos_folha_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_historico_calculos_folha_empresa_id ON public.historico_calculos_folha USING btree (empresa_id)` |
| idx_historico_calculos_folha_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_historico_calculos_folha_folha_id ON public.historico_calculos_folha USING btree (folha_id)` |


## Policies (RLS)

### `Acesso por empresa historico`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid)` |
| WITH CHECK |  |

### `Inserção por empresa historico`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
