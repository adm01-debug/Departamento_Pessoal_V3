# public.comunicados

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
| 2 | `titulo` | `text` | não |  |  |  |
| 3 | `conteudo` | `text` | sim |  |  |  |
| 4 | `tipo` | `text` | sim | `'informativo'::text` |  |  |
| 5 | `prioridade` | `integer` | sim | `0` |  |  |
| 6 | `ativo` | `boolean` | sim | `true` |  |  |
| 7 | `data_publicacao` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `data_expiracao` | `timestamp with time zone` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| comunicados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| comunicados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| comunicados_vigencia_coerente | CHECK | `CHECK (data_expiracao IS NULL OR data_publicacao IS NULL OR data_expiracao >= data_publicacao)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.comunicados_leituras | comunicados_leituras_comunicado_id_fkey | comunicado_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| comunicados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX comunicados_pkey ON public.comunicados USING btree (id)` |
| idx_comunicados_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_comunicados_empresa_id ON public.comunicados USING btree (empresa_id)` |


## Policies (RLS)

### `empresa_comunicados`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
