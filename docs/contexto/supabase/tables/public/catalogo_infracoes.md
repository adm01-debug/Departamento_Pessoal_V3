# public.catalogo_infracoes

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `codigo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `gravidade` | `text` | não |  |  |  |
| 6 | `artigo_clt_sugerido` | `text` | sim |  |  |  |
| 7 | `tipo_sugerido` | `text` | não |  |  |  |
| 8 | `dias_suspensao_sugerido` | `integer` | sim |  |  |  |
| 9 | `ativo` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| catalogo_infracoes_empresa_id_codigo_key | UNIQUE | `UNIQUE (empresa_id, codigo)` |  |  | sim |
| catalogo_infracoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| catalogo_infracoes_gravidade_check | CHECK | `CHECK (gravidade = ANY (ARRAY['leve'::text, 'media'::text, 'grave'::text, 'gravissima'::text]))` |  |  | sim |
| catalogo_infracoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| catalogo_infracoes_tipo_sugerido_check | CHECK | `CHECK (tipo_sugerido = ANY (ARRAY['advertencia_verbal'::text, 'advertencia_escrita'::text, 'suspensao'::text, 'justa_causa'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| catalogo_infracoes_empresa_id_codigo_key | btree | empresa_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX catalogo_infracoes_empresa_id_codigo_key ON public.catalogo_infracoes USING btree (empresa_id, codigo)` |
| catalogo_infracoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX catalogo_infracoes_pkey ON public.catalogo_infracoes USING btree (id)` |
| idx_catalogo_infracoes_empresa | btree | empresa_id, ativo | não | sim |  | `CREATE INDEX idx_catalogo_infracoes_empresa ON public.catalogo_infracoes USING btree (empresa_id, ativo)` |


## Policies (RLS)

### `catalogo_infracoes_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `catalogo_infracoes_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `catalogo_infracoes_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `catalogo_infracoes_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_catalogo_infracoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.tg_catalogo_infracoes_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
