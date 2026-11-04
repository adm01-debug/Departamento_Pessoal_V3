# public.formacoes_academicas

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
| 3 | `tipo_escolaridade` | `text` | sim |  |  |  |
| 4 | `curso` | `text` | sim |  |  |  |
| 5 | `instituicao` | `text` | sim |  |  |  |
| 6 | `ano_conclusao` | `integer` | sim |  |  |  |
| 7 | `situacao` | `text` | sim | `'concluido'::text` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| formacoes_academicas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| formacoes_academicas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| formacoes_academicas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX formacoes_academicas_pkey ON public.formacoes_academicas USING btree (id)` |
| idx_formacoes_academicas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_formacoes_academicas_colaborador_id ON public.formacoes_academicas USING btree (colaborador_id)` |
| idx_formacoes_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_formacoes_col ON public.formacoes_academicas USING btree (colaborador_id)` |


## Policies (RLS)

### `formacoes_academicas_self_or_rh`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sou_o_colaborador(colaborador_id) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = formacoes_academicas.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id))))))` |
| WITH CHECK | `(sou_o_colaborador(colaborador_id) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = formacoes_academicas.colaborador_id) AND (pode_gerir_rh(c.empresa_id) OR pode_gerir_pessoas(c.empresa_id))))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
