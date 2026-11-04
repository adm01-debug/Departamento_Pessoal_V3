# public.recrutamento_agendamentos

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
| 2 | `candidatura_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `data_hora` | `timestamp with time zone` | não |  |  |  |
| 6 | `duracao_minutos` | `integer` | sim | `30` |  |  |
| 7 | `local_link` | `text` | sim |  |  |  |
| 8 | `responsavel_id` | `uuid` | sim |  |  |  |
| 9 | `status` | `text` | sim | `'agendado'::text` |  |  |
| 10 | `feedback_entrevistador` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recrutamento_agendamentos_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recrutamento_agendamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recrutamento_agendamentos_responsavel_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recrutamento_agendamentos_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_recrutamento_agendamentos_candidatura_id ON public.recrutamento_agendamentos USING btree (candidatura_id)` |
| idx_recrutamento_agendamentos_responsavel_id | btree | responsavel_id | não | sim |  | `CREATE INDEX idx_recrutamento_agendamentos_responsavel_id ON public.recrutamento_agendamentos USING btree (responsavel_id)` |
| recrutamento_agendamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recrutamento_agendamentos_pkey ON public.recrutamento_agendamentos USING btree (id)` |


## Policies (RLS)

### `Gestores veem seus agendamentos`

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
