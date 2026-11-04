# public.holerite_distribuicoes

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
| 2 | `folha_id` | `uuid` | não |  |  |  |
| 3 | `holerite_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_id` | `uuid` | não |  |  |  |
| 5 | `canal` | `text` | não |  |  |  |
| 6 | `status` | `text` | não | `'enfileirado'::text` |  |  |
| 7 | `erro` | `text` | sim |  |  |  |
| 8 | `distribuido_por` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| holerite_distribuicoes_canal_check | CHECK | `CHECK (canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'portal'::text]))` |  |  | sim |
| holerite_distribuicoes_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| holerite_distribuicoes_holerite_id_fkey | FOREIGN KEY | `FOREIGN KEY (holerite_id) REFERENCES holerites(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| holerite_distribuicoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| holerite_distribuicoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['enfileirado'::text, 'enviado'::text, 'falhou'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| holerite_distribuicoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX holerite_distribuicoes_pkey ON public.holerite_distribuicoes USING btree (id)` |
| idx_holerite_dist_folha | btree | folha_id, canal | não | sim |  | `CREATE INDEX idx_holerite_dist_folha ON public.holerite_distribuicoes USING btree (folha_id, canal)` |
| idx_holerite_dist_status | btree | status | não | sim | `(status <> 'enviado'::text)` | `CREATE INDEX idx_holerite_dist_status ON public.holerite_distribuicoes USING btree (status) WHERE (status <> 'enviado'::text)` |
| idx_holerite_distrib_holerite_id | btree | holerite_id | não | sim |  | `CREATE INDEX idx_holerite_distrib_holerite_id ON public.holerite_distribuicoes USING btree (holerite_id)` |


## Policies (RLS)

### `Distribuicoes visiveis por empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (folhas_pagamento fp      JOIN user_empresas ue ON ((ue.empresa_id = fp.empresa_id)))   WHERE ((fp.id = holerite_distribuicoes.folha_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_holerite_dist_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
