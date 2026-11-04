# public.historico_cargo

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
| 3 | `cargo_anterior` | `text` | sim |  |  |  |
| 4 | `cargo_novo` | `text` | não |  |  |  |
| 5 | `salario_anterior` | `numeric(12,2)` | sim |  |  |  |
| 6 | `salario_novo` | `numeric(12,2)` | não |  |  |  |
| 7 | `motivo` | `text` | sim |  |  |  |
| 8 | `data_alteracao` | `date` | não |  |  |  |
| 9 | `observacao` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_cargo_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| historico_cargo_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| historico_cargo_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| historico_cargo_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_cargo_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_cargo_pkey ON public.historico_cargo USING btree (id)` |
| idx_historico_cargo_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_historico_cargo_colaborador_id ON public.historico_cargo USING btree (colaborador_id)` |
| idx_historico_cargo_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_historico_cargo_created_by ON public.historico_cargo USING btree (created_by)` |
| idx_historico_cargo_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_historico_cargo_empresa ON public.historico_cargo USING btree (empresa_id) WHERE (empresa_id IS NOT NULL)` |


## Policies (RLS)

### `tenant_historico_cargo`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_empresa_colaborador | BEFORE | INSERT OR UPDATE | ROW | enabled | public.dp_sync_empresa_from_colaborador |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
