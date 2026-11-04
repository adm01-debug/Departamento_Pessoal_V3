# public.aej_geracoes

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
| 3 | `periodo_inicio` | `date` | não |  |  |  |
| 4 | `periodo_fim` | `date` | não |  |  |  |
| 5 | `total_colaboradores` | `integer` | não | `0` |  |  |
| 6 | `total_marcacoes` | `integer` | não | `0` |  |  |
| 7 | `colaboradores_sem_pis` | `integer` | não | `0` |  |  |
| 8 | `tamanho_bytes` | `integer` | não | `0` |  |  |
| 9 | `hash_sha256` | `text` | não |  |  |  |
| 10 | `status` | `text` | não | `'gerado'::text` |  |  |
| 11 | `erro` | `text` | sim |  |  |  |
| 12 | `gerado_por` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| aej_geracoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| aej_geracoes_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (gerado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| aej_geracoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| aej_geracoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['gerando'::text, 'gerado'::text, 'erro'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| aej_geracoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX aej_geracoes_pkey ON public.aej_geracoes USING btree (id)` |
| idx_aej_geracoes_empresa_periodo | btree | empresa_id, periodo_inicio, periodo_fim | não | sim |  | `CREATE INDEX idx_aej_geracoes_empresa_periodo ON public.aej_geracoes USING btree (empresa_id, periodo_inicio DESC, periodo_fim DESC)` |
| idx_aej_geracoes_gerado_por | btree | gerado_por | não | sim |  | `CREATE INDEX idx_aej_geracoes_gerado_por ON public.aej_geracoes USING btree (gerado_por)` |
| uq_aej_geracoes_hash | btree | empresa_id, periodo_inicio, periodo_fim, hash_sha256 | sim | sim |  | `CREATE UNIQUE INDEX uq_aej_geracoes_hash ON public.aej_geracoes USING btree (empresa_id, periodo_inicio, periodo_fim, hash_sha256)` |


## Policies (RLS)

### `aej_geracoes_insert_membros`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = aej_geracoes.empresa_id)))))` |

### `aej_geracoes_select_membros`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = aej_geracoes.empresa_id)))))` |
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
