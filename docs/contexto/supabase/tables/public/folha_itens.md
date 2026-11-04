# public.folha_itens

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
| 2 | `folha_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `salario_base` | `numeric(12,2)` | sim | `0` |  |  |
| 5 | `total_proventos` | `numeric(12,2)` | sim | `0` |  |  |
| 6 | `total_descontos` | `numeric(12,2)` | sim | `0` |  |  |
| 7 | `total_liquido` | `numeric(12,2)` | sim | `0` |  |  |
| 8 | `fgts_mes` | `numeric(12,2)` | sim | `0` |  |  |
| 9 | `inss_mes` | `numeric(12,2)` | sim | `0` |  |  |
| 10 | `irrf_mes` | `numeric(12,2)` | sim | `0` |  |  |
| 11 | `detalhes` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 12 | `status_pagamento` | `text` | sim | `'pendente'::text` |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| folha_itens_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| folha_itens_folha_colaborador_unique | UNIQUE | `UNIQUE (folha_id, colaborador_id)` |  |  | sim |
| folha_itens_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| folha_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| folha_itens_valores_nao_negativos | CHECK | `CHECK (COALESCE(salario_base, 0::numeric) >= 0::numeric AND COALESCE(total_proventos, 0::numeric) >= 0::numeric AND COALESCE(total_descontos, 0::numeric) >= 0::numeric AND COALESCE(fgts_mes, 0::numeric) >= 0::numeric AND COALESCE(inss_mes, 0::numeric) >= 0::numeric AND COALESCE(irrf_mes, 0::numeric) >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cnab_itens | cnab_itens_folha_item_id_fkey | folha_item_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folha_itens_folha_colaborador_unique | btree | folha_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX folha_itens_folha_colaborador_unique ON public.folha_itens USING btree (folha_id, colaborador_id)` |
| folha_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folha_itens_pkey ON public.folha_itens USING btree (id)` |
| idx_folha_itens_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_folha_itens_colaborador_id ON public.folha_itens USING btree (colaborador_id)` |
| idx_folha_itens_folha_colab_covering | btree | folha_id, colaborador_id, total_liquido, total_proventos, total_descontos | não | sim |  | `CREATE INDEX idx_folha_itens_folha_colab_covering ON public.folha_itens USING btree (folha_id, colaborador_id) INCLUDE (total_liquido, total_proventos, total_descontos)` |
| idx_folha_itens_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_folha_itens_folha_id ON public.folha_itens USING btree (folha_id)` |


## Policies (RLS)

### `folha_itens_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = folha_itens.folha_id) AND pode_gerir_rh(f.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = folha_itens.folha_id) AND pode_gerir_rh(f.empresa_id))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_holerite_folha_item | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_sync_holerite_from_folha_item |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
