# public.afd_geracoes

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
| 5 | `total_colaboradores` | `integer` | sim |  |  |  |
| 6 | `total_marcacoes` | `integer` | sim |  |  |  |
| 7 | `colaboradores_sem_pis` | `integer` | sim |  |  |  |
| 8 | `tamanho_bytes` | `integer` | sim |  |  |  |
| 9 | `hash_sha256` | `text` | sim |  |  |  |
| 10 | `status` | `text` | sim | `'gerado'::text` |  |  |
| 11 | `erro` | `text` | sim |  |  |  |
| 12 | `gerado_por` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| afd_geracoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| afd_geracoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| afd_geracoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX afd_geracoes_pkey ON public.afd_geracoes USING btree (id)` |
| uq_afd_geracoes_hash | btree | empresa_id, periodo_inicio, periodo_fim, hash_sha256 | sim | sim |  | `CREATE UNIQUE INDEX uq_afd_geracoes_hash ON public.afd_geracoes USING btree (empresa_id, periodo_inicio, periodo_fim, hash_sha256)` |


## Policies (RLS)

### `afd_geracoes_insert_membros`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = afd_geracoes.empresa_id)))))` |

### `afd_geracoes_select_membros`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = afd_geracoes.empresa_id)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | INSERT, SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
