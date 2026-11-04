# public.contabilidade_contatos

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `email` | `text` | não |  |  |  |
| 5 | `telefone` | `text` | sim |  |  |  |
| 6 | `escritorio` | `text` | sim |  |  |  |
| 7 | `ativo` | `boolean` | não | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contabilidade_contatos_empresa_id_email_key | UNIQUE | `UNIQUE (empresa_id, email)` |  |  | sim |
| contabilidade_contatos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contabilidade_contatos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contabilidade_threads | contabilidade_threads_contato_id_fkey | contato_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contabilidade_contatos_empresa_id_email_key | btree | empresa_id, email | sim | sim |  | `CREATE UNIQUE INDEX contabilidade_contatos_empresa_id_email_key ON public.contabilidade_contatos USING btree (empresa_id, email)` |
| contabilidade_contatos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contabilidade_contatos_pkey ON public.contabilidade_contatos USING btree (id)` |
| idx_contab_contatos_empresa | btree | empresa_id | não | sim | `(ativo = true)` | `CREATE INDEX idx_contab_contatos_empresa ON public.contabilidade_contatos USING btree (empresa_id) WHERE (ativo = true)` |


## Policies (RLS)

### `contabilidade_contatos_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK | `user_belongs_to_empresa(auth.uid(), empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_contab_contatos_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
