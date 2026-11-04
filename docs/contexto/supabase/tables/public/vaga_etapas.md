# public.vaga_etapas

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
| 3 | `vaga_id` | `uuid` | não |  |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `ordem` | `integer` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| vaga_etapas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vaga_etapas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| vaga_etapas_vaga_id_fkey | FOREIGN KEY | `FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.vaga_entrevistas | vaga_entrevistas_etapa_id_fkey | etapa_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_vaga_etapas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_vaga_etapas_empresa_id ON public.vaga_etapas USING btree (empresa_id)` |
| idx_vaga_etapas_vaga_id | btree | vaga_id | não | sim |  | `CREATE INDEX idx_vaga_etapas_vaga_id ON public.vaga_etapas USING btree (vaga_id)` |
| vaga_etapas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX vaga_etapas_pkey ON public.vaga_etapas USING btree (id)` |


## Policies (RLS)

### `empresa_isolation_vaga_etapas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = get_auth_empresa_id())` |
| WITH CHECK | `(empresa_id = get_auth_empresa_id())` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_vaga_etapas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
