# public.contabilidade_threads

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
| 3 | `assunto` | `text` | não |  |  |  |
| 4 | `categoria` | `text` | não | `'outro'::text` |  |  |
| 5 | `status` | `text` | não | `'aberto'::text` |  |  |
| 6 | `prioridade` | `text` | não | `'normal'::text` |  |  |
| 7 | `contato_id` | `uuid` | sim |  |  |  |
| 8 | `aberto_por` | `uuid` | sim |  |  |  |
| 9 | `ultima_atividade_em` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `resolvido_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contabilidade_threads_aberto_por_fkey | FOREIGN KEY | `FOREIGN KEY (aberto_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contabilidade_threads_categoria_check | CHECK | `CHECK (categoria = ANY (ARRAY['folha'::text, 'esocial'::text, 'admissao'::text, 'rescisao'::text, 'tributos'::text, 'ferias'::text, 'outro'::text]))` |  |  | sim |
| contabilidade_threads_contato_id_fkey | FOREIGN KEY | `FOREIGN KEY (contato_id) REFERENCES contabilidade_contatos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contabilidade_threads_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contabilidade_threads_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contabilidade_threads_prioridade_check | CHECK | `CHECK (prioridade = ANY (ARRAY['baixa'::text, 'normal'::text, 'alta'::text, 'urgente'::text]))` |  |  | sim |
| contabilidade_threads_status_check | CHECK | `CHECK (status = ANY (ARRAY['aberto'::text, 'respondido'::text, 'resolvido'::text, 'arquivado'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contabilidade_mensagens | contabilidade_mensagens_thread_id_fkey | thread_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contabilidade_threads_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contabilidade_threads_pkey ON public.contabilidade_threads USING btree (id)` |
| idx_contab_threads_aberto_por | btree | aberto_por | não | sim |  | `CREATE INDEX idx_contab_threads_aberto_por ON public.contabilidade_threads USING btree (aberto_por)` |
| idx_contab_threads_contato_id | btree | contato_id | não | sim |  | `CREATE INDEX idx_contab_threads_contato_id ON public.contabilidade_threads USING btree (contato_id)` |
| idx_contab_threads_empresa_ativ | btree | empresa_id, ultima_atividade_em | não | sim |  | `CREATE INDEX idx_contab_threads_empresa_ativ ON public.contabilidade_threads USING btree (empresa_id, ultima_atividade_em DESC)` |
| idx_contab_threads_status | btree | empresa_id, status | não | sim | `(status = ANY (ARRAY['aberto'::text, 'respondido'::text]))` | `CREATE INDEX idx_contab_threads_status ON public.contabilidade_threads USING btree (empresa_id, status) WHERE (status = ANY (ARRAY['aberto'::text, 'respondido'::text]))` |


## Policies (RLS)

### `contab_threads_tenant_all`

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
| trg_contab_threads_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
