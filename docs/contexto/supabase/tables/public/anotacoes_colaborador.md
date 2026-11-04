# public.anotacoes_colaborador

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
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `conteudo` | `text` | sim |  |  |  |
| 5 | `data` | `date` | sim | `CURRENT_DATE` |  |  |
| 6 | `tipo` | `text` | sim | `'geral'::text` |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| anotacoes_colaborador_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| anotacoes_colaborador_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| anotacoes_colaborador_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX anotacoes_colaborador_pkey ON public.anotacoes_colaborador USING btree (id)` |
| idx_anotacoes_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_anotacoes_col ON public.anotacoes_colaborador USING btree (colaborador_id)` |
| idx_anotacoes_colaborador_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_anotacoes_colaborador_colaborador_id ON public.anotacoes_colaborador USING btree (colaborador_id)` |


## Policies (RLS)

### `anotacoes_colaborador_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = anotacoes_colaborador.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = anotacoes_colaborador.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_anotacoes_colaborador_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
