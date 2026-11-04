# public.contrato_assinatura_tokens

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
| usada por views | public.v_contratos_assinatura_kpi, public.v_contratos_tokens_pendentes |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contrato_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `token_hash` | `text` | não |  |  |  |
| 5 | `cpf_esperado` | `text` | sim |  |  |  |
| 6 | `email_destinatario` | `text` | sim |  |  |  |
| 7 | `expira_em` | `timestamp with time zone` | não |  |  |  |
| 8 | `usado_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `assinado_ip` | `inet` | sim |  |  |  |
| 10 | `assinado_ua` | `text` | sim |  |  |  |
| 11 | `assinatura_hash` | `text` | sim |  |  |  |
| 12 | `tentativas` | `integer` | não | `0` |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `reminders_enviados` | `integer` | não | `0` |  |  |
| 16 | `ultimo_reminder_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `revogado_em` | `timestamp with time zone` | sim |  |  |  |
| 18 | `revogado_por` | `uuid` | sim |  |  |  |
| 19 | `revogacao_motivo` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contrato_assinatura_tokens_contrato_id_fkey | FOREIGN KEY | `FOREIGN KEY (contrato_id) REFERENCES contratos_gerados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contrato_assinatura_tokens_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contrato_assinatura_tokens_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contrato_assinatura_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contrato_assinatura_tokens_revogado_por_fkey | FOREIGN KEY | `FOREIGN KEY (revogado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contrato_assinatura_tokens_token_hash_key | UNIQUE | `UNIQUE (token_hash)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contrato_token_eventos | contrato_token_eventos_token_id_fkey | token_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contrato_assinatura_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contrato_assinatura_tokens_pkey ON public.contrato_assinatura_tokens USING btree (id)` |
| contrato_assinatura_tokens_token_hash_key | btree | token_hash | sim | sim |  | `CREATE UNIQUE INDEX contrato_assinatura_tokens_token_hash_key ON public.contrato_assinatura_tokens USING btree (token_hash)` |
| idx_contrato_tokens_ativo | btree | contrato_id | não | sim | `((usado_em IS NULL) AND (revogado_em IS NULL))` | `CREATE INDEX idx_contrato_tokens_ativo ON public.contrato_assinatura_tokens USING btree (contrato_id) WHERE ((usado_em IS NULL) AND (revogado_em IS NULL))` |
| idx_contrato_tokens_contrato | btree | contrato_id | não | sim |  | `CREATE INDEX idx_contrato_tokens_contrato ON public.contrato_assinatura_tokens USING btree (contrato_id)` |
| idx_contrato_tokens_expira | btree | expira_em | não | sim | `(usado_em IS NULL)` | `CREATE INDEX idx_contrato_tokens_expira ON public.contrato_assinatura_tokens USING btree (expira_em) WHERE (usado_em IS NULL)` |
| idx_contrato_tokens_pending_reminder | btree | created_at | não | sim | `(usado_em IS NULL)` | `CREATE INDEX idx_contrato_tokens_pending_reminder ON public.contrato_assinatura_tokens USING btree (created_at) WHERE (usado_em IS NULL)` |


## Policies (RLS)

### `contrato_tokens_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK |  |

### `contrato_tokens_write`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_contrato_token_auditar | AFTER | INSERT OR UPDATE | ROW | enabled | public.trg_contrato_token_auditar |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
