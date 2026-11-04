# public.escalas_trabalho

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
| 3 | `turno_id` | `uuid` | não |  |  |  |
| 4 | `data` | `date` | não |  |  |  |
| 5 | `status` | `text` | sim | `'agendado'::text` |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `empresa_id` | `uuid` | sim |  |  |  |
| 8 | `created_by` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| escalas_trabalho_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| escalas_trabalho_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| escalas_trabalho_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| escalas_trabalho_turno_id_fkey | FOREIGN KEY | `FOREIGN KEY (turno_id) REFERENCES turnos(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| escalas_trabalho_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX escalas_trabalho_pkey ON public.escalas_trabalho USING btree (id)` |
| idx_escalas_trabalho_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_escalas_trabalho_colaborador_id ON public.escalas_trabalho USING btree (colaborador_id)` |
| idx_escalas_trabalho_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_escalas_trabalho_empresa_id ON public.escalas_trabalho USING btree (empresa_id)` |
| idx_escalas_trabalho_turno_id | btree | turno_id | não | sim |  | `CREATE INDEX idx_escalas_trabalho_turno_id ON public.escalas_trabalho USING btree (turno_id)` |


## Policies (RLS)

### `empresa_escalas_trabalho`

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
| update_escalas_trabalho_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
