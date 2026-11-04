# public.recrutamento_testes

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
| 3 | `nome_teste` | `text` | não |  |  |  |
| 4 | `url_teste` | `text` | sim |  |  |  |
| 5 | `data_envio` | `timestamp with time zone` | sim | `timezone('utc'::text, now())` |  |  |
| 6 | `data_entrega` | `timestamp with time zone` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'enviado'::text` |  |  |
| 8 | `nota` | `numeric(4,2)` | sim |  |  |  |
| 9 | `comentarios` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recrutamento_testes_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recrutamento_testes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recrutamento_testes_status_check | CHECK | `CHECK (status = ANY (ARRAY['enviado'::text, 'em_progresso'::text, 'entregue'::text, 'avaliado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recrutamento_testes_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_recrutamento_testes_candidatura_id ON public.recrutamento_testes USING btree (candidatura_id)` |
| recrutamento_testes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recrutamento_testes_pkey ON public.recrutamento_testes USING btree (id)` |


## Policies (RLS)

### `Testes acessíveis por empresa`

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
| set_timestamp_recrutamento_testes | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_fill_rec_testes_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_recrutamento_child_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
