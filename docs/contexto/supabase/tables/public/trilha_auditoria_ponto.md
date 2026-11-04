# public.trilha_auditoria_ponto

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
| 2 | `ponto_id` | `uuid` | sim |  |  |  |
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 6 | `dados_novos` | `jsonb` | sim |  |  |  |
| 7 | `justificativa` | `text` | sim |  |  |  |
| 8 | `ip_address` | `text` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| trilha_auditoria_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| trilha_auditoria_ponto_ponto_id_fkey | FOREIGN KEY | `FOREIGN KEY (ponto_id) REFERENCES batidas_ponto(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| trilha_auditoria_ponto_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_trilha_auditoria_ponto_ponto_id | btree | ponto_id | não | sim |  | `CREATE INDEX idx_trilha_auditoria_ponto_ponto_id ON public.trilha_auditoria_ponto USING btree (ponto_id)` |
| idx_trilha_auditoria_ponto_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_trilha_auditoria_ponto_usuario_id ON public.trilha_auditoria_ponto USING btree (usuario_id)` |
| trilha_auditoria_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX trilha_auditoria_ponto_pkey ON public.trilha_auditoria_ponto USING btree (id)` |


## Policies (RLS)

### `Acesso à trilha de auditoria`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(usuario_id = auth.uid())` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |
| trg_trilha_auditoria_ponto_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_trilha_auditoria_ponto_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_trilha_auditoria_ponto_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
