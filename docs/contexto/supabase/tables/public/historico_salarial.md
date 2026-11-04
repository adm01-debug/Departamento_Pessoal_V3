# public.historico_salarial

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `salario_anterior` | `numeric(12,2)` | sim |  |  |  |
| 5 | `salario_novo` | `numeric(12,2)` | não |  |  |  |
| 6 | `cargo_anterior` | `text` | sim |  |  |  |
| 7 | `cargo_novo` | `text` | sim |  |  |  |
| 8 | `departamento_anterior` | `text` | sim |  |  |  |
| 9 | `departamento_novo` | `text` | sim |  |  |  |
| 10 | `motivo` | `text` | não |  |  |  |
| 11 | `descricao` | `text` | sim |  |  |  |
| 12 | `data_vigencia` | `date` | não |  |  |  |
| 13 | `vinculo_id` | `text` | sim |  |  |  |
| 14 | `ativo` | `boolean` | sim | `true` |  |  |
| 15 | `created_by` | `uuid` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_salarial_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_salarial_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| historico_salarial_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_salarial_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_salarial_pkey ON public.historico_salarial USING btree (id)` |
| idx_historico_salarial_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_historico_salarial_col ON public.historico_salarial USING btree (colaborador_id)` |
| idx_historico_salarial_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_historico_salarial_colaborador_id ON public.historico_salarial USING btree (colaborador_id)` |
| idx_historico_salarial_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_historico_salarial_empresa_created ON public.historico_salarial USING btree (empresa_id, created_at DESC)` |
| idx_historico_salarial_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_historico_salarial_empresa_id ON public.historico_salarial USING btree (empresa_id)` |


## Policies (RLS)

### `historico_salarial_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_historico_salarial_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
