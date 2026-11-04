# public.pix_lotes

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `data_criacao` | `timestamp with time zone` | sim | `now()` |  |  |
| 4 | `status` | `text` | não | `'aberto'::text` |  |  |
| 5 | `valor_total` | `numeric(18,2)` | sim | `0` |  |  |
| 6 | `quantidade_pagamentos` | `integer` | sim | `0` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `folha_id` | `uuid` | sim |  |  |  |
| 10 | `arquivo_lote` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pix_lotes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pix_lotes_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id)` | NO ACTION | NO ACTION | sim |
| pix_lotes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pix_itens | pix_itens_lote_id_fkey | lote_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pix_lotes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_pix_lotes_empresa_id ON public.pix_lotes USING btree (empresa_id)` |
| pix_lotes_empresa_folha_uk | btree | empresa_id, folha_id | sim | sim | `(folha_id IS NOT NULL)` | `CREATE UNIQUE INDEX pix_lotes_empresa_folha_uk ON public.pix_lotes USING btree (empresa_id, folha_id) WHERE (folha_id IS NOT NULL)` |
| pix_lotes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pix_lotes_pkey ON public.pix_lotes USING btree (id)` |


## Policies (RLS)

### `pix_lotes_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `pix_lotes_tenant_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_pix_lotes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
