# public.lancamentos_contabeis

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
| 3 | `folha_id` | `uuid` | sim |  |  |  |
| 4 | `data_lancamento` | `date` | não |  |  |  |
| 5 | `descricao` | `text` | não |  |  |  |
| 6 | `valor` | `numeric(18,2)` | não |  |  |  |
| 7 | `conta_debito_id` | `uuid` | sim |  |  |  |
| 8 | `conta_credito_id` | `uuid` | sim |  |  |  |
| 9 | `origem` | `text` | não | `'folha'::text` |  |  |
| 10 | `status` | `text` | não | `'pendente'::text` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lancamentos_contabeis_conta_credito_id_fkey | FOREIGN KEY | `FOREIGN KEY (conta_credito_id) REFERENCES plano_contas(id)` | NO ACTION | NO ACTION | sim |
| lancamentos_contabeis_conta_debito_id_fkey | FOREIGN KEY | `FOREIGN KEY (conta_debito_id) REFERENCES plano_contas(id)` | NO ACTION | NO ACTION | sim |
| lancamentos_contabeis_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| lancamentos_contabeis_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| lancamentos_contabeis_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lancamentos_contabeis_conta_credito_id | btree | conta_credito_id | não | sim |  | `CREATE INDEX idx_lancamentos_contabeis_conta_credito_id ON public.lancamentos_contabeis USING btree (conta_credito_id)` |
| idx_lancamentos_contabeis_conta_debito_id | btree | conta_debito_id | não | sim |  | `CREATE INDEX idx_lancamentos_contabeis_conta_debito_id ON public.lancamentos_contabeis USING btree (conta_debito_id)` |
| idx_lancamentos_contabeis_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_lancamentos_contabeis_empresa_id ON public.lancamentos_contabeis USING btree (empresa_id)` |
| idx_lancamentos_contabeis_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_lancamentos_contabeis_folha_id ON public.lancamentos_contabeis USING btree (folha_id)` |
| lancamentos_contabeis_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lancamentos_contabeis_pkey ON public.lancamentos_contabeis USING btree (id)` |


## Policies (RLS)

### `Empresas can view their own lancamentos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_lancamentos_contabeis_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
