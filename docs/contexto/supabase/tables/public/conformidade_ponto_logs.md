# public.conformidade_ponto_logs

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `batida_id` | `uuid` | sim |  |  |  |
| 4 | `tipo_alerta` | `text` | não |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `severidade` | `text` | sim | `'media'::text` |  |  |
| 7 | `resolvido` | `boolean` | sim | `false` |  |  |
| 8 | `timestamp` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| conformidade_ponto_logs_batida_id_fkey | FOREIGN KEY | `FOREIGN KEY (batida_id) REFERENCES batidas_ponto(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| conformidade_ponto_logs_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| conformidade_ponto_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| conformidade_ponto_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX conformidade_ponto_logs_pkey ON public.conformidade_ponto_logs USING btree (id)` |
| idx_conformidade_ponto_logs_batida_id | btree | batida_id | não | sim |  | `CREATE INDEX idx_conformidade_ponto_logs_batida_id ON public.conformidade_ponto_logs USING btree (batida_id)` |
| idx_conformidade_ponto_logs_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_conformidade_ponto_logs_empresa_id ON public.conformidade_ponto_logs USING btree (empresa_id)` |


## Policies (RLS)

### `View logs by company`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_conformidade_ponto_logs_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_conformidade_ponto_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_conformidade_ponto_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
