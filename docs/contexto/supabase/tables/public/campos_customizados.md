# public.campos_customizados

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | não | `'texto'::text` |  |  |
| 5 | `secao` | `text` | sim | `'outras_informacoes'::text` |  |  |
| 6 | `opcoes` | `jsonb` | sim |  |  |  |
| 7 | `obrigatorio` | `boolean` | sim | `false` |  |  |
| 8 | `ativo` | `boolean` | sim | `true` |  |  |
| 9 | `ordem` | `integer` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| campos_customizados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| campos_customizados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.valores_campos_customizados | valores_campos_customizados_campo_customizado_id_fkey | campo_customizado_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| campos_customizados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX campos_customizados_pkey ON public.campos_customizados USING btree (id)` |
| idx_campos_customizados_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_campos_customizados_empresa_id ON public.campos_customizados USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_campos_customizados`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_campos_customizados_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
