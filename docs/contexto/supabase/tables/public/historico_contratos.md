# public.historico_contratos

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
| 4 | `data_inicio` | `date` | não |  |  |  |
| 5 | `data_fim` | `date` | sim |  |  |  |
| 6 | `cargo` | `text` | sim |  |  |  |
| 7 | `departamento` | `text` | sim |  |  |  |
| 8 | `tipo_contrato` | `text` | sim |  |  |  |
| 9 | `salario` | `numeric(12,2)` | sim |  |  |  |
| 10 | `carga_horaria_semanal` | `numeric(5,2)` | sim |  |  |  |
| 11 | `motivo_alteracao` | `text` | sim |  |  |  |
| 12 | `observacoes` | `text` | sim |  |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_contratos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_contratos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_contratos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_contratos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_contratos_pkey ON public.historico_contratos USING btree (id)` |
| idx_historico_contratos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_historico_contratos_colaborador_id ON public.historico_contratos USING btree (colaborador_id)` |
| idx_historico_contratos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_historico_contratos_empresa_id ON public.historico_contratos USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_historico_contratos`

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
| update_historico_contratos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
