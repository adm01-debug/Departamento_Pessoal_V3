# public.sst_cat_testemunhas

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
| 2 | `cat_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `cpf` | `text` | sim |  |  |  |
| 5 | `telefone` | `text` | sim |  |  |  |
| 6 | `endereco` | `text` | sim |  |  |  |
| 7 | `depoimento` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_cat_testemunhas_cat_id_fkey | FOREIGN KEY | `FOREIGN KEY (cat_id) REFERENCES sst_cat(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_cat_testemunhas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_cat_testemunhas_cat | btree | cat_id | não | sim |  | `CREATE INDEX idx_sst_cat_testemunhas_cat ON public.sst_cat_testemunhas USING btree (cat_id)` |
| sst_cat_testemunhas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_cat_testemunhas_pkey ON public.sst_cat_testemunhas USING btree (id)` |


## Policies (RLS)

### `cat_testemunhas_por_empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (sst_cat c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = sst_cat_testemunhas.cat_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (sst_cat c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = sst_cat_testemunhas.cat_id) AND (ue.user_id = auth.uid()))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
