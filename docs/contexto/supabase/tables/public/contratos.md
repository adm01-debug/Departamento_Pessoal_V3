# public.contratos

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
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `tipo` | `text` | sim | `'indeterminado'::text` |  |  |
| 5 | `data_inicio` | `date` | não |  |  |  |
| 6 | `data_fim` | `date` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 8 | `observacoes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contratos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contratos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| contratos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contratos_vigencia_coerente | CHECK | `CHECK (data_fim IS NULL OR data_fim >= data_inicio)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contratos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contratos_pkey ON public.contratos USING btree (id)` |
| idx_contratos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_contratos_colaborador_id ON public.contratos USING btree (colaborador_id)` |
| idx_contratos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_contratos_empresa_id ON public.contratos USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_contratos`

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
| update_contratos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
