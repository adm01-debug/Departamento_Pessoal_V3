# public.cnab_remessas

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
| 3 | `banco_codigo` | `text` | não |  |  |  |
| 4 | `sequencial_arquivo` | `integer` | não |  |  |  |
| 5 | `data_geracao` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `status` | `text` | não | `'gerado'::text` |  |  |
| 7 | `arquivo_url` | `text` | sim |  |  |  |
| 8 | `total_pagamentos` | `integer` | sim | `0` |  |  |
| 9 | `valor_total` | `numeric(18,2)` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `hash_integridade` | `text` | sim |  |  |  |
| 13 | `folha_id` | `uuid` | sim |  |  |  |
| 14 | `arquivo_remessa` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cnab_remessas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cnab_remessas_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| cnab_remessas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cnab_itens | cnab_itens_remessa_id_fkey | remessa_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cnab_remessas_empresa_folha_uniq | btree | empresa_id, folha_id | sim | sim | `(folha_id IS NOT NULL)` | `CREATE UNIQUE INDEX cnab_remessas_empresa_folha_uniq ON public.cnab_remessas USING btree (empresa_id, folha_id) WHERE (folha_id IS NOT NULL)` |
| cnab_remessas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cnab_remessas_pkey ON public.cnab_remessas USING btree (id)` |
| cnab_remessas_sequencial_uk | btree | empresa_id, banco_codigo, sequencial_arquivo | sim | sim |  | `CREATE UNIQUE INDEX cnab_remessas_sequencial_uk ON public.cnab_remessas USING btree (empresa_id, banco_codigo, sequencial_arquivo)` |
| idx_cnab_data | btree | data_geracao | não | sim |  | `CREATE INDEX idx_cnab_data ON public.cnab_remessas USING btree (data_geracao DESC)` |
| idx_cnab_remessas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_cnab_remessas_empresa_id ON public.cnab_remessas USING btree (empresa_id)` |
| idx_cnab_remessas_folha | btree | folha_id | não | sim |  | `CREATE INDEX idx_cnab_remessas_folha ON public.cnab_remessas USING btree (folha_id)` |
| idx_cnab_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_cnab_status ON public.cnab_remessas USING btree (empresa_id, status)` |


## Policies (RLS)

### `cnab_remessas_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `cnab_remessas_tenant_read`

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
| trg_enforce_cnab_remessa_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_cnab_remessa_hash |
| trg_impedir_alteracao_cnab_transmitida | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_cnab_transmitida |
| trg_proibir_delete_cnab_transmitida | BEFORE | DELETE | ROW | enabled | public.proibir_delete_cnab_transmitida |
| update_cnab_remessas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
