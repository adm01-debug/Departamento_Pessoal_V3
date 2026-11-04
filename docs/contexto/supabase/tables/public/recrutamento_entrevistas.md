# public.recrutamento_entrevistas

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
| 3 | `entrevistador_id` | `uuid` | sim |  |  |  |
| 4 | `data_hora` | `timestamp with time zone` | não |  |  |  |
| 5 | `local_link` | `text` | sim |  |  |  |
| 6 | `tipo` | `text` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'agendada'::text` |  |  |
| 8 | `feedback` | `text` | sim |  |  |  |
| 9 | `nota` | `integer` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recrutamento_entrevistas_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recrutamento_entrevistas_entrevistador_id_fkey | FOREIGN KEY | `FOREIGN KEY (entrevistador_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| recrutamento_entrevistas_nota_check | CHECK | `CHECK (nota >= 1 AND nota <= 5)` |  |  | sim |
| recrutamento_entrevistas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recrutamento_entrevistas_status_check | CHECK | `CHECK (status = ANY (ARRAY['agendada'::text, 'realizada'::text, 'cancelada'::text, 'reagendada'::text]))` |  |  | sim |
| recrutamento_entrevistas_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['presencial'::text, 'remoto'::text, 'telefone'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recrutamento_entrevistas_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_recrutamento_entrevistas_candidatura_id ON public.recrutamento_entrevistas USING btree (candidatura_id)` |
| idx_recrutamento_entrevistas_entrevistador_id | btree | entrevistador_id | não | sim |  | `CREATE INDEX idx_recrutamento_entrevistas_entrevistador_id ON public.recrutamento_entrevistas USING btree (entrevistador_id)` |
| recrutamento_entrevistas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recrutamento_entrevistas_pkey ON public.recrutamento_entrevistas USING btree (id)` |


## Policies (RLS)

### `Entrevistas acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_timestamp_recrutamento_entrevistas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_fill_rec_entrevistas_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_recrutamento_child_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
