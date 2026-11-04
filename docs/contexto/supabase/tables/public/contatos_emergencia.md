# public.contatos_emergencia

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `parentesco` | `text` | sim |  |  |  |
| 5 | `telefone` | `text` | sim |  |  |  |
| 6 | `celular` | `text` | sim |  |  |  |
| 7 | `telefone_trabalho` | `text` | sim |  |  |  |
| 8 | `email` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `relacionamento_id` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contatos_emergencia_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contatos_emergencia_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contatos_emergencia_relacionamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (relacionamento_id) REFERENCES relacionamentos_contato_emergencia(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contatos_emergencia_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contatos_emergencia_pkey ON public.contatos_emergencia USING btree (id)` |
| idx_contatos_emergencia_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_contatos_emergencia_col ON public.contatos_emergencia USING btree (colaborador_id)` |
| idx_contatos_emergencia_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_contatos_emergencia_colaborador_id ON public.contatos_emergencia USING btree (colaborador_id)` |
| idx_contatos_emergencia_relacionamento_id | btree | relacionamento_id | não | sim |  | `CREATE INDEX idx_contatos_emergencia_relacionamento_id ON public.contatos_emergencia USING btree (relacionamento_id)` |


## Policies (RLS)

### `contatos_emergencia_self_or_rh`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sou_o_colaborador(colaborador_id) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = contatos_emergencia.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id))))))` |
| WITH CHECK | `(sou_o_colaborador(colaborador_id) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = contatos_emergencia.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_contatos_emergencia_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
