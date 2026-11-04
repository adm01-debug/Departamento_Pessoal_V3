# public.sst_regimento_assinaturas

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
| 2 | `documento_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `empresa_id` | `uuid` | não |  |  |  |
| 5 | `hash_documento` | `text` | não |  |  |  |
| 6 | `hash_assinatura` | `text` | não |  |  |  |
| 7 | `ip_origem` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `assinado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_regimento_assinaturas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_regimento_assinaturas_documento_id_colaborador_id_key | UNIQUE | `UNIQUE (documento_id, colaborador_id)` |  |  | sim |
| sst_regimento_assinaturas_documento_id_fkey | FOREIGN KEY | `FOREIGN KEY (documento_id) REFERENCES sst_regimento_documentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_regimento_assinaturas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_regimento_assinaturas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_regimento_ass_colab | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_regimento_ass_colab ON public.sst_regimento_assinaturas USING btree (colaborador_id)` |
| idx_regimento_ass_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_regimento_ass_empresa ON public.sst_regimento_assinaturas USING btree (empresa_id)` |
| sst_regimento_assinaturas_documento_id_colaborador_id_key | btree | documento_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX sst_regimento_assinaturas_documento_id_colaborador_id_key ON public.sst_regimento_assinaturas USING btree (documento_id, colaborador_id)` |
| sst_regimento_assinaturas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_regimento_assinaturas_pkey ON public.sst_regimento_assinaturas USING btree (id)` |


## Policies (RLS)

### `Insercao por RH/Admin ou proprio`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |

### `Leitura por empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_regimento_ass_no_delete | BEFORE | DELETE | ROW | enabled | public.sst_regimento_ass_imutavel |
| trg_regimento_ass_no_update | BEFORE | UPDATE | ROW | enabled | public.sst_regimento_ass_imutavel |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
