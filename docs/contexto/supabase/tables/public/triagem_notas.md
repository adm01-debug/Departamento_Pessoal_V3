# public.triagem_notas

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
| 4 | `nota` | `integer` | sim |  |  |  |
| 5 | `comentario` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| triagem_notas_candidatura_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| triagem_notas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| triagem_notas_nota_faixa | CHECK | `CHECK (nota IS NULL OR nota >= 0 AND nota <= 10)` |  |  | sim |
| triagem_notas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_triagem_notas_candidatura_id | btree | candidatura_id | não | sim |  | `CREATE INDEX idx_triagem_notas_candidatura_id ON public.triagem_notas USING btree (candidatura_id)` |
| idx_triagem_notas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_triagem_notas_empresa_id ON public.triagem_notas USING btree (empresa_id)` |
| triagem_notas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX triagem_notas_pkey ON public.triagem_notas USING btree (id)` |


## Policies (RLS)

### `empresa_isolation_triagem_notas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = get_auth_empresa_id())` |
| WITH CHECK | `(empresa_id = get_auth_empresa_id())` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
