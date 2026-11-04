# public.plano_contas

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
| 3 | `codigo` | `text` | não |  |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `tipo` | `text` | não |  |  |  |
| 6 | `natureza` | `text` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| plano_contas_empresa_id_codigo_key | UNIQUE | `UNIQUE (empresa_id, codigo)` |  |  | sim |
| plano_contas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| plano_contas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.lancamentos_contabeis | lancamentos_contabeis_conta_credito_id_fkey | conta_credito_id | NO ACTION |
| public.lancamentos_contabeis | lancamentos_contabeis_conta_debito_id_fkey | conta_debito_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| plano_contas_empresa_id_codigo_key | btree | empresa_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX plano_contas_empresa_id_codigo_key ON public.plano_contas USING btree (empresa_id, codigo)` |
| plano_contas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX plano_contas_pkey ON public.plano_contas USING btree (id)` |


## Policies (RLS)

### `Empresas can view their own plano de contas`

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
| update_plano_contas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
