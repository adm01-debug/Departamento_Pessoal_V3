# public.vales_alimentacao

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
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `valor_mensal` | `numeric` | sim | `0` |  |  |
| 5 | `valor_por_dia` | `numeric` | sim |  |  |  |
| 6 | `dias_uteis` | `integer` | sim | `22` |  |  |
| 7 | `tipo` | `text` | sim | `'alimentacao'::text` |  |  |
| 8 | `ativo` | `boolean` | sim | `true` |  |  |
| 9 | `data_inicio` | `text` | sim |  |  |  |
| 10 | `data_fim` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| vales_alimentacao_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vales_alimentacao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| vales_alimentacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.recargas_vale | recargas_vale_vale_id_fkey | vale_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_vales_alimentacao_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_vales_alimentacao_colaborador_id ON public.vales_alimentacao USING btree (colaborador_id)` |
| idx_vales_alimentacao_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_vales_alimentacao_empresa_id ON public.vales_alimentacao USING btree (empresa_id)` |
| vales_alimentacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX vales_alimentacao_pkey ON public.vales_alimentacao USING btree (id)` |


## Policies (RLS)

### `tenant_vales_alimentacao`

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
