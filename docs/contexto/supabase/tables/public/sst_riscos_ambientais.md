# public.sst_riscos_ambientais

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
| 3 | `local_id` | `uuid` | sim |  |  |  |
| 4 | `categoria` | `text` | não |  |  |  |
| 5 | `agente` | `text` | não |  |  |  |
| 6 | `intensidade_concentracao` | `text` | sim |  |  |  |
| 7 | `limite_tolerancia` | `text` | sim |  |  |  |
| 8 | `tecnica_utilizada` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_riscos_ambientais_local_id_fkey | FOREIGN KEY | `FOREIGN KEY (local_id) REFERENCES locais_trabalho(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_riscos_ambientais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_riscos_ambientais_local_id | btree | local_id | não | sim |  | `CREATE INDEX idx_sst_riscos_ambientais_local_id ON public.sst_riscos_ambientais USING btree (local_id)` |
| sst_riscos_ambientais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_riscos_ambientais_pkey ON public.sst_riscos_ambientais USING btree (id)` |


## Policies (RLS)

### `Acesso aos riscos da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'rh'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
