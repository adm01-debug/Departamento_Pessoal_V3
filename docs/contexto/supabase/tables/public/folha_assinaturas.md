# public.folha_assinaturas

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
| 2 | `folha_id` | `uuid` | sim |  |  |  |
| 3 | `assinante_id` | `uuid` | sim |  |  |  |
| 4 | `data_assinatura` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `cargo_assinante` | `text` | sim |  |  |  |
| 6 | `hash_documento` | `text` | sim |  |  |  |
| 7 | `ip_assinatura` | `text` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'valido'::text` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| folha_assinaturas_assinante_id_fkey | FOREIGN KEY | `FOREIGN KEY (assinante_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| folha_assinaturas_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| folha_assinaturas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folha_assinaturas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folha_assinaturas_pkey ON public.folha_assinaturas USING btree (id)` |
| idx_folha_assinaturas_assinante_id | btree | assinante_id | não | sim |  | `CREATE INDEX idx_folha_assinaturas_assinante_id ON public.folha_assinaturas USING btree (assinante_id)` |
| idx_folha_assinaturas_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_folha_assinaturas_folha_id ON public.folha_assinaturas USING btree (folha_id)` |


## Policies (RLS)

### `Users can view their own signatures`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((assinante_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_folha_assinaturas_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_folha_assinaturas_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
