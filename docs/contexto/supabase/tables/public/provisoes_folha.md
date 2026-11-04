# public.provisoes_folha

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
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `competencia` | `text` | não |  |  |  |
| 5 | `valor_13_salario` | `numeric(12,2)` | sim | `0` |  |  |
| 6 | `valor_ferias` | `numeric(12,2)` | sim | `0` |  |  |
| 7 | `encargos_provisao` | `numeric(12,2)` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `valor_total` | `numeric(15,2)` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| provisoes_folha_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| provisoes_folha_empresa_colaborador_competencia_key | UNIQUE | `UNIQUE (empresa_id, colaborador_id, competencia)` |  |  | sim |
| provisoes_folha_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| provisoes_folha_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_provisoes_folha_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_provisoes_folha_colaborador_id ON public.provisoes_folha USING btree (colaborador_id)` |
| idx_provisoes_folha_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_provisoes_folha_empresa_id ON public.provisoes_folha USING btree (empresa_id)` |
| provisoes_folha_empresa_colaborador_competencia_key | btree | empresa_id, colaborador_id, competencia | sim | sim |  | `CREATE UNIQUE INDEX provisoes_folha_empresa_colaborador_competencia_key ON public.provisoes_folha USING btree (empresa_id, colaborador_id, competencia)` |
| provisoes_folha_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX provisoes_folha_pkey ON public.provisoes_folha USING btree (id)` |


## Policies (RLS)

### `provisoes_folha_rh_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_set_provisoes_folha_total | BEFORE | INSERT OR UPDATE | ROW | enabled | public.set_provisoes_folha_total |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
