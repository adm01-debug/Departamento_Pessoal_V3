# public.vaga_entrevistas

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
| 3 | `candidatura_id` | `uuid` | não |  |  |  |
| 4 | `etapa_id` | `uuid` | não |  |  |  |
| 5 | `data_hora` | `timestamp with time zone` | não |  |  |  |
| 6 | `feedback` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| vaga_entrevistas_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vaga_entrevistas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vaga_entrevistas_etapa_id_fkey | FOREIGN KEY | `FOREIGN KEY (etapa_id) REFERENCES vaga_etapas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vaga_entrevistas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_vaga_entrevistas_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_vaga_entrevistas_candidatura_id ON public.vaga_entrevistas USING btree (candidatura_id)` |
| idx_vaga_entrevistas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_vaga_entrevistas_empresa_id ON public.vaga_entrevistas USING btree (empresa_id)` |
| idx_vaga_entrevistas_etapa_id | btree | etapa_id | não | sim |  | `CREATE INDEX idx_vaga_entrevistas_etapa_id ON public.vaga_entrevistas USING btree (etapa_id)` |
| vaga_entrevistas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX vaga_entrevistas_pkey ON public.vaga_entrevistas USING btree (id)` |


## Policies (RLS)

### `empresa_isolation_vaga_entrevistas`

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
| tr_updated_at_vaga_entrevistas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
