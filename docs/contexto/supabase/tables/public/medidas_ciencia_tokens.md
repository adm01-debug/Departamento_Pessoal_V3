# public.medidas_ciencia_tokens

> Internal token state. Public acknowledgement is available only through hash-validating RPCs.

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
| 2 | `medida_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_id` | `uuid` | não |  |  |  |
| 5 | `token` | `text` | não |  |  |  |
| 6 | `expires_at` | `timestamp with time zone` | não | `(now() + '7 days'::interval)` |  |  |
| 7 | `used_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `ip_address` | `text` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `geolocation` | `jsonb` | sim |  |  |  |
| 11 | `acao` | `text` | sim |  |  |  |
| 12 | `motivo_recusa` | `text` | sim |  |  |  |
| 13 | `assinatura_hash` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_ciencia_tokens_acao_check | CHECK | `CHECK (acao = ANY (ARRAY['ciencia'::text, 'recusa'::text]))` |  |  | sim |
| medidas_ciencia_tokens_medida_id_fkey | FOREIGN KEY | `FOREIGN KEY (medida_id) REFERENCES medidas_disciplinares(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_ciencia_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| medidas_ciencia_tokens_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_medidas_ciencia_tokens_empresa | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_medidas_ciencia_tokens_empresa ON public.medidas_ciencia_tokens USING btree (empresa_id, created_at DESC)` |
| idx_medidas_ciencia_tokens_medida | btree | medida_id | não | sim |  | `CREATE INDEX idx_medidas_ciencia_tokens_medida ON public.medidas_ciencia_tokens USING btree (medida_id)` |
| idx_medidas_ciencia_tokens_token | btree | token | não | sim | `(used_at IS NULL)` | `CREATE INDEX idx_medidas_ciencia_tokens_token ON public.medidas_ciencia_tokens USING btree (token) WHERE (used_at IS NULL)` |
| medidas_ciencia_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_ciencia_tokens_pkey ON public.medidas_ciencia_tokens USING btree (id)` |
| medidas_ciencia_tokens_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX medidas_ciencia_tokens_token_key ON public.medidas_ciencia_tokens USING btree (token)` |


## Policies (RLS)

### `RH gera tokens da empresa`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid()))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |

### `RH visualiza tokens da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid()))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
