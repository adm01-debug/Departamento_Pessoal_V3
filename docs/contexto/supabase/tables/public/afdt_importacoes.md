# public.afdt_importacoes

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
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `nome_arquivo` | `text` | não |  |  |  |
| 5 | `tamanho_bytes` | `integer` | sim |  |  |  |
| 6 | `hash_sha256` | `text` | sim |  |  |  |
| 7 | `status` | `text` | não | `'processando'::text` |  |  |
| 8 | `total_linhas` | `integer` | sim | `0` |  |  |
| 9 | `total_registros` | `integer` | sim | `0` |  |  |
| 10 | `total_erros` | `integer` | sim | `0` |  |  |
| 11 | `cnpj_empregador` | `text` | sim |  |  |  |
| 12 | `data_inicial` | `date` | sim |  |  |  |
| 13 | `data_final` | `date` | sim |  |  |  |
| 14 | `mensagem_erro` | `text` | sim |  |  |  |
| 15 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 16 | `importado_por` | `uuid` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| afdt_importacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| afdt_importacoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['processando'::text, 'concluido'::text, 'erro'::text, 'parcial'::text]))` |  |  | sim |
| afdt_importacoes_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['AFDT'::text, 'ACJEF'::text, 'AEJ'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.afdt_divergencias | afdt_divergencias_importacao_id_fkey | importacao_id | CASCADE |
| public.afdt_registros_raw | afdt_registros_raw_importacao_id_fkey | importacao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| afdt_importacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX afdt_importacoes_pkey ON public.afdt_importacoes USING btree (id)` |
| idx_afdt_imp_empresa | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_afdt_imp_empresa ON public.afdt_importacoes USING btree (empresa_id, created_at DESC)` |


## Policies (RLS)

### `afdt_imp_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |
| WITH CHECK | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_afdt_imp_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
