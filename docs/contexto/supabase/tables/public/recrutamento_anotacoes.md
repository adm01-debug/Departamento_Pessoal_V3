# public.recrutamento_anotacoes

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
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `anotacao` | `text` | não |  |  |  |
| 5 | `privada` | `boolean` | sim | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 7 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recrutamento_anotacoes_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recrutamento_anotacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recrutamento_anotacoes_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recrutamento_anotacoes_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_recrutamento_anotacoes_candidatura_id ON public.recrutamento_anotacoes USING btree (candidatura_id)` |
| idx_recrutamento_anotacoes_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_recrutamento_anotacoes_usuario_id ON public.recrutamento_anotacoes USING btree (usuario_id)` |
| recrutamento_anotacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recrutamento_anotacoes_pkey ON public.recrutamento_anotacoes USING btree (id)` |


## Policies (RLS)

### `Anotações acessíveis por empresa`

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
| trg_fill_rec_anotacoes_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_recrutamento_child_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
