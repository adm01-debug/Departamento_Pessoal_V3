# public.provisao_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `competencia` | `date` | não |  |  |  |
| 4 | `status` | `text` | não |  |  |  |
| 5 | `tipo_calculo` | `text` | sim |  |  |  |
| 6 | `total_colaboradores` | `integer` | sim | `0` |  |  |
| 7 | `valor_total_provisionado` | `numeric(15,2)` | sim | `0` |  |  |
| 8 | `erro_mensagem` | `text` | sim |  |  |  |
| 9 | `metadados` | `jsonb` | sim |  |  |  |
| 10 | `usuario_id` | `uuid` | sim |  |  |  |
| 11 | `duracao_ms` | `integer` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| provisao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| provisao_logs_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.provisoes_mensais | provisoes_mensais_log_id_fkey | log_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_provisao_logs_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_provisao_logs_usuario_id ON public.provisao_logs USING btree (usuario_id)` |
| provisao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX provisao_logs_pkey ON public.provisao_logs USING btree (id)` |


## Policies (RLS)

### `Gestores podem ver logs de provisão`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |

### `Provisao logs scoped by empresa`

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
| trg_provisao_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_provisao_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
