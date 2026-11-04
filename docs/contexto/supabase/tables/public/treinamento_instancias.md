# public.treinamento_instancias

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
| 2 | `curso_id` | `uuid` | sim |  |  |  |
| 3 | `instrutor_id` | `uuid` | sim |  |  |  |
| 4 | `data_inicio` | `timestamp with time zone` | não |  |  |  |
| 5 | `data_fim` | `timestamp with time zone` | sim |  |  |  |
| 6 | `local_link` | `text` | sim |  |  |  |
| 7 | `capacidade_maxima` | `integer` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'planejado'::text` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| treinamento_instancias_curso_id_fkey | FOREIGN KEY | `FOREIGN KEY (curso_id) REFERENCES catalogo_cursos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_instancias_instrutor_id_fkey | FOREIGN KEY | `FOREIGN KEY (instrutor_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| treinamento_instancias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| treinamento_instancias_status_check | CHECK | `CHECK (status = ANY (ARRAY['planejado'::text, 'em_curso'::text, 'concluido'::text, 'cancelado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_treinamento_instancias_curso_id | btree | curso_id | não | sim |  | `CREATE INDEX idx_treinamento_instancias_curso_id ON public.treinamento_instancias USING btree (curso_id)` |
| idx_treinamento_instancias_instrutor_id | btree | instrutor_id | não | sim |  | `CREATE INDEX idx_treinamento_instancias_instrutor_id ON public.treinamento_instancias USING btree (instrutor_id)` |
| treinamento_instancias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_instancias_pkey ON public.treinamento_instancias USING btree (id)` |


## Policies (RLS)

### `Treinamento instancias authenticated`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_timestamp_instancias | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_fill_treinamento_instancias_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_treinamento_instancias_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
