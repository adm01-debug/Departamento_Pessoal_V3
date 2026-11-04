# public.sst_incidentes

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
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `data_hora` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `local` | `text` | não |  |  |  |
| 7 | `gravidade` | `integer` | sim |  |  |  |
| 8 | `descricao` | `text` | não |  |  |  |
| 9 | `medidas_tomadas` | `text` | sim |  |  |  |
| 10 | `testemunhas` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 11 | `status` | `text` | sim | `'investigacao'::text` |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_incidentes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_incidentes_gravidade_check | CHECK | `CHECK (gravidade >= 1 AND gravidade <= 5)` |  |  | sim |
| sst_incidentes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_incidentes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_sst_incidentes_colaborador_id ON public.sst_incidentes USING btree (colaborador_id)` |
| sst_incidentes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_incidentes_pkey ON public.sst_incidentes USING btree (id)` |


## Policies (RLS)

### `Gestores e RH gerenciam incidentes`

| campo | valor |
|---|---|
| comando | ALL |
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
