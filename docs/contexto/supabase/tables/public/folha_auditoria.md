# public.folha_auditoria

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
| usada por views | public.v_audit_events_unified |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `folha_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `tipo_evento` | `text` | não |  |  |  |
| 5 | `severidade` | `text` | não | `'INFO'::text` |  |  |
| 6 | `mensagem` | `text` | não |  |  |  |
| 7 | `detalhes` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `criado_por` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| folha_auditoria_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| folha_auditoria_criado_por_fkey | FOREIGN KEY | `FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| folha_auditoria_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| folha_auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folha_auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folha_auditoria_pkey ON public.folha_auditoria USING btree (id)` |
| idx_folha_auditoria_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_folha_auditoria_colaborador ON public.folha_auditoria USING btree (colaborador_id)` |
| idx_folha_auditoria_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_folha_auditoria_created_at ON public.folha_auditoria USING btree (created_at)` |
| idx_folha_auditoria_criado_por | btree | criado_por | não | sim |  | `CREATE INDEX idx_folha_auditoria_criado_por ON public.folha_auditoria USING btree (criado_por)` |
| idx_folha_auditoria_folha | btree | folha_id | não | sim |  | `CREATE INDEX idx_folha_auditoria_folha ON public.folha_auditoria USING btree (folha_id)` |


## Policies (RLS)

### `Usuários autenticados podem inserir auditoria`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = folha_auditoria.folha_id) AND ((f.empresa_id IS NULL) OR pertence_a_empresa(f.empresa_id)))))` |

### `Usuários autenticados podem visualizar auditoria`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = folha_auditoria.folha_id) AND ((f.empresa_id IS NULL) OR pertence_a_empresa(f.empresa_id)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_folha_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_folha_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_folha_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
