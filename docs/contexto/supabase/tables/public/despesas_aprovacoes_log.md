# public.despesas_aprovacoes_log

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
| 2 | `despesa_id` | `uuid` | não |  |  |  |
| 3 | `usuario_id` | `uuid` | não |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `status_anterior` | `text` | sim |  |  |  |
| 6 | `status_novo` | `text` | não |  |  |  |
| 7 | `motivo` | `text` | sim |  |  |  |
| 8 | `empresa_id` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| despesas_aprovacoes_log_acao_check | CHECK | `CHECK (acao = ANY (ARRAY['submetido'::text, 'aprovado'::text, 'rejeitado'::text, 'integrado_folha'::text, 'pago'::text, 'cancelado'::text, 'editado'::text]))` |  |  | sim |
| despesas_aprovacoes_log_despesa_id_fkey | FOREIGN KEY | `FOREIGN KEY (despesa_id) REFERENCES despesas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| despesas_aprovacoes_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| despesas_aprovacoes_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX despesas_aprovacoes_log_pkey ON public.despesas_aprovacoes_log USING btree (id)` |
| idx_despesas_log_despesa | btree | despesa_id, created_at | não | sim |  | `CREATE INDEX idx_despesas_log_despesa ON public.despesas_aprovacoes_log USING btree (despesa_id, created_at DESC)` |


## Policies (RLS)

### `empresa_despesas_log_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (usuario_id = auth.uid()))` |

### `empresa_despesas_log_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
